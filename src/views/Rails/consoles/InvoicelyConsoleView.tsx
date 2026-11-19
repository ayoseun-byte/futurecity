import React from 'react'
import { Check, Copy, ExternalLink, RefreshCw, XCircle } from 'lucide-react'
import {
  cancelCharge,
  createCharge,
  fetchMerchantSettings,
  listCharges,
  resolveLocalCheckoutHref,
} from '../../../services/pspConsoleService'
import type { ChargeSummary } from '../../../services/pspConsoleService'
import { ErrorBanner } from '../../../components/ui/StateBlocks'
import { DemoPerspectiveShell, useLivePspMerchant } from './DemoConsoleChrome'
import type { ApiExchange } from './DemoConsoleChrome'

const ALL_TOKENS = ['USDC', 'USDT', 'ETH', 'SOL']
const ALL_CHAINS: { id: string; label: string }[] = [
  { id: 'base', label: 'Base' },
  { id: 'solana', label: 'Solana' },
]

function statusDisplay(status: string): { label: string; cls: string } {
  switch (status) {
    case 'paid':
      return { label: 'Paid', cls: 'bg-emerald-100 text-emerald-800' }
    case 'pending_confirmation':
    case 'payment_received':
      return { label: 'Payment on its way', cls: 'bg-amber-100 text-amber-800' }
    case 'cancelled':
      return { label: 'Void', cls: 'bg-slate-200 text-slate-600' }
    case 'expired':
      return { label: 'Expired', cls: 'bg-slate-200 text-slate-600' }
    default:
      return { label: 'Awaiting payment', cls: 'bg-[#E6F1F0] text-[#0F5C5A]' }
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
    number: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    currency: 'usd',
    clientName: 'Acme GmbH',
    clientEmail: 'ap@acme.example',
    description: 'Brand refresh, phase 1',
    amount: '1.00',
    dueInDays: 14,
    expiresInMinutes: 60 * 24 * 7,
  })

  const [availableTokens, setAvailableTokens] = React.useState<string[]>(['USDC', 'USDT'])
  const [availableChains, setAvailableChains] = React.useState<string[]>(['base', 'solana'])
  const [acceptedTokens, setAcceptedTokens] = React.useState<string[]>(['USDC', 'USDT'])
  const [acceptedChains, setAcceptedChains] = React.useState<string[]>(['base', 'solana'])

  const [charges, setCharges] = React.useState<ChargeSummary[]>([])
  const [justSent, setJustSent] = React.useState<ChargeSummary | null>(null)
  const [pspPayModalCharge, setPspPayModalCharge] = React.useState<ChargeSummary | null>(null)
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
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

  const loadMerchantAcceptance = React.useCallback(async () => {
    if (!selectedMerchant?.id) return
    const path = `/api/v1/psp/merchants/${selectedMerchant.id}`
    try {
      const settings = await fetchMerchantSettings(selectedMerchant.id)
      const tokens = Array.isArray(settings.acceptedTokens) && settings.acceptedTokens.length > 0 ? settings.acceptedTokens : ['USDC', 'USDT']
      const chains = Array.isArray(settings.acceptedChains) && settings.acceptedChains.length > 0 ? settings.acceptedChains : ['base', 'solana']
      setAvailableTokens(tokens)
      setAvailableChains(chains)
      setAcceptedTokens(tokens)
      setAcceptedChains(chains)
      pushExchange({ title: "Read the merchant's payment settings", method: 'GET', path, status: 200, response: settings })
    } catch {
      setAvailableTokens(ALL_TOKENS)
      setAvailableChains(ALL_CHAINS.map((c) => c.id))
    }
  }, [selectedMerchant?.id, pushExchange])

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
      setCharges(page.data || [])
      pushExchange({ title: 'List invoices', method: 'GET', path, status: 200, response: { total: page.data?.length ?? 0 } })
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      setError(msg)
      pushExchange({ title: 'List invoices', method: 'GET', path, error: msg })
    } finally {
      setLoading(false)
    }
  }, [merchantExternalId, pushExchange])

  React.useEffect(() => {
    void loadMerchantAcceptance()
  }, [loadMerchantAcceptance])

  React.useEffect(() => {
    void loadInvoices()
  }, [loadInvoices])

  const toggleItem = (
    item: string,
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setSelected(selected.includes(item) ? selected.filter((v) => v !== item) : [...selected, item])
  }

  const raiseInvoice = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!merchantExternalId) {
      setError('Select a live merchant (or enter a merchantExternalId) first.')
      return
    }
    if (acceptedTokens.length === 0 || acceptedChains.length === 0) {
      setError('Tick at least one token and one network.')
      return
    }
    setBusy(true)
    setError(null)
    const now = new Date()
    const due = new Date(now.getTime() + form.dueInDays * 24 * 60 * 60 * 1000)
    const body = {
      merchantExternalId,
      amount: form.amount,
      currency: form.currency.toUpperCase(),
      description: form.description,
      expiresInMinutes: form.expiresInMinutes,
      acceptedTokens,
      acceptedChains,
      invoice: {
        number: form.number,
        issuedAt: now.toISOString(),
        dueAt: due.toISOString(),
        billTo: {
          name: form.clientName.trim() || 'Acme GmbH',
          email: form.clientEmail.trim() || 'ap@acme.example',
        },
      },
    }

    try {
      const created = await createCharge(body)
      setJustSent(created)
      setForm((prev) => ({ ...prev, number: `INV-${Math.floor(1000 + Math.random() * 9000)}` }))
      pushExchange({ title: `Create invoice ${form.number}`, method: 'POST', path: '/api/v1/psp/charges', status: 201, request: body, response: created })
      await loadInvoices()
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      setError(msg)
      pushExchange({ title: `Create invoice ${form.number}`, method: 'POST', path: '/api/v1/psp/charges', request: body, error: msg })
    } finally {
      setBusy(false)
    }
  }

  const voidInvoice = async (chargeToken: string) => {
    setBusy(true)
    setError(null)
    const path = `/api/v1/psp/charges/${chargeToken}`
    try {
      const res = await cancelCharge(chargeToken)
      pushExchange({ title: `Void invoice (${chargeToken})`, method: 'PATCH', path, status: 200, request: { status: 'cancelled' }, response: res })
      await loadInvoices()
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      setError(msg)
      pushExchange({ title: `Void invoice (${chargeToken})`, method: 'PATCH', path, error: msg })
    } finally {
      setBusy(false)
    }
  }

  const copyLink = async (token: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(token)
      setTimeout(() => setCopiedToken((curr) => (curr === token ? null : curr)), 1500)
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <>
      <DemoPerspectiveShell
        accentColor="#0F5C5A"
        appName="Invoicely"
        navLabel="Invoices"
        merchantName={merchantName}
        pspName={pspName}
        ribbon={
          <>
            You are <strong className="text-white">{merchantName}</strong>, a merchant using{' '}
            <strong className="text-white">Invoicely</strong> ({pspName}). Invoicely calls Orki behind the scenes.
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
        behindDescription="What Invoicely's server sent to Orki and what came back. The merchant never sees this; it is how Invoicely uses the Orki API."
      >
        <div className="mb-5">
          <h1 className="text-xl font-bold text-slate-900">Invoices</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Create an invoice, then send its payment link to your client. Your client can pay in crypto; you settle on your configured rails.
          </p>
        </div>

        {error && <div className="mb-4"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>}

        <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-6 items-start">
          {/* Left: New invoice form */}
          <form onSubmit={(e) => void raiseInvoice(e)} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3.5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">New invoice</h2>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-slate-700">
                Invoice number
                <input
                  required
                  value={form.number}
                  onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                />
              </label>
              <label className="block text-xs font-medium text-slate-700">
                Currency
                <select
                  value={form.currency}
                  onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                >
                  <option value="usd">USD</option>
                  <option value="aed">AED</option>
                  <option value="eur">EUR</option>
                  <option value="gbp">GBP</option>
                  <option value="usdc">USDC</option>
                </select>
              </label>
            </div>

            <label className="block text-xs font-medium text-slate-700">
              Client
              <input
                required
                value={form.clientName}
                onChange={(e) => setForm((p) => ({ ...p, clientName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </label>

            <label className="block text-xs font-medium text-slate-700">
              Client email <span className="font-normal text-slate-400">· Shown on the invoice</span>
              <input
                type="email"
                value={form.clientEmail}
                onChange={(e) => setForm((p) => ({ ...p, clientEmail: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </label>

            <label className="block text-xs font-medium text-slate-700">
              What it's for
              <input
                required
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
              />
            </label>

            <label className="block text-xs font-medium text-slate-700">
              Amount <span className="font-normal text-slate-400">· Keep small on testnet</span>
              <input
                required
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-slate-700">
                Due in
                <select
                  value={form.dueInDays}
                  onChange={(e) => setForm((p) => ({ ...p, dueInDays: Number(e.target.value) }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-700">
                Link expires
                <select
                  value={form.expiresInMinutes}
                  onChange={(e) => setForm((p) => ({ ...p, expiresInMinutes: Number(e.target.value) }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                >
                  <option value={60}>1 hour</option>
                  <option value={60 * 24}>24 hours</option>
                  <option value={60 * 24 * 7}>7 days</option>
                  <option value={60 * 24 * 30}>30 days</option>
                </select>
              </label>
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-2.5">
              <div>
                <div className="text-xs font-semibold text-slate-800">Accepted payments</div>
                <p className="text-[11px] text-slate-500">
                  Pre-ticked from {merchantName}'s settings. Untick to narrow what this invoice accepts.
                </p>
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-700 mb-1">Stablecoins and tokens</div>
                <div className="flex flex-wrap gap-3">
                  {(availableTokens.length > 0 ? availableTokens : ALL_TOKENS).map((token) => (
                    <label key={token} className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedTokens.includes(token)}
                        onChange={() => toggleItem(token, acceptedTokens, setAcceptedTokens)}
                        className="rounded border-slate-300 text-[#0F5C5A]"
                      />
                      {token}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-700 mb-1">Networks</div>
                <div className="flex flex-wrap gap-3">
                  {ALL_CHAINS.filter((c) => availableChains.includes(c.id) || availableChains.length === 0).map((chain) => (
                    <label key={chain.id} className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedChains.includes(chain.id)}
                        onChange={() => toggleItem(chain.id, acceptedChains, setAcceptedChains)}
                        className="rounded border-slate-300 text-[#0F5C5A]"
                      />
                      {chain.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy || !merchantExternalId}
              className="w-full rounded-lg bg-[#0F5C5A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0c4a48] disabled:opacity-50 transition"
            >
              {busy ? 'Creating invoice…' : 'Create invoice'}
            </button>
          </form>

          {/* Right: Sent callout + Sent invoices list */}
          <section className="space-y-4">
            {justSent && (
              <div className="rounded-xl border border-slate-200 border-l-4 border-l-[#0F5C5A] bg-white p-4 space-y-2 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-xs text-slate-900">
                    Invoice {justSent.invoice?.number || justSent.chargeToken} created — send this payment link to {form.clientName}:
                  </strong>
                  <button
                    type="button"
                    onClick={() => setPspPayModalCharge(justSent)}
                    className="rounded-lg bg-[#0F5C5A] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#0c4a48]"
                  >
                    Open Invoicely pay page
                  </button>
                </div>
                {justSent.checkoutUrl && (
                  <div className="flex items-center gap-2 rounded-lg bg-[#E6F1F0] px-3 py-1.5 text-xs">
                    <span className="font-mono text-[#0F5C5A] truncate flex-1">
                      {resolveLocalCheckoutHref(justSent.checkoutUrl)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void copyLink(justSent.chargeToken, resolveLocalCheckoutHref(justSent.checkoutUrl!))}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F5C5A] hover:underline"
                    >
                      {copiedToken === justSent.chargeToken ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedToken === justSent.chargeToken ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Sent invoices</h2>
              <button
                type="button"
                onClick={() => void loadInvoices()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-200">
              {charges.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-400">
                  {loading ? 'Loading invoices…' : 'No invoices yet for this merchant. Create one on the left.'}
                </p>
              ) : (
                charges.map((charge) => {
                  const badge = statusDisplay(charge.status)
                  const href = charge.checkoutUrl ? resolveLocalCheckoutHref(charge.checkoutUrl) : null
                  return (
                    <div key={charge.chargeToken} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-semibold text-slate-900">
                              {charge.invoice?.number || charge.chargeToken}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 truncate">
                            {charge.description || 'Invoice charge'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{charge.chargeToken}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-lg font-bold text-slate-900 font-mono">
                            {charge.amount} {charge.currency}
                          </div>
                        </div>
                      </div>

                      {href && charge.status === 'open' && (
                        <div className="flex items-center gap-2 rounded-lg bg-[#E6F1F0] px-2.5 py-1.5 text-[11px]">
                          <span className="font-mono text-[#0F5C5A] truncate flex-1">{href}</span>
                          <button
                            type="button"
                            onClick={() => void copyLink(charge.chargeToken, href)}
                            className="font-semibold text-[#0F5C5A] hover:underline shrink-0"
                          >
                            {copiedToken === charge.chargeToken ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-3 flex-wrap pt-0.5">
                        <button
                          type="button"
                          onClick={() => setPspPayModalCharge(charge)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Open pay page
                        </button>
                        {href && (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0F5C5A] hover:underline"
                          >
                            Direct Orki checkout
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {charge.status === 'open' && (
                          <button
                            type="button"
                            onClick={() => void voidInvoice(charge.chargeToken)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:underline ml-auto"
                          >
                            <XCircle className="w-3 h-3" />
                            Void
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>
      </DemoPerspectiveShell>

      {/* Invoicely Payment Page Modal (mirrors psp-payment-page.blade.php) */}
      {pspPayModalCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 flex items-center justify-between text-white" style={{ backgroundColor: '#0F5C5A' }}>
              <span className="font-bold text-sm">Invoicely · Secure payment</span>
              <button
                type="button"
                onClick={() => setPspPayModalCharge(null)}
                className="text-xs text-white/80 hover:text-white"
              >
                Close ✕
              </button>
            </div>

            <div className="p-5 space-y-5 bg-[#FAF9F6]">
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <h3 className="text-base font-bold text-slate-900">
                  Invoice {pspPayModalCharge.invoice?.number || pspPayModalCharge.chargeToken} from {merchantName}
                </h3>
                <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 gap-x-4 text-xs">
                  <dt className="text-slate-500">{pspPayModalCharge.description || 'Invoice payment'}</dt>
                  <dd className="text-right text-slate-700" />
                  <dt className="text-slate-500 border-t border-slate-200 pt-2 font-bold">Amount due</dt>
                  <dd className="text-right border-t border-slate-200 pt-2 font-bold text-slate-900 font-mono">
                    {pspPayModalCharge.amount} {pspPayModalCharge.currency}
                  </dd>
                </dl>
                {pspPayModalCharge.status !== 'open' && (
                  <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                    Status: <span className="font-semibold">{statusDisplay(pspPayModalCharge.status).label}</span>
                  </p>
                )}
              </div>

              {pspPayModalCharge.status === 'open' && (
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
                  <div className="flex items-center justify-between rounded-xl border border-[#0F5C5A]/30 bg-white p-3.5">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Pay with Orki</div>
                      <div className="text-[11px] text-slate-500">
                        Pay in crypto from your wallet. You go to Orki's page, then return here.
                      </div>
                    </div>
                    {pspPayModalCharge.checkoutUrl ? (
                      <a
                        href={resolveLocalCheckoutHref(pspPayModalCharge.checkoutUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F5C5A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0c4a48]"
                      >
                        Pay with Orki
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">No checkoutUrl</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
