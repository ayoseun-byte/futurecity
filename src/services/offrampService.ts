import { apiRequest, requestApi, type ApiConfig } from './apiConfig'
import type { SettlementMode } from '../types'

export type OfframpProvider = 'bridge' | 'due'

export interface OfframpProvidersEnabled {
  bridge: boolean
  due: boolean
}

export interface LiquidationAddress {
  id: string
  provider: string
  externalAccountId: string | null
  providerLiquidationId: string | null
  chain: string
  currency: string
  destinationCurrency: string
  destinationPaymentRail: string | null
  address: string
  blockchainMemo: string | null
  status: string
  createdAt?: string | null
  updatedAt?: string | null
}

export interface BridgeOfframpState {
  enabled: boolean
  status: string
  customerId: string | null
  signedAgreementId: string | null
  tosUrl: string | null
  kycUrl: string | null
  externalAccountId: string | null
  eligible: boolean
  lastError: string | null
  liquidationAddresses: LiquidationAddress[]
}

export interface DueOfframpState {
  enabled: boolean
  status: string
  accountId: string | null
  submissionId: string | null
  sharingStatus: string | null
  completionUrl: string | null
  eligible: boolean
  lastError: string | null
}

export interface OfframpStatusResponse {
  merchantId: string
  settlementMode: 'hold_as_received' | 'auto_offramp' | string
  providersEnabled: OfframpProvidersEnabled
  offrampEligible: boolean
  dueKybStatus: string
  bridgeKybStatus: string
  verifiedAt: string | null
  bridge: BridgeOfframpState
  due: DueOfframpState
  liquidationAddresses: LiquidationAddress[]
}

export interface CreateLiquidationAddressInput {
  currency: 'usd' | 'eur' | 'mxn' | 'brl'
  destinationPaymentRail?: string
  accountOwnerName?: string
  bankName?: string
  externalAccountId?: string
  iban?: string
  bic?: string
  country?: string
  routingNumber?: string
  accountNumber?: string
  accountClassification?: 'checking' | 'savings'
  chains?: string[]
  currencies?: string[]
}

export interface SettlementModeUpdateOutcome {
  ok: boolean
  statusCode: number
  settlementMode?: string
  offrampEligible: boolean
  verificationUrl?: string
  message?: string
  error?: string
  offrampStatus?: OfframpStatusResponse
}

export function normalizeOfframpStatus(raw: Partial<OfframpStatusResponse> | null | undefined): OfframpStatusResponse {
  const providersEnabled: OfframpProvidersEnabled = {
    bridge: Boolean(raw?.providersEnabled?.bridge ?? raw?.bridge?.enabled ?? false),
    due: Boolean(raw?.providersEnabled?.due ?? raw?.due?.enabled ?? true),
  }

  const liquidationAddresses = Array.isArray(raw?.liquidationAddresses)
    ? raw.liquidationAddresses
    : Array.isArray(raw?.bridge?.liquidationAddresses)
      ? raw.bridge.liquidationAddresses
      : []

  const bridge: BridgeOfframpState = {
    enabled: Boolean(raw?.bridge?.enabled ?? providersEnabled.bridge),
    status: raw?.bridge?.status || raw?.bridgeKybStatus || 'not_started',
    customerId: raw?.bridge?.customerId ?? null,
    signedAgreementId: raw?.bridge?.signedAgreementId ?? null,
    tosUrl: raw?.bridge?.tosUrl ?? null,
    kycUrl: raw?.bridge?.kycUrl ?? null,
    externalAccountId: raw?.bridge?.externalAccountId ?? null,
    eligible: Boolean(raw?.bridge?.eligible ?? false),
    lastError: raw?.bridge?.lastError ?? null,
    liquidationAddresses: Array.isArray(raw?.bridge?.liquidationAddresses)
      ? raw.bridge.liquidationAddresses
      : liquidationAddresses,
  }

  const due: DueOfframpState = {
    enabled: Boolean(raw?.due?.enabled ?? providersEnabled.due),
    status: raw?.due?.status || raw?.dueKybStatus || 'not_started',
    accountId: raw?.due?.accountId ?? null,
    submissionId: raw?.due?.submissionId ?? null,
    sharingStatus: raw?.due?.sharingStatus ?? null,
    completionUrl: raw?.due?.completionUrl ?? null,
    eligible: Boolean(raw?.due?.eligible ?? false),
    lastError: raw?.due?.lastError ?? null,
  }

  return {
    merchantId: raw?.merchantId || '',
    settlementMode: raw?.settlementMode || 'hold_as_received',
    providersEnabled,
    offrampEligible: Boolean(raw?.offrampEligible ?? (bridge.eligible || due.eligible)),
    dueKybStatus: raw?.dueKybStatus || due.status,
    bridgeKybStatus: raw?.bridgeKybStatus || bridge.status,
    verifiedAt: raw?.verifiedAt ?? null,
    bridge,
    due,
    liquidationAddresses,
  }
}

