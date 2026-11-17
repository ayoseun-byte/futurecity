import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  CheckCircle2,
  ExternalLink,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Trash2,
  X,
} from 'lucide-react'
import { getApiConfig, requestApi, saveApiConfig } from '../../services/apiConfig'
import { createCharge, resolveLocalCheckoutHref, type ChargeSummary } from '../../services/pspConsoleService'

interface StoreItem {
  id: string
  name: string
  subtitle: string
  priceUsd: number
  tag: string
  accent: string
}

const CATALOG: StoreItem[] = [
  {
    id: 'sticker-pack',
    name: 'Orki Developer Sticker Pack',
    subtitle: 'Matte vinyl 5-piece set for laptops',
    priceUsd: 0.5,
    tag: 'Digital / Merch',
    accent: 'from-violet-500/15 to-fuchsia-500/15 text-violet-700',
  },
  {
    id: 'espresso-shot',
    name: 'Single-Origin Espresso',
    subtitle: 'Double ristretto pulled fresh',
    priceUsd: 1.0,
    tag: 'Cafe',
    accent: 'from-amber-500/15 to-orange-500/15 text-amber-800',
  },
  {
    id: 'almond-croissant',
    name: 'Artisan Almond Croissant',
    subtitle: 'Twice-baked sourdough pastry',
    priceUsd: 2.5,
    tag: 'Bakery',
    accent: 'from-yellow-500/15 to-amber-500/15 text-amber-900',
  },
  {
    id: 'nitro-cold-brew',
    name: 'Nitro Cold Brew (350ml)',
    subtitle: 'Velvety micro-foam canned brew',
    priceUsd: 4.0,
    tag: 'Beverage',
    accent: 'from-sky-500/15 to-indigo-500/15 text-sky-800',
  },
  {
    id: 'coffee-beans',
    name: 'Ethiopia Yirgacheffe Beans (250g)',
    subtitle: 'Washed heirloom whole beans',
    priceUsd: 7.5,
    tag: 'Roastery',
    accent: 'from-emerald-500/15 to-teal-500/15 text-emerald-800',
  },
  {
    id: 'canvas-tote',
    name: 'Heavyweight Canvas Tote',
    subtitle: '14oz organic cotton carryall',
    priceUsd: 10.0,
    tag: 'Apparel',
    accent: 'from-rose-500/15 to-pink-500/15 text-rose-800',
  },
]

interface PspMerchantOption {
  id: string
  externalId: string
  legalBusinessName: string
  status: string
}

