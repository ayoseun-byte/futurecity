import { getApiConfig, requestApi } from './apiConfig'
import type { Organization } from '../types'

export interface FeeChangeRequest {
  id: string
  organization_name: string
  requested_markup_bps: number
  requested_by: string
  reason: string
  submitted_at: string
  effective_at: string
  status: string
}

export interface AdminMetrics {
  psps: {
    total: number
    approved: number
    inReview: number
    sandbox: number
    suspended: number
  }
  merchants: {
    total: number
    active: number
    invited: number
    disabled: number
  }
  settlement: {
    totalVolumeUsdc: number
    totalTransactions: number
    totalOrkiFeesAccruedUsdc: number
    totalPspMarkupsAccruedUsdc: number
    volume24hUsdc: number
    transactions24h: number
  }
  chainBreakdown: Record<string, { count: number; volume: number }>
  governance: {
    pendingFeeChangeRequests: number
    orkiBaseFeeBps: number
    pspMarkupSafetyCapBps: number
    combinedHardCapBps: number
    rateLockNoticeDays: number
  }
  smartContracts: {
    evmBase: {
      network: string
      splitterContract: string
      features: string[]
      status: string
    }
    solanaSvm: {
      network: string
      program: string
      features: string[]
      status: string
    }
  }
}

export interface AdminMerchantRow {
  id: string
  organizationId: string
  organizationName: string
  organizationCategory: string
  externalId: string
  legalBusinessName: string
  tradeLicenseNumber: string
  jurisdiction: string
  representativeName: string
  representativeEmail: string
  status: 'active' | 'disabled' | 'invited' | 'suspended'
  nextStep?: string | null
  settlementMode: string
  baseWalletAddress?: string | null
  solanaWalletAddress?: string | null
  statusReason?: string | null
  volumeUsdc: number
  transactionCount: number
  verifiedAt?: string | null
  activatedAt?: string | null
  createdAt: string
}

export interface AdminMerchantDetailResponse {
  id: string
  organizationId: string
  organizationName: string
  organizationCategory: string
  externalId: string
  legalBusinessName: string
  tradeLicenseNumber: string
  jurisdiction: string
  representativeName: string
  representativeEmail: string
  status: 'active' | 'disabled' | 'invited' | 'suspended'
  nextStep?: string | null
  settlementMode: string
  baseWalletAddress?: string | null
  solanaWalletAddress?: string | null
  passkeyId?: string | null
  hasPasskey: boolean
  statusReason?: string | null
  consentDetails?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  kybSubmissions?: Array<Record<string, unknown>>
  paylinks?: Array<Record<string, unknown>>
  recentTransactions?: Array<Record<string, unknown>>
  onboardingSessions?: Array<Record<string, unknown>>
  stats?: {
    totalVolumeUsdc: number
    totalTransactions: number
    totalOrkiFeesUsdc: number
    totalPspMarkupUsdc: number
  }
  verifiedAt?: string | null
  activatedAt?: string | null
  createdAt: string
  updatedAt?: string | null
  rawRecord?: Record<string, unknown>
}

export interface AdminTransactionRow {
  id: string
  organizationId: string
  organizationName: string
  merchantId: string
  merchantName: string
  merchantExternalId: string
  type: string
  grossAmount: number
  currency: string
  split: {
    merchantNet: number
    pspMarkupAmount: number
    pspMarkupBps: number
    orkiFeeAmount: number
    orkiFeeBps: number
  }
  chain: string
  txHash?: string | null
  explorerUrl?: string | null
  payerAddress?: string | null
  status: string
  createdAt: string
}

export interface AdminAuditLogRow {
  id: string
  category: string
  actor: string
  action: string
  targetType: string
  targetId: string
  targetName: string
  details: string
  timestamp: string
}

export interface AdminUbo {
  id?: string
  name: string
  ownershipPercentage: number
  nationality?: string
  idDocumentType?: string
  sanctionsClearance?: string
  screenedAt?: string
}

export interface PspDetailResponse {
  pspId: string
  pspName: string
  category: Organization['category']
  categoryType: Organization['categoryType']
  webhookUrl?: string | null
  status: Organization['status']
  contacts?: Array<{ name: string; email: string; role?: string }>
  ndaSignedAt?: string | null
  agreement?: Record<string, unknown> | null
  kyb?: {
    caseReference?: string
    riskRating?: string
    nextReviewDue?: string
    isRegulatedEntity?: boolean
    regulator?: string
    licenseReference?: string
    ubos?: AdminUbo[]
  } | null
  feeSchedule?: Organization['feeSchedule'] | null
  goLiveChecklist?: Record<string, unknown> | null
  preparedBy?: string | null
  approvedBy?: string | null
  approvedAt?: string | null
}

// 1. Metrics
export async function fetchAdminMetrics(): Promise<AdminMetrics | null> {
  const config = getApiConfig()
  if (!config.adminKey) return null
  try {
    const res = await requestApi<{ metrics: AdminMetrics }>(config, 'GET', '/api/v1/admin/metrics', undefined, 'admin')
    return res.metrics
  } catch {
    return null
  }
}

