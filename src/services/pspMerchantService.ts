import type { Merchant, MerchantStatus, OnboardingStep, SettlementMode } from '../types'
import { getApiConfig, requestApi } from './apiConfig'

interface PspMerchantRecord {
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
  const nextStep = onboardingSteps.includes((record.next_step ?? record.nextStep) as OnboardingStep)
    ? (record.next_step ?? record.nextStep) as OnboardingStep
    : null
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
