import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Code2, ExternalLink, RefreshCw, Sparkles, Store } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { fetchPspMerchants } from '../../../services/pspMerchantService'
import {
  fetchCharge,
  fetchPayAssets,
  fetchPayQuote,
  resolveLocalCheckoutHref,
} from '../../../services/pspConsoleService'
import type { ChargeSummary, PayQuoteResponse } from '../../../services/pspConsoleService'
import type { Merchant } from '../../../types'

export interface ApiExchange {
  id: string
  timestamp: string
  title: string
  method: string
  path: string
  status?: number | string
  request?: unknown
  response?: unknown
  error?: string
}

export function useLivePspMerchant() {
  const { user } = useAuth()
  const [merchants, setMerchants] = React.useState<Merchant[]>([])
  const [selectedMerchantId, setSelectedMerchantId] = React.useState<string>('')
  const [manualExternalId, setManualExternalId] = React.useState<string>('')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadMerchants = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = (await fetchPspMerchants(user?.organizationId || '')) || []
      setMerchants(list)
      if (list.length > 0) {
        setSelectedMerchantId((prev) => {
          if (prev && list.some((m) => m.id === prev)) return prev
          const active = list.find((m) => m.status === 'active') || list[0]
          return active.id
        })
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setLoading(false)
    }
  }, [user?.organizationId])

  React.useEffect(() => {
    void loadMerchants()
  }, [loadMerchants])

  const selectedMerchant = React.useMemo(
    () => merchants.find((m) => m.id === selectedMerchantId) || null,
    [merchants, selectedMerchantId],
  )

  const merchantExternalId = selectedMerchant?.externalId || selectedMerchant?.id || manualExternalId.trim()
  const merchantName = selectedMerchant?.legalBusinessName || (merchantExternalId ? `Merchant (${merchantExternalId})` : 'Corner Shop')
  const pspName = user?.name || 'Your PSP'

  return {
    user,
    pspName,
    merchants,
    selectedMerchant,
    selectedMerchantId,
    setSelectedMerchantId,
    manualExternalId,
    setManualExternalId,
    merchantExternalId,
    merchantName,
    loading,
    error,
    reload: loadMerchants,
  }
}

interface DemoPerspectiveShellProps {
  accentColor: string
  appName: string
  navLabel: string
  merchantName: string
  pspName: string
  ribbon: React.ReactNode
  merchants: Merchant[]
  selectedMerchantId: string
  onSelectMerchant: (id: string) => void
  manualExternalId: string
  onManualExternalIdChange: (value: string) => void
  loadingMerchants: boolean
  onReloadMerchants: () => void
  exchanges: ApiExchange[]
  behindTitle?: string
  behindDescription?: string
  showTechnicalTrace?: boolean
  onToggleTechnicalTrace?: (next: boolean) => void
  children: React.ReactNode
}

