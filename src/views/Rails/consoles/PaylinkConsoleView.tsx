import React from 'react'
import {
  Link2,
  QrCode,
  Smartphone,
  Copy,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Store,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  createPaymentLink,
  listPaymentLinks,
  resolveLocalCheckoutHref,
  type PaymentLinkSummary,
} from '../../../services/pspConsoleService'
import { ErrorBanner } from '../../../components/ui/StateBlocks'
import {
  DemoPerspectiveShell,
  LiveQuoteAndStatusCard,
  useLivePspMerchant,
  type ApiExchange,
} from './DemoConsoleChrome'

interface PresetItem {
  id: string
  title: string
  price: string
  currency: string
  description: string
  stock: number
  tag: string
}

const PRESET_ITEMS: PresetItem[] = [
  {
    id: 'print',
    title: 'Harbour at Dawn — Signed Risograph Print',
    price: '1.00',
    currency: 'USD',
    description: 'Limited edition of 5 numbered risograph art prints on 300gsm Swedish Munken paper.',
    stock: 5,
    tag: 'Art & Collectibles',
  },
  {
    id: 'coffee',
    title: 'Single-Origin Ethiopian Yirgacheffe (250g)',
    price: '2.50',
    currency: 'USD',
    description: 'Washed process, notes of bergamot, jasmine, and citrus honey. Freshly roasted.',
    stock: 20,
    tag: 'Specialty Coffee',
  },
  {
    id: 'hoodie',
    title: 'Heavyweight Studio Hoodie (Dark Moss)',
    price: '5.00',
    currency: 'USD',
    description: '450gsm organic French terry cotton with embroidered crest. Unisex oversized cut.',
    stock: 10,
    tag: 'Limited Drop',
  },
]

