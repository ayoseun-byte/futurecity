import React from 'react'
import { ExternalLink, RefreshCw, ShoppingBag } from 'lucide-react'
import {
  createCharge,
  createPaymentLink,
  listPaymentLinks,
  resolveLocalCheckoutHref,
} from '../../../services/pspConsoleService'
import type { PaymentLinkSummary } from '../../../services/pspConsoleService'
import { ErrorBanner } from '../../../components/ui/StateBlocks'
import { DemoPerspectiveShell, useLivePspMerchant } from './DemoConsoleChrome'
import type { ApiExchange } from './DemoConsoleChrome'

const SHOPLANE_PRODUCTS = [
  { sku: 'espresso', name: 'Harbour Roast Beans', detail: '250g whole bean, dark chocolate & hazelnut.', price: 1.0 },
  { sku: 'cup', name: 'Stoneware Espresso Cup', detail: 'Wheel-thrown speckled clay, 90ml.', price: 1.5 },
  { sku: 'tote', name: 'Waxed Canvas Tote', detail: 'Heavyweight 18oz cotton with internal pocket.', price: 2.0 },
]

const DROP_STOCK = 5

export const ShoplaneConsoleView: React.FC = () => {
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

  const [cart, setCart] = React.useState<Record<string, number>>({})
  const [shoplaneCheckoutOpen, setShoplaneCheckoutOpen] = React.useState(false)
  const [orderId, setOrderId] = React.useState(() => `SHOP-${Math.floor(1000 + Math.random() * 9000)}`)
  const [dropLink, setDropLink] = React.useState<PaymentLinkSummary | null>(null)
  const [dropCreating, setDropCreating] = React.useState(false)
  const [linksLoading, setLinksLoading] = React.useState(false)
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

  const loadDropLink = React.useCallback(async () => {
    if (!merchantExternalId) {
      setDropLink(null)
      return
    }
    setLinksLoading(true)
    const path = `/api/v1/psp/payment-links?merchantExternalId=${encodeURIComponent(merchantExternalId)}`
    try {
      const page = await listPaymentLinks({ merchantExternalId })
      const links = page.data || []
      const existingDrop =
        links.find((l) => l.description?.toLowerCase().includes('harbour at dawn')) || links[0] || null
      setDropLink(existingDrop)
      pushExchange({ title: 'Load store payment links', method: 'GET', path, status: 200, response: { count: links.length } })
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      pushExchange({ title: 'Load store payment links', method: 'GET', path, error: msg })
    } finally {
      setLinksLoading(false)
    }
  }, [merchantExternalId, pushExchange])

  React.useEffect(() => {
    void loadDropLink()
  }, [loadDropLink])

  const cartEntries = SHOPLANE_PRODUCTS.filter((p) => (cart[p.sku] || 0) > 0).map((p) => ({
    ...p,
    qty: cart[p.sku],
    lineTotal: (cart[p.sku] * p.price).toFixed(2),
  }))

  const cartTotal = cartEntries.reduce((sum, item) => sum + item.qty * item.price, 0).toFixed(2)

  const addToBasket = (sku: string) => {
    setCart((prev) => ({ ...prev, [sku]: (prev[sku] || 0) + 1 }))
  }

  const clearBasket = () => setCart({})

  const openShoplanePaymentPage = () => {
    setOrderId(`SHOP-${Math.floor(1000 + Math.random() * 9000)}`)
    setShoplaneCheckoutOpen(true)
  }

  const payWithOrkiOnShoplane = async () => {
    if (!merchantExternalId) {
      setError('Select a live merchant first.')
      return
    }
    setBusy(true)
    setError(null)
    const description = cartEntries.map((item) => `${item.qty} × ${item.name}`).join(', ')
    const body = {
      merchantExternalId,
      amount: cartTotal,
      currency: 'USD',
      description: `${merchantName} order ${orderId}: ${description}`,
      orderMetadata: {
        orderId,
        source: 'shoplane_hosted_payment_page',
        items: cartEntries.map((i) => ({ sku: i.sku, name: i.name, qty: i.qty, price: i.price })),
      },
    }

    try {
      const created = await createCharge(body)
      pushExchange({
        title: `Create a charge for order ${orderId}`,
        method: 'POST',
        path: '/api/v1/psp/charges',
        status: 201,
        request: body,
        response: created,
      })
      if (created.checkoutUrl) {
        window.open(resolveLocalCheckoutHref(created.checkoutUrl), '_blank', 'noopener,noreferrer')
      }
      setShoplaneCheckoutOpen(false)
      setCart({})
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      setError(msg)
      pushExchange({
        title: `Create a charge for order ${orderId}`,
        method: 'POST',
        path: '/api/v1/psp/charges',
        request: body,
        error: msg,
      })
    } finally {
      setBusy(false)
    }
  }

  const createLimitedDropLink = async () => {
    if (!merchantExternalId) {
      setError('Select a live merchant first.')
      return
    }
    setDropCreating(true)
    setError(null)
    const body = {
      merchantExternalId,
      pricing: 'fixed',
      amount: '1.00',
      currency: 'USD',
      description: 'Harbour at dawn — signed risograph print (limited 5)',
      salesLimitBy: 'items',
      salesLimitMax: DROP_STOCK,
    }
    try {
      const created = await createPaymentLink(body)
      setDropLink(created)
      pushExchange({
        title: "Create limited print's payment link",
        method: 'POST',
        path: '/api/v1/psp/payment-links',
        status: 201,
        request: body,
        response: created,
      })
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      setError(msg)
      pushExchange({
        title: "Create limited print's payment link",
        method: 'POST',
        path: '/api/v1/psp/payment-links',
        request: body,
        error: msg,
      })
    } finally {
      setDropCreating(false)
    }
  }

  const dropSoldOut = dropLink?.status === 'sold_out'

  return (
    <>
      <DemoPerspectiveShell
        accentColor="#7A3B1D"
        appName={merchantName}
        navLabel="Shop"
        merchantName={merchantName}
        pspName={`Powered by Shoplane · ${pspName}`}
        ribbon={
          <>
            You are a <strong className="text-white">shopper</strong> in <strong className="text-white">{merchantName}</strong>'s store,
            hosted by <strong className="text-white">Shoplane</strong> ({pspName}). Checkout takes you to Shoplane's payment page, where Pay with Orki is one option.
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
        behindDescription="Shoplane's server calls to Orki. Adding items to the basket calls nothing: an order's charge is created on Shoplane's payment page only when the shopper picks Pay with Orki. The limited print is a reusable payment link."
      >
        {error && <div className="mb-4"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_310px] gap-6 items-start">
          {/* Left: Product Grid + Limited Edition Drop */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-serif">Small things, made well</h1>
              <p className="text-xs text-slate-600 mt-1">
                Coffee, cups and canvas from {merchantName} by the harbour.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {SHOPLANE_PRODUCTS.map((product) => (
                <article
                  key={product.sku}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col shadow-sm"
                >
                  <div className="aspect-[4/3] bg-[#F6EEE8] grid place-items-center font-serif text-4xl font-bold text-[#7A3B1D]">
                    {product.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="p-3.5 flex flex-col flex-1 gap-1.5">
                    <strong className="text-sm text-slate-900">{product.name}</strong>
                    <span className="text-[11px] text-slate-500 leading-snug">{product.detail}</span>
                    <span className="text-sm font-bold text-slate-900 mt-auto pt-2">${product.price.toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => addToBasket(product.sku)}
                      className="mt-1.5 w-full rounded-lg bg-[#7A3B1D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#612d15] transition"
                    >
                      Add to basket
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* Limited Edition Drop */}
            <article className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 sm:grid-cols-[160px_minmax(0,1fr)] gap-4 items-center shadow-sm">
              <div className="aspect-[4/3] rounded-lg bg-[#F6EEE8] grid place-items-center font-serif text-lg font-bold text-[#7A3B1D] text-center p-3">
                Harbour
                <br />
                at dawn
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Limited edition</span>
                  <button
                    type="button"
                    onClick={() => void loadDropLink()}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
                  >
                    <RefreshCw className={`w-3 h-3 ${linksLoading ? 'animate-spin' : ''}`} />
                    Refresh stock
                  </button>
                </div>
                <div className="text-base font-bold text-slate-900">Harbour at dawn — signed risograph print</div>
                <p className="text-xs text-slate-500">
                  $1.00 each. One reusable payment link sells the whole edition of {DROP_STOCK}; it closes itself when the last print is bought.
                </p>

                {/* Stock Bar */}
                <div className="flex gap-1 py-1" aria-hidden="true">
                  {Array.from({ length: DROP_STOCK }, (_, idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 w-6 rounded-full ${dropSoldOut ? 'bg-slate-200' : 'bg-[#7A3B1D]'}`}
                    />
                  ))}
                </div>

                <div className="pt-1 flex items-center gap-3 flex-wrap">
                  {dropLink?.checkoutUrl ? (
                    <a
                      href={dropSoldOut ? '#' : resolveLocalCheckoutHref(dropLink.checkoutUrl)}
                      target={dropSoldOut ? undefined : '_blank'}
                      rel="noreferrer"
                      aria-disabled={dropSoldOut}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition ${
                        dropSoldOut ? 'bg-slate-300 pointer-events-none' : 'bg-[#7A3B1D] hover:bg-[#612d15]'
                      }`}
                    >
                      {dropSoldOut ? 'Sold out' : 'Buy a print'}
                      {!dropSoldOut && <ExternalLink className="w-3.5 h-3.5" />}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void createLimitedDropLink()}
                      disabled={dropCreating || !merchantExternalId}
                      className="rounded-lg bg-[#7A3B1D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#612d15] disabled:opacity-50"
                    >
                      {dropCreating ? 'Creating drop link…' : 'Create limited drop link (5 prints)'}
                    </button>
                  )}
                  {dropLink && (
                    <span className="text-[11px] font-mono text-slate-500">
                      Link {dropLink.id} · {dropLink.status}
                    </span>
                  )}
                </div>
              </div>
            </article>
          </div>

          {/* Right: Sticky Basket */}
          <aside className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 lg:sticky lg:top-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-[#7A3B1D]" />
                Basket
              </h2>
              {cartEntries.length > 0 && (
                <button type="button" onClick={clearBasket} className="text-[11px] text-slate-400 hover:text-slate-700">
                  Clear
                </button>
              )}
            </div>

            {cartEntries.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">Your basket is empty.</p>
            ) : (
              <div className="space-y-1.5">
                {cartEntries.map((item) => (
                  <div key={item.sku} className="flex justify-between gap-2 text-xs text-slate-700">
                    <span>
                      {item.qty} × {item.name}
                    </span>
                    <span className="font-mono">${item.lineTotal}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between font-bold text-sm border-t border-slate-200 pt-2.5 text-slate-900">
              <span>Total</span>
              <span className="font-mono">${cartTotal}</span>
            </div>

            <button
              type="button"
              disabled={cartEntries.length === 0 || !merchantExternalId}
              onClick={openShoplanePaymentPage}
              className="w-full rounded-lg bg-[#7A3B1D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#612d15] disabled:opacity-45 transition"
            >
              Checkout
            </button>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Shoplane's server works out the total from its own prices, then takes you to Shoplane's payment page. The browser cannot change what you are charged.
            </p>
          </aside>
        </div>
      </DemoPerspectiveShell>

      {/* Shoplane Hosted Payment Page Modal (mirrors psp-payment-page.blade.php) */}
      {shoplaneCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 flex items-center justify-between text-white" style={{ backgroundColor: '#7A3B1D' }}>
              <span className="font-bold text-sm">Shoplane · Secure payment</span>
              <button
                type="button"
                onClick={() => setShoplaneCheckoutOpen(false)}
                className="text-xs text-white/80 hover:text-white"
              >
                Back to store ✕
              </button>
            </div>

            <div className="p-5 space-y-5 bg-[#FAF9F6]">
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <h3 className="text-base font-bold text-slate-900">
                  Order {orderId} from {merchantName}
                </h3>
                <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 gap-x-4 text-xs">
                  {cartEntries.map((item) => (
                    <React.Fragment key={item.sku}>
                      <dt className="text-slate-500">
                        {item.qty} × {item.name}
                      </dt>
                      <dd className="text-right font-mono text-slate-700">${item.lineTotal}</dd>
                    </React.Fragment>
                  ))}
                  <dt className="text-slate-900 border-t border-slate-200 pt-2 font-bold">Total</dt>
                  <dd className="text-right border-t border-slate-200 pt-2 font-bold text-slate-900 font-mono">
                    ${cartTotal}
                  </dd>
                </dl>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Choose how to pay</h4>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 opacity-55">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Card</div>
                    <div className="text-[11px] text-slate-500">Visa, Mastercard. Not part of this demo.</div>
                  </div>
                  <button type="button" disabled className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500">
                    Pay by card
                  </button>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#7A3B1D]/30 bg-white p-3.5">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Pay with Orki</div>
                    <div className="text-[11px] text-slate-500">
                      Pay in crypto from your wallet. You go to Orki's page, then come back here.
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void payWithOrkiOnShoplane()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#7A3B1D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#612d15] disabled:opacity-50"
                  >
                    {busy ? 'Creating charge…' : 'Pay with Orki'}
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