// 2. PSPs
export async function fetchAdminPsps(category?: string): Promise<Organization[]> {
  const config = getApiConfig()
  if (!config.adminKey) return []
  const query = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : ''
  const { data } = await requestApi<{
    data: Array<{
      pspId: string
      pspName: string
      category: Organization['category']
      categoryType: Organization['categoryType']
      status: Organization['status']
      webhookUrl?: string | null
      createdAt: string
    }>
  }>(config, 'GET', `/api/v1/admin/psps${query}`, undefined, 'admin')

  return data.map((p) => ({
    id: p.pspId,
    name: p.pspName,
    category: p.category,
    categoryType: p.categoryType,
    status: p.status,
    webhookUrl: p.webhookUrl || undefined,
    createdAt: p.createdAt,
    isRegulatedEntity: false,
    feeWallet: '',
    contacts: [],
  }))
}

export async function fetchAdminPspDetail(pspId: string): Promise<PspDetailResponse> {
  const config = getApiConfig()
  return requestApi<PspDetailResponse>(config, 'GET', `/api/v1/admin/psps/${encodeURIComponent(pspId)}`, undefined, 'admin')
}

export async function updateAdminPsp(
  pspId: string,
  updates: {
    pspName?: string
    category?: 'FINANCE' | 'LOGISTICS' | 'MARKET'
    categoryType?: 'psp' | 'fintech' | 'bank' | 'neo_broker'
    webhookUrl?: string | null
    contacts?: Array<{ name: string; email: string; role?: string }>
  }
): Promise<PspDetailResponse> {
  const config = getApiConfig()
  return requestApi<PspDetailResponse>(config, 'PATCH', `/api/v1/admin/psps/${encodeURIComponent(pspId)}`, updates, 'admin')
}

export async function updateAdminPspStatus(
  pspId: string,
  status: string,
  reason?: string
): Promise<{ pspId: string; status: string; message: string }> {
  const config = getApiConfig()
  return requestApi(config, 'PATCH', `/api/v1/admin/psps/${encodeURIComponent(pspId)}/status`, { status, reason }, 'admin')
}

export async function updateAdminPspKyb(
  pspId: string,
  kybData: {
    caseReference?: string
    riskRating?: 'low' | 'medium' | 'high'
    nextReviewDue?: string
    isRegulatedEntity?: boolean
    regulator?: string
    licenseReference?: string
  }
): Promise<{ pspId: string; kyb: Record<string, unknown>; message: string }> {
  const config = getApiConfig()
  return requestApi(config, 'PATCH', `/api/v1/admin/psps/${encodeURIComponent(pspId)}/kyb`, kybData, 'admin')
}

export async function addAdminPspUbo(pspId: string, ubo: AdminUbo): Promise<{ ubos: AdminUbo[]; message: string }> {
  const config = getApiConfig()
  return requestApi(config, 'POST', `/api/v1/admin/psps/${encodeURIComponent(pspId)}/ubos`, ubo, 'admin')
}

export async function deleteAdminPspUbo(pspId: string, uboId: string): Promise<{ ubos: AdminUbo[]; message: string }> {
  const config = getApiConfig()
  return requestApi(config, 'DELETE', `/api/v1/admin/psps/${encodeURIComponent(pspId)}/ubos/${encodeURIComponent(uboId)}`, undefined, 'admin')
}

export async function approvePspProduction(
  pspId: string,
  payload: {
    preparedBy: string
    approvedBy: string
    agreement: { signedAt: string; version: string; documentHash?: string }
    kyb: { caseReference: string; riskRating: string; nextReviewDue: string }
    pspRegulatoryStatus?: { isRegulatedEntity?: boolean; regulator?: string; licenseReference?: string }
    feeSchedule: { paymentRateBps: 100; pspMarkupBps: number; combinedCapBps: number; lockedUntil: string }
    goLiveChecklist: {
      signedAt: string
      signedBy: string
      webhookSignaturesVerified: true
      idempotencyHandled: true
      passkeyIntegrationVerified: true
      sandboxTransactionsPassed: true
      reconciliationJobTested: true
      settlementModeConfigured: true
      errorHandlingVerified: true
      rateLimitsRespected: true
      tlsAndIpWhitelistingConfirmed: true
    }
  }
): Promise<{ status: string; pspId: string; productionKeyDelivery: Record<string, unknown> }> {
  const config = getApiConfig()
  return requestApi(config, 'POST', `/api/v1/admin/psps/${encodeURIComponent(pspId)}/approve`, payload, 'admin')
}

export async function reissuePspCredentials(
  pspId: string,
  environment: 'sandbox' | 'production',
  reason?: string
): Promise<{
  pspId: string
  environment: string
  status: string
  keyDelivery: { status: string; sentTo: string; expiresInHours: number; temporaryShareUrl: string }
}> {
  const config = getApiConfig()
  return requestApi(config, 'POST', `/api/v1/admin/psps/${encodeURIComponent(pspId)}/reissue-keys`, { environment, reason }, 'admin')
}