export const DemoStorefrontView: React.FC = () => {
  const { merchantExternalId: routeMerchantExt } = useParams<{ merchantExternalId?: string }>()
  const initialConfig = getApiConfig()

  const [pspKey, setPspKey] = useState(initialConfig.pspKey || '')
  const [merchantExternalId, setMerchantExternalId] = useState(routeMerchantExt || '')
  const [merchantOptions, setMerchantOptions] = useState<PspMerchantOption[]>([])
  const [currency, setCurrency] = useState<'USD' | 'USDC'>('USDC')
  const [checkoutMode, setCheckoutMode] = useState<'modal' | 'redirect'>('modal')

  const [cart, setCart] = useState<Record<string, number>>({ 'espresso-shot': 1 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeCharge, setActiveCharge] = useState<ChargeSummary | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [paidReceipt, setPaidReceipt] = useState<{
    chargeToken: string
    amount: string
    currency: string
    txHash?: string
  } | null>(null)

  // Fetch merchants for the entered PSP key so demo operator can pick an active merchant cleanly
  useEffect(() => {
    const trimmed = pspKey.trim()
    if (!trimmed) {
      setMerchantOptions([])
      return
    }
    let active = true
    const cfg = { ...getApiConfig(), pspKey: trimmed }
    requestApi<{
      data?: Array<{
        id: string
        externalId?: string
        external_id?: string
        legalBusinessName?: string
        legal_business_name?: string
        status?: string
      }>
    }>(cfg, 'GET', '/api/v1/psp/merchants', undefined, 'psp')
      .then((res) => {
        if (!active) return
        const rows = (res.data || []).map((m) => ({
          id: m.id,
          externalId: m.externalId || m.external_id || m.id,
          legalBusinessName: m.legalBusinessName || m.legal_business_name || m.id,
          status: (m.status || '').toLowerCase(),
        }))
        setMerchantOptions(rows)
        if (!merchantExternalId && rows.length > 0) {
          const activeRow = rows.find((r) => r.status === 'active') || rows[0]
          setMerchantExternalId(activeRow.externalId)
        }
      })
      .catch(() => {
        if (active) setMerchantOptions([])
      })
    return () => {
      active = false
    }
  }, [pspKey, merchantExternalId])

  // Listen for iframe postMessage events emitted by Orki PaymentFlow
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data.type !== 'string') return
      if (event.data.type === 'ORKI_PAYMENT_SUCCESS') {
        const txHash = event.data.payload?.tx_hash || event.data.payload?.txHash
        if (activeCharge) {
          setPaidReceipt({
            chargeToken: activeCharge.chargeToken,
            amount: activeCharge.amount,
            currency: activeCharge.currency,
            txHash,
          })
        }
        setModalOpen(false)
        setCart({})
      } else if (event.data.type === 'ORKI_CLOSE' || event.data.type === 'ORKI_PAYMENT_CANCEL') {
        setModalOpen(false)
      } else if (event.data.type === 'ORKI_PAYMENT_ERROR') {
        setError(event.data.payload?.message || 'Payment failed inside checkout.')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [activeCharge])

  const cartLines = CATALOG.filter((item) => (cart[item.id] || 0) > 0).map((item) => ({
    ...item,
    qty: cart[item.id] || 0,
    subtotal: Number((item.priceUsd * (cart[item.id] || 0)).toFixed(2)),
  }))

  const cartTotal = Number(
    cartLines.reduce((sum, line) => sum + line.subtotal, 0).toFixed(2),
  )

  const addToCart = (id: string, delta: number) => {
    setCart((prev) => {
      const nextQty = Math.max(0, (prev[id] || 0) + delta)
      if (nextQty === 0) {
        const copy = { ...prev }
        delete copy[id]
        return copy
      }
      return { ...prev, [id]: nextQty }
    })
  }

  const handleCheckout = async () => {
    setError(null)
    setPaidReceipt(null)

    if (!pspKey.trim()) {
      setError('Enter or load a PSP API Key in the Store Config bar above first.')
      return
    }
    if (!merchantExternalId.trim()) {
      setError('Enter or select an active Merchant External ID.')
      return
    }
    if (cartTotal <= 0) {
      setError('Add at least one item to your cart.')
      return
    }

    setBusy(true)
    try {
      const config = { ...getApiConfig(), pspKey: pspKey.trim() }
      saveApiConfig(config)

      const orderId = `STORE-${Date.now().toString(36).toUpperCase()}`
      const description = cartLines.map((l) => `${l.qty}x ${l.name}`).join(', ')

      const charge = await createCharge(
        {
          merchantExternalId: merchantExternalId.trim(),
          amount: cartTotal.toFixed(2),
          currency,
          description: description.slice(0, 180),
          orderMetadata: {
            orderId,
            source: 'orki-demo-storefront',
            items: cartLines.map((l) => ({
              id: l.id,
              name: l.name,
              qty: l.qty,
              unitPrice: l.priceUsd,
            })),
          },
          returnUrl: `${window.location.origin}/store?paid=1`,
          cancelUrl: `${window.location.origin}/store?cancelled=1`,
        },
        config,
      )

      setActiveCharge(charge)

      const targetUrl = resolveLocalCheckoutHref(
        charge.checkoutUrl || `/charge/${charge.chargeToken}`,
      )

      if (checkoutMode === 'redirect') {
        window.open(targetUrl, '_blank', 'noopener,noreferrer')
      } else {
        setModalOpen(true)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create PSP charge.')
    } finally {
      setBusy(false)
    }
  }

  const modalSrc = activeCharge
    ? resolveLocalCheckoutHref(activeCharge.checkoutUrl || `/charge/${activeCharge.chargeToken}`)
    : ''

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Top Storefront Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <span>Corner Shop Goods</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-onion-50 text-onion-800 border border-onion-200">
                  PSP Storefront Demo
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Micro-price testnet store ($0.50 – $10.00) · Powered by Orki EVM &amp; Solana Splits
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <Link
              to="/psp"
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium"
            >
              PSP Portal
            </Link>
            <Link
              to="/merchant"
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium"
            >
              Merchant Portal
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* PSP & Merchant Binding Bar */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Store className="w-4 h-4 text-onion-700" />
              <span>Storefront PSP &amp; Merchant Binding</span>
            </div>
            <span className="text-[11px] text-slate-500">
              Creates live charges via <code className="font-mono text-slate-700">POST /api/v1/psp/charges</code>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                PSP API Key
              </label>
              <input
                type="password"
                placeholder="psp_test_... or sk_live_..."
                value={pspKey}
                onChange={(e) => setPspKey(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs focus:ring-2 focus:ring-onion-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Merchant External ID
              </label>
              {merchantOptions.length > 0 ? (
                <select
                  value={merchantExternalId}
                  onChange={(e) => setMerchantExternalId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:ring-2 focus:ring-onion-500/20 focus:outline-none"
                >
                  {merchantOptions.map((m) => (
                    <option key={m.id} value={m.externalId}>
                      {m.legalBusinessName} ({m.externalId}) · {m.status}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. XSQ-MERCH-1029"
                  value={merchantExternalId}
                  onChange={(e) => setMerchantExternalId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs focus:ring-2 focus:ring-onion-500/20 focus:outline-none"
                />
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Charge Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'USD' | 'USDC')}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
              >
                <option value="USDC">USDC (Stablecoin)</option>
                <option value="USD">USD (Fiat Priced → Crypto)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Checkout Experience
              </label>
              <select
                value={checkoutMode}
                onChange={(e) => setCheckoutMode(e.target.value as 'modal' | 'redirect')}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
              >
                <option value="modal">Embedded Checkout Modal (Iframe)</option>
                <option value="redirect">Hosted Page (New Tab Redirect)</option>
              </select>
            </div>
          </div>
        </section>

        {paidReceipt && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-start justify-between gap-4 text-xs text-emerald-900">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-sm">
                  Payment Settled: {paidReceipt.amount} {paidReceipt.currency}
                </div>
                <div className="font-mono text-[11px]">Charge: {paidReceipt.chargeToken}</div>
                {paidReceipt.txHash && (
                  <div className="font-mono text-[11px] break-all">Tx Hash: {paidReceipt.txHash}</div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPaidReceipt(null)}
              className="p-1 text-emerald-700 hover:text-emerald-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Store Grid + Cart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Catalog ($0.50 - $10.00) */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CATALOG.map((item) => {
              const qty = cart[item.id] || 0
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition"
                >
                  <div>
                    <div className={`h-24 rounded-xl bg-gradient-to-br ${item.accent} flex items-center justify-between px-4 mb-3`}>
                      <span className="text-[11px] font-bold uppercase tracking-wider">{item.tag}</span>
                      <span className="text-xl font-extrabold font-mono">${item.priceUsd.toFixed(2)}</span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900">{item.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{item.subtitle}</p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      ${item.priceUsd.toFixed(2)}
                    </span>

                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => addToCart(item.id, 1)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-1.5 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    ) : (
                      <div className="inline-flex items-center space-x-2 bg-slate-100 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => addToCart(item.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-mono text-xs font-bold">{qty}</span>
                        <button
                          type="button"
                          onClick={() => addToCart(item.id, 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Order Summary / Pay with Orki Card */}
          <aside className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 sticky top-24">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 font-bold text-sm text-slate-900">
                <ShoppingCart className="w-4 h-4 text-onion-700" />
                <span>Order Cart</span>
              </div>
              {cartLines.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart({})}
                  className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center space-x-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {cartLines.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Add items from $0.50 to $10.00 to test checkout.
              </p>
            ) : (
              <div className="space-y-2.5 text-xs">
                {cartLines.map((line) => (
                  <div key={line.id} className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-800">{line.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {line.qty} × ${line.priceUsd.toFixed(2)}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      ${line.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-sm font-extrabold">
              <span>Total Due</span>
              <span className="font-mono">
                {cartTotal.toFixed(2)} {currency}
              </span>
            </div>

            <button
              type="button"
              disabled={busy || cartTotal <= 0}
              onClick={() => void handleCheckout()}
              className="w-full py-3 px-4 rounded-xl bg-onion hover:bg-onion-700 text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{busy ? 'Creating Charge…' : `Pay ${cartTotal.toFixed(2)} ${currency} with Orki`}</span>
            </button>

            {activeCharge && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1.5">
                <div className="font-semibold text-slate-700">Latest Charge Created</div>
                <div className="font-mono text-slate-600 break-all">{activeCharge.chargeToken}</div>
                <a
                  href={resolveLocalCheckoutHref(
                    activeCharge.checkoutUrl || `/charge/${activeCharge.chargeToken}`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 text-onion-700 font-semibold hover:underline"
                >
                  <span>Open in New Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Embedded Checkout Iframe Modal */}
      {modalOpen && modalSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-onion-300" />
                <span className="font-bold">Orki Hosted Checkout</span>
                <span className="font-mono text-slate-400">{activeCharge?.chargeToken}</span>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <iframe
              src={modalSrc}
              title="Orki Storefront Checkout"
              className="w-full h-[640px] bg-white border-0"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        </div>
      )}
    </div>
  )
}
