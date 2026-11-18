import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Building,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileCode2,
  Layers,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import type { Transaction } from '../../types'
import {
  fetchTransactionDetail,
  normalizeTransactionDetail,
  type TransactionDetail,
  type TransactionViewerRole,
} from '../../services/transactionService'

interface TransactionDetailPageProps {
  role: TransactionViewerRole
  transactions?: Transaction[]
}

const ROLE_META: Record<TransactionViewerRole, { backLabel: string; backPath: string; scopeLabel: string }> = {
  admin: {
    backLabel: 'Back to Admin Ledger',
    backPath: '/admin',
    scopeLabel: 'Orki Platform Ledger',
  },
  org: {
    backLabel: 'Back to PSP Portal',
    backPath: '/psp',
    scopeLabel: 'PSP Organization Ledger',
  },
  merchant: {
    backLabel: 'Back to Merchant Dashboard',
    backPath: '/merchant',
    scopeLabel: 'Merchant Settlement Ledger',
  },
}

const statusBadgeStyle = (status: string): string => {
  const s = status.toLowerCase()
  if (s === 'completed' || s === 'paid' || s === 'settled') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }
  if (s === 'failed' || s === 'expired' || s === 'cancelled') {
    return 'bg-red-50 text-red-700 border-red-200'
  }
  return 'bg-amber-50 text-amber-800 border-amber-200'
}

