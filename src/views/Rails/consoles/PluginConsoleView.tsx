import React from 'react'
import {
  Plug,
  CheckCircle2,
  Settings,
  ShoppingCart,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Store,
  Sparkles,
} from 'lucide-react'
import {
  createCharge,
  fetchMerchantSettings,
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

export const PluginConsoleView: React.FC = () => {
  const {
    pspName,
    merchants,
    selectedMerchant,
    selectedMerchantId,
    setSelectedMerchantId,
    manualExternalId,
    setManualExternalId,
    merchantExternalId,
    merchantName,
    loading: loadingMerchants,
    reload: reloadMerchants,
  } = useLivePspMerchant()

  const [activeTab, setActiveTab] = React.useState<'checkout' | 'admin'>('checkout')
  const [pluginEnabled, setPluginEnabled] = React.useState(true)
  const [autoMarkPaid, setAutoMarkPaid] = React.useState(true)
  const [acceptedChains, setAcceptedChains] = React.useState<string[]>(['base', 'solana'])
  const [acceptedTokens, setAcceptedTokens] = React.useState<string[]>(['USDC', 'USDT', 'EURC'])
  const [orderNumber, setOrderNumber] = React.useState(() => `WC-${Math.floor(4000 + Math.random() * 5000)}`)
  const [activeCharge, setActiveCharge] = React.useState<ChargeSummary | null>(null)
  const [storeOrders, setStoreOrders] = React.useState<ChargeSummary[]>([])
  const [loadingOrders, setLoadingOrders] = React.useState(false)
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

  React.useEffect(() => {
    if (!selectedMerchant?.id) return
    let active = true
    const loadSettings = async () => {
      try {
        const settings = await fetchMerchantSettings(selectedMerchant.id)
        if (!active) return
        if (Array.isArray(settings.acceptedChains) && settings.acceptedChains.length > 0) {
          setAcceptedChains(settings.acceptedChains)
        }
        if (Array.isArray(settings.acceptedTokens) && settings.acceptedTokens.length > 0) {
          setAcceptedTokens(settings.acceptedTokens)
        }
      } catch {
        // Keep defaults
      }
    }
    void loadSettings()
    return () => {
      active = false
    }
  }, [selectedMerchant?.id])

  const loadStoreOrders = React.useCallback(async () => {
    if (!merchantExternalId) return
    setLoadingOrders(true)
    const path = `/api/v1/psp/charges?merchantExternalId=${encodeURIComponent(merchantExternalId)}`
    try {
      const page = await listCharges({ merchantExternalId })
      const list = page.data || []
      setStoreOrders(list)
      if (list.length > 0 && !activeCharge) {
        const pluginCharge = list.find((c) => c.orderMetadata && (c.orderMetadata as Record<string, unknown>).source === 'store_plugin') || list[0]
        setActiveCharge(pluginCharge)
        setStep(pluginCharge.status === 'paid' ? 4 : 2)
      }
      pushExchange({
        title: `Loaded ${list.length} orders for ${merchantName}`,
        method: 'GET',
        path,
        status: 200,
        response: { count: list.length },
      })
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      pushExchange({ title: 'Load store orders failed', method: 'GET', path, error: msg })
    } finally {
      setLoadingOrders(false)
    }
  }, [merchantExternalId, activeCharge, merchantName, pushExchange])

  React.useEffect(() => {
    void loadStoreOrders()
  }, [loadStoreOrders])

  const isMerchantActive = selectedMerchant ? selectedMerchant.status === 'active' : Boolean(merchantExternalId)

  const handleCheckoutWithPlugin = async () => {
    if (!merchantExternalId) {
      setError('Select a live merchant first.')
      return
    }
    if (!isMerchantActive) {
      setError(
        `${merchantName} is not active yet. Orki is only displayed in the plugin once the merchant completes onboarding in ${pspName}.`
      )
      return
    }
    if (!pluginEnabled) {
      setError('Enable the Orki plugin in Store Admin settings first.')
      return
    }

    setBusy(true)
    setError(null)
    const nextOrder = `WC-${Math.floor(4000 + Math.random() * 5000)}`
    setOrderNumber(nextOrder)

    const body = {
      merchantExternalId,
      amount: '1.50',
      currency: 'USD',
      description: `${merchantName} Store Order #${nextOrder} (Plugin Checkout)`,
      returnUrl: `${window.location.origin}/psp/console/plugin?order=${nextOrder}&status=success`,
      cancelUrl: `${window.location.origin}/psp/console/plugin?order=${nextOrder}&status=cancelled`,
      orderMetadata: {
        orderId: nextOrder,
        source: 'store_plugin',
        platform: 'woocommerce_shopify_demo',
      },
    }

    try {
      const created = await createCharge(body)
      setActiveCharge(created)
      setStep(2)
      pushExchange({
        title: `Store Plugin backend created charge for Order #${nextOrder}`,
        method: 'POST',
        path: '/api/v1/psp/charges',
        status: 201,
        request: body,
        response: created,
      })
      await loadStoreOrders()
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      setError(msg)
      pushExchange({
        title: `Store Plugin charge failed for Order #${nextOrder}`,
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
      useCaseKey="plugin"
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
          ? 'Shopper arrives at checkout on WooCommerce / Shopify store'
          : step === 2
          ? 'Plugin backend requests payment link from PSP gateway'
          : step === 3
          ? 'Shopper completes payment on Orki multi-chain checkout'
          : 'PSP webhooks update store order to Paid ✓ automatically'
      }
    >
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Role / Context Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('checkout')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'checkout'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>1. Storefront Checkout (Shopper)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'admin'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>2. Store Admin Settings (Merchant)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 bg-amber-50 text-amber-900 px-3.5 py-1.5 rounded-full border border-amber-200/60 text-xs font-semibold">
          <Plug className="w-4 h-4 text-amber-600" />
          <span>Extension: <strong>{pspName} Gateway v2.4</strong></span>
        </div>
      </div>

      {activeTab === 'admin' ? (
        /* Store Admin Plugin Configuration View */
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  E-Commerce Admin Panel
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  WooCommerce / Shopify Payment Settings
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Merchant installs the plugin once. No API keys or custom code required on the shop.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-3 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Plugin Active
              </span>
            </div>

            {/* Enable Toggle */}
            <label className="flex items-center justify-between p-4 rounded-2xl border border-amber-200 bg-amber-50/40 cursor-pointer">
              <div className="pr-4">
                <div className="text-xs font-bold text-slate-900">
                  Enable "Pay with Orki (Crypto)" at Checkout
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Allows customers to pay in USDC, USDT, and EURC on Base and Solana.
                </div>
              </div>
              <input
                type="checkbox"
                checked={pluginEnabled}
                onChange={(e) => setPluginEnabled(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
            </label>

            {/* Auto-mark order paid toggle */}
            <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
              <div className="pr-4">
                <div className="text-xs font-bold text-slate-900">
                  Automatic Order Status Sync via Webhook
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Store order automatically changes from "Pending Payment" to "Processing / Paid" when Orki emits <code>charge.paid</code>.
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoMarkPaid}
                onChange={(e) => setAutoMarkPaid(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
            </label>

            {/* Acceptance Rules synced from PSP */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Synced Acceptance Rules from {pspName}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1 font-semibold text-indigo-900">
                  Chains: {acceptedChains.map((c) => c.toUpperCase()).join(', ')}
                </span>
                <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 font-semibold text-emerald-900">
                  Tokens: {acceptedTokens.map((t) => t.toUpperCase()).join(', ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                These rules are pulled in real-time from the merchant's profile in {pspName}.
              </p>
            </div>
          </div>

          {/* Right: Architecture & Walkthrough Explanation */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>How the Store Plugin Works</span>
            </h4>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="text-slate-900 block mb-0.5">1. PSP Ships Extension</strong>
                {pspName} releases the plugin once to the store app directory.
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="text-slate-900 block mb-0.5">2. Zero-Config Merchant</strong>
                Merchant enables it with one click. No coding or blockchain setup on the merchant side.
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="text-slate-900 block mb-0.5">3. Webhook Fulfillment</strong>
                Once customer pays on Orki, {pspName} receives the webhook and notifies the store to ship the order.
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Shopper Checkout Experience */
        <div className="grid grid-cols-1 lg:grid-cols-[1.18fr_0.92fr] gap-6 items-start">
          {/* Left: Storefront Checkout Frame */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Storefront Checkout · Order #{orderNumber}
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                Customer: Alex Morgan
              </span>
            </div>

            {/* Basket Items Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-800">1 × Harbour Roast Beans (250g)</span>
                <span className="font-bold text-slate-900 font-mono">$1.00</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-800">Standard Shipping</span>
                <span className="font-bold text-slate-900 font-mono">$0.50</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-slate-900">
                <span>Total Due</span>
                <span className="font-mono text-amber-700">$1.50 USD</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Select Payment Method
              </label>

              {!isMerchantActive && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 leading-relaxed">
                  <strong>Pay with Orki is hidden:</strong> {merchantName} is currently {selectedMerchant?.status || 'inactive'}. The plugin automatically hides crypto until merchant onboarding is verified.
                </div>
              )}

              {/* Disabled Credit Card Mock */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 opacity-45">
                <div>
                  <div className="text-xs font-bold text-slate-700">Credit or Debit Card</div>
                  <div className="text-[11px] text-slate-500">Visa, Mastercard, Amex</div>
                </div>
                <input type="radio" disabled name="pm" />
              </div>

              {/* Pay with Orki Plugin Card */}
              {isMerchantActive && (
                <div
                  className={`p-4 rounded-2xl border transition space-y-2.5 ${
                    pluginEnabled
                      ? 'border-amber-500 bg-amber-50/40 shadow-xs ring-1 ring-amber-400'
                      : 'border-slate-200 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Pay with Orki (Crypto &amp; Stablecoins)</span>
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Instant zero-chargeback settlement with {acceptedTokens.join(', ')} on Base &amp; Solana.
                      </div>
                    </div>
                    <input
                      type="radio"
                      checked={pluginEnabled}
                      readOnly
                      name="pm"
                      className="text-amber-600 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2.5 py-1 rounded-lg">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Provided by {pspName} Store Plugin · Auto-fulfills upon on-chain settlement</span>
                  </div>
                </div>
              )}
            </div>

            {/* Place Order Button */}
            <button
              type="button"
              disabled={busy || !pluginEnabled || !merchantExternalId || !isMerchantActive}
              onClick={() => void handleCheckoutWithPlugin()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs shadow-md transition disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95"
            >
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              <span>Place Order with Orki — $1.50 USD</span>
            </button>

            {/* Charge Ready Callout */}
            {activeCharge && resolvedCheckoutUrl && activeCharge.status !== 'paid' && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">
                    Payment Gateway Initiated for Order #{orderNumber}
                  </span>
                  <span className="text-[10px] font-bold uppercase bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
                    {activeCharge.status}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800">
                  The store plugin redirects the shopper to complete the payment on Orki's hosted checkout screen.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(3)
                      window.open(resolvedCheckoutUrl, '_blank', 'noopener,noreferrer')
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                  >
                    <span>Launch Orki Payment Screen</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Live Quote Engine & Store Orders Ledger */}
          <div className="space-y-6">
            {/* Live Quote & Settlement Engine */}
            <LiveQuoteAndStatusCard
              activeCharge={activeCharge}
              onSettled={(updated: ChargeSummary) => {
                setActiveCharge(updated)
                setStep(4)
                void loadStoreOrders()
              }}
            />

            {/* Store Orders Fulfillment Ledger */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Store Orders Sync ({storeOrders.length})
                </h4>
                <button
                  type="button"
                  onClick={() => void loadStoreOrders()}
                  disabled={loadingOrders}
                  className="text-xs text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingOrders ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {storeOrders.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-3 text-center">
                  No orders recorded yet. Complete a checkout on the left.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {storeOrders.map((order) => {
                    const isCurrent = activeCharge?.chargeToken === order.chargeToken
                    return (
                      <div
                        key={order.chargeToken}
                        onClick={() => {
                          setActiveCharge(order)
                          setStep(order.status === 'paid' ? 4 : 2)
                        }}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                          isCurrent
                            ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 pr-3">
                          <div className="font-bold text-slate-900 truncate">
                            {order.description || order.chargeToken}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {order.chargeToken.slice(0, 16)}…
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-slate-900 font-mono">
                            ${order.amount} {order.currency}
                          </div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-1 ${
                              order.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {order.status === 'paid' ? 'Paid ✓' : order.status}
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
      )}
    </DemoPerspectiveShell>
  )
}
