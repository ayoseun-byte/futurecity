import React from 'react'
import { Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react'
import { createCharge, resolveLocalCheckoutHref } from '../../../services/pspConsoleService'
import { ErrorBanner } from '../../../components/ui/StateBlocks'
import { DemoPerspectiveShell, LiveQuoteAndStatusCard, useLivePspMerchant } from './DemoConsoleChrome'
import type { ApiExchange } from './DemoConsoleChrome'

const WIDGET_PRODUCTS = [
  { sku: 'espresso', name: 'Harbour Roast Beans', detail: '250g whole bean, dark chocolate & hazelnut.', price: 1.0 },
  { sku: 'cup', name: 'Stoneware Espresso Cup', detail: 'Wheel-thrown speckled clay, 90ml.', price: 1.5 },
  { sku: 'tote', name: 'Waxed Canvas Tote', detail: 'Heavyweight 18oz cotton with internal pocket.', price: 2.0 },
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

  const [basket, setBasket] = React.useState<Record<string, number>>({ espresso: 1, cup: 0, tote: 0 })
  const [displayMode, setDisplayMode] = React.useState<'new-tab' | 'popup' | 'iframe'>('iframe')
  const [showTechnicalTrace, setShowTechnicalTrace] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [lastOrder, setLastOrder] = React.useState<{
    chargeToken: string
    amount: string
    currency: string
    checkoutUrl?: string | null
    status: string
  } | null>(null)
  const [callbacks, setCallbacks] = React.useState<CallbackLogItem[]>([])
  const [exchanges, setExchanges] = React.useState<ApiExchange[]>([])
  const [copiedClient, setCopiedClient] = React.useState(false)

  const pushCallback = React.useCallback((name: string, detail?: string) => {
    setCallbacks((prev) => [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, when: new Date().toLocaleTimeString(), name, detail },
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

  const adjustQty = (sku: string, delta: number) => {
    setBasket((prev) => ({
      ...prev,
      [sku]: Math.max(0, (prev[sku] || 0) + delta),
    }))
  }

  const itemsInBasket = WIDGET_PRODUCTS.filter((p) => (basket[p.sku] || 0) > 0)
  const totalAmount = itemsInBasket.reduce((sum, p) => sum + (basket[p.sku] || 0) * p.price, 0).toFixed(2)
  const description = itemsInBasket.map((p) => `${basket[p.sku]} × ${p.name}`).join(', ')
  const merchantSlug = merchantName.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'cornershop'

  const clientSnippet = `<div id="orki-checkout"></div>
<script src="${window.location.origin}/orki-widget.js"></script>
<script>
  OrkiCheckoutModal.open({
    display: "${displayMode}",
    buttonText: "Pay $${totalAmount}",
    createCharge: async ({ idempotencyKey }) => {
      const res = await fetch("/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ description: ${JSON.stringify(description || 'Empty basket')} })
      });
      return res.json(); // { checkoutUrl, chargeToken }
    },
    onChargeCreated: (charge) => console.log("Created", charge.chargeToken),
    onSuccess: (payload) => console.log("Paid!", payload),
  });
</script>`

  const serverSnippet = `// On ${merchantName}'s server -> calls ${pspName} API:
POST /api/v1/psp/charges
Idempotency-Key: <forwarded from widget>
{
  "merchantExternalId": "${merchantExternalId || '<merchantExternalId>'}",
  "amount": "${totalAmount}",
  "currency": "USD",
  "description": ${JSON.stringify(description || `${merchantName} order`)}
}`

  const triggerWidgetPay = async () => {
    if (!merchantExternalId) {
      setError('Select a live merchant first.')
      return
    }
    if (Number(totalAmount) <= 0) return

    setBusy(true)
    setError(null)
    pushCallback('onStartPayment', `Opening ${displayMode} checkout for $${totalAmount}`)

    const ensureWidgetLoaded = () =>
      new Promise<void>((resolve, reject) => {
        const w = window as unknown as { OrkiCheckoutModal?: { open: (opts: Record<string, unknown>) => void } }
        if (w.OrkiCheckoutModal) {
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
      await ensureWidgetLoaded()
      const w = window as unknown as {
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

      w.OrkiCheckoutModal.open({
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
          setLastOrder({
            chargeToken: charge.chargeToken || 'chg_...',
            amount: totalAmount,
            currency: 'USD',
            checkoutUrl: charge.checkoutUrl,
            status: charge.status || 'open',
          })
          pushCallback('onChargeCreated', `Charge ${charge.chargeToken || ''} ready`)
        },
        onSuccess: (payload) => {
          setLastOrder((prev) => (prev ? { ...prev, status: 'paid' } : prev))
          pushCallback('onSuccess', JSON.stringify(payload))
        },
        onError: (err) => {
          setError(err.message)
          pushCallback('onError', err.message)
        },
        onClose: () => {
          pushCallback('onClose', 'Shopper closed checkout window')
        },
      })
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      setError(msg)
      pushCallback('onError', msg)
    } finally {
      setBusy(false)
    }
  }

  const copyClientSnippet = async () => {
    try {
      await navigator.clipboard.writeText(clientSnippet)
      setCopiedClient(true)
      setTimeout(() => setCopiedClient(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <DemoPerspectiveShell
      accentColor="#22313F"
      appName={`${merchantName}'s website`}
      navLabel="Embedded Widget"
      merchantName={merchantName}
      pspName={`Widget by ${pspName}`}
      ribbon={
        <>
          <strong className="text-white">Embedded Widget Demo:</strong> A shopper checks out on{' '}
          <strong className="text-white">{merchantName}</strong>'s own site using{' '}
          <strong className="text-white">{pspName}'s</strong> drop-in payment modal—without leaving the page.
        </>
      }
      merchants={merchants}
      selectedMerchantId={selectedMerchantId}
      onSelectMerchant={setSelectedMerchantId}
      manualExternalId={manualExternalId}
      onManualExternalIdChange={setManualExternalId}
      loadingMerchants={loadingMerchants}
      onReloadMerchants={() => void reloadMerchants()}
      exchanges={exchanges}
      showTechnicalTrace={showTechnicalTrace}
      onToggleTechnicalTrace={setShowTechnicalTrace}
      behindDescription="Live calls made when the widget opens and creates a charge."
    >
      {error && <div className="mb-4"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.95fr] gap-6 items-start">
        {/* Left: Simulated Browser Window */}
        <div className="rounded-xl border border-slate-300 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 bg-[#E9ECEF] px-3.5 py-2 border-b border-slate-200">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C5CBD1]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#C5CBD1]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#C5CBD1]" />
            </div>
            <div className="flex-1 rounded-full bg-white px-3 py-1 text-xs font-mono text-slate-600 truncate">
              <span className="text-slate-400">https://</span>
              <strong className="font-normal text-slate-900">{merchantSlug}.example</strong>
            </div>
          </div>

          <div className="bg-[#FBF5F0] p-5 space-y-4">
            <div>
              <h2 className="text-2xl font-bold font-serif text-[#7A3B1D]">{merchantName}</h2>
              <p className="text-xs text-slate-600 mt-0.5 font-serif">
                Order for collection at the shop. Pay with crypto right inside our checkout.
              </p>
            </div>

            <div className="space-y-2">
              {WIDGET_PRODUCTS.map((product) => (
                <div
                  key={product.sku}
                  className="grid grid-cols-[1fr_auto_auto] gap-3 items-center rounded-lg border border-[#EADBCF] bg-white px-3.5 py-2.5"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900 font-serif">{product.name}</div>
                    <div className="text-[11px] text-slate-500">{product.detail}</div>
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-800">${product.price.toFixed(2)}</div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjustQty(product.sku, -1)}
                      className="w-6 h-6 rounded border border-[#EADBCF] bg-white text-[#7A3B1D] text-xs font-bold hover:bg-[#FBF5F0]"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-xs font-mono font-semibold">{basket[product.sku] || 0}</span>
                    <button
                      type="button"
                      onClick={() => adjustQty(product.sku, 1)}
                      className="w-6 h-6 rounded border border-[#EADBCF] bg-white text-[#7A3B1D] text-xs font-bold hover:bg-[#FBF5F0]"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EADBCF]">
              <div>
                <div className="text-base font-bold text-slate-900">
                  Total <span className="font-mono">${totalAmount}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Experience:</span>
                  {(
                    [
                      { id: 'iframe', label: 'In-page Modal' },
                      { id: 'popup', label: 'Popup' },
                      { id: 'new-tab', label: 'New Tab' },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setDisplayMode(mode.id)}
                      className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
                        displayMode === mode.id
                          ? 'bg-[#22313F] text-white border-[#22313F]'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={busy || Number(totalAmount) <= 0 || !merchantExternalId}
                onClick={() => void triggerWidgetPay()}
                className="rounded-lg bg-[#22313F] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#19242e] disabled:opacity-45 transition"
              >
                {busy ? 'Opening Checkout…' : `Pay with Orki · $${totalAmount}`}
              </button>
            </div>

            {lastOrder && lastOrder.checkoutUrl && (
              <div className="rounded-lg border border-emerald-200 bg-white p-3 text-xs flex items-center justify-between">
                <span className="font-semibold text-emerald-800">
                  {lastOrder.status === 'paid' ? 'Order Confirmed & Paid!' : 'Checkout opened for your order.'}
                </span>
                <a
                  href={lastOrder.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#22313F] font-semibold hover:underline"
                >
                  Open in tab
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right: Business Summary + Live Quote (or Technical Code Snippets when Technical Trace is On) */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-[#22313F]" />
              Why merchants use the Embedded Widget
            </div>
            <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4">
              <li>Shoppers stay on <strong>{merchantName}</strong>'s website inside an in-page modal.</li>
              <li>Supports all active chains and tokens with real-time quotes.</li>
              <li>{pspName} prices the order on the server so shoppers cannot tamper with the amount.</li>
            </ul>
          </div>

          {lastOrder && (
            <LiveQuoteAndStatusCard
              identifier={lastOrder.chargeToken}
              amount={lastOrder.amount}
              currency={lastOrder.currency}
              checkoutUrl={lastOrder.checkoutUrl}
              initialStatus={lastOrder.status}
              onPaid={(c) => setLastOrder((prev) => (prev ? { ...prev, status: c.status } : prev))}
            />
          )}

          {showTechnicalTrace && (
            <>
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">What {merchantName} added</h3>
                  <button
                    type="button"
                    onClick={() => void copyClientSnippet()}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                  >
                    {copiedClient ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedClient ? 'Copied' : 'Copy snippet'}
                  </button>
                </div>
                <pre className="rounded-xl bg-[#16202B] text-[#E5E9ED] p-3.5 text-[11px] font-mono overflow-x-auto leading-relaxed">
                  {clientSnippet}
                </pre>
                <pre className="rounded-xl bg-[#16202B] text-[#E5E9ED] p-3.5 text-[11px] font-mono overflow-x-auto leading-relaxed">
                  {serverSnippet}
                </pre>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                <h3 className="text-sm font-bold text-slate-900">Widget callbacks</h3>
                {callbacks.length === 0 ? (
                  <p className="text-xs text-slate-400">Nothing yet. Add items and press Pay.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 max-h-52 overflow-auto text-xs font-mono">
                    {callbacks.map((cb) => (
                      <li key={cb.id} className="py-1.5">
                        <span className="text-slate-400 mr-2">{cb.when}</span>
                        <span className="font-semibold text-slate-900">{cb.name}</span>
                        {cb.detail && <div className="text-[11px] text-slate-500 break-all">{cb.detail}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </aside>
      </div>
    </DemoPerspectiveShell>
  )
}
