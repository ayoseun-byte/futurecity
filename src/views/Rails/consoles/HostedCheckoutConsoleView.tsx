import React from 'react'
import {
  ExternalLink,
  RefreshCw,
  ShoppingBag,
  Store,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import {
  createCharge,
  listCharges,
} from '../../../services/pspConsoleService'
import type { ChargeSummary } from '../../../services/pspConsoleService'
import { ErrorBanner } from '../../../components/ui/StateBlocks'
import {
  DemoPerspectiveShell,
  LiveQuoteAndStatusCard,
  useLivePspMerchant,
  type ApiExchange,
} from './DemoConsoleChrome'

const HOSTED_PRODUCTS = [
  { sku: 'espresso', name: 'Harbour Roast Beans', detail: '250g whole bean, dark chocolate notes.', price: 1.0 },
  { sku: 'cup', name: 'Handmade Stoneware Cup', detail: 'Wheel-thrown speckled clay, 90ml.', price: 1.5 },
  { sku: 'tote', name: 'Canvas Tote Bag', detail: '18oz heavyweight cotton with inner pocket.', price: 2.0 },
]

export const HostedCheckoutConsoleView: React.FC = () => {
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

  const [cart, setCart] = React.useState<Record<string, number>>({ espresso: 1, cup: 1 })
  const [hostedModalOpen, setHostedModalOpen] = React.useState(false)
  const [orderId, setOrderId] = React.useState(() => `HP-${Math.floor(2000 + Math.random() * 8000)}`)
  const [charges, setCharges] = React.useState<ChargeSummary[]>([])
  const [activeCharge, setActiveCharge] = React.useState<ChargeSummary | null>(null)
  const [busy, setBusy] = React.useState(false)
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
    try {
      const page = await listCharges({ merchantExternalId })
      setCharges(page.data || [])
    } catch {
      // Ignore
    }
  }, [merchantExternalId])

  React.useEffect(() => {
    void loadRecentOrders()
  }, [loadRecentOrders])

  const cartEntries = HOSTED_PRODUCTS.filter((p) => (cart[p.sku] || 0) > 0).map((p) => ({
    ...p,
    qty: cart[p.sku],
    lineTotal: (cart[p.sku] * p.price).toFixed(2),
  }))

  const cartTotal = cartEntries.reduce((sum, item) => sum + item.qty * item.price, 0).toFixed(2)

  const addToBasket = (sku: string) => {
    setCart((prev) => ({ ...prev, [sku]: (prev[sku] || 0) + 1 }))
    setStep(1)
  }

  const openHostedPaymentPage = () => {
    const nextOrder = `HP-${Math.floor(2000 + Math.random() * 8000)}`
    setOrderId(nextOrder)
    setHostedModalOpen(true)
    setStep(2)
  }

  const payWithOrkiOnHostedPage = async () => {
    if (!merchantExternalId) {
      setError('Select a live merchant first.')
      return
    }
    setBusy(true)
    setError(null)
    const itemsDescription = cartEntries.map((item) => `${item.qty} × ${item.name}`).join(', ')
    const body = {
      merchantExternalId,
      amount: cartTotal,
      currency: 'USD',
      description: `${merchantName} Order #${orderId}: ${itemsDescription}`,
      returnUrl: `${window.location.origin}/psp/console/hosted?order=${orderId}&status=success`,
      cancelUrl: `${window.location.origin}/psp/console/hosted?order=${orderId}&status=cancelled`,
      orderMetadata: {
        orderId,
        source: 'psp_hosted_checkout',
        items: cartEntries.map((i) => ({ sku: i.sku, name: i.name, qty: i.qty, price: i.price })),
      },
    }

    try {
      const created = await createCharge(body)
      setActiveCharge(created)
      setStep(3)
      pushExchange({
        title: `PSP Server created charge for Order #${orderId}`,
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
        title: `Charge creation failed for Order #${orderId}`,
        method: 'POST',
        path: '/api/v1/psp/charges',
        request: body,
        error: msg,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DemoPerspectiveShell
        useCaseKey="hosted"
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
            ? 'Shopper is building a basket in Corner Shop'
            : step === 2
            ? 'Shopper is on PSP’s hosted payment screen choosing payment method'
            : step === 3
            ? 'Orki Charge generated with live multi-chain crypto quote'
            : 'Payment settled on-chain & order completed!'
        }
      >
        {error && <div className="mb-4"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>}

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.9fr] gap-6 items-start">
          {/* Left: Shopper Storefront & Checkout Simulation */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="flex items-center justify-between bg-slate-100 px-4 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Shopper Perspective · {merchantName}
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500">Hosted by {pspName}</span>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-serif">Curated Everyday Goods</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Small batch goods. Add items to cart and proceed to checkout.
                </p>
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {HOSTED_PRODUCTS.map((prod) => (
                  <div
                    key={prod.sku}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 flex flex-col justify-between space-y-2 hover:border-indigo-300 transition"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">{prod.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{prod.detail}</div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-bold text-slate-900 font-mono">${prod.price.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => addToBasket(prod.sku)}
                        className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 transition"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cart Summary */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">
                  <span className="flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-indigo-600" />
                    Shopper Basket ({cartEntries.length} items)
                  </span>
                  <span className="font-mono">${cartTotal} USD</span>
                </div>

                {cartEntries.length === 0 ? (
                  <p className="text-xs text-slate-400 py-1">Basket is empty.</p>
                ) : (
                  <div className="space-y-1.5">
                    {cartEntries.map((item) => (
                      <div key={item.sku} className="flex justify-between text-xs text-slate-600">
                        <span>{item.qty} × {item.name}</span>
                        <span className="font-mono font-medium">${item.lineTotal}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  disabled={cartEntries.length === 0 || !merchantExternalId}
                  onClick={openHostedPaymentPage}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-sm disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  Proceed to {pspName} Payment Page
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Active Charge Quote Card */}
              {activeCharge && (
                <LiveQuoteAndStatusCard
                  identifier={activeCharge.chargeToken}
                  amount={activeCharge.amount}
                  currency={activeCharge.currency}
                  checkoutUrl={activeCharge.checkoutUrl}
                  initialStatus={activeCharge.status}
                  onPaid={(c) => {
                    setActiveCharge(c)
                    setStep(4)
                    void loadRecentOrders()
                  }}
                />
              )}
            </div>
          </div>

          {/* Right: Merchant Admin Perspective */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Merchant Order Stream
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void loadRecentOrders()}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Orders created by {pspName}'s hosted payment page update automatically when settled by Orki on-chain.
              </p>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {charges.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No orders recorded yet.</p>
                ) : (
                  charges.slice(0, 6).map((c) => {
                    const isPaid = c.status === 'paid'
                    return (
                      <div key={c.chargeToken} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900 font-mono">
                            {c.invoice?.number || c.chargeToken.slice(0, 12)}…
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {c.description || 'Hosted checkout order'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold font-mono text-slate-900">${c.amount}</div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                              isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isPaid ? 'Paid ✓' : c.status}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </DemoPerspectiveShell>

      {/* Hosted Payment Page Modal (Simulates the PSP-hosted screen) */}
      {hostedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            {/* Hosted Page Header */}
            <div className="px-6 py-4 flex items-center justify-between text-white bg-gradient-to-r from-indigo-600 to-purple-800">
              <div>
                <div className="text-xs uppercase tracking-wider font-bold text-white/80">{pspName} Payments</div>
                <div className="font-extrabold text-sm text-white">Secure Hosted Checkout</div>
              </div>
              <button
                type="button"
                onClick={() => setHostedModalOpen(false)}
                className="text-xs bg-white/20 hover:bg-white/30 text-white rounded-lg px-2.5 py-1 transition"
              >
                ✕ Cancel
              </button>
            </div>

            <div className="p-6 space-y-5 bg-[#FAF9F6]">
              {/* Order Breakdown */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5">
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>Merchant:</span>
                  <strong className="text-slate-800">{merchantName}</strong>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>Order Reference:</span>
                  <span className="font-mono font-semibold text-slate-800">{orderId}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-900">Total Amount Due:</span>
                  <span className="text-lg font-black font-mono text-indigo-700">${cartTotal} USD</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">Select How to Pay</div>

                {/* Disabled Card Option */}
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 opacity-50">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Card Payment</div>
                      <div className="text-[11px] text-slate-500">Visa / Mastercard (disabled for crypto demo)</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 border border-slate-200 rounded px-2 py-0.5">
                    Disabled
                  </span>
                </div>

                {/* Active Orki Crypto Option */}
                <div className="rounded-2xl border-2 border-indigo-500 bg-indigo-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        Pay with Orki (Crypto)
                      </div>
                      <div className="text-[11px] text-indigo-800 mt-0.5">
                        Instant settlement in USDC / USDT / EURC across Base &amp; Solana.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      void payWithOrkiOnHostedPage()
                      setHostedModalOpen(false)
                    }}
                    className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-md flex items-center justify-center gap-2"
                  >
                    {busy ? 'Creating Charge…' : 'Proceed to Orki Crypto Payment'}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
