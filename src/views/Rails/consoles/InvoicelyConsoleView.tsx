import React from 'react'
import {
  FileText,
  CheckCircle2,
  ExternalLink,
  Copy,
  RefreshCw,
  XCircle,
  Building2,
  Calendar,
  Send,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  cancelCharge,
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

const ALL_TOKENS = ['USDC', 'USDT', 'EURC']
const ALL_CHAINS = [
  { id: 'base', label: 'Base' },
  { id: 'solana', label: 'Solana' },
]

function statusBadge(status: string) {
  switch (status) {
    case 'paid':
      return { label: 'Paid ✓', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
    case 'pending_confirmation':
    case 'payment_received':
      return { label: 'Payment Incoming', cls: 'bg-amber-100 text-amber-800 border-amber-300' }
    case 'cancelled':
      return { label: 'Void', cls: 'bg-slate-100 text-slate-500 border-slate-200' }
    case 'expired':
      return { label: 'Expired', cls: 'bg-rose-50 text-rose-600 border-rose-200' }
    default:
      return { label: 'Awaiting Payment', cls: 'bg-teal-50 text-teal-800 border-teal-200' }
  }
}

export const InvoicelyConsoleView: React.FC = () => {
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

  const [form, setForm] = React.useState({
    number: `INV-${Math.floor(2000 + Math.random() * 8000)}`,
    currency: 'USD',
    clientName: 'Acme International Corp',
    clientEmail: 'billing@acme-corp.example',
    description: 'Q4 Enterprise Cloud Infrastructure & Architecture Consulting',
    amount: '1.00',
    dueInDays: 14,
    expiresInMinutes: 60 * 24 * 14,
  })

  const [availableTokens, setAvailableTokens] = React.useState<string[]>(['USDC', 'USDT', 'EURC'])
  const [availableChains, setAvailableChains] = React.useState<string[]>(['base', 'solana'])
  const [acceptedTokens, setAcceptedTokens] = React.useState<string[]>(['USDC', 'USDT', 'EURC'])
  const [acceptedChains, setAcceptedChains] = React.useState<string[]>(['base', 'solana'])

  const [charges, setCharges] = React.useState<ChargeSummary[]>([])
  const [activeInvoice, setActiveInvoice] = React.useState<ChargeSummary | null>(null)
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
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

  const loadMerchantAcceptance = React.useCallback(async () => {
    if (!selectedMerchant?.id) return
    const path = `/api/v1/psp/merchants/${selectedMerchant.id}`
    try {
      const settings = await fetchMerchantSettings(selectedMerchant.id)
      const tokens =
        Array.isArray(settings.acceptedTokens) && settings.acceptedTokens.length > 0
          ? settings.acceptedTokens
          : ['USDC', 'USDT', 'EURC']
      const chains =
        Array.isArray(settings.acceptedChains) && settings.acceptedChains.length > 0
          ? settings.acceptedChains
          : ['base', 'solana']
      setAvailableTokens(tokens)
      setAvailableChains(chains)
      setAcceptedTokens(tokens)
      setAcceptedChains(chains)
      pushExchange({
        title: `Loaded merchant payment acceptance rules for ${selectedMerchant.legalBusinessName || merchantName}`,
        method: 'GET',
        path,
        status: 200,
        response: settings,
      })
    } catch {
      setAvailableTokens(ALL_TOKENS)
      setAvailableChains(ALL_CHAINS.map((c) => c.id))
    }
  }, [selectedMerchant?.id, selectedMerchant?.legalBusinessName, merchantName, pushExchange])

  const loadInvoices = React.useCallback(async () => {
    if (!merchantExternalId) {
      setCharges([])
      return
    }
    setLoading(true)
    setError(null)
    const path = `/api/v1/psp/charges?merchantExternalId=${encodeURIComponent(merchantExternalId)}`
    try {
      const page = await listCharges({ merchantExternalId })
      const list = page.data || []
      setCharges(list)
      if (list.length > 0 && !activeInvoice) {
        setActiveInvoice(list[0])
        setStep(list[0].status === 'paid' ? 4 : 2)
      }
      pushExchange({
        title: `Listed ${list.length} invoices`,
        method: 'GET',
        path,
        status: 200,
        response: { count: list.length },
      })
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      setError(msg)
      pushExchange({ title: 'List invoices failed', method: 'GET', path, error: msg })
    } finally {
      setLoading(false)
    }
  }, [merchantExternalId, activeInvoice, pushExchange])

  React.useEffect(() => {
    void loadMerchantAcceptance()
  }, [loadMerchantAcceptance])

  React.useEffect(() => {
    void loadInvoices()
  }, [loadInvoices])

  const toggleToken = (token: string) => {
    setAcceptedTokens((prev) =>
      prev.includes(token) ? prev.filter((t) => t !== token) : [...prev, token]
    )
  }

  const toggleChain = (chain: string) => {
    setAcceptedChains((prev) =>
      prev.includes(chain) ? prev.filter((c) => c !== chain) : [...prev, chain]
    )
  }

  const handleRaiseInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!merchantExternalId) {
      setError('Select a live merchant first.')
      return
    }
    if (acceptedTokens.length === 0 || acceptedChains.length === 0) {
      setError('Select at least one token and one network.')
      return
    }
    setBusy(true)
    setError(null)

    const now = new Date()
    const due = new Date(now.getTime() + form.dueInDays * 24 * 60 * 60 * 1000)
    const body = {
      merchantExternalId,
      amount: Number(form.amount).toFixed(2),
      currency: form.currency,
      description: form.description,
      expiresInMinutes: form.expiresInMinutes,
      acceptedTokens,
      acceptedChains,
      invoice: {
        number: form.number,
        issuedAt: now.toISOString(),
        dueAt: due.toISOString(),
        billTo: {
          name: form.clientName.trim() || 'Acme International Corp',
          email: form.clientEmail.trim() || 'billing@acme-corp.example',
        },
      },
    }

    try {
      const created = await createCharge(body)
      setActiveInvoice(created)
      setStep(2)
      setForm((prev) => ({ ...prev, number: `INV-${Math.floor(2000 + Math.random() * 8000)}` }))
      pushExchange({
        title: `Created B2B Invoice ${form.number}`,
        method: 'POST',
        path: '/api/v1/psp/charges',
        status: 201,
        request: body,
        response: created,
      })
      await loadInvoices()
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      setError(msg)
      pushExchange({
        title: `Failed to create invoice ${form.number}`,
        method: 'POST',
        path: '/api/v1/psp/charges',
        request: body,
        error: msg,
      })
    } finally {
      setBusy(false)
    }
  }

  const handleVoidInvoice = async (chargeToken: string) => {
    setBusy(true)
    setError(null)
    const path = `/api/v1/psp/charges/${chargeToken}`
    try {
      const res = await cancelCharge(chargeToken)
      if (activeInvoice?.chargeToken === chargeToken) {
        setActiveInvoice(res)
      }
      pushExchange({
        title: `Voided Invoice ${chargeToken}`,
        method: 'PATCH',
        path,
        status: 200,
        request: { status: 'cancelled' },
        response: res,
      })
      await loadInvoices()
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      setError(msg)
      pushExchange({ title: `Failed to void invoice ${chargeToken}`, method: 'PATCH', path, error: msg })
    } finally {
      setBusy(false)
    }
  }

  const handleCopyLink = (token: string, url: string) => {
    navigator.clipboard.writeText(url).catch(() => {})
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const resolvedCheckoutUrl = activeInvoice?.checkoutUrl
    ? resolveLocalCheckoutHref(activeInvoice.checkoutUrl)
    : ''

  return (
    <DemoPerspectiveShell
      useCaseKey="invoice"
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
          ? 'Merchant drafts invoice with payment terms and token restrictions'
          : step === 2
          ? 'Branded invoice generated with dedicated payment link and QR code'
          : step === 3
          ? 'Client reviews invoice details and examines live multi-chain quote'
          : 'Payment settled on-chain & invoice marked Paid ✓'
      }
    >
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.18fr_0.92fr] gap-6 items-start">
        {/* Left: Client Branded Invoice Document */}
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm overflow-hidden space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Client Perspective · Formal Invoice
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/60">
              B2B Client Portal
            </span>
          </div>

          {activeInvoice ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 space-y-6">
              {/* Invoice Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <div className="text-[11px] font-bold text-teal-700 uppercase tracking-widest">
                    Commercial Invoice
                  </div>
                  <h2 className="text-2xl font-bold font-serif text-slate-900 mt-1">
                    {activeInvoice.invoice?.number || activeInvoice.chargeToken}
                  </h2>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Issued by <strong>{merchantName}</strong></span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  {(() => {
                    const badge = statusBadge(activeInvoice.status)
                    return (
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    )
                  })()}
                  <div className="text-xs text-slate-500 mt-2 font-mono">
                    Token: {activeInvoice.chargeToken.slice(0, 14)}…
                  </div>
                </div>
              </div>

              {/* Bill To & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Billed To
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {form.clientName || 'Acme International Corp'}
                  </div>
                  <div className="text-slate-600">{form.clientEmail || 'billing@acme-corp.example'}</div>
                </div>
                <div className="space-y-1 sm:text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Payment Terms
                  </div>
                  <div className="font-semibold text-slate-900 flex items-center gap-1 sm:justify-end">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    <span>Net {form.dueInDays} Days</span>
                  </div>
                  <div className="text-slate-500">Settles to {merchantName}'s Wallet</div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-3.5 font-medium text-slate-800">
                        {activeInvoice.description || form.description}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900 font-mono">
                        ${activeInvoice.amount} {activeInvoice.currency}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200">
                    <tr>
                      <td className="px-4 py-3 text-slate-700">Total Due</td>
                      <td className="px-4 py-3 text-right text-base text-slate-900 font-mono">
                        ${activeInvoice.amount} {activeInvoice.currency}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Payment Actions & QR Scan */}
              {activeInvoice.status === 'open' ? (
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-teal-50/60 p-4 rounded-xl border border-teal-200/70">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-xl shadow-xs border border-teal-200">
                        {resolvedCheckoutUrl ? (
                          <QRCodeSVG value={resolvedCheckoutUrl} size={90} />
                        ) : (
                          <div className="w-[90px] h-[90px] bg-slate-100 rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                            QR Ready
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-teal-900">Scan to Pay Invoice</div>
                        <div className="text-[11px] text-teal-700 mt-0.5">
                          Direct wallet settlement on Base &amp; Solana
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      {resolvedCheckoutUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setStep(3)
                            window.open(resolvedCheckoutUrl, '_blank', 'noopener,noreferrer')
                          }}
                          className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <span>Pay Invoice Now</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {resolvedCheckoutUrl && (
                        <button
                          type="button"
                          onClick={() => handleCopyLink(activeInvoice.chargeToken, resolvedCheckoutUrl)}
                          className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-xs flex items-center justify-center gap-1 transition"
                        >
                          {copiedToken === activeInvoice.chargeToken ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {copiedToken === activeInvoice.chargeToken ? 'Link Copied!' : 'Copy Paylink'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleVoidInvoice(activeInvoice.chargeToken)}
                      disabled={busy}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Void this invoice</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-1">
                  <div className="text-sm font-bold text-emerald-900 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Invoice Fully Settled On-Chain
                  </div>
                  <p className="text-xs text-emerald-700">
                    Funds released directly into {merchantName}'s configured settlement address.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              No invoice selected. Draft a new invoice on the right to preview.
            </div>
          )}
        </div>

        {/* Right: Merchant Invoice Generator & Live Status Engine */}
        <div className="space-y-6">
          {/* New Invoice Form */}
          <form
            onSubmit={(e) => void handleRaiseInvoice(e)}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Create New Client Invoice
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {merchantName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Invoice Number
                </label>
                <input
                  required
                  value={form.number}
                  onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))}
                  className="w-full text-xs font-mono font-bold rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Amount (USD)
                </label>
                <input
                  required
                  type="number"
                  step="0.10"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full text-xs font-bold rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Client Name
                </label>
                <input
                  required
                  value={form.clientName}
                  onChange={(e) => setForm((p) => ({ ...p, clientName: e.target.value }))}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Client Email
                </label>
                <input
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => setForm((p) => ({ ...p, clientEmail: e.target.value }))}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Line Item Description
              </label>
              <input
                required
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Token & Network Guardrails */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Invoice Acceptance Guardrails
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[11px] text-slate-500 font-medium">Allowed Tokens:</span>
                {availableTokens.map((token) => (
                  <label key={token} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTokens.includes(token)}
                      onChange={() => toggleToken(token)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>{token}</span>
                  </label>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[11px] text-slate-500 font-medium">Networks:</span>
                {availableChains.map((chainId) => {
                  const chain = ALL_CHAINS.find((c) => c.id === chainId) || { id: chainId, label: chainId.toUpperCase() }
                  return (
                    <label key={chain.id} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedChains.includes(chain.id)}
                        onChange={() => toggleChain(chain.id)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span>{chain.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={busy || !merchantExternalId}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 hover:from-teal-800 hover:to-emerald-900 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
            >
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Issue Invoice &amp; Generate Payment Link</span>
            </button>
          </form>

          {/* Live Multi-Chain Quoting & Settlement Card */}
          <LiveQuoteAndStatusCard
            activeCharge={activeInvoice}
            onSettled={(updated: ChargeSummary) => {
              setActiveInvoice(updated)
              setStep(4)
              void loadInvoices()
            }}
          />

          {/* Recent Invoices Ledger */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Invoice Ledger ({charges.length})
              </h4>
              <button
                type="button"
                onClick={() => void loadInvoices()}
                disabled={loading}
                className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {charges.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center">
                No invoices found for this merchant.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {charges.map((charge) => {
                  const isCurrent = activeInvoice?.chargeToken === charge.chargeToken
                  const badge = statusBadge(charge.status)
                  return (
                    <div
                      key={charge.chargeToken}
                      onClick={() => {
                        setActiveInvoice(charge)
                        setStep(charge.status === 'paid' ? 4 : 2)
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                        isCurrent
                          ? 'border-teal-500 bg-teal-50/50 ring-1 ring-teal-500'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-bold text-slate-900 truncate">
                          {charge.invoice?.number || charge.chargeToken}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {charge.description || 'Invoice'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-slate-900 font-mono">
                          ${charge.amount} {charge.currency}
                        </div>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 border ${badge.cls}`}>
                          {badge.label}
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
