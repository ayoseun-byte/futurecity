import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Organization } from '../../types'
import { getApiConfig, requestApi } from '../../services/apiConfig'
import {
  fetchAdminMetrics,
  fetchAdminPsps,
  fetchAdminPspDetail,
  updateAdminPspStatus,
  addAdminPspUbo,
  deleteAdminPspUbo,
  approvePspProduction,
  reissuePspCredentials,
  fetchAdminMerchants,
  updateAdminMerchantStatus,
  fetchAdminTransactions,
  fetchAdminFeeChangeRequests,
  reviewAdminFeeChangeRequest,
  fetchAdminAuditLogs,
  fetchAdminMerchantDetail,
  type AdminMetrics,
  type AdminMerchantRow,
  type AdminMerchantDetailResponse,
  type AdminTransactionRow,
  type AdminAuditLogRow,
  type AdminUbo,
  type PspDetailResponse,
  type FeeChangeRequest,
} from '../../services/adminService'
import { MerchantFullDetailsModal } from '../../components/MerchantFullDetailsModal'
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  UserCheck,
  Key,
  Eye,
  ChevronRight,
  X,
  RotateCw,
  Store,
  Receipt,
  FileText,
  Coins,
  ExternalLink,
  Lock,
  Layers,
  ArrowRight,
  Copy,
} from 'lucide-react'

interface OrkiAdminPortalProps {
  organizations: Organization[]
  onUpdateOrganization: (updated: Organization) => void
  onAddOrganization: (newOrg: Organization) => void
}

type AdminPortalTab = 'psps' | 'merchants' | 'transactions' | 'fees' | 'audit' | 'vaults'

