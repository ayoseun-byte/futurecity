import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Merchant, Paylink, Transaction } from '../../types'
import { StatusBadge } from '../../components/StatusBadge'
import { MerchantFullDetailsModal } from '../../components/MerchantFullDetailsModal'
import {
  ArrowLeft,
  Building,
  Wallet,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Coins,
  ArrowRightLeft,
  FileText,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  Clock,
  FileCode,
} from 'lucide-react'
import { getApiConfig, requestApi, saveApiConfig } from '../../services/apiConfig'

interface MerchantDetailPageProps {
  merchants: Merchant[]
  paylinks: Paylink[]
  transactions: Transaction[]
  onToggleStatus: (merchantId: string, newStatus: 'active' | 'disabled') => void | Promise<void>
}

export const MerchantDetailPage: React.FC<MerchantDetailPageProps> = ({
  merchants,
  paylinks,
  transactions,
  onToggleStatus,
}) => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [statusBusy, setStatusBusy] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

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

  // Full Backend Details & Modal State
  const [backendDetail, setBackendDetail] = useState<Record<string, unknown> | null>(null)
  const [isFullModalOpen, setIsFullModalOpen] = useState(false)
  const [backendLoading, setBackendLoading] = useState(false)

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
      <div className="text-center py-20 space-y-4">
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
      if (!config.baseUrl) {
        throw new Error('API Base URL is not configured. Please open the Workbench to configure the backend URL.')
      }
      if (!config.pspKey) {
        throw new Error('A valid PSP API key is required to issue an onboarding session. Please set your PSP API Key in the Workbench.')
      }

      const response = await requestApi<{
        clientSecret: string
        setupUrl?: string | null
        expiresAt?: string
      }>(config, 'POST', `/api/v1/psp/merchants/${encodeURIComponent(merchant.id)}/onboarding-sessions`, {
        returnUrl: `${window.location.origin}/setup`,
        ttlMinutes: 60,
      }, 'psp')

      setSessionData(response)
      if (response.clientSecret) {
        sessionStorage.setItem(`orki_merchant_session:${merchant.externalId}`, response.clientSecret)
        sessionStorage.setItem('orki_active_merchant_session', response.clientSecret)
        saveApiConfig({ ...config, merchantSession: response.clientSecret })
      }
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Failed to issue merchant onboarding session')
    } finally {
      setSessionLoading(false)
    }
  }

  const isMerchantActive = (merchant.status || '').toLowerCase() === 'active'
  const isMerchantDisabled = (merchant.status || '').toLowerCase() === 'disabled'
  const merchantPaylinks = paylinks.filter(
    (p) => p.merchantId === merchant.id && ((p.status || '').toLowerCase() === 'active' || (p.status || '').toLowerCase() === 'disabled')
  )
  const merchantTransactions = transactions.filter((transaction) => transaction.merchantId === merchant.id)
  const canToggleStatus = isMerchantActive || (
    isMerchantDisabled && !!merchant.verifiedAt && !!merchant.activatedAt
  )

  return (
    <div className="space-y-6">
      {statusError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{statusError}</div>}
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/psp')}
            className="p-2.5 rounded-xl border border-slate-200 hover:border-onion-300 hover:bg-onion-50 text-slate-600 hover:text-onion transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {merchant.legalBusinessName}
              </h1>
              <StatusBadge status={merchant.status} />
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              ID: {merchant.id} · Ref: {merchant.externalId}
            </p>

            {/* Payment Rails */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                Rails:
              </span>
              {isMerchantActive && !!merchant.verifiedAt && !!merchant.activatedAt ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                  Orki (Active)
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200 opacity-60">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-1"></span>
                  Orki (Disabled)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-wrap gap-2">
          <button
            onClick={() => setIsFullModalOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center space-x-2 shadow-2xs"
          >
            {backendLoading ? (
              <RefreshCw className="w-4 h-4 text-onion animate-spin" />
            ) : (
              <Eye className="w-4 h-4 text-onion" />
            )}
            <span>View Complete Backend Dossier</span>
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
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${
              isMerchantActive
                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>
              {statusBusy ? 'Updating…' : isMerchantActive ? 'Disable Merchant' : 'Re-activate Merchant'}
            </span>
          </button>
        </div>
      </div>

      {/* Onboarding Session & Credentials Surface */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-onion-50 text-onion-800 border border-onion-200 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5 text-onion-700" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Merchant Onboarding Credentials & Session Key</h2>
              <p className="text-xs text-slate-500">
                Issue a single-merchant session secret (<code className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded">onb_sec_...</code>) for this merchant via <code className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded">POST /api/v1/psp/merchants/{'{id}'}/onboarding-sessions</code>.
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateOnboardingSession}
            disabled={sessionLoading}
            className="px-4 py-2.5 rounded-xl bg-onion text-white text-xs font-semibold hover:bg-onion-700 transition flex items-center justify-center space-x-1.5 shadow-xs disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${sessionLoading ? 'animate-spin' : ''}`} />
            <span>{sessionLoading ? 'Issuing Session…' : sessionData?.clientSecret ? 'Re-issue Session Key' : 'Generate Onboarding Session'}</span>
          </button>
        </div>

        {sessionError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
            {sessionError}
          </div>
        )}

        {sessionData?.clientSecret ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-onion" />
                Active Merchant Session Secret Key:
              </span>
              {sessionData.expiresAt && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Expires: {new Date(sessionData.expiresAt).toLocaleTimeString()} ({new Date(sessionData.expiresAt).toLocaleDateString()})
                </span>
              )}
            </div>

            {/* Secret Key with Show/Hide and 1-Click Copy */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Merchant Client Secret (onb_sec_...)
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showSessionSecret ? 'text' : 'password'}
                    readOnly
                    value={sessionData.clientSecret}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-mono text-slate-900 select-all pr-10 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSessionSecret(!showSessionSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title={showSessionSecret ? 'Hide secret key' : 'Show secret key'}
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
              </div>
            </div>

            {/* Setup URL */}
            {sessionData.setupUrl && (
              <div className="pt-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Merchant Hosted Setup URL (setupUrl)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={sessionData.setupUrl}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono text-slate-700 select-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(sessionData.setupUrl!, 'url')}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shrink-0 shadow-2xs"
                  >
                    {copiedField === 'url' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedField === 'url' ? 'Copied Link!' : 'Copy Link'}</span>
                  </button>
                  <a
                    href={sessionData.setupUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-onion text-white text-xs font-semibold hover:bg-onion-700 flex items-center gap-1.5 transition shrink-0 shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Launch Setup</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-600 font-medium">
                No active session token is cached for this merchant in this browser session.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click <strong>Generate Onboarding Session</strong> to issue a 60-minute time-bounded secret key and hosted link.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Balance Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Float Balance</span>
            <Coins className="w-4 h-4 text-onion" />
          </div>
          <div>
            <span className="text-3xl font-black text-slate-900">
              ${(merchant.balanceUsdc ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-semibold text-slate-400 ml-1.5">USDC</span>
          </div>
          <p className="text-xs text-slate-500">
            Total Volume: <strong>${(merchant.volumeUsdc || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC</strong>
          </p>
          <p className="text-xs text-slate-500 flex items-center space-x-1">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Settlement: <strong>{merchant.settlementMode.replace('_', ' ')}</strong></span>
          </p>
        </div>

        {/* Business KYC Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Corporate Identity</span>
            <Building className="w-4 h-4 text-onion" />
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">License:</span>
              <span className="font-mono font-bold text-slate-800">{merchant.tradeLicenseNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Jurisdiction:</span>
              <span className="font-semibold text-slate-800">{merchant.jurisdiction}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Sumsub KYB:</span>
              <span className={`font-bold ${merchant.verifiedAt ? 'text-emerald-600' : 'text-slate-500'}`}>
                {merchant.verifiedAt ? `Verified ${new Date(merchant.verifiedAt).toLocaleDateString()}` : (merchant.status || '').toLowerCase() === 'verifying' ? 'In review' : 'Not verified'}
              </span>
            </div>
          </div>
        </div>

        {/* Non-Custodial Wallets */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Non-Custodial Accounts</span>
            <Wallet className="w-4 h-4 text-onion" />
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Base EVM Smart Account</span>
              <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-200 font-mono text-[11px] mt-0.5">
                <span className="truncate">{merchant.baseWalletAddress || 'Not registered'}</span>
                {merchant.baseWalletAddress && <button onClick={() => { const address = merchant.baseWalletAddress; if (address) handleCopy(address, 'base') }} className="p-1 text-slate-400 hover:text-slate-600">
                  {copiedField === 'base' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>}
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Solana SVM Account</span>
              <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-200 font-mono text-[11px] mt-0.5">
                <span className="truncate">{merchant.solanaWalletAddress || 'Not registered'}</span>
                {merchant.solanaWalletAddress && <button onClick={() => { const address = merchant.solanaWalletAddress; if (address) handleCopy(address, 'sol') }} className="p-1 text-slate-400 hover:text-slate-600">
                  {copiedField === 'sol' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs / Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Paylinks */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <FileText className="w-4 h-4 text-onion" />
              <span>Active Checkout Paylinks</span>
            </h3>
            <span className="text-xs text-slate-400">{merchantPaylinks.length} total</span>
          </div>

          <div className="space-y-3">
            {merchantPaylinks.map((plk) => (
              <div key={plk.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-xs">{plk.title}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">${(plk.amount ?? 0).toLocaleString()} USDC · {plk.slug}</p>
                </div>
                <a
                  href={`/checkout/${plk.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:border-onion-400 hover:text-onion flex items-center space-x-1 transition-colors"
                >
                  <span>Checkout</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions Ledger */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <ArrowRightLeft className="w-4 h-4 text-onion" />
              <span>Recent Financial Operations</span>
            </h3>
            <span className="text-xs text-slate-400">Backend records</span>
          </div>

          <div className="space-y-3">
            {merchantTransactions.slice(0, 4).map((tx) => (
              <div key={tx.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-xs capitalize">{tx.type} via {tx.chain}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{tx.txHash}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 text-xs">+${tx.grossAmount.toLocaleString()} USDC</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">{tx.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Complete Backend Database Record Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-onion" />
              <span>Complete Stored Backend Data & Raw Database Record</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive inspection of all table columns, consent proofs, KYB submissions, and timestamps stored in the database.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFullModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs"
            >
              <Eye className="w-3.5 h-3.5 text-onion-400" />
              <span>Open Tabbed Dossier</span>
            </button>

            <button
              onClick={() => {
                const dataToCopy = backendDetail || merchant
                navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2))
                handleCopy(JSON.stringify(dataToCopy, null, 2), 'rawPspJson')
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              {copiedField === 'rawPspJson' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedField === 'rawPspJson' ? 'Copied JSON!' : 'Copy Raw Record'}</span>
            </button>
          </div>
        </div>

        <pre className="bg-slate-950 text-emerald-400 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-80 border border-slate-800 leading-relaxed select-all">
          {JSON.stringify(backendDetail || merchant, null, 2)}
        </pre>
      </div>

      {/* Full Merchant Details Dossier Modal */}
      {isFullModalOpen && (
        <MerchantFullDetailsModal
          merchant={{
            id: merchant.id,
            organizationId: merchant.organizationId || 'psp_org',
            organizationName: 'PSP Organization',
            organizationCategory: 'FINANCE',
            externalId: merchant.externalId,
            legalBusinessName: merchant.legalBusinessName,
            tradeLicenseNumber: merchant.tradeLicenseNumber,
            jurisdiction: merchant.jurisdiction,
            representativeName: merchant.representativeName,
            representativeEmail: merchant.representativeEmail,
            status: (merchant.status as 'active' | 'disabled' | 'invited' | 'suspended') || 'invited',
            settlementMode: merchant.settlementMode,
            baseWalletAddress: merchant.baseWalletAddress,
            solanaWalletAddress: merchant.solanaWalletAddress,
            passkeyId: merchant.passkeyId,
            hasPasskey: !merchant.passkeyId,
            statusReason: merchant.statusReason,
            consentDetails: (backendDetail?.consentDetails as Record<string, unknown>) || {
              consentMethod: 'dashboard',
              consentNoticeVersion: '1.0',
              consentRecordedAt: merchant.termsAcceptedAt,
            },
            metadata: (backendDetail?.metadata as Record<string, unknown>) || {},
            kybSubmissions: (backendDetail?.kybSubmissions as Array<Record<string, unknown>>) || [],
            paylinks: merchantPaylinks as unknown as Array<Record<string, unknown>>,
            recentTransactions: merchantTransactions as unknown as Array<Record<string, unknown>>,
            stats: {
              totalVolumeUsdc: merchant.volumeUsdc || 0,
              totalTransactions: merchantTransactions.length,
              totalOrkiFeesUsdc: (merchant.volumeUsdc || 0) * 0.01,
              totalPspMarkupUsdc: (merchant.volumeUsdc || 0) * 0.0035,
            },
            verifiedAt: merchant.verifiedAt,
            activatedAt: merchant.activatedAt,
            createdAt: merchant.createdAt,
            rawRecord: (backendDetail?.rawRecord as Record<string, unknown>) || (backendDetail as Record<string, unknown>) || (merchant as unknown as Record<string, unknown>),
          }}
          onClose={() => setIsFullModalOpen(false)}
          onToggleStatus={(merchantId, newStatus) => onToggleStatus(merchantId, newStatus === 'active' ? 'disabled' : 'active')}
          isAdmin={false}
        />
      )}
    </div>
  )
}
