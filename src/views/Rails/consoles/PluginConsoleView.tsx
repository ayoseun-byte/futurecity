import React from 'react'
import { CheckCircle2, Plug, Settings, ShoppingCart, ShieldCheck } from 'lucide-react'
import { createCharge, fetchMerchantSettings } from '../../../services/pspConsoleService'
import type { ChargeSummary } from '../../../services/pspConsoleService'
import { ErrorBanner } from '../../../components/ui/StateBlocks'
import { DemoPerspectiveShell, LiveQuoteAndStatusCard, useLivePspMerchant } from './DemoConsoleChrome'
import type { ApiExchange } from './DemoConsoleChrome'

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

  const [tab, setTab] = React.useState<'checkout' | 'settings'>('checkout')
  const [pluginEnabled, setPluginEnabled] = React.useState(true)
  const [acceptedChains, setAcceptedChains] = React.useState<string[]>(['base', 'solana'])
  const [acceptedTokens, setAcceptedTokens] = React.useState<string[]>(['USDC', 'USDT', 'EURC'])
  const [orderNumber, setOrderNumber] = React.useState(() => `WC-${Math.floor(4000 + Math.random() * 5000)}`)
  const [charge, setCharge] = React.useState<ChargeSummary | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [exchanges, setExchanges] = React.useState<ApiExchange[]>([])

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

  const completeOrder = async () => {
    if (!merchantExternalId) {
      setError('Select a live merchant first.')
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
      description: `${merchantName} Store Order #${nextOrder}`,
      orderMetadata: {
        orderId: nextOrder,
        source: 'store_plugin',
        platform: 'woocommerce_shopify_demo',
      },
    }

    try {
      const created = await createCharge(body)
      setCharge(created)
      pushExchange({
        title: `Plugin created charge for Order #${nextOrder}`,
        method: 'POST',
        path: '/api/v1/psp/charges',
        status: 201,
        request: body,
        response: created,
      })
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      setError(msg)
      pushExchange({
        title: `Plugin charge failed for Order #${nextOrder}`,
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
    <DemoPerspectiveShell
      accentColor="#4F46E5"
      appName={`${merchantName} Store`}
      navLabel="Store Plugin"
      merchantName={merchantName}
      pspName={`Plugin by ${pspName}`}
      ribbon={
        <>
          <strong className="text-white">Store Plugin Demo:</strong> {merchantName} installed{' '}
          <strong className="text-white">{pspName}'s</strong> plugin on their online store. Shoppers pick{' '}
          <strong className="text-white">Pay with Orki</strong> at checkout and orders mark Paid automatically.
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
      behindDescription="Calls made by the store plugin backend when the shopper selects Pay with Orki."
    >
      {error && <div className="mb-4"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>}

      {/* Role Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setTab('checkout')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              tab === 'checkout' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            1. Shopper Checkout
          </button>
          <button
            type="button"
            onClick={() => setTab('settings')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              tab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            2. Store Admin (Plugin Settings)
          </button>
        </div>

        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
          <Plug className="w-3.5 h-3.5 text-indigo-600" />
          Plugin status:{' '}
          <strong className={pluginEnabled ? 'text-emerald-700' : 'text-slate-400'}>
            {pluginEnabled ? 'Enabled' : 'Disabled'}
          </strong>
        </span>
      </div>

      {tab === 'settings' ? (
        <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">{pspName} Payments Plugin (v2.4)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Zero-code plugin installed on {merchantName}'s store. Enable Orki to show crypto checkout alongside cards.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Connected
            </span>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 cursor-pointer">
            <div>
              <div className="text-xs font-bold text-slate-900">Enable "Pay with Orki" at checkout</div>
              <div className="text-[11px] text-slate-500">
                Allows shoppers to pay in stablecoins &amp; crypto while you settle automatically.
              </div>
            </div>
            <input
              type="checkbox"
              checked={pluginEnabled}
              onChange={(e) => setPluginEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
          </label>

          <div className="rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="text-xs font-bold text-slate-800">Synced Acceptance Rules (from {pspName})</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-indigo-50 px-2.5 py-1 font-medium text-indigo-800">
                Networks: {acceptedChains.map((c) => c.toUpperCase()).join(', ')}
              </span>
              <span className="rounded-md bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800">
                Tokens: {acceptedTokens.map((t) => t.toUpperCase()).join(', ')}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_360px] gap-6 items-start">
          {/* Left: Store Checkout */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Checkout</h2>
                <p className="text-xs text-slate-500">Customer: Alex Morgan · alex@customer.example</p>
              </div>
              <span className="text-xs font-medium text-slate-500">Order #{orderNumber}</span>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Payment Method</h3>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 opacity-55">
                <div>
                  <div className="text-xs font-bold text-slate-800">Credit or Debit Card</div>
                  <div className="text-[11px] text-slate-500">Visa, Mastercard, Amex (disabled in demo)</div>
                </div>
                <input type="radio" disabled name="pm" />
              </div>

              <div className={`rounded-xl border p-4 space-y-2 ${pluginEnabled ? 'border-indigo-500 bg-indigo-50/40' : 'border-slate-200 opacity-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Pay with Orki</div>
                    <div className="text-[11px] text-slate-600">
                      Pay instantly with {acceptedTokens.join(', ')} on {acceptedChains.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(' & ')}.
                    </div>
                  </div>
                  <input type="radio" checked={pluginEnabled} readOnly name="pm" className="text-indigo-600" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-indigo-700 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Powered by {pspName} Plugin — order status updates automatically upon confirmation.
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={busy || !pluginEnabled || !merchantExternalId}
              onClick={() => void completeOrder()}
              className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-45 transition"
            >
              {busy ? 'Preparing Orki Checkout…' : 'Complete Order — $1.50'}
            </button>

            {charge && (
              <LiveQuoteAndStatusCard
                identifier={charge.chargeToken}
                amount={charge.amount}
                currency={charge.currency}
                checkoutUrl={charge.checkoutUrl}
                initialStatus={charge.status}
              />
            )}
          </div>

          {/* Right: Order Summary */}
          <aside className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">Order Summary</h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>1 × Harbour Roast Beans</span>
                <span className="font-semibold text-slate-900">$1.00</span>
              </div>
              <div className="flex justify-between">
                <span>Standard Shipping</span>
                <span className="font-semibold text-slate-900">$0.50</span>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-3 flex justify-between text-sm font-bold text-slate-900">
              <span>Total</span>
              <span>$1.50 USD</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
              Merchant effort: install and enable the plugin once. Your PSP handles pricing, multi-chain quotes, and webhook settlement.
            </p>
          </aside>
        </div>
      )}
    </DemoPerspectiveShell>
  )
}