export const TransactionDetailPage: React.FC<TransactionDetailPageProps> = ({
  role,
  transactions = [],
}) => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const meta = ROLE_META[role]

  const stateFallback = (location.state as { transaction?: Partial<Transaction> } | null)?.transaction ?? null
  const storeFallback = useMemo(
    () => transactions.find((item) => item.id === id) ?? null,
    [transactions, id],
  )
  const fallbackTx = stateFallback || storeFallback

  const [detail, setDetail] = useState<TransactionDetail | null>(() =>
    fallbackTx ? normalizeTransactionDetail({}, fallbackTx) : null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [showRawJson, setShowRawJson] = useState(false)

  const loadDetail = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const live = await fetchTransactionDetail(role, id, fallbackTx)
      setDetail(live)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load full transaction details.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [id, role, fallbackTx])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  const handleCopy = (value: string, key: string) => {
    void navigator.clipboard.writeText(value)
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(null), 1800)
  }

  const CopyableValue: React.FC<{ value?: string | null; copyId: string; emptyLabel?: string }> = ({
    value,
    copyId,
    emptyLabel = 'Not recorded',
  }) => {
    if (!value) {
      return <span className="text-slate-400 italic font-normal">{emptyLabel}</span>
    }
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-slate-800 break-all">
        <span>{value}</span>
        <button
          type="button"
          onClick={() => handleCopy(value, copyId)}
          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 shrink-0"
          title="Copy value"
        >
          {copiedKey === copyId ? (
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </span>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(meta.backPath)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{meta.backLabel}</span>
            </button>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {meta.scopeLabel}
            </span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap pt-1">
            <h1 className="text-lg font-bold text-slate-900 font-mono tracking-tight">
              {detail?.id || id}
            </h1>
            {detail && (
              <>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${statusBadgeStyle(detail.status)}`}>
                  {detail.status}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold uppercase">
                  {detail.chain}
                </span>
                <span className="px-2 py-0.5 rounded bg-onion-50 text-onion-800 border border-onion-200 text-[11px] font-semibold capitalize">
                  {detail.type.replace(/_/g, ' ')}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void loadDetail()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Loading…' : 'Refresh'}</span>
          </button>
          {detail?.explorerUrl && (
            <a
              href={detail.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
            >
              <span>View On Explorer</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">
              {detail ? 'Showing cached summary while live backend detail lookup failed:' : 'Could not load transaction detail:'}
            </p>
            <p className="font-mono text-[11px]">{error}</p>
          </div>
        </div>
      )}

      {!detail && loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-500">
          Loading settlement record…
        </div>
      )}

      {!detail && !loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm font-bold text-slate-900">Transaction record unavailable</p>
          <p className="text-xs text-slate-500">No transaction matching `{id}` was returned for this account.</p>
          <button
            type="button"
            onClick={() => navigate(meta.backPath)}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            {meta.backLabel}
          </button>
        </div>
      )}

      {detail && (
        <>
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Gross Payment
              </span>
              <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                ${detail.grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
              </p>
              <p className="text-xs font-mono text-slate-500">{detail.currency}</p>
            </div>

            <div className="bg-white border border-emerald-200 rounded-2xl p-5 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                Merchant Net Settlement
              </span>
              <p className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
                ${detail.split.merchantNetAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
              </p>
              <p className="text-xs text-emerald-600">
                {detail.grossAmount > 0
                  ? `${((detail.split.merchantNetAmount / detail.grossAmount) * 100).toFixed(2)}% net share`
                  : 'Primary merchant share'}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-onion-700">
                PSP Commission ({(detail.split.pspMarkupBps / 100).toFixed(2)}%)
              </span>
              <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                ${detail.split.pspMarkupAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
              </p>
              <p className="text-xs font-mono text-slate-500">{detail.split.pspMarkupBps} bps</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Orki Protocol Fee ({(detail.split.orkiFeeBps / 100).toFixed(2)}%)
              </span>
              <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                ${detail.split.orkiFeeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
              </p>
              <p className="text-xs font-mono text-slate-500">{detail.split.orkiFeeBps} bps</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 cols: 3-Way Split & Payment Lifecycle Context */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-onion" />
                    <h2 className="text-sm font-bold text-slate-900">Tri-Wallet Atomic Settlement Split</h2>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 uppercase">{detail.chain}</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-emerald-900">1. Merchant Settlement Proceeds</span>
                      <span className="font-mono font-bold text-sm text-emerald-800">
                        ${detail.split.merchantNetAmount.toFixed(2)} {detail.currency}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-800 flex items-center gap-2 flex-wrap">
                      <span className="text-emerald-700 font-semibold">Destination Wallet:</span>
                      <CopyableValue
                        value={detail.split.merchantDestinationWallet}
                        copyId="merchant-wallet"
                        emptyLabel="Not resolved on ledger"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-onion-50/50 border border-onion-200 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-onion-900">
                        2. PSP Commission ({(detail.split.pspMarkupBps / 100).toFixed(2)}%)
                      </span>
                      <span className="font-mono font-bold text-sm text-onion-900">
                        ${detail.split.pspMarkupAmount.toFixed(2)} {detail.currency}
                      </span>
                    </div>
                    <div className="text-[11px] text-onion-800 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">Fee Wallet:</span>
                      <CopyableValue
                        value={detail.split.pspDestinationWallet}
                        copyId="psp-wallet"
                        emptyLabel="Not recorded"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">
                        3. Orki Protocol Vault ({(detail.split.orkiFeeBps / 100).toFixed(2)}%)
                      </span>
                      <span className="font-mono font-bold text-sm text-slate-900">
                        ${detail.split.orkiFeeAmount.toFixed(2)} {detail.currency}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">Vault Wallet:</span>
                      <CopyableValue
                        value={detail.split.orkiDestinationWallet}
                        copyId="orki-wallet"
                        emptyLabel="Platform fee vault"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Blockchain & Payment Attempt Proof */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Wallet className="w-4 h-4 text-slate-700" />
                  <h2 className="text-sm font-bold text-slate-900">On-Chain Execution & Payer Proof</h2>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 sm:col-span-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Transaction Hash</dt>
                    <dd>
                      <CopyableValue value={detail.txHash} copyId="tx-hash" emptyLabel="Pending / Off-chain simulated" />
                    </dd>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payer Address</dt>
                    <dd>
                      <CopyableValue value={detail.payerAddress} copyId="payer-address" emptyLabel="Not captured" />
                    </dd>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Settlement Chain & Asset</dt>
                    <dd className="font-mono font-bold text-slate-900 uppercase">
                      {detail.chain} · {detail.currency}
                    </dd>
                  </div>

                  {detail.paymentContext && (
                    <>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Linked Charge / Payment ID</dt>
                        <dd className="font-mono text-slate-800">
                          {detail.paymentContext.chargeToken || detail.paymentContext.paymentId || '—'}
                        </dd>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Source Network & Token</dt>
                        <dd className="font-mono text-slate-800 uppercase">
                          {detail.paymentContext.sourceNetwork || detail.chain} · {detail.paymentContext.sourceToken || detail.currency}
                        </dd>
                      </div>

                      {detail.paymentContext.description && (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 sm:col-span-2">
                          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payment Description</dt>
                          <dd className="text-slate-800">{detail.paymentContext.description}</dd>
                        </div>
                      )}

                      {detail.paymentContext.orderMetadata && (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 sm:col-span-2">
                          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Order Metadata</dt>
                          <dd className="font-mono text-[11px] text-slate-700 overflow-x-auto">
                            {JSON.stringify(detail.paymentContext.orderMetadata)}
                          </dd>
                        </div>
                      )}
                    </>
                  )}
                </dl>
              </div>
            </div>

            {/* Right column: Parties & Audit Timeline */}
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Building2 className="w-4 h-4 text-slate-700" />
                  <h2 className="text-sm font-bold text-slate-900">Parties & Tenant Scope</h2>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      <span>Merchant</span>
                    </span>
                    <p className="font-bold text-slate-900">{detail.merchantName || detail.merchantId}</p>
                    <p className="font-mono text-[11px] text-slate-500">{detail.merchantId}</p>
                    {role === 'admin' && detail.merchantId && (
                      <Link
                        to={`/admin/merchants/${encodeURIComponent(detail.merchantId)}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-onion hover:underline pt-1"
                      >
                        <span>Inspect Merchant</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                    {role === 'org' && detail.merchantId && (
                      <Link
                        to={`/psp/merchants/${encodeURIComponent(detail.merchantId)}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-onion hover:underline pt-1"
                      >
                        <span>Inspect Merchant</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>PSP Organization</span>
                    </span>
                    <p className="font-bold text-slate-900">{detail.organizationName || detail.organizationId}</p>
                    <p className="font-mono text-[11px] text-slate-500">{detail.organizationId}</p>
                    {role === 'admin' && detail.organizationId && (
                      <Link
                        to={`/admin/psps/${encodeURIComponent(detail.organizationId)}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-onion hover:underline pt-1"
                      >
                        <span>Inspect PSP Organization</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>

                  {detail.settlementMode && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Settlement Mode</span>
                      <span className="font-mono font-bold text-slate-800 uppercase text-[11px]">
                        {detail.settlementMode}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Clock className="w-4 h-4 text-slate-700" />
                  <h2 className="text-sm font-bold text-slate-900">Timestamps</h2>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Recorded At</span>
                    <span className="font-mono text-slate-800 text-right">
                      {detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '—'}
                    </span>
                  </div>
                  {detail.updatedAt && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Last Updated</span>
                      <span className="font-mono text-slate-800 text-right">
                        {new Date(detail.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {detail.paymentContext?.confirmedAt && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>On-Chain Confirmed</span>
                      </span>
                      <span className="font-mono text-slate-800 text-right">
                        {new Date(detail.paymentContext.confirmedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {detail.raw && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setShowRawJson((prev) => !prev)}
                    className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <FileCode2 className="w-4 h-4 text-slate-500" />
                      <span>Raw Ledger Payload</span>
                    </span>
                    <span className="text-[11px] font-semibold text-onion">
                      {showRawJson ? 'Hide' : 'Show'}
                    </span>
                  </button>
                  {showRawJson && (
                    <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[10px] font-mono overflow-x-auto max-h-80">
                      {JSON.stringify(detail.raw, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default TransactionDetailPage