export const OrkiAdminPortal: React.FC<OrkiAdminPortalProps> = ({
  organizations,
  onUpdateOrganization,
  onAddOrganization,
}) => {
  const { login } = useAuth()
  const navigate = useNavigate()

  // Navigation tab
  const [activeTab, setActiveTab] = useState<AdminPortalTab>('psps')

  // Global KPI Metrics from backend
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)

  // PSP State & Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [licenseFilter, setLicenseFilter] = useState<'all' | 'licensed' | 'unlicensed'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleOrganizations, setVisibleOrganizations] = useState<Organization[]>(organizations)
  const [backendPspIds, setBackendPspIds] = useState<Set<string>>(new Set())
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [selectedPspDetail, setSelectedPspDetail] = useState<PspDetailResponse | null>(null)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false)
  const [approvalOfficer, setApprovalOfficer] = useState('david.risk@orki.com')
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [claimLinks, setClaimLinks] = useState<Record<string, string>>({})
  const [apiBusy, setApiBusy] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [apiSuccess, setApiSuccess] = useState<string | null>(null)

  // UBO Modal / Add Form State
  const [isAddUboOpen, setIsAddUboOpen] = useState(false)
  const [newUboForm, setNewUboForm] = useState<AdminUbo>({
    name: '',
    ownershipPercentage: 25,
    nationality: 'United Arab Emirates',
    idDocumentType: 'Passport',
    sanctionsClearance: 'cleared',
  })

  // Sub-Merchants Directory State
  const [merchantsList, setMerchantsList] = useState<AdminMerchantRow[]>([])
  const [merchantsLoading, setMerchantsLoading] = useState(false)
  const [merchantSearch, setMerchantSearch] = useState('')
  const [merchantStatusFilter, setMerchantStatusFilter] = useState('all')

  // Global Transactions State
  const [transactionsList, setTransactionsList] = useState<AdminTransactionRow[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [txChainFilter, setTxChainFilter] = useState('all')
  const [txSearch, setTxSearch] = useState('')

  // Sub-Merchant Full Details State
  const [selectedMerchantDetail, setSelectedMerchantDetail] = useState<AdminMerchantDetailResponse | null>(null)

  // Rate Governance State
  const [feeRequests, setFeeRequests] = useState<FeeChangeRequest[]>([])
  const [feeApproverEmail, setFeeApproverEmail] = useState('')
  const [feeRejectionReason, setFeeRejectionReason] = useState('')

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogRow[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('all')

  // New PSP Registration Form
  const [newPspForm, setNewPspForm] = useState({
    name: '',
    category: 'FINANCE' as 'LOGISTICS' | 'FINANCE' | 'MARKET',
    categoryType: 'psp' as 'psp' | 'fintech' | 'bank' | 'neo_broker',
    isRegulated: false,
    regulatorName: 'VARA (Dubai)',
    licenseNumber: '',
    techName: '',
    techEmail: '',
    commercialName: '',
    commercialEmail: '',
    initialMarkupBps: '35',
  })

  // 1. Initial Load: Metrics, PSPs, Fee Requests
  const loadInitialData = useCallback(async () => {
    const config = getApiConfig()
    if (!config.adminKey) return

    try {
      const [metricsData, pspsData, feeRequestsData] = await Promise.all([
        fetchAdminMetrics(),
        fetchAdminPsps(),
        fetchAdminFeeChangeRequests(),
      ])

      if (metricsData) setMetrics(metricsData)
      if (pspsData.length > 0) {
        setVisibleOrganizations(pspsData)
        setBackendPspIds(new Set(pspsData.map((p) => p.id)))
      }
      setFeeRequests(feeRequestsData as unknown as FeeChangeRequest[])
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to fetch admin data from backend.')
    }
  }, [])

  useEffect(() => {
    void loadInitialData()
  }, [loadInitialData])

  // 2. Tab-specific lazy loaders
  useEffect(() => {
    if (activeTab === 'merchants') {
      setMerchantsLoading(true)
      fetchAdminMerchants({ search: merchantSearch, status: merchantStatusFilter })
        .then((res) => setMerchantsList(res.data))
        .catch((err) => setApiError(err instanceof Error ? err.message : 'Failed to load merchants.'))
        .finally(() => setMerchantsLoading(false))
    } else if (activeTab === 'transactions') {
      setTransactionsLoading(true)
      fetchAdminTransactions({ chain: txChainFilter, search: txSearch })
        .then((res) => setTransactionsList(res.data))
        .catch((err) => setApiError(err instanceof Error ? err.message : 'Failed to load transactions.'))
        .finally(() => setTransactionsLoading(false))
    } else if (activeTab === 'audit') {
      setAuditLoading(true)
      fetchAdminAuditLogs(auditCategoryFilter)
        .then((res) => setAuditLogs(res.data))
        .catch((err) => setApiError(err instanceof Error ? err.message : 'Failed to load audit logs.'))
        .finally(() => setAuditLoading(false))
    }
  }, [activeTab, merchantSearch, merchantStatusFilter, txChainFilter, txSearch, auditCategoryFilter])

  // 3. Inspect PSP Dossier with deep backend details
  const handleOpenDossier = async (org: Organization) => {
    setSelectedOrg(org)
    setSelectedPspDetail(null)
    setApiError(null)
    try {
      const detail = await fetchAdminPspDetail(org.id)
      setSelectedPspDetail(detail)
    } catch {
      // Fallback to local record metadata
    }
  }

  // 3b. Inspect Full Sub-Merchant Dossier with all backend data
  const handleOpenMerchantDetail = async (merchantId: string, fallbackRow?: AdminMerchantRow) => {
    setApiError(null)
    try {
      const detail = await fetchAdminMerchantDetail(merchantId)
      setSelectedMerchantDetail(detail)
    } catch {
      if (fallbackRow) {
        setSelectedMerchantDetail({
          id: fallbackRow.id,
          organizationId: fallbackRow.organizationId,
          organizationName: fallbackRow.organizationName,
          organizationCategory: fallbackRow.organizationCategory,
          externalId: fallbackRow.externalId,
          legalBusinessName: fallbackRow.legalBusinessName,
          tradeLicenseNumber: fallbackRow.tradeLicenseNumber,
          jurisdiction: fallbackRow.jurisdiction,
          representativeName: fallbackRow.representativeName,
          representativeEmail: fallbackRow.representativeEmail,
          status: fallbackRow.status,
          settlementMode: fallbackRow.settlementMode,
          baseWalletAddress: fallbackRow.baseWalletAddress,
          solanaWalletAddress: fallbackRow.solanaWalletAddress,
          hasPasskey: false,
          statusReason: fallbackRow.statusReason,
          consentDetails: { consentMethod: 'dashboard', consentNoticeVersion: '1.0' },
          stats: {
            totalVolumeUsdc: fallbackRow.volumeUsdc,
            totalTransactions: fallbackRow.transactionCount,
            totalOrkiFeesUsdc: fallbackRow.volumeUsdc * 0.01,
            totalPspMarkupUsdc: fallbackRow.volumeUsdc * 0.0035,
          },
          verifiedAt: fallbackRow.verifiedAt,
          activatedAt: fallbackRow.activatedAt,
          createdAt: fallbackRow.createdAt,
          rawRecord: fallbackRow as unknown as Record<string, unknown>,
        })
      }
    }
  }

  // 4. Two-Person Production Approval Handler (Stage 7)
  const handleExecuteApproval = async () => {
    if (!selectedOrg) return

    const preparer = selectedOrg.preparedBy || 'sarah.ops@orki.com'
    if (approvalOfficer === preparer) {
      setApprovalError(
        `Two-Person Rule Violation: The approver (${approvalOfficer}) cannot be the same person who prepared the approval (${preparer}).`
      )
      return
    }

    setApiBusy(true)
    setApprovalError(null)

    const payload = {
      preparedBy: preparer,
      approvedBy: approvalOfficer,
      agreement: {
        signedAt: new Date().toISOString(),
        version: '2026.1-ORKI-PSP-NC',
        documentHash: '0x' + Math.random().toString(36).substring(2, 18),
      },
      kyb: {
        caseReference: selectedOrg.dueDiligence?.caseReference || `KYB-${selectedOrg.id.toUpperCase()}`,
        riskRating: (selectedOrg.dueDiligence?.riskRating || 'low').toLowerCase(),
        nextReviewDue: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      },
      pspRegulatoryStatus: {
        isRegulatedEntity: selectedOrg.isRegulatedEntity ?? false,
        regulator: selectedOrg.dueDiligence?.regulatorName || 'VARA',
        licenseReference: selectedOrg.dueDiligence?.licenseNumber || 'DMCC-REG-2026',
      },
      feeSchedule: {
        paymentRateBps: 100 as const,
        pspMarkupBps: selectedOrg.feeSchedule?.pspMarkupBps || 35,
        combinedCapBps: 500,
        lockedUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      },
      goLiveChecklist: {
        signedAt: new Date().toISOString(),
        signedBy: selectedOrg.contacts?.find((c) => c.role === 'technical')?.email || 'tech@example.com',
        webhookSignaturesVerified: true as const,
        idempotencyHandled: true as const,
        passkeyIntegrationVerified: true as const,
        sandboxTransactionsPassed: true as const,
        reconciliationJobTested: true as const,
        settlementModeConfigured: true as const,
        errorHandlingVerified: true as const,
        rateLimitsRespected: true as const,
        tlsAndIpWhitelistingConfirmed: true as const,
      },
    }

    try {
      if (backendPspIds.has(selectedOrg.id)) {
        await approvePspProduction(selectedOrg.id, payload)
      }

      const updated: Organization = {
        ...selectedOrg,
        status: 'approved',
        approvedBy: approvalOfficer,
        approvedAt: new Date().toISOString(),
        apiCredentials: {
          ...selectedOrg.apiCredentials,
          production: {
            environment: 'production',
            publicKey: 'pk_live_' + Math.random().toString(36).substring(2, 14),
            secretKeyMasked: 'sk_live_••••••••••••••••' + Math.random().toString(36).substring(2, 6),
            webhookSecretMasked: 'whsec_live_••••••••••••••••' + Math.random().toString(36).substring(2, 6),
            shareUrl: 'https://share.1password.com/s#claim_live_' + selectedOrg.id,
            status: 'link_sent',
            sentTo: selectedOrg.contacts?.find((c) => c.role === 'technical')?.email || 'tech@example.com',
            expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          },
        },
      }

      onUpdateOrganization(updated)
      setSelectedOrg(updated)
      setIsApprovalModalOpen(false)
      setApiSuccess(`Production credentials approved and issued for ${selectedOrg.name}.`)
      void loadInitialData()
    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : 'Stage 7 sign-off failed.')
    } finally {
      setApiBusy(false)
    }
  }

  // 5. Reissue API Credentials
  const handleReissueKeys = async (environment: 'sandbox' | 'production') => {
    if (!selectedOrg) return
    const envUpper = environment.toUpperCase()
    if (
      !window.confirm(
        `Are you sure you want to reissue ${envUpper} credentials for ${selectedOrg.name}? Any existing ${envUpper} secret keys will be immediately revoked.`
      )
    ) {
      return
    }

    setApiBusy(true)
    setApiError(null)
    try {
      const res = await reissuePspCredentials(
        selectedOrg.id,
        environment,
        `Reissued from Admin Portal by ${approvalOfficer || 'admin'}`
      )
      setClaimLinks((current) => ({ ...current, [selectedOrg.id]: res.keyDelivery.temporaryShareUrl }))
      setApiSuccess(`Fresh ${envUpper} claim link generated for ${selectedOrg.name}.`)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to reissue credentials.')
    } finally {
      setApiBusy(false)
    }
  }

  // 6. Handle New PSP Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPspForm.name.trim()) return
    setApiBusy(true)
    setApiError(null)
    try {
      const config = getApiConfig()
      if (!config.adminKey) throw new Error('Admin API key is required.')
      const created = await requestApi<{
        pspId: string
        name: string
        category: Organization['category']
        categoryType: Organization['categoryType']
        status: Organization['status']
        feeSchedule?: Organization['feeSchedule']
        keyDelivery: { status: string; sentTo: string; expiresInHours: number; temporaryShareUrl: string }
      }>(
        config,
        'POST',
        '/api/v1/admin/psps',
        {
          pspName: newPspForm.name.trim(),
          category: newPspForm.category,
          categoryType: newPspForm.categoryType,
          contacts: [{ name: newPspForm.techName, email: newPspForm.techEmail, role: 'technical' }],
        },
        'admin'
      )

      const initialMarkup = parseInt(newPspForm.initialMarkupBps || '35', 10)
      const lockDate = new Date()
      lockDate.setDate(lockDate.getDate() + 30)

      const newOrg: Organization = {
        id: created.pspId,
        name: created.name,
        category: created.category,
        categoryType: created.categoryType,
        status: created.status,
        isRegulatedEntity: newPspForm.isRegulated,
        feeWallet: '',
        contacts: [{ name: newPspForm.techName, email: newPspForm.techEmail, role: 'technical' }],
        feeSchedule: created.feeSchedule || {
          orkiFeeBps: 100,
          pspMarkupBps: initialMarkup,
          combinedCapBps: 200,
          lockedUntil: lockDate.toISOString(),
        },
        createdAt: new Date().toISOString(),
      }

      setClaimLinks((current) => ({ ...current, [created.pspId]: created.keyDelivery.temporaryShareUrl }))
      onAddOrganization(newOrg)
      setVisibleOrganizations((current) => [newOrg, ...current.filter((org) => org.id !== newOrg.id)])
      setBackendPspIds((current) => new Set([...current, newOrg.id]))
      setSelectedOrg(newOrg)
      setIsRegisterModalOpen(false)
      setApiSuccess(`New PSP ${newOrg.name} successfully registered in sandbox.`)
      setNewPspForm({
        name: '',
        category: 'FINANCE',
        categoryType: 'psp',
        isRegulated: false,
        regulatorName: 'VARA (Dubai)',
        licenseNumber: '',
        techName: '',
        techEmail: '',
        commercialName: '',
        commercialEmail: '',
        initialMarkupBps: '35',
      })
    } catch (reason) {
      setApiError(reason instanceof Error ? reason.message : 'PSP could not be created.')
    } finally {
      setApiBusy(false)
    }
  }

  // 7. Update PSP Lifecycle Status (Suspend / Reactivate)
  const handleTogglePspStatus = async (pspId: string, currentStatus: string) => {
    const newStatus = currentStatus.toLowerCase() === 'suspended' ? 'approved' : 'suspended'
    const confirmMsg =
      newStatus === 'suspended'
        ? 'Are you sure you want to suspend this PSP? All payment creation and API access will be frozen.'
        : 'Reactivate this PSP?'
    if (!window.confirm(confirmMsg)) return

    setApiBusy(true)
    try {
      await updateAdminPspStatus(pspId, newStatus, `Manual status change via Admin Portal`)
      setVisibleOrganizations((current) =>
        current.map((org) => (org.id === pspId ? { ...org, status: newStatus as Organization['status'] } : org))
      )
      if (selectedOrg && selectedOrg.id === pspId) {
        setSelectedOrg({ ...selectedOrg, status: newStatus as Organization['status'] })
      }
      setApiSuccess(`PSP status updated to ${newStatus}.`)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Status update failed.')
    } finally {
      setApiBusy(false)
    }
  }

  // 8. Add UBO to PSP
  const handleAddUbo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrg) return
    setApiBusy(true)
    try {
      await addAdminPspUbo(selectedOrg.id, newUboForm)
      setIsAddUboOpen(false)
      setApiSuccess(`Beneficial owner ${newUboForm.name} screened and added.`)
      await handleOpenDossier(selectedOrg)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to add UBO.')
    } finally {
      setApiBusy(false)
    }
  }

  // 9. Delete UBO from PSP
  const handleDeleteUbo = async (uboId: string) => {
    if (!selectedOrg) return
    if (!window.confirm('Remove this beneficial owner from the entity dossier?')) return
    setApiBusy(true)
    try {
      await deleteAdminPspUbo(selectedOrg.id, uboId)
      setApiSuccess('Beneficial owner removed.')
      await handleOpenDossier(selectedOrg)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to remove UBO.')
    } finally {
      setApiBusy(false)
    }
  }

  // 10. Emergency Freeze / Unfreeze Sub-Merchant
  const handleToggleMerchantStatus = async (merchantId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'disabled' ? 'active' : 'disabled'
    setApiBusy(true)
    try {
      await updateAdminMerchantStatus(merchantId, newStatus, 'Status updated by Protocol Administrator')
      setMerchantsList((current) =>
        current.map((m) => (m.id === merchantId ? { ...m, status: newStatus } : m))
      )
      setApiSuccess(`Merchant status updated to ${newStatus}.`)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to update merchant status.')
    } finally {
      setApiBusy(false)
    }
  }

  // 11. Review Fee Change Request
  const reviewFeeRequest = async (request: FeeChangeRequest, action: 'approve' | 'reject') => {
    const config = getApiConfig()
    if (!config.adminKey) {
      setApiError('Set the Orki admin API key in the Backend API workbench.')
      return
    }
    if (!config.feeApproverKey) {
      setApiError('Set the separate fee approver key in the Backend API workbench.')
      return
    }
    if (!feeApproverEmail.trim()) {
      setApiError('Enter the second approver email before reviewing fee requests.')
      return
    }
    if (action === 'reject' && feeRejectionReason.trim().length < 10) {
      setApiError('Enter a rejection reason of at least 10 characters.')
      return
    }

    setApiBusy(true)
    setApiError(null)
    try {
      await reviewAdminFeeChangeRequest(request.id, action, feeApproverEmail, feeRejectionReason)
      setApiSuccess(`Rate change request ${action === 'approve' ? 'approved' : 'rejected'}.`)
      const refreshed = await fetchAdminFeeChangeRequests()
      setFeeRequests(refreshed as unknown as FeeChangeRequest[])
    } catch (reason) {
      setApiError(reason instanceof Error ? reason.message : `Fee request could not be processed.`)
    } finally {
      setApiBusy(false)
    }
  }

  // Filter PSPs for Tab 1
  const filteredOrgs = visibleOrganizations.filter((org) => {
    if (statusFilter !== 'all' && (org.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false
    if (licenseFilter === 'licensed' && org.isRegulatedEntity !== true) return false
    if (licenseFilter === 'unlicensed' && org.isRegulatedEntity !== false) return false
    if (categoryFilter !== 'all' && (org.category || 'FINANCE') !== categoryFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        org.name.toLowerCase().includes(q) ||
        org.id.toLowerCase().includes(q) ||
        (org.dueDiligence?.caseReference || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {apiError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-center justify-between">
          <span>{apiError}</span>
          <button onClick={() => setApiError(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-2">✕</button>
        </div>
      )}
      {apiSuccess && (
        <div role="alert" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-center justify-between">
          <span>{apiSuccess}</span>
          <button onClick={() => setApiSuccess(null)} className="text-emerald-500 hover:text-emerald-700 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-slate-700/60 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-onion-500/20 text-onion-300 border border-onion-500/30">
                Orki Protocol Headquarters · Multi-Tenancy Core
              </span>
              <span className="text-slate-400 text-xs">· Two-Person Rule Enforced</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Institutional Settlement & Governance Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Supervise multi-tenant PSPs, sub-merchants, cryptographic rate locks, and smart contract splitters across <strong>Base (EVM)</strong> and <strong>Solana (SVM)</strong>.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-onion-700 to-onion text-white font-bold text-xs shadow-lg shadow-onion/30 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard New PSP (Stage 1-3)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Protocol KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Total PSPs</span>
            <Building2 className="w-4 h-4 text-onion" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics?.psps.total ?? visibleOrganizations.length}</p>
          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
            <span className="text-emerald-600 font-semibold">{metrics?.psps.approved ?? visibleOrganizations.filter(o => o.status === 'approved').length} Live</span>
            <span>·</span>
            <span className="text-amber-600 font-semibold">{metrics?.psps.inReview ?? visibleOrganizations.filter(o => o.status === 'in_review').length} In Review</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Sub-Merchants</span>
            <Store className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics?.merchants.total ?? '—'}</p>
          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
            <span className="text-emerald-600 font-semibold">{metrics?.merchants.active ?? '—'} Active</span>
            <span>·</span>
            <span className="text-slate-400 font-semibold">{metrics?.merchants.invited ?? '—'} Invited</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Settlement Volume</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">
            ${(metrics?.settlement.totalVolumeUsdc ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-600">
            24h: ${(metrics?.settlement.volume24hUsdc ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Rate Lock Queue</span>
            <Clock className="w-4 h-4 text-onion-600" />
          </div>
          <p className="text-2xl font-black text-onion">
            {feeRequests.length}
          </p>
          <p className="text-[11px] text-onion-700">30-day notice dual-control</p>
        </div>
      </div>

      {/* Admin Tabbed Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('psps')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'psps'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>PSP Network ({visibleOrganizations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('merchants')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'merchants'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Cross-Tenant Merchants</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'transactions'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Settlement Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('fees')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'fees'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Rate Governance ({feeRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audit Logs</span>
        </button>

        <button
          onClick={() => setActiveTab('vaults')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'vaults'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Smart Contracts</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: PSP NETWORK & ONBOARDING (8-STAGE GOVERNANCE)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'psps' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search PSP name, ID, ref..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved & Live</option>
                <option value="in_review">In Review (Stage 7 Ready)</option>
                <option value="sandbox">Sandbox Only</option>
                <option value="suspended">Suspended</option>
              </select>

              <select
                value={licenseFilter}
                onChange={(e) => setLicenseFilter(e.target.value as 'all' | 'licensed' | 'unlicensed')}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
              >
                <option value="all">All Licenses</option>
                <option value="licensed">Licensed Entity (VARA/CBUAE/FSRA)</option>
                <option value="unlicensed">Unlicensed FinTech (UBO Screened)</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
              >
                <option value="all">All Categories</option>
                <option value="FINANCE">Finance</option>
                <option value="LOGISTICS">Logistics</option>
                <option value="MARKET">Marketplace</option>
              </select>
            </div>

            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredOrgs.length} of {visibleOrganizations.length} PSPs
            </span>
          </div>

          {/* PSPs Master Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">PSP Legal Entity</th>
                    <th className="py-3.5 px-4">Regulatory License</th>
                    <th className="py-3.5 px-4">Stage & Status</th>
                    <th className="py-3.5 px-4">Markup (Rate Lock)</th>
                    <th className="py-3.5 px-4">Credentials & Approver</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrgs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No PSPs match current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrgs.map((org) => {
                      const isApproved = (org.status || '').toLowerCase() === 'approved'
                      const isSuspended = (org.status || '').toLowerCase() === 'suspended'
                      const isInReview = (org.status || '').toLowerCase() === 'in_review'

                      return (
                        <tr key={org.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Name & ID */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                              <span>{org.name}</span>
                              <span className="text-[10px] font-mono text-slate-400 font-normal">({org.categoryType?.toUpperCase() || 'PSP'})</span>
                            </div>
                            <p className="text-[11px] font-mono text-slate-400 mt-0.5">{org.id}</p>
                          </td>

                          {/* Regulatory License */}
                          <td className="py-3.5 px-4">
                            {org.isRegulatedEntity ? (
                              <div className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg w-max">
                                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="font-bold text-[11px]">
                                  {org.dueDiligence?.regulatorName || 'Regulated'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg w-max">
                                <UserCheck className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="font-bold text-[11px]">Unlicensed (UBO Check)</span>
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {isApproved && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Approved & Live
                              </span>
                            )}
                            {isInReview && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                In Review (Stage 7 Ready)
                              </span>
                            )}
                            {isSuspended && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                Suspended
                              </span>
                            )}
                            {!isApproved && !isInReview && !isSuspended && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                Sandbox Mode
                              </span>
                            )}
                          </td>

                          {/* Markup & Rate Lock */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900">
                              {((org.feeSchedule?.pspMarkupBps ?? 35) / 100).toFixed(2)}%
                            </span>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Locked for 30d
                            </p>
                          </td>

                          {/* Credentials */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-[11px] text-slate-600">
                                {isApproved ? 'pk_live_••••' : 'pk_test_••••'}
                              </span>
                              {org.approvedBy && (
                                <span className="text-[10px] text-slate-400">
                                  by {org.approvedBy.split('@')[0]}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => void handleOpenDossier(org)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 transition"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>Dossier</span>
                            </button>

                            <button
                              onClick={() => void handleTogglePspStatus(org.id, org.status || '')}
                              className={`inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                                isSuspended
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                              }`}
                              title={isSuspended ? 'Reactivate PSP' : 'Suspend PSP'}
                            >
                              {isSuspended ? 'Reactivate' : 'Suspend'}
                            </button>

                            <button
                              onClick={() => {
                                login('org', org.id)
                                navigate('/psp')
                              }}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-onion-50 hover:bg-onion-100 text-onion font-bold text-xs transition"
                              title="Sign in directly as this PSP"
                            >
                              <span>Enter PSP</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: CROSS-TENANT SUB-MERCHANTS DIRECTORY
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'merchants' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search merchant, license, email..."
                  value={merchantSearch}
                  onChange={(e) => setMerchantSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
                />
              </div>

              <select
                value={merchantStatusFilter}
                onChange={(e) => setMerchantStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
              >
                <option value="all">All Merchant Statuses</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled / Frozen</option>
                <option value="invited">Invited / Onboarding</option>
              </select>
            </div>

            <span className="text-xs text-slate-500 font-medium">
              Protocol-Wide Sub-Merchants ({merchantsList.length})
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Merchant Entity</th>
                    <th className="py-3.5 px-4">Parent PSP</th>
                    <th className="py-3.5 px-4">Trade License & Jurisdiction</th>
                    <th className="py-3.5 px-4">Settlement Mode & Wallets</th>
                    <th className="py-3.5 px-4">Volume ($ USDC)</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Emergency Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {merchantsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Loading cross-tenant merchants...
                      </td>
                    </tr>
                  ) : merchantsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No sub-merchants found across the protocol.
                      </td>
                    </tr>
                  ) : (
                    merchantsList.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => void handleOpenMerchantDetail(m.id, m)}
                            className="font-bold text-slate-900 hover:text-onion text-left transition flex items-center space-x-1"
                          >
                            <span>{m.legalBusinessName}</span>
                            <Eye className="w-3 h-3 text-slate-400 opacity-60" />
                          </button>
                          <p className="text-[11px] font-mono text-slate-400 mt-0.5">{m.id} · {m.representativeEmail}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800">{m.organizationName}</span>
                          <p className="text-[10px] text-slate-400 font-mono">{m.organizationId}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-mono text-slate-700">{m.tradeLicenseNumber}</p>
                          <p className="text-[11px] text-slate-500">{m.jurisdiction}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-700 uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                            {m.settlementMode}
                          </span>
                          <p className="text-[10px] font-mono text-slate-400 mt-1 truncate max-w-[140px]">
                            {m.baseWalletAddress || m.solanaWalletAddress || 'No wallet registered'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900">
                            ${m.volumeUsdc.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <p className="text-[10px] text-slate-400">{m.transactionCount} transactions</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.status === 'disabled'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {m.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => void handleOpenMerchantDetail(m.id, m)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View Details</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleToggleMerchantStatus(m.id, m.status)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                              m.status === 'disabled'
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                            }`}
                          >
                            {m.status === 'disabled' ? 'Unfreeze' : 'Emergency Freeze'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: GLOBAL SETTLEMENT LEDGER & 3-WAY SPLIT STREAM
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search tx hash, payer, merchant..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
                />
              </div>

              <select
                value={txChainFilter}
                onChange={(e) => setTxChainFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
              >
                <option value="all">All Chains (Base & Solana)</option>
                <option value="base">Base (EVM)</option>
                <option value="solana">Solana (SVM)</option>
              </select>
            </div>

            <span className="text-xs text-slate-500 font-medium">
              Live Protocol Ledger ({transactionsList.length})
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Transaction ID & Hash</th>
                    <th className="py-3.5 px-4">Chain Rail</th>
                    <th className="py-3.5 px-4">Parties (PSP · Merchant)</th>
                    <th className="py-3.5 px-4">Gross Amount</th>
                    <th className="py-3.5 px-4">3-Way Split Distribution</th>
                    <th className="py-3.5 px-4">Status & Time</th>
                    <th className="py-3.5 px-4 text-right">Explorer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactionsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Loading settlement ledger...
                      </td>
                    </tr>
                  ) : transactionsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No transactions recorded in current stream.
                      </td>
                    </tr>
                  ) : (
                    transactionsList.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-mono font-bold text-slate-900">{tx.id}</p>
                          <p className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                            {tx.txHash || 'Pending on-chain'}
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              tx.chain.toLowerCase() === 'solana'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {tx.chain}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900">{tx.merchantName}</p>
                          <p className="text-[11px] text-slate-500">{tx.organizationName}</p>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          ${tx.grossAmount.toFixed(2)} {tx.currency}
                        </td>

                        <td className="py-3.5 px-4 space-y-0.5 text-[11px]">
                          <div className="flex justify-between max-w-[200px]">
                            <span className="text-slate-500">Merchant Net:</span>
                            <span className="font-bold text-slate-800">${tx.split.merchantNet.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between max-w-[200px]">
                            <span className="text-onion-600">PSP Markup:</span>
                            <span className="font-bold text-onion">${tx.split.pspMarkupAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between max-w-[200px]">
                            <span className="text-emerald-600">Orki Protocol:</span>
                            <span className="font-bold text-emerald-700">${tx.split.orkiFeeAmount.toFixed(2)}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {tx.status.toUpperCase()}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1">{new Date(tx.createdAt).toLocaleTimeString()}</p>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {tx.explorerUrl ? (
                            <a
                              href={tx.explorerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1 text-onion hover:text-onion-700 font-bold"
                            >
                              <span>View</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Simulated</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: RATE GOVERNANCE & 30-DAY RATE LOCKS
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'fees' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-900">PSP Fee-Change Dual-Control Review Queue</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    feeRequests.length > 0
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {feeRequests.length} Pending
                </span>
              </div>
              <p className="text-xs text-slate-500">
                In accordance with Orki safety invariants, fee adjustments require dual-officer sign-off and cannot exceed the 100 bps PSP markup cap.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <input
                type="email"
                value={feeApproverEmail}
                onChange={(e) => setFeeApproverEmail(e.target.value)}
                placeholder="Second approver email"
                className="rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-onion/20 focus:border-onion sm:w-60"
              />
              <input
                type="text"
                value={feeRejectionReason}
                onChange={(e) => setFeeRejectionReason(e.target.value)}
                placeholder="Rejection reason (if rejecting)"
                className="rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-200 sm:w-72"
              />
            </div>
          </div>

          {feeRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">No pending rate change requests.</p>
              <p className="text-slate-400 text-[11px]">All PSP commission markups are locked under approved schedules.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {feeRequests.map((request) => (
                <article key={request.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/30 hover:bg-white transition-all space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">
                        {request.organization_name} · {(request.requested_markup_bps / 100).toFixed(2)}%
                      </h3>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Requested by <span className="font-medium text-slate-700">{request.requested_by}</span> · {new Date(request.submitted_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                      Effective: {new Date(request.effective_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/60">{request.reason}</p>
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => void reviewFeeRequest(request, 'reject')}
                      disabled={apiBusy}
                      className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => void reviewFeeRequest(request, 'approve')}
                      disabled={apiBusy}
                      className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-xs transition"
                    >
                      Approve when eligible
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 5: IMMUTABLE AUDIT TRAIL & LOGS
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <select
                value={auditCategoryFilter}
                onChange={(e) => setAuditCategoryFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
              >
                <option value="all">All Audit Categories</option>
                <option value="STAGE_7_APPROVAL">Stage 7 Approvals</option>
                <option value="RATE_GOVERNANCE">Rate Governance</option>
                <option value="SECURITY">Security & Credentials</option>
                <option value="ONBOARDING">PSP Onboarding</option>
              </select>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Audit Event Log Stream ({auditLogs.length})
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="divide-y divide-slate-100">
              {auditLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">Loading audit trail...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">No audit events recorded yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                          {log.action}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-semibold text-slate-700">{log.actor}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-bold text-onion">{log.targetName}</span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{log.details}</p>
                    </div>

                    <div className="text-right flex-shrink-0 text-[11px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 6: SMART CONTRACT VAULTS & PROTOCOL CONFIGURATION
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'vaults' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                EVM
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Base Network Payment Splitter (V2)</h3>
                <p className="text-[11px] text-slate-400">OrkiPaymentSplitterV2.sol · Cancun EVM</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Contract Invariant:</span>
                <span className="font-mono font-bold text-slate-800">Zero-Sum Tri-Wallet Split</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rate Lock Delay:</span>
                <span className="font-mono font-bold text-slate-800">30 Days (Hikes only)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hard Cap:</span>
                <span className="font-mono font-bold text-slate-800">500 bps (5.00%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fuzz Testing:</span>
                <span className="font-mono font-bold text-emerald-600">256-Run Passed</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Enforces non-custodial direct ERC20 USDC / native ETH distribution directly inside the payment transaction. Orki base fee, PSP markup, and Merchant net amounts settle atomically.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                SVM
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Solana Split Settlement Core</h3>
                <p className="text-[11px] text-slate-400">Anchor 0.32+ Program · Jupiter Swap Rails</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Routing Mode:</span>
                <span className="font-mono font-bold text-slate-800">Direct SPL ATA + Jupiter CPI</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Supported Token:</span>
                <span className="font-mono font-bold text-slate-800">USDC (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Replay Protection:</span>
                <span className="font-mono font-bold text-slate-800">State Account PDA seeds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-mono font-bold text-emerald-600">Operational</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Provides multi-party non-custodial token settlement across Solana sub-second finality rails with instantaneous merchant wallet credit.
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PSP DOSSIER INSPECTION MODAL (STAGE 1 TO 8 INSPECTION)
         ───────────────────────────────────────────────────────────── */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 border border-slate-200 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                  <span>{selectedOrg.name}</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {selectedOrg.id}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Onboarded on {new Date(selectedOrg.createdAt).toLocaleDateString()} · Category: {selectedOrg.category || 'FINANCE'}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrg(null)}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Due Diligence & UBOs */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Due Diligence & Beneficial Ownership (UBO)
                    </h3>
                    {!selectedOrg.isRegulatedEntity && (
                      <button
                        onClick={() => setIsAddUboOpen(true)}
                        className="inline-flex items-center space-x-1 text-[11px] font-bold text-onion hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add UBO</span>
                      </button>
                    )}
                  </div>

                  {selectedOrg.isRegulatedEntity ? (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 space-y-1">
                      <p className="font-bold">Regulated Financial Institution</p>
                      <p className="text-[11px]">
                        Licensed under {selectedOrg.dueDiligence?.regulatorName || 'VARA'} (License #{selectedOrg.dueDiligence?.licenseNumber || 'DMCC-2026'}).
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
                        Heightened UBO screening applied for unlicensed FinTech entity.
                      </div>

                      {/* UBO list from backend or local */}
                      <div className="space-y-1.5 mt-2">
                        {((selectedPspDetail?.kyb?.ubos) ?? (selectedOrg.dueDiligence?.ubos) ?? []).map((ubo, idx) => (
                          <div key={idx} className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-[11px]">
                            <div>
                              <p className="font-bold text-slate-800">{ubo.name} ({ubo.ownershipPercentage}%)</p>
                              <p className="text-slate-400">{ubo.nationality} · {ubo.idDocumentType}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-emerald-600 font-bold">Clear</span>
                              {(ubo as AdminUbo).id && (
                                <button
                                  onClick={() => void handleDeleteUbo((ubo as AdminUbo).id!)}
                                  className="text-rose-500 hover:text-rose-700 font-bold text-xs"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Fee Schedule */}
                <div className="p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Fee Schedule & Safety Caps
                  </h3>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-slate-400 text-[10px]">Orki Base</p>
                      <p className="font-bold text-slate-900 mt-0.5">1.00%</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-slate-400 text-[10px]">PSP Markup</p>
                      <p className="font-bold text-onion mt-0.5">{((selectedOrg.feeSchedule?.pspMarkupBps || 35) / 100).toFixed(2)}%</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-slate-400 text-[10px]">Safety Cap</p>
                      <p className="font-bold text-slate-900 mt-0.5">5.00%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Key Delivery & Stage 7 Production Gate */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Cryptographic Credentials & Key Rotation
                  </h3>

                  {claimLinks[selectedOrg.id] && (
                    <div className="p-3 bg-onion-50 border border-onion-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-onion-900">Reissued Credentials Ready</span>
                        <span className="text-[10px] text-onion-700 bg-onion-100 font-bold px-2 py-0.5 rounded-full">Single-Use</span>
                      </div>
                      <a
                        href={claimLinks[selectedOrg.id]}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 shadow"
                      >
                        <Key className="w-3.5 h-3.5 text-onion-400" />
                        <span>Claim Credentials (Single-Use Link)</span>
                      </a>
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">Sandbox API Key</p>
                      <p className="font-mono text-[11px] text-slate-500">pk_test_••••••••••••</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleReissueKeys('sandbox')}
                      disabled={apiBusy}
                      className="inline-flex items-center space-x-1 text-xs font-semibold text-onion hover:text-onion-700"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Reissue</span>
                    </button>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">Production Key</p>
                      <p className="font-mono text-[11px] text-slate-500">
                        {(selectedOrg.status || '').toLowerCase() === 'approved' ? 'pk_live_••••••••••••' : 'Awaiting Stage 7 Sign-Off'}
                      </p>
                    </div>
                    {(selectedOrg.status || '').toLowerCase() === 'approved' && (
                      <button
                        type="button"
                        onClick={() => void handleReissueKeys('production')}
                        disabled={apiBusy}
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>Reissue</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Stage 7 Two-Person Sign-Off Card */}
                <div className="p-5 rounded-2xl bg-onion-50/60 border border-onion-200 space-y-3">
                  <div className="flex items-center space-x-2 text-onion">
                    <Key className="w-5 h-5 flex-shrink-0" />
                    <h4 className="font-bold text-sm text-slate-900">
                      Stage 7: Two-Person Production Approval Rule
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600">
                    Prepared by: <strong>{selectedOrg.preparedBy || 'sarah.ops@orki.com'}</strong>. Sign-off requires an independent compliance or risk officer.
                  </p>

                  {(selectedOrg.status || '').toLowerCase() === 'approved' ? (
                    <div className="p-3 bg-emerald-100 rounded-xl border border-emerald-300 text-xs text-emerald-900 font-bold flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <span>Production Approved by {selectedOrg.approvedBy}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsApprovalModalOpen(true)}
                      className="w-full py-2.5 px-4 bg-onion hover:bg-onion-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Execute Two-Person Production Sign-Off</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Complete Raw PSP Database Record Inspector */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs">Complete Raw PSP Database Record</h4>
                  <p className="text-[11px] text-slate-400">
                    Live database record from organizations table, contacts, fee schedules, and compliance gates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedPspDetail || selectedOrg, null, 2))
                    setApiSuccess('Copied raw PSP JSON to clipboard!')
                    setTimeout(() => setApiSuccess(null), 2000)
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copy Raw JSON</span>
                </button>
              </div>
              <pre className="text-emerald-400 font-mono text-[11px] max-h-48 overflow-y-auto p-3 bg-black/60 rounded-xl select-all leading-relaxed">
                {JSON.stringify(selectedPspDetail || selectedOrg, null, 2)}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={() => {
                  login('org', selectedOrg.id)
                  navigate('/psp')
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition flex items-center space-x-1.5"
              >
                <span>Access this PSP Portal View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSelectedOrg(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TWO-PERSON APPROVAL CONFIRMATION MODAL
         ───────────────────────────────────────────────────────────── */}
      {isApprovalModalOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 border border-onion-200">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-onion" />
                <span>Confirm Production Approval</span>
              </h3>
              <button onClick={() => setIsApprovalModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Confirm that all mandatory Stage 7 preconditions have been reviewed and verified:
            </p>

            <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Non-Custodial Agreement & Fee Schedule Signed</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Due Diligence Completed ({selectedOrg.isRegulatedEntity ? 'Regulator Verified' : 'UBOs Screened'})</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Go-Live Checklist Signed by PSP Technical Lead</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Authorizing Second Approver Email
              </label>
              <input
                type="email"
                value={approvalOfficer}
                onChange={(e) => setApprovalOfficer(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Cannot match preparer: <strong>{selectedOrg.preparedBy || 'sarah.ops@orki.com'}</strong>
              </p>
            </div>

            {approvalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{approvalError}</span>
              </div>
            )}

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setIsApprovalModalOpen(false)}
                className="w-1/2 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleExecuteApproval()}
                disabled={apiBusy}
                className="w-1/2 py-2.5 bg-onion text-white rounded-xl text-xs font-bold hover:bg-onion-700 shadow-md disabled:opacity-50"
              >
                {apiBusy ? 'Issuing...' : 'Issue Production Keys'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ADD UBO MODAL
         ───────────────────────────────────────────────────────────── */}
      {isAddUboOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add Beneficial Owner (≥25%)</h3>
              <button onClick={() => setIsAddUboOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUbo} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Al-Mansoor"
                  value={newUboForm.name}
                  onChange={(e) => setNewUboForm({ ...newUboForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ownership Share (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={newUboForm.ownershipPercentage}
                    onChange={(e) => setNewUboForm({ ...newUboForm, ownershipPercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nationality</label>
                  <input
                    type="text"
                    required
                    value={newUboForm.nationality}
                    onChange={(e) => setNewUboForm({ ...newUboForm, nationality: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUboOpen(false)}
                  className="w-1/2 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={apiBusy}
                  className="w-1/2 py-2 bg-onion text-white rounded-xl text-xs font-bold hover:bg-onion-700"
                >
                  Screen & Add UBO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          REGISTER NEW PSP MODAL (STAGES 1-3)
         ───────────────────────────────────────────────────────────── */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 border border-slate-200 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-onion" />
                <span>Onboard New PSP (Stages 1-3)</span>
              </h3>
              <button onClick={() => setIsRegisterModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">PSP Legal Entity Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Citadel Pay FZ-LLC"
                  value={newPspForm.name}
                  onChange={(e) => setNewPspForm({ ...newPspForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newPspForm.category}
                    onChange={(e) => setNewPspForm({ ...newPspForm, category: e.target.value as 'FINANCE' | 'LOGISTICS' | 'MARKET' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
                  >
                    <option value="FINANCE">Finance</option>
                    <option value="LOGISTICS">Logistics</option>
                    <option value="MARKET">Marketplace</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sub-Type</label>
                  <select
                    value={newPspForm.categoryType}
                    onChange={(e) => setNewPspForm({ ...newPspForm, categoryType: e.target.value as 'psp' | 'fintech' | 'bank' | 'neo_broker' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
                  >
                    <option value="psp">Payment Service Provider</option>
                    <option value="fintech">FinTech Platform</option>
                    <option value="bank">Digital Bank</option>
                    <option value="neo_broker">Neo-Broker</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center space-x-2 font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={newPspForm.isRegulated}
                    onChange={(e) => setNewPspForm({ ...newPspForm, isRegulated: e.target.checked })}
                    className="rounded text-onion focus:ring-onion"
                  />
                  <span>Is this entity licensed by a Financial Regulator?</span>
                </label>
                {newPspForm.isRegulated && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Regulator (e.g. VARA, CBUAE)"
                      value={newPspForm.regulatorName}
                      onChange={(e) => setNewPspForm({ ...newPspForm, regulatorName: e.target.value })}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="License Reference Number"
                      value={newPspForm.licenseNumber}
                      onChange={(e) => setNewPspForm({ ...newPspForm, licenseNumber: e.target.value })}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Technical Contact Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={newPspForm.techName}
                    onChange={(e) => setNewPspForm({ ...newPspForm, techName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Technical Email (For Key Delivery)</label>
                  <input
                    type="email"
                    required
                    placeholder="tech@citadelpay.com"
                    value={newPspForm.techEmail}
                    onChange={(e) => setNewPspForm({ ...newPspForm, techEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial PSP Commission Markup (bps)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newPspForm.initialMarkupBps}
                  onChange={(e) => setNewPspForm({ ...newPspForm, initialMarkupBps: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">35 bps = 0.35%. Hard capped at 100 bps (1.00%).</p>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={apiBusy}
                  className="w-1/2 py-2.5 bg-onion text-white rounded-xl text-xs font-bold hover:bg-onion-700 shadow-md disabled:opacity-50"
                >
                  {apiBusy ? 'Generating Keys...' : 'Register & Issue Keys'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MERCHANT FULL DETAILS DOSSIER MODAL
         ───────────────────────────────────────────────────────────── */}
      {selectedMerchantDetail && (
        <MerchantFullDetailsModal
          merchant={selectedMerchantDetail}
          onClose={() => setSelectedMerchantDetail(null)}
          onToggleStatus={handleToggleMerchantStatus}
          isAdmin={true}
        />
      )}
    </div>
  )
}
