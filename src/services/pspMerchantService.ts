import type { Merchant, MerchantStatus, OnboardingStep, Organization, SettlementMode, Transaction } from '../types'
import { getApiConfig, requestApi } from './apiConfig'
import { resolveMonotonicStep } from './onboardingStepService'

interface PspMerchantRecord {
  [key: string]: unknown
  id: string
  organization_id?: string
  organizationId?: string
  external_id?: string
  externalId?: string
  legal_business_name?: string
  legalBusinessName?: string
  trade_license_number?: string
  tradeLicenseNumber?: string
  jurisdiction?: string
  representative_name?: string | null
  representativeName?: string | null
  representative_email?: string | null
  representativeEmail?: string | null
  status?: string
  next_step?: string | null
  nextStep?: string | null
  settlement_mode?: string
  settlementMode?: string
  orki_fee_wallet?: string | null
  orkiFeeWallet?: string | null
  psp_fee_wallet?: string | null
  pspFeeWallet?: string | null
  merchant_wallet?: string | null
  merchantWallet?: string | null
  orki_fee_bps?: number | string | null
  orkiFeeBps?: number | string | null
  psp_fee_bps?: number | string | null
  pspFeeBps?: number | string | null
  base_wallet_address?: string | null
  baseWalletAddress?: string | null
  solana_wallet_address?: string | null
  solanaWalletAddress?: string | null
  passkey_id?: string | null
  passkeyId?: string | null
  status_reason?: string | null
  statusReason?: string | null
  notice_acknowledged_at?: string | null
  noticeAcknowledgedAt?: string | null
  kyb_information_submitted_at?: string | null
  kybInformationSubmittedAt?: string | null
  terms_accepted_at?: string | null
  termsAcceptedAt?: string | null
  sumsub_completed_at?: string | null
  sumsubCompletedAt?: string | null
  passkey_registered_at?: string | null
  passkeyRegisteredAt?: string | null
  verified_at?: string | null
  verifiedAt?: string | null
  activated_at?: string | null
  activatedAt?: string | null
  created_at?: string
  createdAt?: string
  volume_usdc?: number | string | null
  volumeUsdc?: number | string | null
  balance_usdc?: number | string | null
  balanceUsdc?: number | string | null
}

interface PspMerchantPage {
  data: PspMerchantRecord[]
  last_page?: number
}

interface PspTransactionRecord {
  id: string
  organizationId?: string
  merchantId: string
  type: Transaction['type']
  grossAmount: number | string
  currency: string
  orkiFeeBps: number | string
  orkiFeeAmount: number | string
  pspMarkupBps: number | string
  pspMarkupAmount: number | string
  netAmount: number | string
  chain: string
  txHash?: string | null
  payerAddress?: string | null
  status: Transaction['status']
  createdAt: string
}

interface PspPage<T> {
  data: T[]
  last_page?: number
}

export interface PspDashboardMetrics {
  totalVolumeUsdc: number
  accruedMarkupUsdc: number
  totalOfframpedAed: number
  totalMerchants: number
  activeMerchants: number
  verifyingMerchants: number
  actionRequiredMerchants: number
}

export interface PspDashboardData {
  merchants: Merchant[]
  transactions: Transaction[]
  metrics: PspDashboardMetrics
  feeSchedule?: Organization['feeSchedule']
}

const merchantStatuses: MerchantStatus[] = [
  'invited',
  'terms_accepted',
  'verifying',
  'verification_action_required',
  'verified',
  'active',
  'on_hold',
  'rejected',
  'disabled',
  'suspended',
]

const onboardingSteps: OnboardingStep[] = [
  'OPT_IN',
  'NOTICE',
  'KYB_INFORMATION',
  'TERMS',
  'SUMSUB',
  'PASSKEY',
  'COMPLETED',
]

function text(value: string | null | undefined, fallback = ''): string {
  return value ?? fallback
}

