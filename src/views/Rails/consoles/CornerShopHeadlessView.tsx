import React from 'react'
import {
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Zap,
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

const HEADLESS_PRODUCTS = [
  {
    sku: 'espresso',
    name: 'Harbour Roast Beans',
    detail: '250g whole bean, dark chocolate & hazelnut notes.',
    price: 1.0,
  },
  {
    sku: 'cup',
    name: 'Stoneware Ceramic Dripper',
    detail: 'Wheel-thrown speckled clay pour-over dripper.',
    price: 1.5,
  },
  {
    sku: 'tote',
    name: 'Heavyweight Canvas Tote',
    detail: '18oz organic cotton tote with internal key leash.',
    price: 2.0,
  },
]

export const CornerShopHeadlessView: React.FC = () => {
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
  const [selectedMethod, setSelectedMethod] = React.useState<'orki' | 'card'>('orki')
  const [activeCharge, setActiveCharge] = React.useState<ChargeSummary | null>(null)
  const [recentCharges, setRecentCharges] = React.useState<ChargeSummary[]>([])
  const [busy, setBusy] = React.useState(false)
  const [loadingOrders, setLoadingOrders] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [exchanges, setExchanges] = React.useState<ApiExchange[]>([])
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1)

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
        const headlessCharge = list.find((c) => c.orderMetadata && (c.orderMetadata as Record<string, unknown>).source === 'headless_enterprise_button') || list[0]
        setActiveCharge(headlessCharge)
        setStep(headlessCharge.status === 'paid' ? 4 : 2)
      }
      pushExchange({
        title: `Loaded ${list.length} headless orders for ${merchantName}`,
        method: 'GET',
        path,
        status: 200,
        response: { count: list.length },
      })
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      pushExchange({ title: 'Load orders failed', method: 'GET', path, error: msg })
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

  const itemsInBasket = HEADLESS_PRODUCTS.filter((p) => (basket[p.sku] || 0) > 0)
  const totalAmount = itemsInBasket.reduce((sum, p) => sum + (basket[p.sku] || 0) * p.price, 0).toFixed(2)
  const description = itemsInBasket.map((p) => `${basket[p.sku]} × ${p.name}`).join(', ')
  const itemsPayload = Object.fromEntries(itemsInBasket.map((p) => [p.sku, basket[p.sku]]))
  const merchantSlug = merchantName.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'brand'

  const handlePayHeadless = async () => {
    if (!merchantExternalId) {
      setError('Select a live merchant first.')
      return
    }
    if (Number(totalAmount) <= 0) {
      setError('Add at least one item to basket.')
      return
    }

    setBusy(true)
    setError(null)
    const orderId = `HL-${Math.floor(3000 + Math.random() * 7000)}`
    const body = {
      merchantExternalId,
      amount: totalAmount,
      currency: 'USD',
      description: description || `${merchantName} Headless Order #${orderId}`,
      returnUrl: `${window.location.origin}/psp/console/headless?order=${orderId}&status=confirmed`,
      cancelUrl: `${window.location.origin}/psp/console/headless?order=${orderId}&status=cancelled`,
      orderMetadata: {
        orderId,
        source: 'headless_enterprise_button',
        items: itemsPayload,
      },
    }

    try {
      const created = await createCharge(body)
      setActiveCharge(created)
      setStep(2)
      pushExchange({
        title: `Enterprise Server created direct charge for Order #${orderId}`,
        method: 'POST',
        path: '/api/v1/psp/charges',
        status: 201,
        request: body,
        response: created,
      })
      await loadRecentOrders()
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      setError(msg)
      pushExchange({
        title: `Headless charge creation failed for Order #${orderId}`,
        method: 'POST',
        path: '/api/v1/psp/charges',
        request: body,
        error: msg,
      })
    } finally {
      setBusy(false)
    }
  }

  const resolvedCheckoutUrl = activeCharge?.checkoutUrl
    ? resolveLocalCheckoutHref(activeCharge.checkoutUrl)
    : ''

  return (
    <DemoPerspectiveShell
      useCaseKey="headless"
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
          ? 'Enterprise shopper configures cart inside custom bespoke checkout'
          : step === 2
          ? 'Merchant backend initiates direct charge via POST /api/v1/psp/charges'
          : step === 3
          ? 'Shopper reviews real-time token quote and completes transaction'
          : 'Settlement confirmed & on-brand order receipt displayed!'
      }
    >
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.18fr_0.92fr] gap-6 items-start">
        {/* Left: Enterprise Bespoke Browser Experience */}
        <div className="rounded-3xl border border-slate-700/30 bg-slate-900 text-white shadow-xl overflow-hidden">
          {/* Browser Address Bar */}
          <div className="flex items-center gap-3 bg-slate-950 px-4 py-2.5 border-b border-slate-800">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div className="flex-1 rounded-lg bg-slate-900 px-3 py-1 text-xs font-mono text-slate-300 truncate border border-slate-800">
              <span className="text-cyan-400">https://</span>
              <span className="font-semibold">{merchantSlug}.luxury-store.com/checkout</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-800">
              100% Brand Owned
            </span>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <div className="text-[11px] font-bold tracking-widest text-cyan-400 uppercase">
                Enterprise Flagship Checkout
              </div>
              <h2 className="text-2xl font-bold font-serif text-white mt-1">
                {merchantName}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Zero third-party redirect or iframe branding. The merchant controls every pixel.
              </p>
            </div>

            {/* Custom Item Picker */}
            <div className="space-y-2.5">
              {HEADLESS_PRODUCTS.map((product) => {
                const qty = basket[product.sku] || 0
                return (
                  <div
                    key={product.sku}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{product.name}</div>
                      <div className="text-[11px] text-slate-400">{product.detail}</div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono font-bold text-cyan-300">
                        ${product.price.toFixed(2)}
                      </span>
                      <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
                        <button
                          type="button"
                          onClick={() => adjustQty(product.sku, -1)}
                          className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-400 hover:text-white"
                        >
                          −
                        </button>
                        <span className="w-4 text-center font-mono text-xs font-bold text-white">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustQty(product.sku, 1)}
                          className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-400 hover:text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Payment Method Selector (Custom Radio) */}
            <div className="space-y-2.5 pt-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Payment Option
              </label>

              <div
                onClick={() => setSelectedMethod('orki')}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  selectedMethod === 'orki'
                    ? 'border-cyan-400 bg-cyan-950/40'
                    : 'border-slate-800 bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      Instant Crypto Settle (USDC, USDT, EURC)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Powered by {pspName} silent background rails on Base &amp; Solana
                    </div>
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedMethod === 'orki' ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600'
                  }`}
                >
                  {selectedMethod === 'orki' && <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
                </div>
              </div>

              <div
                onClick={() => setSelectedMethod('card')}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between opacity-50 ${
                  selectedMethod === 'card'
                    ? 'border-cyan-400 bg-cyan-950/40'
                    : 'border-slate-800 bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-700/40 flex items-center justify-center text-slate-400">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-300">Credit Card / Apple Pay</div>
                    <div className="text-[11px] text-slate-500">Traditional acquirer (disabled in demo)</div>
                  </div>
                </div>
                <div className="w-4 h-4 rounded-full border border-slate-600" />
              </div>
            </div>

            {/* Total & Action */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Due</div>
                <div className="text-2xl font-bold font-mono text-cyan-300">${totalAmount} USD</div>
              </div>

              <button
                type="button"
                disabled={busy || Number(totalAmount) <= 0 || !merchantExternalId}
                onClick={() => void handlePayHeadless()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg transition disabled:opacity-40 flex items-center gap-2 active:scale-95"
              >
                {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                <span>Complete Purchase (${totalAmount})</span>
              </button>
            </div>

            {/* Order Confirmation Card */}
            {activeCharge && (
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">
                      Order Registered: {activeCharge.chargeToken.slice(0, 16)}…
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      activeCharge.status === 'paid'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {activeCharge.status}
                  </span>
                </div>

                {resolvedCheckoutUrl && activeCharge.status !== 'paid' && (
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Simulate customer wallet signing:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStep(3)
                        window.open(resolvedCheckoutUrl, '_blank', 'noopener,noreferrer')
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-1 active:scale-95"
                    >
                      <span>Open Payment Screen</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Enterprise Value Engine & Live Multi-Chain Card */}
        <div className="space-y-6">
          {/* Executive Architecture Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-cyan-600" />
              <span>Headless Architecture Model</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              In Headless mode, <strong>{merchantName}</strong> never redirects users away from their app. The merchant's server calls <strong>{pspName}</strong>'s API directly.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Frontend</div>
                <div className="font-bold text-slate-800 mt-0.5">100% Custom React / iOS</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Backend Settle</div>
                <div className="font-bold text-slate-800 mt-0.5">Direct API (POST /charges)</div>
              </div>
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
                Direct API Charges ({recentCharges.length})
              </h4>
              <button
                type="button"
                onClick={() => void loadRecentOrders()}
                disabled={loadingOrders}
                className="text-xs text-cyan-600 hover:text-cyan-800 font-semibold flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingOrders ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {recentCharges.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center">
                No charges recorded yet. Trigger one on the left.
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
                          ? 'border-cyan-500 bg-cyan-50/50 ring-1 ring-cyan-500'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-bold text-slate-900 truncate">
                          {charge.description || charge.chargeToken}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {charge.chargeToken.slice(0, 18)}…
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
                          {charge.status}
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
