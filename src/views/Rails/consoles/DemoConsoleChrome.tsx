import React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Store,
} from 'lucide-react'
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
import { DEMO_USE_CASES, type DemoUseCaseKey } from './demoTheme'

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
  const merchantName =
    selectedMerchant?.legalBusinessName ||
    (merchantExternalId ? `Merchant (${merchantExternalId})` : 'Corner Shop Goods')
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

export interface DemoPerspectiveShellProps {
  useCaseKey: DemoUseCaseKey
  merchantName: string
  pspName: string
  merchants: Merchant[]
  selectedMerchantId: string
  onSelectMerchant: (id: string) => void
  manualExternalId: string
  onManualExternalIdChange: (value: string) => void
  loadingMerchants: boolean
  onReloadMerchants: () => void
  exchanges: ApiExchange[]
  currentStep?: 1 | 2 | 3 | 4
  stepSubtitle?: string
  showTechnicalTrace?: boolean
  onToggleTechnicalTrace?: (next: boolean) => void
  children: React.ReactNode
  // Backwards compatibility props
  accentColor?: string
  appName?: string
  navLabel?: string
  ribbon?: React.ReactNode
  behindTitle?: string
  behindDescription?: string
}

export const DemoPerspectiveShell: React.FC<DemoPerspectiveShellProps> = ({
  useCaseKey,
  merchantName,
  pspName,
  merchants,
  selectedMerchantId,
  onSelectMerchant,
  manualExternalId,
  onManualExternalIdChange,
  loadingMerchants,
  onReloadMerchants,
  exchanges,
  currentStep = 1,
  stepSubtitle,
  showTechnicalTrace,
  onToggleTechnicalTrace,
  children,
  behindTitle = 'Technical Trace (Live API & Webhooks)',
  behindDescription = 'Raw HTTP exchanges between the merchant, PSP, and Orki chain contracts. Collapsed by default during executive demonstrations.',
}) => {
  const [internalTrace, setInternalTrace] = React.useState(false)
  const traceVisible = showTechnicalTrace ?? internalTrace
  const setTraceVisible = onToggleTechnicalTrace ?? setInternalTrace

  const meta = DEMO_USE_CASES[useCaseKey] || DEMO_USE_CASES.hosted

  const stepLabels = [
    { num: 1, label: 'Initiate' },
    { num: 2, label: 'Charge Ready' },
    { num: 3, label: 'Shopper Paying' },
    { num: 4, label: 'Settled & Paid' },
  ]

  return (
    <div className="space-y-5">
      {/* Top Bar: Nav + Live Merchant Switcher + Technical Trace Toggle */}
      <div className="rounded-2xl border border-slate-200 bg-slate-900 text-slate-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/psp/rails"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white shrink-0 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            All 6 Use Cases
          </Link>
          <span className="h-4 w-px bg-slate-700 shrink-0" />
          <span className="text-xs text-slate-300 truncate">
            Demo: <strong className="text-white">{meta.title}</strong> · Connected to <strong className="text-white">{pspName}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1">
            <Store className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-400 font-medium">Merchant:</span>
            {merchants.length > 0 ? (
              <select
                aria-label="Live merchant"
                value={selectedMerchantId}
                onChange={(e) => onSelectMerchant(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                {merchants.map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-900 text-white">
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
                className="w-36 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
            )}
            <button
              type="button"
              onClick={onReloadMerchants}
              title="Refresh live merchants"
              className="p-0.5 text-slate-400 hover:text-white transition"
            >
              <RefreshCw className={`w-3 h-3 ${loadingMerchants ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setTraceVisible(!traceVisible)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition shadow-sm ${
              traceVisible
                ? 'border-emerald-500/80 bg-emerald-500/20 text-emerald-200'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Technical Trace: <strong className={traceVisible ? 'text-emerald-400' : 'text-slate-400'}>{traceVisible ? 'ON' : 'OFF'}</strong>
          </button>
        </div>
      </div>

      {/* Vibrant Hero Banner */}
      <div className={`rounded-3xl bg-gradient-to-r ${meta.gradient} p-6 sm:p-7 text-white shadow-xl relative overflow-hidden`}>
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-bold uppercase tracking-wider text-white border border-white/20">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Use Case #{meta.number} · {meta.kicker}
            </span>
            <span className="text-xs text-white/80 font-medium bg-black/20 px-3 py-1 rounded-full border border-white/10">
              Merchant: <strong className="text-white">{merchantName}</strong>
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{meta.title}</h1>
            <p className="text-sm sm:text-base text-white/90 mt-1 max-w-3xl leading-relaxed font-medium">
              {meta.tagline}
            </p>
          </div>

          {/* Business Benefit Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {meta.chips.map((chip, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-xl bg-black/25 backdrop-blur-sm px-3 py-1.5 text-xs border border-white/15"
              >
                <span className="text-white/60 font-medium">{chip.label}:</span>
                <span className="text-white font-bold">{chip.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Automatic Live Step Progress Rail */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Live Transaction Progress
            </span>
          </div>
          {stepSubtitle && (
            <span className="text-xs text-slate-500 font-medium">
              {stepSubtitle}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
          {stepLabels.map((s) => {
            const isCompleted = currentStep > s.num
            const isCurrent = currentStep === s.num
            return (
              <div
                key={s.num}
                className={`rounded-xl p-3 border transition-all flex items-center gap-3 ${
                  isCompleted
                    ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950'
                    : isCurrent
                    ? 'border-indigo-400 bg-indigo-50/70 text-indigo-950 shadow-sm ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-slate-50/60 text-slate-400'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-200'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{s.label}</div>
                  <div className="text-[10px] uppercase tracking-wider opacity-70">
                    {isCompleted ? 'Done' : isCurrent ? 'Active' : 'Upcoming'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Demo Workspace Stage */}
      <div className="rounded-3xl border border-slate-200 bg-[#FAF9F6] p-5 sm:p-6 shadow-sm">
        {children}
      </div>

      {/* Technical Trace Slide-out / Collapsible Drawer */}
      {traceVisible && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-600" />
                {behindTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{behindDescription}</p>
            </div>
            <span className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {exchanges.length} events logged
            </span>
          </div>

          {exchanges.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              No API calls recorded in this session yet. Perform an action in the demo above to inspect live HTTP requests and signed responses.
            </p>
          ) : (
            <div className="space-y-2.5">
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
  symbol: string
  chainName: string
}

const DEFAULT_ASSETS: AssetOption[] = [
  { chain: 'base', token: 'usdc', symbol: 'USDC', chainName: 'Base', label: 'USDC on Base' },
  { chain: 'base', token: 'eurc', symbol: 'EURC', chainName: 'Base', label: 'EURC on Base' },
  { chain: 'solana', token: 'usdc', symbol: 'USDC', chainName: 'Solana', label: 'USDC on Solana' },
]

export interface LiveQuoteAndStatusCardProps {
  identifier?: string
  activeCharge?: ChargeSummary | null
  isCharge?: boolean
  amount?: string | null
  currency?: string
  checkoutUrl?: string | null
  initialStatus?: string
  onPaid?: (charge: ChargeSummary) => void
  onSettled?: (charge: ChargeSummary) => void
}

export const LiveQuoteAndStatusCard: React.FC<LiveQuoteAndStatusCardProps> = ({
  identifier,
  activeCharge,
  isCharge = true,
  amount,
  currency,
  checkoutUrl,
  initialStatus,
  onPaid,
  onSettled,
}) => {
  const targetIdentifier = identifier || activeCharge?.chargeToken || activeCharge?.paymentLinkId || ''
  const targetAmount = amount ?? activeCharge?.amount ?? '0.00'
  const targetCurrency = currency || activeCharge?.currency || 'USD'
  const targetCheckoutUrl = checkoutUrl ?? activeCharge?.checkoutUrl ?? null
  const targetInitialStatus = initialStatus || activeCharge?.status || 'open'

  const [assets, setAssets] = React.useState<AssetOption[]>(DEFAULT_ASSETS)
  const [selectedAsset, setSelectedAsset] = React.useState<AssetOption>(DEFAULT_ASSETS[0])
  const [quote, setQuote] = React.useState<PayQuoteResponse | null>(null)
  const [quoteLoading, setQuoteLoading] = React.useState(false)
  const [chargeState, setChargeState] = React.useState<ChargeSummary | null>(null)
  const [status, setStatus] = React.useState(targetInitialStatus)

  React.useEffect(() => {
    setStatus(targetInitialStatus)
  }, [targetInitialStatus, targetIdentifier])

  React.useEffect(() => {
    if (!targetIdentifier) return
    let active = true
    const loadAssets = async () => {
      try {
        const res = await fetchPayAssets(targetIdentifier)
        if (!active) return
        const list = Array.isArray(res.assets) ? res.assets : []
        if (list.length > 0) {
          const mapped: AssetOption[] = list
            .map((a) => {
              const chain = String(a.chain || a.network || 'base').toLowerCase()
              const token = String(a.symbol || a.token || 'usdc').toLowerCase()
              const chainName = chain.charAt(0).toUpperCase() + chain.slice(1)
              return {
                chain,
                token,
                symbol: token.toUpperCase(),
                chainName,
                label: `${token.toUpperCase()} on ${chainName}`,
              }
            })
            .filter((v, idx, arr) => arr.findIndex((x) => x.chain === v.chain && x.token === v.token) === idx)
          if (mapped.length > 0) {
            setAssets(mapped)
            setSelectedAsset(mapped[0])
          }
        }
      } catch {
        // Fallback options
      }
    }
    void loadAssets()
    return () => {
      active = false
    }
  }, [targetIdentifier])

  React.useEffect(() => {
    if (!targetIdentifier) return
    let active = true
    const loadQuote = async () => {
      setQuoteLoading(true)
      try {
        const q = await fetchPayQuote(targetIdentifier, selectedAsset.chain, selectedAsset.token)
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
  }, [targetIdentifier, selectedAsset])

  React.useEffect(() => {
    if (!targetIdentifier || !isCharge) return
    if (['paid', 'cancelled', 'expired'].includes(status)) return

    const timer = setInterval(async () => {
      try {
        const latest = await fetchCharge(targetIdentifier)
        setChargeState(latest)
        setStatus(latest.status)
        if (latest.status === 'paid') {
          if (onPaid) onPaid(latest)
          if (onSettled) onSettled(latest)
        }
      } catch {
        // Ignore transient poll errors
      }
    }, 3500)

    return () => clearInterval(timer)
  }, [targetIdentifier, isCharge, status, onPaid, onSettled])

  if (!targetIdentifier) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center space-y-2 shadow-xs">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
          <Sparkles className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Real-Time Quote &amp; Settlement Engine
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Initiate a payment or generate a link to preview multi-chain crypto conversion rates (Base &amp; Solana) and live settlement tracking.
        </p>
      </div>
    )
  }

  const isPaid = status === 'paid'
  const isConfirming = status === 'pending_confirmation' || status === 'payment_received'
  const cryptoAmount = quote?.cryptoAmount || quote?.tokenAmount || quote?.amount || targetAmount || '1.00'
  const href = targetCheckoutUrl ? resolveLocalCheckoutHref(targetCheckoutUrl) : null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {isPaid ? (
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : isConfirming ? (
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 animate-pulse">
              <Clock className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
          )}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {isPaid ? 'Payment Confirmed & Settled' : isConfirming ? 'Confirming on Blockchain' : 'Live Multi-Chain Quote'}
            </h4>
            <p className="text-[11px] text-slate-500">
              {isPaid
                ? 'Funds reconciled to merchant wallet'
                : 'Customer selects preferred chain & token'}
            </p>
          </div>
        </div>

        <span
          className={`text-xs font-bold px-3 py-1 rounded-full ${
            isPaid
              ? 'bg-emerald-100 text-emerald-800'
              : isConfirming
              ? 'bg-amber-100 text-amber-800 animate-pulse'
              : 'bg-indigo-100 text-indigo-800'
          }`}
        >
          {isPaid ? 'Paid ✓' : isConfirming ? 'Confirming…' : 'Awaiting Payment'}
        </span>
      </div>

      {isPaid ? (
        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4 text-xs text-emerald-950 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-emerald-800">Gross Settled Amount:</span>
            <span className="font-bold text-sm font-mono text-emerald-950">
              {chargeState?.amount || targetAmount} {chargeState?.currency || targetCurrency}
            </span>
          </div>
          {chargeState?.chain && (
            <div className="flex items-center justify-between text-emerald-800">
              <span>Settlement Network:</span>
              <span className="font-bold uppercase">{chargeState.chain}</span>
            </div>
          )}
          {chargeState?.txHash && (
            <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between text-[11px]">
              <span className="text-emerald-700">Transaction Hash:</span>
              <span className="font-mono text-emerald-900 truncate max-w-[200px]">
                {chargeState.txHash}
              </span>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Multi-Chain & Token Selector Pills */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-600">Available Payment Rails:</div>
            <div className="flex flex-wrap gap-2">
              {assets.map((asset) => {
                const active = asset.chain === selectedAsset.chain && asset.token === selectedAsset.token
                const isSolana = asset.chain === 'solana'
                return (
                  <button
                    key={`${asset.chain}-${asset.token}`}
                    type="button"
                    onClick={() => setSelectedAsset(asset)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSolana ? 'bg-purple-400' : 'bg-sky-400'
                      }`}
                    />
                    {asset.symbol} on {asset.chainName}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Real-Time Conversion Box */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Customer Crypto Total:</div>
              <div className="text-lg font-black text-slate-900 font-mono tracking-tight">
                {quoteLoading ? (
                  <span className="text-slate-400 text-sm">Calculating quote…</span>
                ) : (
                  `${cryptoAmount} ${selectedAsset.symbol}`
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Network: <strong className="capitalize text-slate-700">{selectedAsset.chain}</strong>
                {quote?.exchangeRate || quote?.rate ? ` · Rate: 1 USD ≈ ${quote.exchangeRate || quote.rate} ${selectedAsset.symbol}` : ''}
              </div>
            </div>

            {href && (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm shrink-0"
              >
                Pay in Orki Checkout
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
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-100/70 transition"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {open ? (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-800 shrink-0">
            {exchange.method}
          </span>
          <span className="text-xs font-semibold text-slate-900 truncate">{exchange.title}</span>
          <span className="text-[11px] font-mono text-slate-500 truncate hidden sm:inline">{exchange.path}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {exchange.error ? (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700">Error</span>
          ) : (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              {exchange.status || '200 OK'}
            </span>
          )}
          <span className="text-[10px] font-mono text-slate-400">{exchange.timestamp}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-200 bg-slate-950 text-slate-100 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 text-[11px] font-mono">
          <div>
            <div className="text-slate-400 uppercase text-[10px] font-bold mb-1.5">Request Payload</div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all bg-slate-900 p-3 rounded-lg border border-slate-800">
              {exchange.request !== undefined ? JSON.stringify(exchange.request, null, 2) : '(empty body)'}
            </pre>
          </div>
          <div>
            <div className="text-slate-400 uppercase text-[10px] font-bold mb-1.5">
              {exchange.error ? 'Response Error' : 'Response Payload'}
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all bg-slate-900 p-3 rounded-lg border border-slate-800">
              {exchange.error ? exchange.error : JSON.stringify(exchange.response, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