export const PaylinkConsoleView: React.FC = () => {
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

  const [selectedPreset, setSelectedPreset] = React.useState<PresetItem>(PRESET_ITEMS[0])
  const [customPrice, setCustomPrice] = React.useState(PRESET_ITEMS[0].price)
  const [salesLimit, setSalesLimit] = React.useState<number>(PRESET_ITEMS[0].stock)
  const [paymentLinks, setPaymentLinks] = React.useState<PaymentLinkSummary[]>([])
  const [activeLink, setActiveLink] = React.useState<PaymentLinkSummary | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [loadingLinks, setLoadingLinks] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
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

  const loadLinks = React.useCallback(async () => {
    if (!merchantExternalId) return
    setLoadingLinks(true)
    const path = `/api/v1/psp/payment-links?merchantExternalId=${encodeURIComponent(merchantExternalId)}`
    try {
      const page = await listPaymentLinks({ merchantExternalId })
      const list = page.data || []
      setPaymentLinks(list)
      if (list.length > 0 && !activeLink) {
        setActiveLink(list[0])
        setStep(2)
      }
      pushExchange({
        title: `Loaded ${list.length} payment links for merchant`,
        method: 'GET',
        path,
        status: 200,
        response: { count: list.length },
      })
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      pushExchange({ title: 'Load payment links failed', method: 'GET', path, error: msg })
    } finally {
      setLoadingLinks(false)
    }
  }, [merchantExternalId, activeLink, pushExchange])

  React.useEffect(() => {
    void loadLinks()
  }, [loadLinks])

  const handleSelectPreset = (preset: PresetItem) => {
    setSelectedPreset(preset)
    setCustomPrice(preset.price)
    setSalesLimit(preset.stock)
  }

  const handleGenerateLink = async () => {
    if (!merchantExternalId) {
      setError('Select a live merchant first.')
      return
    }
    setBusy(true)
    setError(null)

    const body = {
      merchantExternalId,
      pricing: 'fixed',
      amount: Number(customPrice).toFixed(2),
      currency: selectedPreset.currency,
      description: `${selectedPreset.title} (${selectedPreset.tag})`,
      salesLimitBy: 'items',
      salesLimitMax: salesLimit,
    }

    try {
      const created = await createPaymentLink(body)
      setActiveLink(created)
      setStep(2)
      pushExchange({
        title: `Created payment link: ${selectedPreset.title}`,
        method: 'POST',
        path: '/api/v1/psp/payment-links',
        status: 201,
        request: body,
        response: created,
      })
      await loadLinks()
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      setError(msg)
      pushExchange({
        title: 'Failed to create payment link',
        method: 'POST',
        path: '/api/v1/psp/payment-links',
        request: body,
        error: msg,
      })
    } finally {
      setBusy(false)
    }
  }

  const resolvedUrl = activeLink?.checkoutUrl ? resolveLocalCheckoutHref(activeLink.checkoutUrl) : ''

  const handleCopyLink = () => {
    if (!resolvedUrl) return
    navigator.clipboard.writeText(resolvedUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenLink = () => {
    if (!resolvedUrl) return
    setStep(3)
    window.open(resolvedUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <DemoPerspectiveShell
      useCaseKey="paylink"
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
          ? 'Merchant configures product or drop and generates a reusable payment link'
          : step === 2
          ? 'Link & QR code ready to share via WhatsApp, Instagram DM, or printed flyer'
          : step === 3
          ? 'Shopper clicks link or scans QR to pay with crypto on Base / Solana'
          : 'Payment settled on-chain & inventory count updated!'
      }
    >
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.95fr] gap-6 items-start">
        {/* Left Column: Shopper Mobile Experience & QR Station */}
        <div className="space-y-6">
          {/* Mobile Experience Phone Shell */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Shopper Experience · Mobile & Chat
                </h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60">
                Direct Link / Chat Share
              </span>
            </div>

            {/* Simulated Chat Interface (WhatsApp / iMessage style) */}
            <div className="max-w-md mx-auto bg-slate-900 rounded-3xl p-4 shadow-xl border-4 border-slate-800">
              {/* Phone Header */}
              <div className="flex items-center justify-between px-3 py-2 text-white/80 text-xs border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center font-bold text-white text-sm">
                    {merchantName.charAt(0) || 'M'}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{merchantName}</div>
                    <div className="text-[10px] text-emerald-400">Verified Business</div>
                  </div>
                </div>
                <div className="text-[10px] text-white/60">Online</div>
              </div>

              {/* Chat Message Bubble from Merchant */}
              <div className="space-y-3">
                <div className="bg-slate-800 text-white text-xs p-3.5 rounded-2xl rounded-tl-sm border border-slate-700 space-y-2">
                  <p className="text-slate-300">
                    Hey! Here is your exclusive payment link for <strong className="text-white">{selectedPreset.title}</strong>:
                  </p>

                  {/* Rich Link Card inside Chat */}
                  <div className="rounded-xl bg-slate-950/80 p-3 border border-rose-500/30 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400">
                          {selectedPreset.tag}
                        </span>
                        <div className="text-sm font-bold text-white mt-0.5">{selectedPreset.title}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-extrabold text-emerald-400">${customPrice}</div>
                        <div className="text-[10px] text-slate-400">USD</div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {selectedPreset.description}
                    </p>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Instant Multi-Chain Crypto
                      </span>
                      {resolvedUrl ? (
                        <button
                          type="button"
                          onClick={handleOpenLink}
                          className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition flex items-center gap-1 shadow-sm active:scale-95"
                        >
                          <span>Pay Now</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Generate link first</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-center text-slate-500">
                  Secured by Orki · End-to-end On-Chain Settlement
                </div>
              </div>
            </div>

            {/* In-Person Countertop QR Card */}
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-5 bg-gradient-to-br from-rose-50/50 to-pink-50/30 p-5 rounded-2xl border border-rose-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-rose-200">
                  {resolvedUrl ? (
                    <QRCodeSVG value={resolvedUrl} size={110} />
                  ) : (
                    <div className="w-[110px] h-[110px] bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs text-center p-2">
                      Generate link to see QR
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 uppercase tracking-wide">
                    <QrCode className="w-4 h-4 text-rose-600" />
                    Physical Countertop / Table QR
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">Scan to Pay in Seconds</h4>
                  <p className="text-xs text-slate-600 mt-1 max-w-xs leading-relaxed">
                    Shoppers open their native camera or wallet app to pay on Solana or Base.
                  </p>
                </div>
              </div>

              {resolvedUrl && (
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-300 shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Link Copied!' : 'Copy Paylink'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenLink}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Checkout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Merchant Drop Controls & Live Multi-Chain Engine */}
        <div className="space-y-6">
          {/* Merchant Link Generator Panel */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Merchant Link Terminal
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {merchantName} · {pspName}
              </span>
            </div>

            {/* Preset Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Select Product / Campaign
              </label>
              <div className="grid grid-cols-1 gap-2">
                {PRESET_ITEMS.map((item) => {
                  const isSelected = selectedPreset.id === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectPreset(item)}
                      className={`text-left p-3 rounded-xl border transition flex items-center justify-between ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{item.title}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{item.tag}</span>
                          <span>•</span>
                          <span>Stock: {item.stock} items</span>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-slate-900">${item.price}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quick Price & Sales Limit */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Price (USD)
                </label>
                <input
                  type="number"
                  step="0.10"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full text-sm font-semibold rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Sales Limit (Items)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={salesLimit}
                  onChange={(e) => setSalesLimit(parseInt(e.target.value, 10) || 1)}
                  className="w-full text-sm font-semibold rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="button"
              onClick={() => void handleGenerateLink()}
              disabled={busy || !merchantExternalId}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 via-pink-600 to-rose-700 hover:from-rose-600 hover:to-rose-800 text-white font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
            >
              {busy ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              <span>Create Live Paylink</span>
            </button>
          </div>

          {/* Live Quote & Auto-Status Settlement Engine */}
          <LiveQuoteAndStatusCard
            activeCharge={
              activeLink
                ? {
                    chargeToken: activeLink.id,
                    amount: activeLink.amount || customPrice,
                    currency: activeLink.currency || 'USD',
                    description: activeLink.description,
                    status: activeLink.status,
                    checkoutUrl: activeLink.checkoutUrl,
                  }
                : null
            }
            onSettled={() => {
              setStep(4)
              void loadLinks()
            }}
          />

          {/* Active Links History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Live Paylinks for {merchantName}
              </h4>
              <button
                type="button"
                onClick={() => void loadLinks()}
                disabled={loadingLinks}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingLinks ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {paymentLinks.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-3 text-center">
                No paylinks created yet for this merchant. Click above to create one.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {paymentLinks.map((link) => {
                  const isActive = activeLink?.id === link.id
                  return (
                    <div
                      key={link.id}
                      onClick={() => {
                        setActiveLink(link)
                        setStep(2)
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                        isActive
                          ? 'border-rose-400 bg-rose-50/40 ring-1 ring-rose-400'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-bold text-slate-900 truncate">
                          {link.description || 'General Paylink'}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          ID: <span className="font-mono text-slate-600">{link.id}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-slate-900">
                          ${link.amount || '0.00'} {link.currency}
                        </div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-1 ${
                            link.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {link.status}
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
