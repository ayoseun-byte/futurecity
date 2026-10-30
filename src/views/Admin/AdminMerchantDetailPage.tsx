import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  fetchAdminMerchantDetail,
  updateAdminMerchantStatus,
  enforceAdminMerchantStep,
  reassignAdminMerchant,
  fetchAdminPsps,
  type AdminMerchantDetailResponse,
} from '../../services/adminService'
import type { Organization } from '../../types'
import {
  ArrowLeft,
  Building,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  Key,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  FileCode,
  Search,
  CheckCircle2,
  UserCheck,
} from 'lucide-react'

type DetailTab = 'identity' | 'compliance' | 'wallets' | 'paylinks' | 'transactions' | 'sessions' | 'raw'

export const AdminMerchantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [merchant, setMerchant] = useState<AdminMerchantDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DetailTab>('identity')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Status Action State
  const [statusBusy, setStatusBusy] = useState(false)
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null)

  // Step Enforcement State
  const [currentStepState, setCurrentStepState] = useState<string>('OPT_IN')
  const [isEnforcingStep, setIsEnforcingStep] = useState(false)
  const [selectedEnforceStep, setSelectedEnforceStep] = useState<string>('OPT_IN')
  const [enforceReason, setEnforceReason] = useState<string>('')
  const [enforceSuccess, setEnforceSuccess] = useState<string | null>(null)
  const [enforceError, setEnforceError] = useState<string | null>(null)
  const [showEnforceForm, setShowEnforceForm] = useState(false)

  // Reassign PSP State
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [availablePsps, setAvailablePsps] = useState<Organization[]>([])
  const [targetPspId, setTargetPspId] = useState<string>('')
  const [reassignReason, setReassignReason] = useState<string>('')
  const [reassignBusy, setReassignBusy] = useState(false)
  const [reassignError, setReassignError] = useState<string | null>(null)

  // Paylink / Transaction search filters
  const [paylinkSearch, setPaylinkSearch] = useState('')
  const [txSearch, setTxSearch] = useState('')

  const loadMerchant = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminMerchantDetail(id)
      setMerchant(data)
      setCurrentStepState(
        String(
          data.nextStep ||
            (data.rawRecord as Record<string, unknown> | undefined)?.next_step ||
            ((data.status || '').toLowerCase() === 'active' ? 'COMPLETED' : 'OPT_IN')
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load merchant details.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadMerchant()
  }, [loadMerchant])

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleToggleStatus = async (newStatus: 'active' | 'disabled' | 'suspended') => {
    if (!merchant) return
    setStatusBusy(true)
    setStatusSuccess(null)
    try {
      await updateAdminMerchantStatus(merchant.id, newStatus, `Admin set status to ${newStatus}`)
      setMerchant((prev) => (prev ? { ...prev, status: newStatus } : null))
      setStatusSuccess(`Merchant status updated to ${newStatus.toUpperCase()}`)
      setTimeout(() => setStatusSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.')
    } finally {
      setStatusBusy(false)
    }
  }

  const handleEnforceStep = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!merchant) return
    if (!enforceReason.trim()) {
      setEnforceError('Please provide an audit reason for enforcing this step.')
      return
    }
    setIsEnforcingStep(true)
    setEnforceError(null)
    try {
      const res = await enforceAdminMerchantStep(merchant.id, selectedEnforceStep, enforceReason.trim(), true)
      setCurrentStepState(res.nextStep || 'COMPLETED')
      setEnforceSuccess(`Step successfully enforced to ${selectedEnforceStep} by Orki Admin.`)
      setShowEnforceForm(false)
      setEnforceReason('')
      void loadMerchant()
      setTimeout(() => setEnforceSuccess(null), 4000)
    } catch (err) {
      setEnforceError(err instanceof Error ? err.message : 'Failed to enforce step.')
    } finally {
      setIsEnforcingStep(false)
    }
  }

  const handleOpenReassign = async () => {
    setShowReassignModal(true)
    setReassignError(null)
    try {
      const psps = await fetchAdminPsps('all')
      setAvailablePsps(psps)
      if (psps.length > 0) {
        setTargetPspId(psps[0].id)
      }
    } catch {
      // fallback
    }
  }

  const handleConfirmReassign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!merchant || !targetPspId || !reassignReason.trim()) return
    setReassignBusy(true)
    setReassignError(null)
    try {
      const res = await reassignAdminMerchant(merchant.id, targetPspId, reassignReason.trim())
      setStatusSuccess(res.message)
      setShowReassignModal(false)
      void loadMerchant()
      setTimeout(() => setStatusSuccess(null), 4000)
    } catch (err) {
      setReassignError(err instanceof Error ? err.message : 'Failed to reassign merchant.')
    } finally {
      setReassignBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-onion animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-600">Loading comprehensive merchant dossier…</p>
      </div>
    )
  }

  if (error || !merchant) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">{error || 'Merchant not found'}</h2>
        <button
          onClick={() => navigate('/admin')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
        >
          Return to Admin Dashboard
        </button>
      </div>
    )
  }

  const filteredPaylinks = (merchant.paylinks || []).filter((p) => {
    const title = String(p.title || '').toLowerCase()
    const slug = String(p.slug || '').toLowerCase()
    return title.includes(paylinkSearch.toLowerCase()) || slug.includes(paylinkSearch.toLowerCase())
  })

  const filteredTransactions = (merchant.recentTransactions || []).filter((tx) => {
    const hash = String(tx.tx_hash || '').toLowerCase()
    const payer = String(tx.payer_address || '').toLowerCase()
    return hash.includes(txSearch.toLowerCase()) || payer.includes(txSearch.toLowerCase())
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <Link to="/admin" className="hover:text-slate-900 transition flex items-center space-x-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>Admin Portal</span>
          </Link>
          <span>/</span>
          <Link to="/admin" className="hover:text-slate-900 transition font-medium">
            Cross-Tenant Merchants
          </Link>
          <span>/</span>
          <span className="font-bold text-slate-900 truncate max-w-xs">{merchant.legalBusinessName}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => void loadMerchant()}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {statusSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusSuccess}</span>
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
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${
                    merchant.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : merchant.status === 'disabled'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {merchant.status}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 font-mono">
                  {merchant.jurisdiction}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono flex items-center space-x-3 flex-wrap gap-1">
                <span>ID: {merchant.id}</span>
                <span>·</span>
                <span>Ref: {merchant.externalId}</span>
                <span>·</span>
                <span>
                  PSP Partner:{' '}
                  <Link
                    to={`/admin/psps/${merchant.organizationId}`}
                    className="font-bold text-onion hover:underline"
                  >
                    {merchant.organizationName || merchant.organizationId}
                  </Link>
                </span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5 flex-wrap gap-2">
            <button
              onClick={handleOpenReassign}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition shadow-2xs"
            >
              Reassign PSP
            </button>

            {merchant.status === 'active' ? (
              <button
                disabled={statusBusy}
                onClick={() => handleToggleStatus('disabled')}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition disabled:opacity-50"
              >
                Disable Merchant
              </button>
            ) : (
              <button
                disabled={statusBusy}
                onClick={() => handleToggleStatus('active')}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                Activate Merchant
              </button>
            )}

            <button
              onClick={() => handleCopy(JSON.stringify(merchant.rawRecord || merchant, null, 2), 'raw_json')}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
            >
              {copiedKey === 'raw_json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedKey === 'raw_json' ? 'Copied DB JSON!' : 'Copy Raw Record'}</span>
            </button>
          </div>
        </div>

        {/* 4 Primary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Volume</span>
            <div className="text-xl font-black text-slate-900">
              ${(merchant.stats?.totalVolumeUsdc ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-xs font-bold text-slate-400 ml-1">USDC</span>
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Transactions</span>
            <div className="text-xl font-black text-slate-900">
              {(merchant.stats?.totalTransactions ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Orki Protocol Fees</span>
            <div className="text-xl font-black text-emerald-700">
              ${(merchant.stats?.totalOrkiFeesUsdc ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-xs font-bold text-emerald-500 ml-1">USDC</span>
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PSP Markup Collected</span>
            <div className="text-xl font-black text-indigo-700">
              ${(merchant.stats?.totalPspMarkupUsdc ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-xs font-bold text-indigo-500 ml-1">USDC</span>
            </div>
          </div>
        </div>

        {/* Step Monotonicity Invariant & Admin Step Enforcement Bar */}
        <div className="p-5 bg-onion-50/50 rounded-2xl border border-onion-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Onboarding Step & Forward-Only Monotonic Invariant
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Protected (Never Regresses)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Current Step: <strong className="font-mono text-slate-900 uppercase">{currentStepState}</strong>.
                  Only an Orki Protocol Admin can enforce an onboarding step regression or advance.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowEnforceForm(!showEnforceForm)}
              className="px-3.5 py-1.5 bg-onion text-white rounded-xl text-xs font-bold hover:bg-onion-700 transition shadow-2xs shrink-0"
            >
              {showEnforceForm ? 'Close Override Form' : 'Enforce Step Override'}
            </button>
          </div>

          {enforceSuccess && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900">
              {enforceSuccess}
            </div>
          )}

          {enforceError && (
            <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-xs font-bold text-rose-900">
              {enforceError}
            </div>
          )}

          {showEnforceForm && (
            <form onSubmit={handleEnforceStep} className="pt-3 border-t border-onion-200 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Step to Enforce:</label>
                <select
                  value={selectedEnforceStep}
                  onChange={(e) => setSelectedEnforceStep(e.target.value)}
                  className="w-full text-xs font-mono p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-onion focus:outline-none"
                >
                  <option value="OPT_IN">OPT_IN (Initial state)</option>
                  <option value="NOTICE">NOTICE (Regulatory Notice)</option>
                  <option value="KYB_INFORMATION">KYB_INFORMATION (Business Profile)</option>
                  <option value="TERMS">TERMS (Terms of Service)</option>
                  <option value="SUMSUB">SUMSUB (Biometric / KYB Verification)</option>
                  <option value="PASSKEY">PASSKEY (Biometric MFA & Wallets)</option>
                  <option value="COMPLETED">COMPLETED (Fully Active)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Audit Reason (Mandatory):</label>
                <input
                  type="text"
                  required
                  value={enforceReason}
                  onChange={(e) => setEnforceReason(e.target.value)}
                  placeholder="e.g. Compliance requested document re-submission"
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-onion focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="submit"
                  disabled={isEnforcingStep}
                  className="w-full px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {isEnforcingStep ? 'Enforcing…' : 'Confirm Step Override'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-4 overflow-x-auto pb-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('identity')}
            className={`py-2 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'identity'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Entity & Signatories
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`py-2 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'compliance'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Compliance & KYB ({merchant.kybSubmissions?.length ?? 0})
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
            Paylinks ({merchant.paylinks?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Transactions ({merchant.recentTransactions?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-2 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'sessions'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Sessions ({merchant.onboardingSessions?.length ?? 0})
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
            <span>Raw Database Record</span>
          </button>
        </nav>
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        {/* TAB 1: IDENTITY & SIGNATORY */}
        {activeTab === 'identity' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Building className="w-4 h-4 text-onion" />
                <h2>Legal Corporate Profile</h2>
              </div>
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
                  <span className="text-slate-500">Parent PSP Organization</span>
                  <Link
                    to={`/admin/psps/${merchant.organizationId}`}
                    className="font-bold text-onion hover:underline"
                  >
                    {merchant.organizationName || merchant.organizationId}
                  </Link>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Initial Registration Date</span>
                  <span className="text-slate-700">{new Date(merchant.createdAt).toLocaleString()}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Last Database Update</span>
                  <span className="text-slate-700">{new Date(merchant.updatedAt || merchant.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <h2>Authorized Signatory & Recorded Consent</h2>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Signatory Representative</span>
                  <span className="font-bold text-slate-900">{merchant.representativeName || 'None assigned'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Signatory Email</span>
                  <span className="font-semibold text-slate-800">{merchant.representativeEmail}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Consent Method</span>
                  <span className="font-mono text-slate-700">
                    {String(merchant.consentDetails?.consentMethod || 'dashboard_flow')}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Terms Notice Version</span>
                  <span className="font-mono text-slate-700">
                    v{String(merchant.consentDetails?.consentNoticeVersion || '1.0')}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Consent Recorded At</span>
                  <span className="text-slate-700">
                    {merchant.consentDetails?.consentRecordedAt
                      ? new Date(String(merchant.consentDetails.consentRecordedAt)).toLocaleString()
                      : 'Pending Acceptance'}
                  </span>
                </div>
                {Boolean(merchant.consentDetails?.ipAddress) && (
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-500">Recorded Signatory IP</span>
                    <span className="font-mono text-emerald-700 font-bold">
                      {String(merchant.consentDetails?.ipAddress)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COMPLIANCE & KYB */}
        {activeTab === 'compliance' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Sumsub Review & Biometric Verification Overview</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500">KYB Status:</span>
                  <div className="font-bold text-slate-900 text-sm">
                    {merchant.verifiedAt ? 'VERIFIED (Approved)' : 'PENDING REVIEW'}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500">Verified Timestamp:</span>
                  <div className="font-mono text-slate-900 text-xs">
                    {merchant.verifiedAt ? new Date(merchant.verifiedAt).toLocaleString() : 'N/A'}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500">Status Reason:</span>
                  <div className="text-slate-900 text-xs font-medium">
                    {merchant.statusReason || 'Compliance clear'}
                  </div>
                </div>
              </div>
            </div>

            {/* Historical Submissions Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-6">
              <h3 className="text-sm font-bold text-slate-900">Historical KYB Information Submissions</h3>
              {(!merchant.kybSubmissions || merchant.kybSubmissions.length === 0) ? (
                <p className="text-xs text-slate-500 py-4">No business KYB submissions found on backend.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Revision</th>
                        <th className="py-2.5 px-3">Submission ID</th>
                        <th className="py-2.5 px-3">Schema</th>
                        <th className="py-2.5 px-3">Submitted At</th>
                        <th className="py-2.5 px-3">Encryption</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {merchant.kybSubmissions.map((sub, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">rev #{String(sub.revision || 1)}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{String(sub.id || '')}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">v{String(sub.schema_version || 1)}</td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {sub.submitted_at ? new Date(String(sub.submitted_at)).toLocaleString() : '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              AES-256 Encrypted
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">EVM Smart Account</span>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="truncate">{merchant.baseWalletAddress || 'Not registered'}</span>
                    {merchant.baseWalletAddress && (
                      <button
                        onClick={() => handleCopy(merchant.baseWalletAddress!, 'base_wallet')}
                        className="p-1 hover:text-slate-900 text-slate-400"
                      >
                        {copiedKey === 'base_wallet' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Web3Auth Solana Address</span>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="truncate">{merchant.solanaWalletAddress || 'Not registered'}</span>
                    {merchant.solanaWalletAddress && (
                      <button
                        onClick={() => handleCopy(merchant.solanaWalletAddress!, 'sol_wallet')}
                        className="p-1 hover:text-slate-900 text-slate-400"
                      >
                        {copiedKey === 'sol_wallet' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Key className="w-4 h-4 text-emerald-600" />
                <span>MFA Passkey & Settlement Rule</span>
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Biometric Passkey Status</span>
                  <span className={`font-bold ${merchant.hasPasskey ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {merchant.hasPasskey ? 'Active & Registered' : 'Not Provisioned'}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Passkey Credential ID</span>
                  <span className="font-mono text-slate-800">{merchant.passkeyId || 'None'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Settlement Mode</span>
                  <span className="font-bold text-slate-900 uppercase">{merchant.settlementMode}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Activation Timestamp</span>
                  <span className="text-slate-700">
                    {merchant.activatedAt ? new Date(merchant.activatedAt).toLocaleString() : 'Pending Onboarding'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PAYLINKS */}
        {activeTab === 'paylinks' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Generated Merchant Paylinks</h3>
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
              <p className="text-xs text-slate-500 py-6 text-center">No paylinks matching filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Slug</th>
                      <th className="py-2.5 px-3">Amount</th>
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
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          ${Number(link.amount || 0).toFixed(2)} USDC
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {String(link.status || 'ACTIVE').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {link.created_at ? new Date(String(link.created_at)).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <a
                            href={`/checkout/${link.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-onion hover:underline font-bold inline-flex items-center space-x-1"
                          >
                            <span>Open</span>
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
              <h3 className="text-sm font-bold text-slate-900">Settled Transactions Ledger</h3>
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
              <p className="text-xs text-slate-500 py-6 text-center">No transactions recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">TX Hash</th>
                      <th className="py-2.5 px-3">Chain</th>
                      <th className="py-2.5 px-3">Gross</th>
                      <th className="py-2.5 px-3">Protocol Fee</th>
                      <th className="py-2.5 px-3">PSP Markup</th>
                      <th className="py-2.5 px-3">Net Settlement</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((tx, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                          {String(tx.tx_hash || 'tx_demo_0x...').substring(0, 16)}…
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{String(tx.chain || 'base')}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">${Number(tx.gross_amount || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-mono text-emerald-700">${Number(tx.orki_fee_amount || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-mono text-indigo-700">${Number(tx.psp_markup_amount || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">${Number(tx.net_amount || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {String(tx.status || 'completed').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {tx.created_at ? new Date(String(tx.created_at)).toLocaleString() : '—'}
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
            <h3 className="text-sm font-bold text-slate-900">Onboarding Sessions History</h3>
            {(!merchant.onboardingSessions || merchant.onboardingSessions.length === 0) ? (
              <p className="text-xs text-slate-500 py-6 text-center">No active or historical onboarding sessions.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Session ID</th>
                      <th className="py-2.5 px-3">Secret Key Token</th>
                      <th className="py-2.5 px-3">Expires At</th>
                      <th className="py-2.5 px-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {merchant.onboardingSessions.map((sess, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{String(sess.id || '')}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {String(sess.client_secret || sess.secret || 'onb_sec_••••••••')}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono">
                          {sess.expires_at ? new Date(String(sess.expires_at)).toLocaleString() : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {sess.created_at ? new Date(String(sess.created_at)).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: RAW DATABASE RECORD */}
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
                onClick={() => handleCopy(JSON.stringify(merchant.rawRecord || merchant, null, 2), 'raw_copy')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                {copiedKey === 'raw_copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{copiedKey === 'raw_copy' ? 'Copied JSON!' : 'Copy Raw Record'}</span>
              </button>
            </div>
            <pre className="text-emerald-400 font-mono text-xs max-h-96 overflow-y-auto p-4 bg-black/60 rounded-2xl select-all leading-relaxed border border-slate-800/80">
              {JSON.stringify(merchant.rawRecord || merchant, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Reassign PSP Modal (only for confirmation) */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Reassign Merchant to Another PSP</h3>
            <p className="text-xs text-slate-500">
              Moving <strong>{merchant.legalBusinessName}</strong> will transfer volume aggregation and settlement markup to the target PSP partner.
            </p>

            {reassignError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800">
                {reassignError}
              </div>
            )}

            <form onSubmit={handleConfirmReassign} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Select Target PSP:</label>
                <select
                  value={targetPspId}
                  onChange={(e) => setTargetPspId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-onion focus:outline-none"
                >
                  {availablePsps.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category || 'FINANCE'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Audit Justification:</label>
                <textarea
                  required
                  rows={2}
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="e.g. Contractual consolidation requested by merchant corporate group"
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-onion focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReassignModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassignBusy}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {reassignBusy ? 'Reassigning…' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
