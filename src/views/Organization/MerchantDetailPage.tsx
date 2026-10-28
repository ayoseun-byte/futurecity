import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import type { Merchant, Paylink, Transaction } from '../../types'
import { StatusBadge } from '../../components/StatusBadge'
import {
  ArrowLeft,
  Building,
  Wallet,
  ShieldAlert,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  Clock,
  FileCode,
  Search,
  UserCheck,
} from 'lucide-react'
import { getApiConfig, requestApi, saveApiConfig } from '../../services/apiConfig'

type PspMerchantTab = 'overview' | 'compliance' | 'wallets' | 'paylinks' | 'transactions' | 'sessions' | 'raw'

interface MerchantDetailPageProps {
  merchants: Merchant[]
  paylinks: Paylink[]
  transactions: Transaction[]
  onToggleStatus: (merchantId: string, newStatus: 'active' | 'disabled') => void | Promise<void>
}

export const MerchantDetailPage: React.FC<MerchantDetailPageProps> = ({
  merchants,
  paylinks: propPaylinks,
  transactions: propTransactions,
  onToggleStatus,
}) => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [statusBusy, setStatusBusy] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<PspMerchantTab>('overview')

  const merchant = merchants.find((m) => m.id === id)

  // Track active onboarding session state (prefilled from sessionStorage if present)
  const [sessionData, setSessionData] = useState<{
    clientSecret?: string
    setupUrl?: string | null
    expiresAt?: string
  } | null>(() => {
    if (!merchant) return null
    const cachedSecret = sessionStorage.getItem(`orki_merchant_session:${merchant.externalId}`)
    if (cachedSecret) {
      return {
        clientSecret: cachedSecret,
        setupUrl: `${window.location.origin}/setup#session=${encodeURIComponent(cachedSecret)}`,
      }
    }
    return null
  })
  const [sessionLoading, setSessionLoading] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [showSessionSecret, setShowSessionSecret] = useState(false)

  // Live Backend Overview Data
  const [backendDetail, setBackendDetail] = useState<Record<string, unknown> | null>(null)
  const [backendLoading, setBackendLoading] = useState(false)

  // Search filters
  const [paylinkSearch, setPaylinkSearch] = useState('')
  const [txSearch, setTxSearch] = useState('')

  useEffect(() => {
    if (!merchant) return
    const config = getApiConfig()
    if (!config.baseUrl || !config.pspKey) return

    let active = true
    setBackendLoading(true)
    requestApi<Record<string, unknown>>(
      config,
      'GET',
      `/api/v1/psp/merchants/${encodeURIComponent(merchant.id)}/overview`,
      undefined,
      'psp'
    )
      .then((data) => {
        if (active && data) setBackendDetail(data)
      })
      .catch(() => {
        // Fallback to show endpoint
        if (!active) return
        void requestApi<Record<string, unknown>>(
          config,
          'GET',
          `/api/v1/psp/merchants/${encodeURIComponent(merchant.id)}`,
          undefined,
          'psp'
        )
          .then((showData) => {
            if (active && showData) setBackendDetail(showData)
          })
          .catch(() => {})
      })
      .finally(() => {
        if (active) setBackendLoading(false)
      })

    return () => {
      active = false
    }
  }, [merchant?.id])

  if (!merchant) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Merchant Not Found</h2>
        <button
          onClick={() => navigate('/psp')}
          className="px-4 py-2 bg-onion text-white rounded-xl text-sm font-semibold"
        >
          Return to Merchants
        </button>
      </div>
    )
  }

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleGenerateOnboardingSession = async () => {
    setSessionLoading(true)
    setSessionError(null)
    try {
      const config = getApiConfig()
      if (!config.baseUrl || !config.pspKey) {
        throw new Error('Configure PSP Base URL and API Key in the API Workbench first.')
      }

      const res = await requestApi<{
        id: string
        clientSecret: string
        setupUrl?: string | null
        expiresAt?: string
      }>(
        config,
        'POST',
        `/api/v1/psp/merchants/${encodeURIComponent(merchant.id)}/onboarding-sessions`,
        { ttlMinutes: 60 },
        'psp'
      )

      const payload = {
        clientSecret: res.clientSecret,
        setupUrl: res.setupUrl || `${window.location.origin}/setup#session=${encodeURIComponent(res.clientSecret)}`,
        expiresAt: res.expiresAt,
      }

      setSessionData(payload)
      sessionStorage.setItem(`orki_merchant_session:${merchant.externalId}`, res.clientSecret)
      if (res.expiresAt) {
        sessionStorage.setItem(`orki_merchant_session_expiry:${merchant.externalId}`, res.expiresAt)
      }
      saveApiConfig({ ...config, merchantSession: res.clientSecret })
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Could not generate session token.')
    } finally {
      setSessionLoading(false)
    }
  }

  const merchantPaylinks = (
    (backendDetail?.paylinks as Array<Record<string, unknown>> | undefined) ||
    propPaylinks.filter((p) => p.merchantId === merchant.id)
  )

  const merchantTransactions = (
    (backendDetail?.recentTransactions as Array<Record<string, unknown>> | undefined) ||
    propTransactions.filter((t) => t.merchantId === merchant.id)
  )

  const onboardingSessions = (
    (backendDetail?.onboardingSessions as Array<Record<string, unknown>> | undefined) || []
  )

  const isMerchantActive = (merchant.status || '').toLowerCase() === 'active'
  const canToggleStatus =
    merchant.status === 'active' ||
    (merchant.status === 'disabled' && !!merchant.verifiedAt && !!merchant.activatedAt)

  const consentDetails = (backendDetail?.consentDetails as Record<string, unknown> | undefined) || (merchant as any).consentDetails

  const filteredPaylinks = merchantPaylinks.filter((p) => {
    const pAny = p as any
    const title = String(pAny.title || '').toLowerCase()
    const slug = String(pAny.slug || '').toLowerCase()
    return title.includes(paylinkSearch.toLowerCase()) || slug.includes(paylinkSearch.toLowerCase())
  })

  const filteredTransactions = merchantTransactions.filter((tx) => {
    const txAny = tx as any
    const hash = String(txAny.tx_hash || txAny.txHash || '').toLowerCase()
    const payer = String(txAny.payer_address || txAny.payerAddress || '').toLowerCase()
    return hash.includes(txSearch.toLowerCase()) || payer.includes(txSearch.toLowerCase())
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <Link to="/psp" className="hover:text-slate-900 transition flex items-center space-x-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>PSP Portal</span>
          </Link>
          <span>/</span>
          <Link to="/psp" className="hover:text-slate-900 transition font-medium">
            Merchants
          </Link>
          <span>/</span>
          <span className="font-bold text-slate-900 truncate max-w-xs">{merchant.legalBusinessName}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${backendLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {statusError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
          <span>{statusError}</span>
        </div>
      )}

      {/* Hero Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-6">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-onion-50 text-onion-800 border border-onion-200 flex items-center justify-center font-black text-2xl shrink-0 shadow-xs">
              {merchant.legalBusinessName.charAt(0)}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center space-x-3 flex-wrap gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {merchant.legalBusinessName}
                </h1>
                <StatusBadge status={merchant.status} />
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 font-mono">
                  {merchant.jurisdiction}
                </span>
                {isMerchantActive && !!merchant.verifiedAt && !!merchant.activatedAt ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                    Orki Rails Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200">
                    Rails Disabled
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono flex items-center space-x-3 flex-wrap gap-1">
                <span>ID: {merchant.id}</span>
                <span>·</span>
                <span>Ref: {merchant.externalId}</span>
                <span>·</span>
                <span>License: <strong>{merchant.tradeLicenseNumber}</strong></span>
                {merchant.nextStep && (
                  <>
                    <span>·</span>
                    <span className="text-onion font-bold">Step: {merchant.nextStep}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5 flex-wrap gap-2">
            <button
              onClick={handleGenerateOnboardingSession}
              disabled={sessionLoading}
              className="px-3.5 py-2 rounded-xl bg-onion text-white text-xs font-semibold hover:bg-onion-700 transition flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sessionLoading ? 'animate-spin' : ''}`} />
              <span>{sessionLoading ? 'Issuing…' : sessionData?.clientSecret ? 'Re-issue Session Key' : 'Generate Onboarding Session'}</span>
            </button>

            <button
              onClick={async () => {
                setStatusBusy(true)
                setStatusError(null)
                try {
                  await onToggleStatus(merchant.id, isMerchantActive ? 'disabled' : 'active')
                } catch (reason) {
                  setStatusError(reason instanceof Error ? reason.message : 'Merchant status could not be updated.')
                } finally {
                  setStatusBusy(false)
                }
              }}
              disabled={!canToggleStatus || statusBusy}
              title={canToggleStatus ? undefined : 'Merchant must complete Orki onboarding before activation.'}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border shadow-2xs disabled:cursor-not-allowed disabled:opacity-50 ${
                isMerchantActive
                  ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>
                {statusBusy ? 'Updating…' : isMerchantActive ? 'Disable Merchant' : 'Re-activate Merchant'}
              </span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Available Float Balance</span>
            <div className="text-2xl font-black text-slate-900">
              ${(merchant.balanceUsdc ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-xs font-bold text-slate-400 ml-1">USDC</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Settlement Mode: <strong>{merchant.settlementMode.replace('_', ' ')}</strong>
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Volume Settled</span>
            <div className="text-2xl font-black text-slate-900">
              ${(merchant.volumeUsdc || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-xs font-bold text-slate-400 ml-1">USDC</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Orki Protocol Fee: <strong>{merchant.orkiFeeBps ?? 100} bps</strong>
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PSP Markup Rate</span>
            <div className="text-2xl font-black text-indigo-700">
              {merchant.pspFeeBps ?? 0}
              <span className="text-xs font-bold text-indigo-500 ml-1">bps</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Disbursed to PSP vault on each transaction
            </p>
          </div>
        </div>
      </div>

      {sessionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <span>{sessionError}</span>
        </div>
      )}

      {/* Onboarding Credentials Box if available */}
      {sessionData?.clientSecret && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-onion" />
              Active Merchant Onboarding Session Secret (Single-Merchant API Key):
            </span>
            {sessionData.expiresAt && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-slate-400" />
                Expires: {new Date(sessionData.expiresAt).toLocaleTimeString()} ({new Date(sessionData.expiresAt).toLocaleDateString()})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showSessionSecret ? 'text' : 'password'}
                readOnly
                value={sessionData.clientSecret}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono text-slate-900 select-all pr-10 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowSessionSecret(!showSessionSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showSessionSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(sessionData.clientSecret!, 'secret')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0 shadow-xs"
            >
              {copiedField === 'secret' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedField === 'secret' ? 'Copied Key!' : 'Copy Key'}</span>
            </button>
            {sessionData.setupUrl && (
              <a
                href={sessionData.setupUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-onion text-white text-xs font-semibold hover:bg-onion-700 flex items-center gap-1.5 transition shrink-0 shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Launch Hosted Setup</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-4 overflow-x-auto pb-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Overview & Entity
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`py-2 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'compliance'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Compliance & Consent Dossier
          </button>
          <button
            onClick={() => setActiveTab('wallets')}
            className={`py-2 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'wallets'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Wallets & Passkeys
          </button>
          <button
            onClick={() => setActiveTab('paylinks')}
            className={`py-2 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'paylinks'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Paylinks ({merchantPaylinks.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Transactions ({merchantTransactions.length})
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-2 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'sessions'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Onboarding Sessions ({onboardingSessions.length})
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`py-2 px-3 border-b-2 transition whitespace-nowrap flex items-center space-x-1 ${
              activeTab === 'raw'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Raw Backend DB</span>
          </button>
        </nav>
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        {/* TAB 1: OVERVIEW & ENTITY */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Building className="w-4 h-4 text-onion" />
                <span>Corporate Registration</span>
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Legal Business Name</span>
                  <span className="font-bold text-slate-900">{merchant.legalBusinessName}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Trade License Number</span>
                  <span className="font-mono font-bold text-slate-800">{merchant.tradeLicenseNumber}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Operating Jurisdiction</span>
                  <span className="font-semibold text-slate-800">{merchant.jurisdiction}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Settlement Currency</span>
                  <span className="font-bold text-slate-900">USDC (Stablecoin)</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Registered On</span>
                  <span className="text-slate-700">{new Date(merchant.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Authorized Signatory</span>
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Signatory Representative</span>
                  <span className="font-bold text-slate-900">{merchant.representativeName || 'Not assigned'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Contact Email</span>
                  <span className="font-semibold text-slate-800">{merchant.representativeEmail}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">KYB Sumsub Status</span>
                  <span className={`font-bold ${merchant.verifiedAt ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {merchant.verifiedAt ? `Verified ${new Date(merchant.verifiedAt).toLocaleDateString()}` : 'Pending Verification'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COMPLIANCE & CONSENT DOSSIER */}
        {activeTab === 'compliance' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h2>Compliance Consent & Legal Audit Trail</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Terms Acceptance Audit</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Terms Version:</span>
                    <span className="font-mono text-slate-800 font-semibold">
                      v{String(consentDetails?.consentNoticeVersion || '1.0')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Consent Method:</span>
                    <span className="font-mono text-slate-800 font-semibold">
                      {String(consentDetails?.consentMethod || 'dashboard_acknowledgement')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Recorded Timestamp:</span>
                    <span className="text-slate-800">
                      {consentDetails?.consentRecordedAt
                        ? new Date(String(consentDetails.consentRecordedAt)).toLocaleString()
                        : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Signatory Client Environment</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Client IP Address:</span>
                    <span className="font-mono text-emerald-700 font-bold">
                      {String(consentDetails?.ipAddress || 'Not recorded')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">User Agent:</span>
                    <span className="font-mono text-slate-700 truncate max-w-xs">
                      {String(consentDetails?.userAgent || 'Browser WebKit')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WALLETS & PASSKEYS */}
        {activeTab === 'wallets' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-onion" />
                <span>Non-Custodial Account Topology</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Base EVM Smart Account (ZeroDev)</span>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="truncate">{merchant.baseWalletAddress || 'Not registered'}</span>
                    {merchant.baseWalletAddress && (
                      <button
                        onClick={() => handleCopy(merchant.baseWalletAddress!, 'base_addr')}
                        className="p-1 hover:text-slate-900 text-slate-400"
                      >
                        {copiedField === 'base_addr' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Solana Address (Web3Auth)</span>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="truncate">{merchant.solanaWalletAddress || 'Not registered'}</span>
                    {merchant.solanaWalletAddress && (
                      <button
                        onClick={() => handleCopy(merchant.solanaWalletAddress!, 'sol_addr')}
                        className="p-1 hover:text-slate-900 text-slate-400"
                      >
                        {copiedField === 'sol_addr' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Key className="w-4 h-4 text-emerald-600" />
                <span>Passkey Authentication & Settlement</span>
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">MFA Passkey Registered</span>
                  <span className={`font-bold ${merchant.passkeyRegisteredAt ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {merchant.passkeyRegisteredAt ? 'Registered' : 'Not Provisioned'}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Settlement Mode</span>
                  <span className="font-bold text-slate-900 uppercase">{merchant.settlementMode}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Orki Protocol Fee Rate</span>
                  <span className="font-bold text-emerald-700">{merchant.orkiFeeBps ?? 100} bps</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">PSP Markup Rate</span>
                  <span className="font-bold text-indigo-700">{merchant.pspFeeBps ?? 0} bps</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PAYLINKS */}
        {activeTab === 'paylinks' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Generated Paylinks</h3>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter paylinks…"
                  value={paylinkSearch}
                  onChange={(e) => setPaylinkSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            {filteredPaylinks.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No paylinks recorded for this merchant.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Slug</th>
                      <th className="py-2.5 px-3 font-mono">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Created</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPaylinks.map((link, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{String(link.title || 'Untitled')}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{String(link.slug || '')}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">${Number(link.amount || 0).toFixed(2)} USDC</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {String(link.status || 'ACTIVE').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {link.createdAt || (link as any).created_at ? new Date(String(link.createdAt || (link as any).created_at)).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <a
                            href={`/checkout/${link.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-onion hover:underline font-bold inline-flex items-center space-x-1"
                          >
                            <span>Open Checkout</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Settled Transactions</h3>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter transactions…"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No transactions settled yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">TX Hash</th>
                      <th className="py-2.5 px-3 font-mono">Gross (USDC)</th>
                      <th className="py-2.5 px-3 font-mono">PSP Markup</th>
                      <th className="py-2.5 px-3 font-mono">Merchant Net</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((tx, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {String((tx as any).tx_hash || (tx as any).txHash || '0x...').substring(0, 16)}…
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          ${Number((tx as any).gross_amount || (tx as any).grossAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-indigo-700">
                          ${Number((tx as any).psp_markup_amount || (tx as any).pspMarkupAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                          ${Number((tx as any).net_amount || (tx as any).netAmount || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {String(tx.status || 'completed').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {tx.createdAt || (tx as any).created_at ? new Date(String(tx.createdAt || (tx as any).created_at)).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: SESSIONS */}
        {activeTab === 'sessions' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Onboarding Sessions Ledger</h3>
            {onboardingSessions.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No active or historical onboarding sessions on record.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Session ID</th>
                      <th className="py-2.5 px-3">Client Secret</th>
                      <th className="py-2.5 px-3">Expires At</th>
                      <th className="py-2.5 px-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {onboardingSessions.map((s, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{String(s.id || '')}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{String(s.client_secret || s.secret || 'onb_sec_••••••••')}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono">
                          {s.expires_at ? new Date(String(s.expires_at)).toLocaleString() : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {s.created_at ? new Date(String(s.created_at)).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: RAW BACKEND DB RECORD */}
        {activeTab === 'raw' && (
          <div className="bg-slate-950 rounded-3xl p-6 border border-slate-800 text-slate-200 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Postgres Merchants Table Tuple Dump
                </h3>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(JSON.stringify(backendDetail?.rawRecord || backendDetail || merchant, null, 2), 'raw_dump')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                {copiedField === 'raw_dump' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{copiedField === 'raw_dump' ? 'Copied JSON!' : 'Copy Raw Record'}</span>
              </button>
            </div>
            <pre className="text-emerald-400 font-mono text-xs max-h-96 overflow-y-auto p-4 bg-black/60 rounded-2xl select-all leading-relaxed border border-slate-800/80">
              {JSON.stringify(backendDetail?.rawRecord || backendDetail || merchant, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
