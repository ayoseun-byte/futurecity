import React, { useState } from 'react'
import type { AdminMerchantDetailResponse } from '../services/adminService'
import { enforceAdminMerchantStep } from '../services/adminService'
import {
  ShieldCheck,
  Wallet,
  Coins,
  Key,
  Copy,
  Check,
  ExternalLink,
  X,
  FileCode,
} from 'lucide-react'

interface MerchantFullDetailsModalProps {
  merchant: AdminMerchantDetailResponse
  onClose: () => void
  onToggleStatus?: (merchantId: string, currentStatus: string) => void | Promise<void>
  isAdmin?: boolean
}

type ModalTab = 'identity' | 'compliance' | 'wallets' | 'settlement' | 'paylinks' | 'transactions' | 'raw'

export const MerchantFullDetailsModal: React.FC<MerchantFullDetailsModalProps> = ({
  merchant,
  onClose,
  onToggleStatus,
  isAdmin = false,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('identity')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [statusBusy, setStatusBusy] = useState(false)

  // Step Monotonicity & Admin Enforcement State
  const [currentStepState, setCurrentStepState] = useState<string>(
    String(
      merchant.nextStep ||
        (merchant.rawRecord as Record<string, unknown> | undefined)?.next_step ||
        ((merchant.status || '').toLowerCase() === 'active' ? 'COMPLETED' : 'OPT_IN')
    )
  )
  const [isEnforcingStep, setIsEnforcingStep] = useState(false)
  const [selectedEnforceStep, setSelectedEnforceStep] = useState<string>('OPT_IN')
  const [enforceReason, setEnforceReason] = useState<string>('')
  const [enforceSuccess, setEnforceSuccess] = useState<string | null>(null)
  const [enforceError, setEnforceError] = useState<string | null>(null)
  const [showEnforceForm, setShowEnforceForm] = useState(false)

  const handleEnforceStep = async (e: React.FormEvent) => {
    e.preventDefault()
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
      setTimeout(() => setEnforceSuccess(null), 4000)
    } catch (err) {
      setEnforceError(err instanceof Error ? err.message : 'Failed to enforce step.')
    } finally {
      setIsEnforcingStep(false)
    }
  }

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const isVerified = !!merchant.verifiedAt || (merchant.status || '').toLowerCase() === 'active'
  const isActionRequired = (merchant.status || '').toLowerCase() === 'verification_action_required'
  const isVerifying = (merchant.status || '').toLowerCase() === 'verifying'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 border border-slate-200 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-onion-50 text-onion-800 border border-onion-200 flex items-center justify-center font-bold text-lg shrink-0">
                {merchant.legalBusinessName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {merchant.legalBusinessName}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      merchant.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : merchant.status === 'disabled'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {merchant.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5 flex items-center space-x-2">
                  <span>ID: {merchant.id}</span>
                  <span>·</span>
                  <span>Ref: {merchant.externalId}</span>
                  <span>·</span>
                  <span>PSP: <strong>{merchant.organizationName || merchant.organizationId}</strong></span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onToggleStatus && (
              <button
                onClick={async () => {
                  setStatusBusy(true)
                  try {
                    await onToggleStatus(merchant.id, merchant.status)
                  } finally {
                    setStatusBusy(false)
                  }
                }}
                disabled={statusBusy}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
                  merchant.status === 'disabled'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                }`}
              >
                {statusBusy
                  ? 'Updating...'
                  : merchant.status === 'disabled'
                  ? 'Reactivate Merchant'
                  : 'Emergency Freeze'}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
              title="Close Merchant Dossier"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1.5 border-b border-slate-200 overflow-x-auto pb-2 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('identity')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'identity' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Corporate & Entity
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'compliance' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            KYB & Sumsub
          </button>
          <button
            onClick={() => setActiveTab('wallets')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'wallets' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Non-Custodial Accounts
          </button>
          <button
            onClick={() => setActiveTab('settlement')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'settlement' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Settlement & Fees
          </button>
          <button
            onClick={() => setActiveTab('paylinks')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'paylinks' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Paylinks ({merchant.paylinks?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'transactions' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Transactions ({merchant.recentTransactions?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1 ${
              activeTab === 'raw' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Raw Backend DB</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* TAB 1: IDENTITY & SIGNATORY */}
          {activeTab === 'identity' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <h3 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-500">
                    Entity Registration
                  </h3>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Legal Business Name:</span>
                      <span className="font-bold text-slate-900">{merchant.legalBusinessName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Trade License Number:</span>
                      <span className="font-mono font-bold text-slate-800">{merchant.tradeLicenseNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Jurisdiction:</span>
                      <span className="font-semibold text-slate-800">{merchant.jurisdiction}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Parent PSP Organization:</span>
                      <span className="font-bold text-onion">{merchant.organizationName} ({merchant.organizationId})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Onboarding Registered At:</span>
                      <span className="text-slate-700">{new Date(merchant.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <h3 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-500">
                    Authorized Signatory & Consent
                  </h3>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Signatory Representative:</span>
                      <span className="font-bold text-slate-900">{merchant.representativeName || 'None assigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Signatory Email:</span>
                      <span className="font-semibold text-slate-800">{merchant.representativeEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Consent Method:</span>
                      <span className="font-mono font-semibold text-slate-700">
                        {String(merchant.consentDetails?.consentMethod || 'dashboard')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Terms Notice Version:</span>
                      <span className="font-mono text-slate-700">
                        v{String(merchant.consentDetails?.consentNoticeVersion || '1.0')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Consent Recorded At:</span>
                      <span className="text-slate-700">
                        {merchant.consentDetails?.consentRecordedAt
                          ? new Date(String(merchant.consentDetails.consentRecordedAt)).toLocaleString()
                          : 'Pending acceptance'}
                      </span>
                    </div>
                    {Boolean(merchant.consentDetails?.ipAddress) && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Recorded Signatory IP:</span>
                        <span className="font-mono text-emerald-700 font-bold">{String(merchant.consentDetails?.ipAddress)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Onboarding State & Step Monotonicity Invariant */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                      Onboarding Step & Monotonicity Protection
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Protected (Never Regresses)
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Current Onboarding Step:</span>
                  <span className="font-mono font-bold text-slate-900 px-2 py-0.5 bg-white border border-slate-200 rounded">
                    {currentStepState}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Invariant enforced: When a merchant passes any onboarding milestone, they can never be moved backward to a previous step by normal flows, webhooks, or session creation unless explicitly enforced by Orki Admin.
                </p>

                {enforceSuccess && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 font-medium">
                    {enforceSuccess}
                  </div>
                )}

                {enforceError && (
                  <div className="p-2.5 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200 font-medium">
                    {enforceError}
                  </div>
                )}

                {isAdmin && (
                  <div className="pt-2 border-t border-slate-200">
                    {!showEnforceForm ? (
                      <button
                        type="button"
                        onClick={() => setShowEnforceForm(true)}
                        className="text-xs font-bold text-onion hover:text-onion-dark hover:underline flex items-center space-x-1"
                      >
                        <span>Enforce Step Override (Admin Authority)</span>
                      </button>
                    ) : (
                      <form onSubmit={handleEnforceStep} className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700">Select Target Step to Enforce:</label>
                          <select
                            value={selectedEnforceStep}
                            onChange={(e) => setSelectedEnforceStep(e.target.value)}
                            className="w-full text-xs font-mono p-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-onion focus:outline-none"
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
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700">Admin Audit Reason:</label>
                          <input
                            type="text"
                            required
                            value={enforceReason}
                            onChange={(e) => setEnforceReason(e.target.value)}
                            placeholder="e.g. Compliance requested document re-submission"
                            className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-onion focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="submit"
                            disabled={isEnforcingStep}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                          >
                            {isEnforcingStep ? 'Enforcing...' : 'Confirm Step Enforcement'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowEnforceForm(false)}
                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-medium transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {merchant.metadata && Object.keys(merchant.metadata).length > 0 && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Merchant Metadata</h4>
                  <pre className="bg-white p-3 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 overflow-x-auto">
                    {JSON.stringify(merchant.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COMPLIANCE & KYB */}
          {activeTab === 'compliance' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Sumsub Verification State</span>
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      isVerified
                        ? 'bg-emerald-100 text-emerald-800'
                        : isActionRequired
                        ? 'bg-rose-100 text-rose-800'
                        : isVerifying
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isVerified ? 'VERIFIED' : isActionRequired ? 'ACTION REQUIRED' : isVerifying ? 'IN REVIEW' : 'PENDING'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Verified Timestamp:</span>
                    <span className="font-semibold text-slate-800">
                      {merchant.verifiedAt ? new Date(merchant.verifiedAt).toLocaleString() : 'Not verified yet'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Activation Timestamp:</span>
                    <span className="font-semibold text-slate-800">
                      {merchant.activatedAt ? new Date(merchant.activatedAt).toLocaleString() : 'Not activated yet'}
                    </span>
                  </div>
                </div>

                {merchant.statusReason && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-700">
                    <span className="font-bold text-slate-800 block text-[11px] mb-0.5">Status Reason / Audit Note:</span>
                    <p className="text-[11px]">{merchant.statusReason}</p>
                  </div>
                )}
              </div>

              {/* Submissions list */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  KYB Submissions & Webhook Records ({merchant.kybSubmissions?.length ?? 0})
                </h4>

                {(!merchant.kybSubmissions || merchant.kybSubmissions.length === 0) ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No webhook verification events logged yet for this merchant.
                  </div>
                ) : (
                  merchant.kybSubmissions.map((sub, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold text-slate-900">
                          Applicant: {String(sub.applicant_id || sub.applicantId || 'N/A')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {sub.created_at ? new Date(String(sub.created_at)).toLocaleString() : ''}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-[11px]">
                        <span>Review Answer: <strong className="text-emerald-700">{String(sub.review_answer || 'GREEN')}</strong></span>
                        <span>Review Status: <strong className="text-slate-800">{String(sub.review_status || 'completed')}</strong></span>
                      </div>
                      {Boolean(sub.moderation_comment) && (
                        <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                          {String(sub.moderation_comment)}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: WALLETS & PASSKEYS */}
          {activeTab === 'wallets' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <Wallet className="w-4 h-4 text-blue-600" />
                    <span>Base Network (EVM Smart Account)</span>
                  </span>
                  <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    ERC-4337 ZeroDev
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 font-mono text-xs">
                  <span className="truncate mr-2 font-bold text-slate-900">
                    {merchant.baseWalletAddress || 'No Base smart account registered'}
                  </span>
                  {merchant.baseWalletAddress && (
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleCopy(merchant.baseWalletAddress!, 'base')}
                        className="p-1 text-slate-400 hover:text-slate-600"
                      >
                        {copiedKey === 'base' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a
                        href={`https://basescan.org/address/${merchant.baseWalletAddress}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-400 hover:text-blue-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <Coins className="w-4 h-4 text-purple-600" />
                    <span>Solana (SVM Non-Custodial Account)</span>
                  </span>
                  <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    SPL Associated Token Account
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 font-mono text-xs">
                  <span className="truncate mr-2 font-bold text-slate-900">
                    {merchant.solanaWalletAddress || 'No Solana wallet registered'}
                  </span>
                  {merchant.solanaWalletAddress && (
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleCopy(merchant.solanaWalletAddress!, 'sol')}
                        className="p-1 text-slate-400 hover:text-slate-600"
                      >
                        {copiedKey === 'sol' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a
                        href={`https://solscan.io/account/${merchant.solanaWalletAddress}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-400 hover:text-purple-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <Key className="w-4 h-4 text-amber-600" />
                    <span>WebAuthn FIDO2 Passkey Credential</span>
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      merchant.hasPasskey ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {merchant.hasPasskey ? 'REGISTERED' : 'UNENROLLED'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {merchant.hasPasskey
                    ? `Passkey credential ID enrolled: ${merchant.passkeyId || 'Hardware Authenticator Bound'}`
                    : 'Merchant has not completed hardware key ceremony yet.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: SETTLEMENT & FEES */}
          {activeTab === 'settlement' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Settlement Routing</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Settlement Mode:</span>
                    <span className="font-bold text-slate-900 uppercase">
                      {merchant.settlementMode.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Float USDC Balance:</span>
                    <span className="font-bold text-emerald-700">
                      ${(merchant.stats?.totalVolumeUsdc ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Tri-Wallet Split Topology</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[10px] block">Orki Base Fee</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">1.00%</span>
                    <span className="text-[10px] text-slate-400">100 bps</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[10px] block">PSP Markup</span>
                    <span className="font-bold text-onion text-sm mt-0.5 block">
                      {((merchant.stats?.totalPspMarkupUsdc ?? 35) > 0 ? 'Dynamic' : 'Configured')}
                    </span>
                    <span className="text-[10px] text-slate-400">Rate Locked 30d</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[10px] block">Merchant Net</span>
                    <span className="font-bold text-emerald-700 text-sm mt-0.5 block">98.65%</span>
                    <span className="text-[10px] text-slate-400">Direct Non-Custodial</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PAYLINKS */}
          {activeTab === 'paylinks' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Live Paylinks & Checkout Invoices ({merchant.paylinks?.length ?? 0})
              </h4>
              {(!merchant.paylinks || merchant.paylinks.length === 0) ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No paylinks created yet for this merchant.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                  {merchant.paylinks.map((plk, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-white transition text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{String(plk.title || plk.slug)}</p>
                        <p className="font-mono text-[10px] text-slate-400">
                          Slug: {String(plk.slug)} · {String(plk.currency || 'USDC')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-slate-900">
                          {plk.amount ? `$${Number(plk.amount).toFixed(2)}` : 'Open Amount'}
                        </span>
                        <a
                          href={`/checkout/${plk.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-onion text-white font-semibold text-[11px] hover:bg-onion-700 flex items-center space-x-1"
                        >
                          <span>Checkout</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: TRANSACTIONS */}
          {activeTab === 'transactions' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Recent Payment Settlements ({merchant.recentTransactions?.length ?? 0})
              </h4>
              {(!merchant.recentTransactions || merchant.recentTransactions.length === 0) ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No settlement transactions recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                  {merchant.recentTransactions.map((tx, idx) => (
                    <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white transition text-xs">
                      <div>
                        <p className="font-mono font-bold text-slate-900">{String(tx.id)}</p>
                        <p className="text-[10px] font-mono text-slate-400">
                          Chain: {String(tx.chain || 'base').toUpperCase()} · {tx.created_at ? new Date(String(tx.created_at)).toLocaleString() : ''}
                        </p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <span className="font-bold text-slate-900 text-sm">
                          ${Number(tx.gross_amount || tx.grossAmount || 0).toFixed(2)} {String(tx.currency || 'USDC')}
                        </span>
                        <p className="text-[10px] text-emerald-700 font-semibold">
                          Merchant Net: ${Number(tx.net_amount || tx.netAmount || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: COMPLETE RAW BACKEND DATABASE RECORD */}
          {activeTab === 'raw' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Complete Raw Database Record</h4>
                  <p className="text-[11px] text-slate-400">
                    Direct representation of all table columns and nested JSON objects stored in the backend.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(JSON.stringify(merchant.rawRecord || merchant, null, 2), 'rawJson')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs"
                >
                  {copiedKey === 'rawJson' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'rawJson' ? 'Copied JSON!' : 'Copy Raw JSON'}</span>
                </button>
              </div>

              <pre className="bg-slate-950 text-emerald-400 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-96 border border-slate-800 leading-relaxed select-all">
                {JSON.stringify(merchant.rawRecord || merchant, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-100 flex justify-between items-center shrink-0">
          <span className="text-[11px] text-slate-400 font-mono">
            {merchant.organizationName} · {merchant.jurisdiction}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  )
}