function number(value: number | string | null | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapMerchant(record: PspMerchantRecord, organizationId: string): Merchant {
  const status = merchantStatuses.includes(record.status as MerchantStatus)
    ? record.status as MerchantStatus
    : 'invited'
  const rawStep = onboardingSteps.includes((record.next_step ?? record.nextStep) as OnboardingStep)
    ? (record.next_step ?? record.nextStep) as OnboardingStep
    : null
  const nextStep = resolveMonotonicStep(
    {
      status,
      noticeAcknowledgedAt: (record as Record<string, unknown>).notice_acknowledged_at as string || undefined,
      kybInformationSubmittedAt: (record as Record<string, unknown>).kyb_information_submitted_at as string || undefined,
      termsAcceptedAt: (record as Record<string, unknown>).terms_accepted_at as string || undefined,
      sumsubCompletedAt: (record as Record<string, unknown>).sumsub_completed_at as string || undefined,
      verifiedAt: (record as Record<string, unknown>).verified_at as string || undefined,
      passkeyRegisteredAt: (record as Record<string, unknown>).passkey_registered_at as string || undefined,
      activatedAt: (record as Record<string, unknown>).activated_at as string || undefined,
    },
    rawStep
  )
  const settlementMode = (record.settlement_mode ?? record.settlementMode) as SettlementMode

  return {
    id: record.id,
    organizationId: record.organization_id ?? record.organizationId ?? organizationId,
    externalId: text(record.external_id ?? record.externalId),
    legalBusinessName: text(record.legal_business_name ?? record.legalBusinessName),
    tradeLicenseNumber: text(record.trade_license_number ?? record.tradeLicenseNumber),
    jurisdiction: text(record.jurisdiction),
    representativeName: text(record.representative_name ?? record.representativeName),
    representativeEmail: text(record.representative_email ?? record.representativeEmail),
    status,
    nextStep,
    settlementMode: settlementMode === 'auto_offramp' ? 'auto_offramp' : 'hold_as_received',
    orkiFeeWallet: record.orki_fee_wallet ?? record.orkiFeeWallet ?? undefined,
    pspFeeWallet: record.psp_fee_wallet ?? record.pspFeeWallet ?? undefined,
    merchantWallet: record.merchant_wallet ?? record.merchantWallet ?? undefined,
    orkiFeeBps: number(record.orki_fee_bps ?? record.orkiFeeBps),
    pspFeeBps: number(record.psp_fee_bps ?? record.pspFeeBps),
    baseWalletAddress: record.base_wallet_address ?? record.baseWalletAddress ?? undefined,
    solanaWalletAddress: record.solana_wallet_address ?? record.solanaWalletAddress ?? undefined,
    passkeyId: record.passkey_id ?? record.passkeyId ?? undefined,
    statusReason: record.status_reason ?? record.statusReason ?? undefined,
    noticeAcknowledgedAt: record.notice_acknowledged_at ?? record.noticeAcknowledgedAt ?? undefined,
    kybInformationSubmittedAt: record.kyb_information_submitted_at ?? record.kybInformationSubmittedAt ?? undefined,
    termsAcceptedAt: record.terms_accepted_at ?? record.termsAcceptedAt ?? undefined,
    sumsubCompletedAt: record.sumsub_completed_at ?? record.sumsubCompletedAt ?? undefined,
    passkeyRegisteredAt: record.passkey_registered_at ?? record.passkeyRegisteredAt ?? undefined,
    verifiedAt: record.verified_at ?? record.verifiedAt ?? undefined,
    activatedAt: record.activated_at ?? record.activatedAt ?? undefined,
    createdAt: text(record.created_at ?? record.createdAt),
    volumeUsdc: number(record.volume_usdc ?? record.volumeUsdc),
    balanceUsdc: number(record.balance_usdc ?? record.balanceUsdc),
  }
}

export async function fetchPspMerchants(organizationId: string): Promise<Merchant[] | null> {
  const config = getApiConfig()
  if (!config.pspKey) return null

  const merchants: PspMerchantRecord[] = []
  let lastPage = 1

  for (let pageNumber = 1; pageNumber <= lastPage; pageNumber += 1) {
    const page = await requestApi<PspMerchantPage>(
      config,
      'GET',
      `/api/v1/psp/merchants?page=${pageNumber}`,
      undefined,
      'psp'
    )
    merchants.push(...page.data)
    lastPage = Math.max(1, page.last_page ?? 1)
  }

  return merchants.map((merchant) => mapMerchant(merchant, organizationId))
}

export async function fetchPspDashboard(organizationId: string): Promise<PspDashboardData | null> {
  const config = getApiConfig()
  if (!config.pspKey) return null

  const [merchants, metricsResponse, profile, transactionsPage] = await Promise.all([
    fetchPspMerchants(organizationId),
    requestApi<{ metrics: Record<keyof PspDashboardMetrics, number | string> }>(
      config, 'GET', '/api/v1/psp/metrics', undefined, 'psp'
    ),
    requestApi<{
      feeSchedule?: {
        paymentRateBps?: number
        pspMarkupBps?: number
        combinedCapBps?: number
        lockedUntil?: string | null
        offrampSpreadBps?: number
        pendingChangeRequest?: {
          id: string
          requestedMarkupBps: number
          requestedAt: string
          effectiveAt: string
          status: 'pending_approval'
        } | null
      }
    }>(config, 'GET', '/api/v1/psp/profile', undefined, 'psp'),
    fetchAllPspPages<PspTransactionRecord>('/api/v1/psp/transactions'),
  ])

  if (merchants === null) return null

  return {
    merchants,
    transactions: transactionsPage.map((record) => ({
      id: record.id,
      organizationId: record.organizationId ?? organizationId,
      merchantId: record.merchantId,
      type: record.type,
      grossAmount: number(record.grossAmount),
      currency: record.currency,
      orkiFeeBps: number(record.orkiFeeBps),
      orkiFeeAmount: number(record.orkiFeeAmount),
      pspMarkupBps: number(record.pspMarkupBps),
      pspMarkupAmount: number(record.pspMarkupAmount),
      netAmount: number(record.netAmount),
      chain: record.chain,
      txHash: text(record.txHash),
      payerAddress: text(record.payerAddress),
      status: record.status,
      createdAt: record.createdAt,
    })),
    metrics: {
      totalVolumeUsdc: number(metricsResponse.metrics.totalVolumeUsdc),
      accruedMarkupUsdc: number(metricsResponse.metrics.accruedMarkupUsdc),
      totalOfframpedAed: number(metricsResponse.metrics.totalOfframpedAed),
      totalMerchants: number(metricsResponse.metrics.totalMerchants),
      activeMerchants: number(metricsResponse.metrics.activeMerchants),
      verifyingMerchants: number(metricsResponse.metrics.verifyingMerchants),
      actionRequiredMerchants: number(metricsResponse.metrics.actionRequiredMerchants),
    },
    feeSchedule: profile.feeSchedule ? {
      orkiFeeBps: profile.feeSchedule.paymentRateBps,
      pspMarkupBps: profile.feeSchedule.pspMarkupBps ?? 0,
      combinedCapBps: profile.feeSchedule.combinedCapBps,
      lockedUntil: profile.feeSchedule.lockedUntil ?? undefined,
      offrampSpreadBps: profile.feeSchedule.offrampSpreadBps ?? 0,
      pendingChangeRequest: profile.feeSchedule.pendingChangeRequest ?? undefined,
    } : undefined,
  }
}

async function fetchAllPspPages<T>(path: string): Promise<T[]> {
  const config = getApiConfig()
  const records: T[] = []
  let lastPage = 1

  for (let pageNumber = 1; pageNumber <= lastPage; pageNumber += 1) {
    const page = await requestApi<PspPage<T>>(
      config,
      'GET',
      `${path}?page=${pageNumber}`,
      undefined,
      'psp'
    )
    records.push(...page.data)
    lastPage = Math.max(1, page.last_page ?? 1)
  }

  return records
}

export interface PspWebhookEndpoint {
  id: string
  organizationId: string
  url: string
  events: string[]
  secret?: string
  status: string
  createdAt: string
  updatedAt?: string
}

export async function fetchPspWebhooks(): Promise<PspWebhookEndpoint[]> {
  const config = getApiConfig()
  const res = await requestApi<{ data: PspWebhookEndpoint[] }>(config, 'GET', '/api/v1/psp/webhooks', undefined, 'psp')
  return res.data || []
}

export async function registerPspWebhook(url: string, events: string[]): Promise<PspWebhookEndpoint> {
  const config = getApiConfig()
  return requestApi<PspWebhookEndpoint>(config, 'POST', '/api/v1/psp/webhooks', { url, events }, 'psp')
}

export async function deletePspWebhook(id: string): Promise<{ status: string; message: string }> {
  const config = getApiConfig()
  return requestApi(config, 'DELETE', `/api/v1/psp/webhooks/${encodeURIComponent(id)}`, undefined, 'psp')
}

export interface PspWebhookDelivery {
  id: string
  organizationId: string
  eventType: string
  status: 'DELIVERED' | 'FAILED' | 'PENDING' | 'PROCESSING'
  attempts: number
  lastError?: string | null
  signature?: string | null
  nextAttemptAt?: string | null
  deliveredAt?: string | null
  createdAt: string
  payload?: Record<string, unknown> | null
}

export async function fetchPspWebhookDeliveries(): Promise<PspWebhookDelivery[]> {
  const config = getApiConfig()
  const res = await requestApi<{ data: PspWebhookDelivery[] }>(
    config,
    'GET',
    '/api/v1/psp/webhooks/deliveries',
    undefined,
    'psp',
  )
  return res.data || []
}

export async function triggerTestWebhook(eventType = 'charge.payment_received'): Promise<{
  status: string
  message: string
  dispatch?: PspWebhookDelivery
}> {
  const config = getApiConfig()
  return requestApi(config, 'POST', '/api/v1/psp/webhooks/test', { eventType }, 'psp')
}

export async function retryWebhookDelivery(id: string): Promise<{
  status: string
  dispatch: Partial<PspWebhookDelivery>
}> {
  const config = getApiConfig()
  return requestApi(
    config,
    'POST',
    `/api/v1/psp/webhooks/deliveries/${encodeURIComponent(id)}/retry`,
    undefined,
    'psp',
  )
}

export interface PspMarkupSettingsResponse {
  organizationId: string
  defaultPaymentMarkupBps: number
  pspMarkupCeilingBps: number
  maxTotalMerchantCostBps: number
  feeSchedule?: Record<string, unknown>
}

export async function fetchPspMarkupSettings(): Promise<PspMarkupSettingsResponse> {
  const config = getApiConfig()
  return requestApi<PspMarkupSettingsResponse>(config, 'GET', '/api/v1/psp/settings/markup', undefined, 'psp')
}

export async function updatePspMarkupSettings(defaultPaymentMarkupBps: number): Promise<{
  organizationId: string
  defaultPaymentMarkupBps: number
  pspMarkupCeilingBps: number
  updatedAt: string
}> {
  const config = getApiConfig()
  return requestApi(config, 'POST', '/api/v1/psp/settings/markup', { defaultPaymentMarkupBps }, 'psp')
}