export const DemoPerspectiveShell: React.FC<DemoPerspectiveShellProps> = ({
  accentColor,
  appName,
  navLabel,
  merchantName,
  pspName,
  ribbon,
  merchants,
  selectedMerchantId,
  onSelectMerchant,
  manualExternalId,
  onManualExternalIdChange,
  loadingMerchants,
  onReloadMerchants,
  exchanges,
  behindTitle = 'Technical Trace (API & Webhooks)',
  behindDescription,
  showTechnicalTrace,
  onToggleTechnicalTrace,
  children,
}) => {
  const [internalTrace, setInternalTrace] = React.useState(false)
  const traceVisible = showTechnicalTrace ?? internalTrace
  const setTraceVisible = onToggleTechnicalTrace ?? setInternalTrace

  return (
    <div className="space-y-4">
      {/* Perspective Ribbon */}
      <div className="rounded-xl border border-slate-200 bg-slate-900 text-slate-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/psp/rails"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300 hover:text-white shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Demos
          </Link>
          <span className="h-3.5 w-px bg-slate-700 shrink-0" />
          <p className="text-xs leading-relaxed text-slate-200">{ribbon}</p>
        </div>

        {/* Live Merchant Switcher + Technical Trace Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <Store className="w-3.5 h-3.5 text-slate-400" />
          {merchants.length > 0 ? (
            <select
              aria-label="Live merchant"
              value={selectedMerchantId}
              onChange={(e) => onSelectMerchant(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/40"
            >
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.legalBusinessName}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={manualExternalId}
              onChange={(e) => onManualExternalIdChange(e.target.value)}
              placeholder={loadingMerchants ? 'Loading merchants...' : 'merchantExternalId'}
              className="w-44 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-white placeholder:text-slate-400 focus:outline-none"
            />
          )}
          <button
            type="button"
            onClick={onReloadMerchants}
            title="Refresh live merchants"
            className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <RefreshCw className={`w-3 h-3 ${loadingMerchants ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setTraceVisible(!traceVisible)}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
              traceVisible
                ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Code2 className="w-3 h-3" />
            Technical Trace: {traceVisible ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* Branded App Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div
          className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-white"
          style={{ backgroundColor: accentColor }}
        >
          <div className="flex items-center gap-4">
            <span className="text-base font-bold tracking-tight">{appName}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/15 font-medium">{navLabel}</span>
          </div>
          <div className="text-xs text-white/90 font-medium">
            {merchantName} <span className="opacity-60">·</span> {pspName}
          </div>
        </div>

        {/* Main App Content */}
        <div className="p-5 sm:p-6 bg-[#FAF9F6]">{children}</div>
      </div>

      {/* Optional Behind the scenes API Exchange Drawer (hidden by default for exec demos) */}
      {traceVisible && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{behindTitle}</h3>
            {behindDescription && <p className="text-xs text-slate-500 mt-0.5">{behindDescription}</p>}
          </div>

          {exchanges.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No API calls yet. Interact with the demo above to inspect live PSP requests and responses.</p>
          ) : (
            <div className="space-y-2">
              {exchanges.map((ex) => (
                <ExchangeRow key={ex.id} exchange={ex} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

interface AssetOption {
  chain: string
  token: string
  label: string
}

const DEFAULT_ASSETS: AssetOption[] = [
  { chain: 'base', token: 'usdc', label: 'USDC on Base' },
  { chain: 'base', token: 'eurc', label: 'EURC on Base' },
  { chain: 'solana', token: 'usdc', label: 'USDC on Solana' },
]

export const LiveQuoteAndStatusCard: React.FC<{
  identifier: string
  isCharge?: boolean
  amount?: string | null
  currency?: string
  checkoutUrl?: string | null
  initialStatus?: string
  onPaid?: (charge: ChargeSummary) => void
}> = ({ identifier, isCharge = true, amount, currency = 'USD', checkoutUrl, initialStatus = 'open', onPaid }) => {
  const [assets, setAssets] = React.useState<AssetOption[]>(DEFAULT_ASSETS)
  const [selectedAsset, setSelectedAsset] = React.useState<AssetOption>(DEFAULT_ASSETS[0])
  const [quote, setQuote] = React.useState<PayQuoteResponse | null>(null)
  const [quoteLoading, setQuoteLoading] = React.useState(false)
  const [chargeState, setChargeState] = React.useState<ChargeSummary | null>(null)
  const [status, setStatus] = React.useState(initialStatus)

  React.useEffect(() => {
    setStatus(initialStatus)
  }, [initialStatus, identifier])

  React.useEffect(() => {
    let active = true
    const loadAssets = async () => {
      try {
        const res = await fetchPayAssets(identifier)
        if (!active) return
        const list = Array.isArray(res.assets) ? res.assets : []
        if (list.length > 0) {
          const mapped: AssetOption[] = list
            .map((a) => {
              const chain = String(a.chain || a.network || 'base').toLowerCase()
              const token = String(a.symbol || a.token || 'usdc').toLowerCase()
              const chainLabel = chain.charAt(0).toUpperCase() + chain.slice(1)
              return { chain, token, label: `${token.toUpperCase()} on ${chainLabel}` }
            })
            .filter((v, idx, arr) => arr.findIndex((x) => x.chain === v.chain && x.token === v.token) === idx)
          if (mapped.length > 0) {
            setAssets(mapped)
            setSelectedAsset(mapped[0])
          }
        }
      } catch {
        // Keep fallback options
      }
    }
    void loadAssets()
    return () => {
      active = false
    }
  }, [identifier])

  React.useEffect(() => {
    let active = true
    const loadQuote = async () => {
      setQuoteLoading(true)
      try {
        const q = await fetchPayQuote(identifier, selectedAsset.chain, selectedAsset.token)
        if (active) setQuote(q)
      } catch {
        if (active) setQuote(null)
      } finally {
        if (active) setQuoteLoading(false)
      }
    }
    void loadQuote()
    return () => {
      active = false
    }
  }, [identifier, selectedAsset])

  React.useEffect(() => {
    if (!isCharge) return
    if (['paid', 'cancelled', 'expired'].includes(status)) return

    const timer = setInterval(async () => {
      try {
        const latest = await fetchCharge(identifier)
        setChargeState(latest)
        setStatus(latest.status)
        if (latest.status === 'paid' && onPaid) {
          onPaid(latest)
        }
      } catch {
        // ignore transient poll errors
      }
    }, 4000)

    return () => clearInterval(timer)
  }, [identifier, isCharge, status, onPaid])

  const isPaid = status === 'paid'
  const isConfirming = status === 'pending_confirmation' || status === 'payment_received'
  const cryptoAmount = quote?.cryptoAmount || quote?.tokenAmount || quote?.amount || amount || '—'
  const href = checkoutUrl ? resolveLocalCheckoutHref(checkoutUrl) : null

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
          {isPaid ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-800">Payment Confirmed &amp; Settled</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{isConfirming ? 'Confirming on-chain…' : 'Live Multi-Chain Quote'}</span>
            </>
          )}
        </div>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            isPaid
              ? 'bg-emerald-100 text-emerald-800'
              : isConfirming
              ? 'bg-amber-100 text-amber-800'
              : 'bg-sky-100 text-sky-800'
          }`}
        >
          {isPaid ? 'Paid' : isConfirming ? 'Confirming' : 'Awaiting Payment'}
        </span>
      </div>

      {isPaid ? (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 space-y-1">
          <div>
            Received <strong>{chargeState?.amount || amount} {chargeState?.currency || currency}</strong>
            {chargeState?.chain ? ` on ${chargeState.chain}` : ''}.
          </div>
          {chargeState?.txHash && (
            <div className="text-[11px] font-mono text-emerald-700 truncate">
              Tx: {chargeState.txHash}
            </div>
          )}
        </div>
      ) : (
        <>
          <div>
            <div className="text-[11px] text-slate-500 mb-1.5">Preview customer payment options across chains &amp; tokens:</div>
            <div className="flex flex-wrap gap-1.5">
              {assets.map((asset) => {
                const active = asset.chain === selectedAsset.chain && asset.token === selectedAsset.token
                return (
                  <button
                    key={`${asset.chain}-${asset.token}`}
                    type="button"
                    onClick={() => setSelectedAsset(asset)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {asset.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-slate-500">Customer pays</div>
              <div className="text-sm font-bold text-slate-900">
                {quoteLoading ? 'Fetching live quote…' : `${cryptoAmount} ${selectedAsset.token.toUpperCase()}`}
              </div>
              <div className="text-[11px] text-slate-500">
                Network: <span className="font-medium capitalize">{selectedAsset.chain}</span>
                {quote?.exchangeRate || quote?.rate ? ` · Rate: ${quote.exchangeRate || quote.rate}` : ''}
              </div>
            </div>
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 shrink-0"
              >
                Open Checkout
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const ExchangeRow: React.FC<{ exchange: ApiExchange }> = ({ exchange }) => {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-100/70 transition"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 shrink-0">
            {exchange.method}
          </span>
          <span className="text-xs font-medium text-slate-900 truncate">{exchange.title}</span>
          <span className="text-[11px] font-mono text-slate-500 truncate hidden sm:inline">{exchange.path}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {exchange.error ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">Error</span>
          ) : (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              {exchange.status || '200 OK'}
            </span>
          )}
          <span className="text-[10px] font-mono text-slate-400">{exchange.timestamp}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-200 bg-slate-900 text-slate-100 p-3.5 grid grid-cols-1 lg:grid-cols-2 gap-3 text-[11px] font-mono">
          <div>
            <div className="text-slate-400 uppercase text-[10px] mb-1">Request</div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all">
              {exchange.request !== undefined ? JSON.stringify(exchange.request, null, 2) : '(no body)'}
            </pre>
          </div>
          <div>
            <div className="text-slate-400 uppercase text-[10px] mb-1">{exchange.error ? 'Error' : 'Response'}</div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all">
              {exchange.error ? exchange.error : JSON.stringify(exchange.response, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
