import React from 'react'
import {
  LayoutTemplate,
  ShieldCheck,
  RefreshCw,
  Store,
} from 'lucide-react'
import {
  createCharge,
  listCharges,
  resolveLocalCheckoutHref,
  type ChargeSummary,
} from '../../../services/pspConsoleService'
import { ErrorBanner } from '../../../components/ui/StateBlocks'
import {
  DemoPerspectiveShell,
  LiveQuoteAndStatusCard,
  useLivePspMerchant,
  type ApiExchange,
} from './DemoConsoleChrome'

const WIDGET_PRODUCTS = [
  { sku: 'espresso', name: 'Harbour Roast Beans', detail: '250g whole bean, dark chocolate notes.', price: 1.0 },
  { sku: 'cup', name: 'Stoneware Ceramic Mug', detail: 'Handcrafted speckled clay, 250ml.', price: 1.5 },
  { sku: 'tote', name: 'Organic Cotton Tote', detail: 'Heavyweight canvas with inner pocket.', price: 2.0 },
]

interface CallbackLogItem {
  id: string
  when: string
  name: string
  detail?: string
}

export const CheckoutWidgetView: React.FC = () => {
  const {
    pspName,
    merchants,
    selectedMerchantId,
    setSelectedMerchantId,
    manualExternalId,
    setManualExternalId,
    merchantExternalId,
    merchantName,
    loading: loadingMerchants,
    reload: reloadMerchants,
  } = useLivePspMerchant()

  const [basket, setBasket] = React.useState<Record<string, number>>({ espresso: 1, cup: 1, tote: 0 })
  const [displayMode, setDisplayMode] = React.useState<'iframe' | 'popup' | 'new-tab'>('iframe')
  const [activeCharge, setActiveCharge] = React.useState<ChargeSummary | null>(null)
  const [recentCharges, setRecentCharges] = React.useState<ChargeSummary[]>([])
  const [callbacks, setCallbacks] = React.useState<CallbackLogItem[]>([])
  const [busy, setBusy] = React.useState(false)
  const [loadingOrders, setLoadingOrders] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [exchanges, setExchanges] = React.useState<ApiExchange[]>([])
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1)

  const pushCallback = React.useCallback((name: string, detail?: string) => {
    setCallbacks((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        when: new Date().toLocaleTimeString(),
        name,
        detail,
      },
      ...prev.slice(0, 14),
    ])
  }, [])

  const pushExchange = React.useCallback((entry: Omit<ApiExchange, 'id' | 'timestamp'>) => {
    setExchanges((prev) => [
      {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 14),
    ])
  }, [])

  const loadRecentOrders = React.useCallback(async () => {
    if (!merchantExternalId) return
    setLoadingOrders(true)
    const path = `/api/v1/psp/charges?merchantExternalId=${encodeURIComponent(merchantExternalId)}`
    try {
      const page = await listCharges({ merchantExternalId })
      const list = page.data || []
      setRecentCharges(list)
      if (list.length > 0 && !activeCharge) {
        const widgetCharge = list.find((c) => c.orderMetadata && (c.orderMetadata as Record<string, unknown>).source === 'checkout_widget') || list[0]
        setActiveCharge(widgetCharge)
        setStep(widgetCharge.status === 'paid' ? 4 : 2)
      }
      pushExchange({
        title: `Loaded ${list.length} widget charges for ${merchantName}`,
        method: 'GET',
        path,
        status: 200,
        response: { count: list.length },
      })
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      pushExchange({ title: 'Load widget charges failed', method: 'GET', path, error: msg })
    } finally {
      setLoadingOrders(false)
    }
  }, [merchantExternalId, activeCharge, merchantName, pushExchange])

  React.useEffect(() => {
    void loadRecentOrders()
  }, [loadRecentOrders])

  const adjustQty = (sku: string, delta: number) => {
    setBasket((prev) => ({
      ...prev,
      [sku]: Math.max(0, (prev[sku] || 0) + delta),
    }))
    setStep(1)
  }

  const itemsInBasket = WIDGET_PRODUCTS.filter((p) => (basket[p.sku] || 0) > 0)
  const totalAmount = itemsInBasket.reduce((sum, p) => sum + (basket[p.sku] || 0) * p.price, 0).toFixed(2)
  const description = itemsInBasket.map((p) => `${basket[p.sku]} × ${p.name}`).join(', ')

  const handleTriggerWidgetPay = async () => {
    if (!merchantExternalId) {
      setError('Select a live merchant first.')
      return
    }
    if (Number(totalAmount) <= 0) {
      setError('Add items to basket first.')
      return
    }

    setBusy(true)
    setError(null)
    setStep(2)
    pushCallback('onStartPayment', `Opening widget (${displayMode} mode) for $${totalAmount}`)

    const ensureWidgetScript = () =>
      new Promise<void>((resolve, reject) => {
        const win = window as unknown as { OrkiCheckoutModal?: { open: (opts: Record<string, unknown>) => void } }
        if (win.OrkiCheckoutModal) {
          resolve()
          return
        }
        const script = document.createElement('script')
        script.src = '/orki-widget.js'
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load /orki-widget.js'))
        document.body.appendChild(script)
      })

    try {
      await ensureWidgetScript()
      const win = window as unknown as {
        OrkiCheckoutModal: {
          open: (opts: {
            display?: string
            createCharge: (args: { idempotencyKey: string }) => Promise<{ checkoutUrl: string; chargeToken?: string }>
            onChargeCreated?: (charge: { chargeToken?: string; checkoutUrl?: string; status?: string }) => void
            onSuccess?: (payload: unknown) => void
            onError?: (err: Error) => void
            onClose?: () => void
          }) => void
        }
      }

      win.OrkiCheckoutModal.open({
        display: displayMode,
        createCharge: async ({ idempotencyKey }) => {
          const body = {
            merchantExternalId,
            amount: totalAmount,
            currency: 'USD',
            description: description || `${merchantName} widget order`,
            orderMetadata: {
              source: 'checkout_widget',
              idempotencyKey,
              items: itemsInBasket.map((p) => ({ sku: p.sku, qty: basket[p.sku] })),
            },
          }
          const created = await createCharge(body)
          pushExchange({
            title: `Widget createCharge (idempotencyKey: ${idempotencyKey.slice(0, 8)}…)`,
            method: 'POST',
            path: '/api/v1/psp/charges',
            status: 201,
            request: body,
            response: created,
          })
          if (!created.checkoutUrl) {
            throw new Error('Charge created without checkoutUrl')
          }
          return {
            ...created,
            checkoutUrl: resolveLocalCheckoutHref(created.checkoutUrl),
          }
        },
        onChargeCreated: (charge) => {
          const summary: ChargeSummary = {
            chargeToken: charge.chargeToken || 'chg_widget',
            amount: totalAmount,
            currency: 'USD',
            checkoutUrl: charge.checkoutUrl,
            status: charge.status || 'open',
          }
          setActiveCharge(summary)
          setStep(3)
          pushCallback('onChargeCreated', `Charge ${charge.chargeToken || ''} ready`)
          void loadRecentOrders()
        },
        onSuccess: (payload) => {
          setActiveCharge((prev) => (prev ? { ...prev, status: 'paid' } : prev))
          setStep(4)
          pushCallback('onSuccess', JSON.stringify(payload))
          void loadRecentOrders()
        },
        onError: (err) => {
          setError(err.message)
          pushCallback('onError', err.message)
        },
        onClose: () => {
          pushCallback('onClose', 'Shopper closed checkout modal')
        },
      })
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <DemoPerspectiveShell
      useCaseKey="widget"
      merchantName={merchantName}
      pspName={pspName}
      merchants={merchants}
      selectedMerchantId={selectedMerchantId}
      onSelectMerchant={setSelectedMerchantId}
      manualExternalId={manualExternalId}
      onManualExternalIdChange={setManualExternalId}
      loadingMerchants={loadingMerchants}
      onReloadMerchants={() => void reloadMerchants()}
      exchanges={exchanges}
      currentStep={step}
      stepSubtitle={
        step === 1
          ? 'Shopper builds cart on merchant website'
          : step === 2
          ? 'Clicking Pay launches embedded Orki checkout modal without redirect'
          : step === 3
          ? 'Shopper approves crypto payment inside secure modal iframe'
          : 'Payment settled on-chain & in-page widget callback triggers order success!'
      }
    >
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.18fr_0.92fr] gap-6 items-start">
        {/* Left: Merchant Storefront with Embedded Widget Trigger */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-sky-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Shopper Storefront · In-Page Embedded Widget
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 px-3 py-1 rounded-full border border-sky-200/60">
              Zero Redirect Modal
            </span>
          </div>

          {/* Display Mode Switcher */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <span className="font-bold text-slate-700">Modal Display Mode:</span>
            <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200">
              {(['iframe', 'popup', 'new-tab'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDisplayMode(mode)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition ${
                    displayMode === mode
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode === 'iframe' ? 'In-Page Modal (iframe)' : mode}
                </button>
              ))}
            </div>
          </div>

          {/* Product Items */}
          <div className="space-y-3">
            {WIDGET_PRODUCTS.map((product) => {
              const qty = basket[product.sku] || 0
              return (
                <div
                  key={product.sku}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{product.name}</div>
                    <div className="text-[11px] text-slate-500">{product.detail}</div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono font-bold text-slate-900">
                      ${product.price.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => adjustQty(product.sku, -1)}
                        className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-900"
                      >
                        −
                      </button>
                      <span className="w-4 text-center font-mono text-xs font-bold text-slate-900">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustQty(product.sku, 1)}
                        className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-900"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Checkout Total & Trigger Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Basket Total</div>
              <div className="text-2xl font-bold font-mono text-slate-900">${totalAmount} USD</div>
            </div>

            <button
              type="button"
              disabled={busy || Number(totalAmount) <= 0 || !merchantExternalId}
              onClick={() => void handleTriggerWidgetPay()}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 hover:from-sky-600 hover:to-indigo-800 text-white font-bold text-xs shadow-md transition disabled:opacity-40 flex items-center gap-2 active:scale-95"
            >
              {busy ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <LayoutTemplate className="w-4 h-4" />
              )}
              <span>Open Pay Modal (${totalAmount})</span>
            </button>
          </div>

          {/* Widget Real-Time Lifecycle Events Log */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                In-Page JavaScript Callbacks ({callbacks.length})
              </span>
              {callbacks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCallbacks([])}
                  className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Clear log
                </button>
              )}
            </div>

            {callbacks.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-400 italic">
                Click "Open Pay Modal" to observe live JavaScript lifecycle events.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {callbacks.map((cb) => (
                  <div
                    key={cb.id}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      <strong className="font-mono text-slate-800">{cb.name}</strong>
                      {cb.detail && (
                        <span className="text-[11px] text-slate-500 truncate max-w-xs">
                          {cb.detail}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{cb.when}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Architecture Summary & Live Quote Card */}
        <div className="space-y-6">
          {/* Executive Architecture Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              <span>Embedded Script Advantage</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Customers stay on <strong>{merchantName}</strong>'s site from start to finish. The widget modal embeds securely via iframe and broadcasts callbacks to your page.
            </p>
            <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-100 text-xs text-sky-950 font-mono">
              &lt;script src="/orki-widget.js"&gt;&lt;/script&gt;<br />
              OrkiCheckoutModal.open(&#123; display: '{displayMode}' &#125;)
            </div>
          </div>

          {/* Live Quote & Status Settlement Engine */}
          <LiveQuoteAndStatusCard
            activeCharge={activeCharge}
            onSettled={(updated: ChargeSummary) => {
              setActiveCharge(updated)
              setStep(4)
              void loadRecentOrders()
            }}
          />

          {/* Recent Orders Stream */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Recent Widget Orders ({recentCharges.length})
              </h4>
              <button
                type="button"
                onClick={() => void loadRecentOrders()}
                disabled={loadingOrders}
                className="text-xs text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingOrders ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {recentCharges.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center">
                No orders recorded yet. Open the modal on the left to start.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {recentCharges.map((charge) => {
                  const isCurrent = activeCharge?.chargeToken === charge.chargeToken
                  return (
                    <div
                      key={charge.chargeToken}
                      onClick={() => {
                        setActiveCharge(charge)
                        setStep(charge.status === 'paid' ? 4 : 2)
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                        isCurrent
                          ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-bold text-slate-900 truncate">
                          {charge.description || charge.chargeToken}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {charge.chargeToken.slice(0, 16)}…
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-slate-900 font-mono">
                          ${charge.amount} {charge.currency}
                        </div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-1 ${
                            charge.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {charge.status === 'paid' ? 'Paid ✓' : charge.status}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DemoPerspectiveShell>
  )
}