export async function fetchOfframpStatus(config: ApiConfig): Promise<OfframpStatusResponse> {
  const res = await requestApi<Partial<OfframpStatusResponse>>(
    config,
    'GET',
    '/api/v1/merchant/settlement/offramp',
    undefined,
    'merchant',
  )
  return normalizeOfframpStatus(res)
}

export async function shareOfframpKyb(
  config: ApiConfig,
  params?: { provider?: OfframpProvider; signedAgreementId?: string; redirectUri?: string },
): Promise<{ results?: Record<string, unknown>; status: OfframpStatusResponse }> {
  const res = await requestApi<{ results?: Record<string, unknown>; status?: Partial<OfframpStatusResponse> }>(
    config,
    'POST',
    '/api/v1/merchant/settlement/offramp/share-kyb',
    params || {},
    'merchant',
  )
  return {
    results: res.results,
    status: normalizeOfframpStatus(res.status),
  }
}

export async function createBridgeTosLink(
  config: ApiConfig,
  redirectUri?: string,
): Promise<{ success?: boolean; status?: string; tosUrl?: string; message?: string }> {
  return requestApi<{ success?: boolean; status?: string; tosUrl?: string; message?: string }>(
    config,
    'POST',
    '/api/v1/merchant/settlement/bridge/tos',
    redirectUri ? { redirectUri } : {},
    'merchant',
  )
}

export async function createBridgeLiquidationAddresses(
  config: ApiConfig,
  payload: CreateLiquidationAddressInput,
): Promise<{
  success?: boolean
  externalAccountId?: string
  created?: LiquidationAddress[]
  errors?: unknown[]
  message?: string
}> {
  return requestApi(
    config,
    'POST',
    '/api/v1/merchant/settlement/bridge/liquidation-addresses',
    payload,
    'merchant',
  )
}

export async function updateMerchantSettlementMode(
  config: ApiConfig,
  mode: SettlementMode,
  options?: { provider?: OfframpProvider; signedAgreementId?: string; redirectUri?: string },
): Promise<SettlementModeUpdateOutcome> {
  const normalizedMode = mode.toLowerCase() === 'auto_offramp' ? 'auto_offramp' : 'hold_as_received'
  const result = await apiRequest(
    config,
    'PATCH',
    '/api/v1/merchant/settlement-mode',
    JSON.stringify({ mode: normalizedMode, ...(options || {}) }),
    'merchant',
  )
  const payload = (result.data && typeof result.data === 'object' ? result.data : {}) as Record<string, unknown>

  if (!result.ok) {
    return {
      ok: false,
      statusCode: result.status,
      offrampEligible: Boolean(payload.offrampEligible ?? false),
      verificationUrl: typeof payload.verificationUrl === 'string' ? payload.verificationUrl : undefined,
      error: typeof payload.error === 'string' ? payload.error : `request_failed_${result.status}`,
      message: typeof payload.message === 'string' ? payload.message : `Settlement mode update failed (${result.status}).`,
      offrampStatus: payload.providersEnabled ? normalizeOfframpStatus(payload as Partial<OfframpStatusResponse>) : undefined,
    }
  }

  return {
    ok: true,
    statusCode: result.status,
    settlementMode: typeof payload.settlementMode === 'string' ? payload.settlementMode : normalizedMode,
    offrampEligible: Boolean(payload.offrampEligible ?? false),
    offrampStatus: payload.providersEnabled ? normalizeOfframpStatus(payload as Partial<OfframpStatusResponse>) : undefined,
  }
}
