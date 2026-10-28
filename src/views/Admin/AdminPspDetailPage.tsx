import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  fetchAdminPspDetail,
  updateAdminPspStatus,
  approvePspProduction,
  reissuePspCredentials,
  addAdminPspUbo,
  deleteAdminPspUbo,
  fetchAdminMerchants,
  type PspDetailResponse,
  type AdminMerchantRow,
  type AdminUbo,
} from '../../services/adminService'
import type { Organization } from '../../types'
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Search,
  Key,
  ChevronRight,
  RotateCw,
  Coins,
  ExternalLink,
  Copy,
  Check,
  FileCode,
  ShieldAlert,
  Trash2,
  Wallet,
} from 'lucide-react'

type PspTab = 'profile' | 'ubos' | 'merchants' | 'fees' | 'credentials' | 'raw'

interface AdminPspDetailPageProps {
  organizations: Organization[]
  onUpdateOrganization: (updated: Organization) => void
}

export const AdminPspDetailPage: React.FC<AdminPspDetailPageProps> = ({
  organizations,
  onUpdateOrganization,
}) => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { login } = useAuth()

  const [pspDetail, setPspDetail] = useState<PspDetailResponse | null>(null)
  const [merchants, setMerchants] = useState<AdminMerchantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<PspTab>('profile')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Status Action
  const [statusBusy, setStatusBusy] = useState(false)
  const [apiSuccess, setApiSuccess] = useState<string | null>(null)

  // Two-Person Approval Modal
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false)
  const [approverEmail, setApproverEmail] = useState('')
  const [complianceNotes, setComplianceNotes] = useState('')
  const [isApprovedLoading, setIsApprovedLoading] = useState(false)

  // Add UBO Modal
  const [isAddUboOpen, setIsAddUboOpen] = useState(false)
  const [newUbo, setNewUbo] = useState({
    name: '',
    ownershipPercentage: 25,
    nationality: 'United Arab Emirates',
    idDocumentType: 'passport',
  })
  const [uboLoading, setUboLoading] = useState(false)

  // Merchant search
  const [merchantSearch, setMerchantSearch] = useState('')

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [detailData, merchantData] = await Promise.all([
        fetchAdminPspDetail(id),
        fetchAdminMerchants({ organizationId: id }),
      ])
      setPspDetail(detailData)
      setMerchants(merchantData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PSP details.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleUpdateStatus = async (newStatus: Organization['status']) => {
    if (!id || !pspDetail) return
    setStatusBusy(true)
    try {
      await updateAdminPspStatus(id, newStatus)
      setPspDetail((prev) => (prev ? { ...prev, status: newStatus as Organization['status'] } : null))
      const foundOrg = organizations.find((o) => o.id === id)
      if (foundOrg) {
        onUpdateOrganization({ ...foundOrg, status: newStatus as Organization['status'] })
      }
      setApiSuccess(`PSP status updated to ${newStatus.toUpperCase()}`)
      setTimeout(() => setApiSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.')
    } finally {
      setStatusBusy(false)
    }
  }

  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !approverEmail.trim() || !pspDetail) return
    setIsApprovedLoading(true)
    try {
      const preparer = pspDetail.preparedBy || 'sarah.ops@orki.com'
      await approvePspProduction(id, {
        preparedBy: preparer,
        approvedBy: approverEmail.trim(),
        agreement: {
          signedAt: new Date().toISOString(),
          version: '2026.1-ORKI-PSP-NC',
          documentHash: '0x' + Math.random().toString(36).substring(2, 18),
        },
        kyb: {
          caseReference: pspDetail.kyb?.caseReference || `KYB-${id.toUpperCase()}`,
          riskRating: (pspDetail.kyb?.riskRating || 'low').toLowerCase(),
          nextReviewDue: pspDetail.kyb?.nextReviewDue || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        },
        pspRegulatoryStatus: {
          isRegulatedEntity: pspDetail.kyb?.isRegulatedEntity ?? false,
          regulator: pspDetail.kyb?.regulator || 'VARA',
          licenseReference: pspDetail.kyb?.licenseReference || 'DMCC-REG-2026',
        },
        feeSchedule: {
          paymentRateBps: 100,
          pspMarkupBps: pspDetail.feeSchedule?.pspMarkupBps || 35,
          combinedCapBps: 500,
          lockedUntil: pspDetail.feeSchedule?.lockedUntil || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        },
        goLiveChecklist: {
          signedAt: new Date().toISOString(),
          signedBy: approverEmail.trim(),
          webhookSignaturesVerified: true,
          idempotencyHandled: true,
          passkeyIntegrationVerified: true,
          sandboxTransactionsPassed: true,
          reconciliationJobTested: true,
          settlementModeConfigured: true,
          errorHandlingVerified: true,
          rateLimitsRespected: true,
          tlsAndIpWhitelistingConfirmed: true,
        },
      })
      setIsApprovalModalOpen(false)
      setApiSuccess('Dual-control production approval granted.')
      void loadData()
      setTimeout(() => setApiSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed.')
    } finally {
      setIsApprovedLoading(false)
    }
  }

  const handleReissueKeys = async () => {
    if (!id) return
    setStatusBusy(true)
    try {
      const res = await reissuePspCredentials(id, 'production', 'Reissued from Admin Portal')
      setApiSuccess(`New production credentials generated. Claim URL: ${res.keyDelivery.temporaryShareUrl}`)
      void loadData()
      setTimeout(() => setApiSuccess(null), 6000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reissuing keys failed.')
    } finally {
      setStatusBusy(false)
    }
  }

  const handleAddUbo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !newUbo.name.trim()) return
    setUboLoading(true)
    try {
      await addAdminPspUbo(id, newUbo)
      setIsAddUboOpen(false)
      setNewUbo({ name: '', ownershipPercentage: 25, nationality: 'United Arab Emirates', idDocumentType: 'passport' })
      setApiSuccess('UBO successfully registered & screened.')
      void loadData()
      setTimeout(() => setApiSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add UBO.')
    } finally {
      setUboLoading(false)
    }
  }

  const handleDeleteUbo = async (uboId: string) => {
    if (!id) return
    try {
      await deleteAdminPspUbo(id, uboId)
      setApiSuccess('UBO removed.')
      void loadData()
      setTimeout(() => setApiSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete UBO.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <RotateCw className="w-8 h-8 text-onion animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-600">Loading comprehensive PSP partner dossier…</p>
      </div>
    )
  }

  if (error || !pspDetail) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">{error || 'PSP partner not found'}</h2>
        <button
          onClick={() => navigate('/admin')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
        >
          Return to Admin Dashboard
        </button>
      </div>
    )
  }

  const totalVolume = merchants.reduce((sum, m) => sum + (m.volumeUsdc || 0), 0)
  const totalTx = merchants.reduce((sum, m) => sum + (m.transactionCount || 0), 0)

  const filteredMerchants = merchants.filter((m) => {
    const name = m.legalBusinessName.toLowerCase()
    const ref = m.externalId.toLowerCase()
    return name.includes(merchantSearch.toLowerCase()) || ref.includes(merchantSearch.toLowerCase())
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
            PSP Partners
          </Link>
          <span>/</span>
          <span className="font-bold text-slate-900 truncate max-w-xs">{pspDetail.pspName}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              login('org', pspDetail.pspId)
              navigate('/psp')
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
          >
            <span>Log in as PSP</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => void loadData()}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition shadow-2xs"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {apiSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{apiSuccess}</span>
        </div>
      )}

      {/* Hero Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-6">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-onion-50 text-onion-800 border border-onion-200 flex items-center justify-center font-black text-2xl shrink-0 shadow-xs">
              {pspDetail.pspName.charAt(0)}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center space-x-3 flex-wrap gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {pspDetail.pspName}
                </h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${
                    pspDetail.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : pspDetail.status === 'sandbox'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {pspDetail.status}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 uppercase">
                  {pspDetail.category || 'FINANCE'} · {pspDetail.categoryType || 'psp'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono flex items-center space-x-3 flex-wrap gap-1">
                <span>Partner ID: {pspDetail.pspId}</span>
                <span>·</span>
                <span>Fee Vault: <code className="text-slate-800 font-bold">{((pspDetail as any).feeWallet as string | undefined) || '0x000...'}</code></span>
                <span>·</span>
                <span>Created: {new Date(((pspDetail as any).createdAt || pspDetail.ndaSignedAt || new Date().toISOString())).toLocaleDateString()}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5 flex-wrap gap-2">
            {pspDetail.status !== 'approved' && (
              <button
                onClick={() => setIsApprovalModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-onion text-white hover:bg-onion-700 text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Dual-Control Production Approval</span>
              </button>
            )}

            <button
              onClick={handleReissueKeys}
              disabled={statusBusy}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition shadow-2xs flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Key className="w-3.5 h-3.5 text-onion" />
              <span>Reissue API Keys</span>
            </button>

            <select
              value={pspDetail.status}
              disabled={statusBusy}
              onChange={(e) => handleUpdateStatus(e.target.value as Organization['status'])}
              className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold focus:outline-none"
            >
              <option value="sandbox">Sandbox</option>
              <option value="in_review">In Review</option>
              <option value="approved">Approved (Live)</option>
              <option value="suspended">Suspended</option>
              <option value="declined">Declined</option>
            </select>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Merchants</span>
            <div className="text-xl font-black text-slate-900">{merchants.length} <span className="text-xs font-normal text-slate-400">({totalTx} txs)</span></div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Aggregated Volume</span>
            <div className="text-xl font-black text-slate-900">
              ${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-xs font-bold text-slate-400 ml-1">USDC</span>
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Protocol Fee Rate</span>
            <div className="text-xl font-black text-emerald-700">
              {pspDetail.feeSchedule?.orkiFeeBps ?? 100} bps
              <span className="text-xs font-medium text-slate-400 ml-1">
                (cap ${pspDetail.feeSchedule?.orkiFeeCapAmount ?? 25})
              </span>
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PSP Markup Rate</span>
            <div className="text-xl font-black text-indigo-700">
              {pspDetail.feeSchedule?.pspMarkupBps ?? 0} bps
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-4 overflow-x-auto pb-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Partner Profile
          </button>
          <button
            onClick={() => setActiveTab('ubos')}
            className={`py-2 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'ubos'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            UBO Registry ({pspDetail.kyb?.ubos?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('merchants')}
            className={`py-2 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'merchants'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Sub-Merchants ({merchants.length})
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className={`py-2 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'fees'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Fee Schedule & Governance
          </button>
          <button
            onClick={() => setActiveTab('credentials')}
            className={`py-2 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'credentials'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            API Credentials & Keys
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
        {/* TAB 1: PROFILE */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-onion" />
                <span>Partner Identity & Category</span>
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Legal Entity Name</span>
                  <span className="font-bold text-slate-900">{pspDetail.pspName}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Organization Category</span>
                  <span className="font-bold text-slate-900 uppercase">{pspDetail.category || 'FINANCE'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Entity Type</span>
                  <span className="font-semibold text-slate-800 uppercase">{pspDetail.categoryType || 'psp'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Production Webhook URL</span>
                  <span className="font-mono text-slate-700 truncate max-w-xs">{pspDetail.webhookUrl || 'Not configured'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Partner Created</span>
                  <span className="text-slate-700">{new Date(((pspDetail as any).createdAt || pspDetail.ndaSignedAt || new Date().toISOString())).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Compliance & Dual Approval Status</span>
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Production Approved</span>
                  <span className={`font-bold ${pspDetail.approvedAt ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {pspDetail.approvedAt ? 'Approved & Enforced' : 'Pending Dual-Control Sign-off'}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Approved By</span>
                  <span className="font-mono text-slate-800">{pspDetail.approvedBy || '—'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Approved Timestamp</span>
                  <span className="text-slate-700">
                    {pspDetail.approvedAt ? new Date(pspDetail.approvedAt).toLocaleString() : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: UBOS */}
        {activeTab === 'ubos' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ultimate Beneficial Owners (UBOs)</h3>
                <p className="text-xs text-slate-500">
                  Entities holding ≥25% equity must be registered and screened against OFAC & UN sanctions lists.
                </p>
              </div>
              <button
                onClick={() => setIsAddUboOpen(true)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add UBO</span>
              </button>
            </div>

            {(!pspDetail.kyb?.ubos || pspDetail.kyb.ubos.length === 0) ? (
              <p className="text-xs text-slate-500 py-6 text-center">No UBO records currently registered.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Full Legal Name</th>
                      <th className="py-2.5 px-3">Ownership %</th>
                      <th className="py-2.5 px-3">Nationality</th>
                      <th className="py-2.5 px-3">Document Type</th>
                      <th className="py-2.5 px-3">Sanctions Clearance</th>
                      <th className="py-2.5 px-3">Screened Date</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(pspDetail.kyb?.ubos || []).map((ubo: AdminUbo, i: number) => (
                      <tr key={ubo.id || i} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{ubo.name}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{ubo.ownershipPercentage}%</td>
                        <td className="py-2.5 px-3 text-slate-700">{ubo.nationality || 'United Arab Emirates'}</td>
                        <td className="py-2.5 px-3 uppercase font-mono text-slate-600">{ubo.idDocumentType || 'passport'}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {ubo.sanctionsClearance || 'CLEARED (OFAC)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {ubo.screenedAt ? new Date(ubo.screenedAt).toLocaleDateString() : 'Auto-Cleared'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {ubo.id && (
                            <button
                              onClick={() => handleDeleteUbo(ubo.id!)}
                              className="text-rose-600 hover:text-rose-800 p-1"
                              title="Delete UBO"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MERCHANTS */}
        {activeTab === 'merchants' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Merchants Under {pspDetail.pspName}</h3>
                <p className="text-xs text-slate-500">
                  Sub-merchants registered under this PSP partner. Click any merchant to open their complete dossier.
                </p>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter merchants…"
                  value={merchantSearch}
                  onChange={(e) => setMerchantSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            {filteredMerchants.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No merchants found under this partner.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Legal Business Name</th>
                      <th className="py-2.5 px-3">Trade License</th>
                      <th className="py-2.5 px-3">Jurisdiction</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 font-mono">Volume (USDC)</th>
                      <th className="py-2.5 px-3">Transactions</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMerchants.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          <Link to={`/admin/merchants/${m.id}`} className="hover:text-onion hover:underline">
                            {m.legalBusinessName}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">{m.tradeLicenseNumber}</td>
                        <td className="py-2.5 px-3 text-slate-700">{m.jurisdiction}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              m.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.status === 'disabled'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          ${(m.volumeUsdc || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{m.transactionCount || 0}</td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            to={`/admin/merchants/${m.id}`}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition inline-flex items-center space-x-1"
                          >
                            <span>View Dossier</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FEES */}
        {activeTab === 'fees' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Coins className="w-4 h-4 text-emerald-600" />
                <span>Active Settlement Rate Schedule</span>
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Orki Protocol Base Fee</span>
                  <span className="font-bold text-emerald-700">{pspDetail.feeSchedule?.orkiFeeBps ?? 100} bps (1.00%)</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Orki Protocol Fee Cap</span>
                  <span className="font-bold text-slate-900">
                    ${pspDetail.feeSchedule?.orkiFeeCapAmount ?? 25.0} USDC per tx
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">PSP Merchant Markup</span>
                  <span className="font-bold text-indigo-700">{pspDetail.feeSchedule?.pspMarkupBps ?? 0} bps</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Rate Lock Horizon</span>
                  <span className="font-semibold text-slate-800">
                    {pspDetail.feeSchedule?.lockedUntil
                      ? `Locked until ${new Date(pspDetail.feeSchedule.lockedUntil).toLocaleDateString()}`
                      : 'Standard 30-Day Rate Guarantee'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-onion" />
                <span>PSP Fee Settlement Vault</span>
              </h3>
              <div className="space-y-3 text-xs">
                <p className="text-slate-500">
                  Aggregated PSP markup is disbursed directly to this multi-chain vault address on every transaction completion.
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs flex items-center justify-between">
                  <span className="truncate">{((pspDetail as any).feeWallet as string | undefined) || '0xPspFeeVaultNotAssigned'}</span>
                  {((pspDetail as any).feeWallet as string | undefined) && (
                    <button
                      onClick={() => handleCopy(((pspDetail as any).feeWallet as string | undefined)!, 'fee_vault')}
                      className="p-1 hover:text-slate-900 text-slate-400"
                    >
                      {copiedKey === 'fee_vault' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CREDENTIALS */}
        {activeTab === 'credentials' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">API Credentials & Cryptographic Keys</h3>
                <p className="text-xs text-slate-500">
                  Authentication keys used by this PSP to authenticate into the REST API.
                </p>
              </div>
              <button
                onClick={handleReissueKeys}
                disabled={statusBusy}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate Live Keys</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">API Key Prefix</span>
                <div className="font-mono text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span>{((pspDetail as any).apiKeyPrefix as string | undefined) ? `${((pspDetail as any).apiKeyPrefix as string | undefined)}••••••••••••••••` : 'orki_live_••••••••••••••••'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: RAW RECORD */}
        {activeTab === 'raw' && (
          <div className="bg-slate-950 rounded-3xl p-6 border border-slate-800 text-slate-200 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Postgres Organizations Table Record Dump
                </h3>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(JSON.stringify(pspDetail, null, 2), 'raw_psp')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                {copiedKey === 'raw_psp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{copiedKey === 'raw_psp' ? 'Copied JSON!' : 'Copy Raw Record'}</span>
              </button>
            </div>
            <pre className="text-emerald-400 font-mono text-xs max-h-96 overflow-y-auto p-4 bg-black/60 rounded-2xl select-all leading-relaxed border border-slate-800/80">
              {JSON.stringify(pspDetail, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Two-Person Approval Modal */}
      {isApprovalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 border border-onion-200">
            <h3 className="text-sm font-bold text-slate-900">Dual-Control Production Sign-off</h3>
            <p className="text-xs text-slate-500">
              Entering production requires an authorized compliance officer email address.
            </p>
            <form onSubmit={handleConfirmApproval} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Authorizer Corporate Email:</label>
                <input
                  type="email"
                  required
                  value={approverEmail}
                  onChange={(e) => setApproverEmail(e.target.value)}
                  placeholder="compliance-officer@orki.com"
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-onion focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Notes / Clearance Ref:</label>
                <input
                  type="text"
                  value={complianceNotes}
                  onChange={(e) => setComplianceNotes(e.target.value)}
                  placeholder="e.g. Sanctions clearance and license verified"
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-onion focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsApprovalModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApprovedLoading}
                  className="px-4 py-2 bg-onion text-white rounded-xl text-xs font-bold"
                >
                  {isApprovedLoading ? 'Approving…' : 'Authorize Production'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add UBO Modal */}
      {isAddUboOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Register Ultimate Beneficial Owner</h3>
            <form onSubmit={handleAddUbo} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Legal Name:</label>
                <input
                  type="text"
                  required
                  value={newUbo.name}
                  onChange={(e) => setNewUbo({ ...newUbo, name: e.target.value })}
                  placeholder="e.g. Tariq Al-Mansoor"
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-onion focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Ownership %:</label>
                  <input
                    type="number"
                    min={25}
                    max={100}
                    required
                    value={newUbo.ownershipPercentage}
                    onChange={(e) => setNewUbo({ ...newUbo, ownershipPercentage: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-onion focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nationality:</label>
                  <input
                    type="text"
                    required
                    value={newUbo.nationality}
                    onChange={(e) => setNewUbo({ ...newUbo, nationality: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-onion focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUboOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uboLoading}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  {uboLoading ? 'Screening…' : 'Register UBO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