// 3. Cross-Tenant Sub-Merchants
export async function fetchAdminMerchants(filters?: {
  organizationId?: string
  status?: string
  search?: string
  page?: number
}): Promise<{ data: AdminMerchantRow[]; total: number }> {
  const config = getApiConfig()
  if (!config.adminKey) return { data: [], total: 0 }
  const params = new URLSearchParams()
  if (filters?.organizationId) params.append('organizationId', filters.organizationId)
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status)
  if (filters?.search) params.append('search', filters.search)
  if (filters?.page) params.append('page', String(filters.page))

  const queryString = params.toString() ? `?${params.toString()}` : ''
  return requestApi<{ data: AdminMerchantRow[]; total: number }>(config, 'GET', `/api/v1/admin/merchants${queryString}`, undefined, 'admin')
}

export async function fetchAdminMerchantDetail(merchantId: string): Promise<AdminMerchantDetailResponse> {
  const config = getApiConfig()
  return requestApi<AdminMerchantDetailResponse>(config, 'GET', `/api/v1/admin/merchants/${encodeURIComponent(merchantId)}`, undefined, 'admin')
}

export async function updateAdminMerchantStatus(
  merchantId: string,
  status: 'active' | 'disabled' | 'suspended',
  reason?: string
): Promise<{ id: string; status: string; message: string }> {
  const config = getApiConfig()
  return requestApi(config, 'PATCH', `/api/v1/admin/merchants/${encodeURIComponent(merchantId)}/status`, { status, reason }, 'admin')
}

// 4. Global Transactions
export async function fetchAdminTransactions(filters?: {
  organizationId?: string
  chain?: string
  status?: string
  search?: string
  page?: number
}): Promise<{ data: AdminTransactionRow[]; total: number }> {
  const config = getApiConfig()
  if (!config.adminKey) return { data: [], total: 0 }
  const params = new URLSearchParams()
  if (filters?.organizationId) params.append('organizationId', filters.organizationId)
  if (filters?.chain && filters.chain !== 'all') params.append('chain', filters.chain)
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status)
  if (filters?.search) params.append('search', filters.search)
  if (filters?.page) params.append('page', String(filters.page))

  const queryString = params.toString() ? `?${params.toString()}` : ''
  return requestApi<{ data: AdminTransactionRow[]; total: number }>(config, 'GET', `/api/v1/admin/transactions${queryString}`, undefined, 'admin')
}

// 5. Rate Governance & Dual-Control
export async function fetchAdminFeeChangeRequests(): Promise<FeeChangeRequest[]> {
  const config = getApiConfig()
  if (!config.adminKey) return []
  const res = await requestApi<{ data: FeeChangeRequest[] }>(config, 'GET', '/api/v1/admin/fee-change-requests', undefined, 'admin')
  return res.data || []
}

export async function reviewAdminFeeChangeRequest(
  requestId: string,
  action: 'approve' | 'reject',
  approverEmail: string,
  reason?: string
): Promise<void> {
  const config = getApiConfig()
  await requestApi(
    config,
    'POST',
    `/api/v1/admin/fee-change-requests/${encodeURIComponent(requestId)}/${action}`,
    action === 'approve' ? { approvedBy: approverEmail.trim() } : { rejectedBy: approverEmail.trim(), reason: reason?.trim() },
    'admin'
  )
}

// 6. Audit Logs
export async function fetchAdminAuditLogs(category?: string): Promise<{ data: AdminAuditLogRow[]; total: number }> {
  const config = getApiConfig()
  if (!config.adminKey) return { data: [], total: 0 }
  const query = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : ''
  return requestApi<{ data: AdminAuditLogRow[]; total: number }>(config, 'GET', `/api/v1/admin/audit-logs${query}`, undefined, 'admin')
}

// 7. Admin Onboarding Step Enforcement
export async function enforceAdminMerchantStep(
  merchantId: string,
  step: string,
  reason: string,
  clearSubsequentMilestones = true
): Promise<{ id: string; nextStep: string | null; status: string; message: string }> {
  const config = getApiConfig()
  return requestApi(
    config,
    'PATCH',
    `/api/v1/admin/merchants/${encodeURIComponent(merchantId)}/step`,
    {
      step,
      reason,
      clearSubsequentMilestones,
    },
    'admin'
  )
}

// 8. Reassign Merchant to Another PSP
export async function reassignAdminMerchant(
  merchantId: string,
  newOrganizationId: string,
  reason: string
): Promise<{ id: string; organizationId: string; organizationName: string; message: string }> {
  const config = getApiConfig()
  return requestApi(
    config,
    'POST',
    `/api/v1/admin/merchants/${encodeURIComponent(merchantId)}/reassign`,
    {
      newOrganizationId,
      reason,
    },
    'admin'
  )
}
