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
  metadata?: Record<string, unknown> | null
  timestamp: string
}

export interface OnChainRetryRecord {
  id: string
  entityType: 'psp' | 'merchant' | string
  entityId: string
  organizationId?: string | null
  targetName?: string
  network: string
  payload: Record<string, unknown>
  attempts: number
  maxAttempts: number
  lastError: string
  status: string
  nextRetryAt?: number
  alertedAt?: string
  createdAt?: string
  updatedAt?: string
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
  feeWallet?: string | null
  solanaFeeWallet?: string | null
  onChainRegistration?: { status?: string; txHash?: string | null; error?: string; [key: string]: unknown }
  onChainSolanaRegistration?: { status?: string; txHash?: string | null; error?: string; [key: string]: unknown }
  processing?: boolean
  onChainStatus?: string
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

export async function updateAdminPspFeeWallets(
  pspId: string,
  payload: { feeWallet?: string | null; solanaFeeWallet?: string | null },
): Promise<PspDetailResponse> {
  const config = getApiConfig()
  return requestApi<PspDetailResponse>(
    config,
    'PATCH',
    `/api/v1/admin/psps/${encodeURIComponent(pspId)}`,
    payload,
    'admin',
  )
}

export interface AdminPspOnChainResult {
  network: 'base' | 'solana'
  pspWallet?: string
  feeBps?: number
  status?: string
  txHash?: string
  registered?: boolean
  currentFeeBps?: number
  pendingFeeBps?: number
  rateLockExpiry?: string
  accounts?: Record<string, string>
  instruction?: { name: string; discriminatorHex: string | null; args: Record<string, unknown> }
  message?: string
}

export async function registerAdminPspOnChain(
  pspId: string,
  network: 'base' | 'solana',
  pspWallet?: string,
): Promise<AdminPspOnChainResult> {
  const config = getApiConfig()
  return requestApi<AdminPspOnChainResult>(
    config,
    'POST',
    `/api/v1/admin/psps/${encodeURIComponent(pspId)}/onchain/register`,
    { network, ...(pspWallet ? { pspWallet } : {}) },
    'admin',
  )
}

export async function fetchAdminPspOnChainStatus(
  pspId: string,
  network: 'base' | 'solana',
  pspWallet?: string,
): Promise<AdminPspOnChainResult> {
  const config = getApiConfig()
  const walletParam = pspWallet ? `&wallet=${encodeURIComponent(pspWallet)}` : ''
  return requestApi<AdminPspOnChainResult>(
    config,
    'GET',
    `/api/v1/admin/psps/${encodeURIComponent(pspId)}/onchain?network=${network}${walletParam}`,
    undefined,
    'admin',
  )
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
    feeSchedule: { paymentRateBps: number; pspMarkupBps: number; combinedCapBps: number; lockedUntil: string }
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

export interface AdminFeeSchedulePayload {
  baseRates: { paymentBps: number; offrampBps: number }
  pspMarkupCeiling: { paymentBps: number }
  pspOfframpSharePercent: number
  maxTotalMerchantCostBps: number
  payoutCurrency: string
  preparedBy?: string
  approvedBy?: string
}

export async function fetchAdminPspFeeSchedule(pspId: string): Promise<{
  pspId: string
  pspName: string
  defaultMarkupBps: number
  feeSchedule: AdminFeeSchedulePayload
}> {
  const config = getApiConfig()
  return requestApi(config, 'GET', `/api/v1/admin/psps/${encodeURIComponent(pspId)}/fee-schedule`, undefined, 'admin')
}

export async function setAdminPspFeeSchedule(
  pspId: string,
  payload: AdminFeeSchedulePayload
): Promise<{ pspId: string; pspName: string; feeSchedule: AdminFeeSchedulePayload }> {
  const config = getApiConfig()
  return requestApi(config, 'POST', `/api/v1/admin/psps/${encodeURIComponent(pspId)}/fee-schedule`, payload, 'admin')
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
  reason?: string,
  preparerEmail?: string
): Promise<void> {
  const config = getApiConfig()
  const preparedBy = (preparerEmail || 'compliance.preparer@orki.money').trim()
  await requestApi(
    config,
    'POST',
    `/api/v1/admin/fee-change-requests/${encodeURIComponent(requestId)}/${action}`,
    action === 'approve'
      ? { preparedBy, approvedBy: approverEmail.trim() }
      : { preparedBy, rejectedBy: approverEmail.trim(), reason: reason?.trim() },
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

// 9. Reset Merchant Onboarding Session Reissue Cap
export async function resetAdminMerchantSessions(
  merchantId: string
): Promise<{ id: string; resetAt: string; message: string }> {
  const config = getApiConfig()
  return requestApi(
    config,
    'POST',
    `/api/v1/admin/merchants/${encodeURIComponent(merchantId)}/reset-sessions`,
    {},
    'admin'
  )
}

// 10. Admin Authentication & Session Management
export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'PREPARER' | 'APPROVER'
  keyPrefix?: string | null
  hasActiveKey?: boolean
  status: string
  lastActiveAt?: string | null
  createdAt: string
  updatedAt?: string | null
}

export interface AdminSession {
  id: string
  ipAddress?: string | null
  userAgent?: string | null
  lastActivityAt: string
  expiresAt: string
  isCurrent: boolean
}

export interface AdminAuthResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  expiresAt: string
  admin: AdminUser
}

export async function loginAdminApi(email: string, password: string): Promise<AdminAuthResponse> {
  const config = getApiConfig()
  return requestApi<AdminAuthResponse>(
    config,
    'POST',
    '/api/v1/admin/auth/login',
    { email, password },
    'none'
  )
}

export async function logoutAdminApi(): Promise<{ status: string; message: string }> {
  const config = getApiConfig()
  return requestApi(config, 'POST', '/api/v1/admin/auth/logout', {}, 'admin')
}

export async function fetchAdminMe(): Promise<{
  admin: AdminUser
  session?: { sessionId?: string; expiresIn?: number; expiresAt?: string; ipAddress?: string }
}> {
  const config = getApiConfig()
  return requestApi(config, 'GET', '/api/v1/admin/auth/me', undefined, 'admin')
}

export async function fetchAdminSessions(): Promise<AdminSession[]> {
  const config = getApiConfig()
  const res = await requestApi<{ sessions: AdminSession[] }>(
    config,
    'GET',
    '/api/v1/admin/auth/sessions',
    undefined,
    'admin'
  )
  return res.sessions || []
}

export async function revokeAdminSession(sessionId: string): Promise<void> {
  const config = getApiConfig()
  await requestApi(
    config,
    'DELETE',
    `/api/v1/admin/auth/sessions/${encodeURIComponent(sessionId)}`,
    undefined,
    'admin'
  )
}

// 11. Platform Admin Users Management & API Key Lifecycle
export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const config = getApiConfig()
  if (!config.adminKey) return []
  const res = await requestApi<{ admins: AdminUser[]; count: number }>(
    config,
    'GET',
    '/api/v1/admin/users',
    undefined,
    'admin'
  )
  return res.admins || []
}

export async function createAdminUser(payload: {
  name: string
  email: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'PREPARER' | 'APPROVER'
  password?: string
  generateKey?: boolean
}): Promise<{
  id: string
  name: string
  email: string
  role: string
  keyPrefix?: string
  apiKey?: string
  initialPassword?: string
  warning?: string
}> {
  const config = getApiConfig()
  return requestApi(config, 'POST', '/api/v1/admin/users', payload, 'admin')
}

export async function generateAdminUserKey(id: string): Promise<{
  id: string
  name: string
  email: string
  apiKey: string
  keyPrefix: string
  warning: string
}> {
  const config = getApiConfig()
  return requestApi(
    config,
    'POST',
    `/api/v1/admin/users/${encodeURIComponent(id)}/generate-key`,
    {},
    'admin'
  )
}

export async function bootstrapAdminKey(email: string): Promise<{
  id: string
  name: string
  email: string
  apiKey: string
  keyPrefix: string
  warning: string
}> {
  const config = getApiConfig()
  return requestApi(
    config,
    'POST',
    '/api/v1/admin/users/bootstrap-key',
    { email },
    'none'
  )
}

// 12. Transaction Detail
export async function fetchAdminTransactionDetail(id: string): Promise<Record<string, unknown>> {
  const config = getApiConfig()
  return requestApi(
    config,
    'GET',
    `/api/v1/admin/transactions/${encodeURIComponent(id)}`,
    undefined,
    'admin'
  )
}

// 13. Dynamic Multi-Chain & Token Registry
export interface SupportedChain {
  id: string
  chain_family: string
  name: string
  rpc: string
  chain_id: string
  explorer: string
  image?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface SupportedToken {
  id: string
  chain_id: string
  chain_family: string
  contract_address?: string | null
  name: string
  symbol: string
  image?: string | null
  is_native: boolean
  is_stablecoin: boolean
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export async function fetchAdminChains(): Promise<SupportedChain[]> {
  const config = getApiConfig()
  const res = await requestApi<{ status: string; data: SupportedChain[] }>(
    config,
    'GET',
    '/api/v1/admin/chains',
    undefined,
    'admin'
  )
  return res.data || []
}

export async function addAdminChain(payload: {
  chainFamily: string
  name: string
  rpc: string
  chainId: string
  explorer: string
  image?: string
}): Promise<SupportedChain> {
  const config = getApiConfig()
  const res = await requestApi<{ status: string; data: SupportedChain }>(
    config,
    'POST',
    '/api/v1/admin/chains',
    payload,
    'admin'
  )
  return res.data
}

export async function fetchAdminTokens(chain?: string): Promise<SupportedToken[]> {
  const config = getApiConfig()
  const path = chain ? `/api/v1/admin/tokens?chain=${encodeURIComponent(chain)}` : '/api/v1/admin/tokens'
  const res = await requestApi<{ status: string; data: SupportedToken[] }>(
    config,
    'GET',
    path,
    undefined,
    'admin'
  )
  return res.data || []
}

export async function addAdminToken(payload: {
  chain: string
  chainFamily?: string
  contractAddress?: string
  image?: string
  name: string
  symbol: string
  isNative?: boolean
  isStableCoin?: boolean
  isActive?: boolean
}): Promise<SupportedToken> {
  const config = getApiConfig()
  const res = await requestApi<{ status: string; data: SupportedToken }>(
    config,
    'POST',
    '/api/v1/admin/tokens',
    payload,
    'admin'
  )
  return res.data
}

export async function updateAdminToken(
  id: string,
  payload: {
    chain?: string
    chainFamily?: string
    contractAddress?: string | null
    image?: string | null
    name?: string
    symbol?: string
    isNative?: boolean
    isStableCoin?: boolean
    isActive?: boolean
  }
): Promise<SupportedToken> {
  const config = getApiConfig()
  const res = await requestApi<{ status: string; data: SupportedToken }>(
    config,
    'PATCH',
    `/api/v1/admin/tokens/${encodeURIComponent(id)}`,
    payload,
    'admin'
  )
  return res.data
}

export async function fetchPublicChains(): Promise<SupportedChain[]> {
  const config = getApiConfig()
  const res = await requestApi<{ status: string; data: SupportedChain[] }>(
    config,
    'GET',
    '/api/v1/chains',
    undefined,
    'none'
  )
  return res.data || []
}

export async function fetchPublicTokens(chain?: string): Promise<SupportedToken[]> {
  const config = getApiConfig()
  const path = chain ? `/api/v1/tokens?chain=${encodeURIComponent(chain)}` : '/api/v1/tokens'
  const res = await requestApi<{ status: string; data: SupportedToken[] }>(
    config,
    'GET',
    path,
    undefined,
    'none'
  )
  return res.data || []
}

export async function fetchAdminOnChainRetries(status?: string): Promise<OnChainRetryRecord[]> {
  const config = getApiConfig()
  if (!config.adminKey) return []
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const res = await requestApi<{ retries: OnChainRetryRecord[]; count: number }>(
    config,
    'GET',
    `/api/v1/admin/onchain-retries${query}`,
    undefined,
    'admin'
  )
  return res.retries || []
}

export interface BlockchainOperation {
  operationId: string
  action: string
  network: string
  entityType: string
  entityId: string
  organizationId?: string | null
  status: 'processing' | 'confirmed' | 'failed' | 'retrying' | 'alerted' | string
  txHash?: string | null
  error?: string | null
  result?: Record<string, unknown> | null
  attempts: number
  processedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export async function fetchBlockchainOperation(
  scope: 'admin' | 'psp' | 'merchant',
  operationId: string
): Promise<BlockchainOperation> {
  const config = getApiConfig()
  return requestApi<BlockchainOperation>(
    config,
    'GET',
    `/api/v1/${scope}/operations/${encodeURIComponent(operationId)}`,
    undefined,
    scope
  )
}

export async function retryAdminOnChainRegistration(
  id: string
): Promise<{
  status: string
  retryId: string
  operationId?: string
  chainEnabled?: boolean
  error?: string
  message?: string
}> {
  const config = getApiConfig()
  return requestApi<{
    status: string
    retryId: string
    operationId?: string
    chainEnabled?: boolean
    error?: string
    message?: string
  }>(
    config,
    'POST',
    `/api/v1/admin/onchain-retries/${encodeURIComponent(id)}/retry`,
    {},
    'admin'
  )
}
