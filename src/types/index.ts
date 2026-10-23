export type MerchantStatus =
  | 'invited'
  | 'terms_accepted'
  | 'verifying'
  | 'verification_action_required'
  | 'verified'
  | 'active'
  | 'on_hold'
  | 'rejected'
  | 'disabled'
  | 'suspended'

export type SettlementMode = 'hold_as_received' | 'auto_offramp'

export type OnboardingStep =
  | 'OPT_IN'
  | 'NOTICE'
  | 'KYB_INFORMATION'
  | 'TERMS'
  | 'SUMSUB'
  | 'PASSKEY'
  | 'COMPLETED'

export interface TosDocumentLinks {
  tos: string
  privacyPolicy: string
}

export interface TosAcceptance {
  id: string
  entityName: string
  status: 'pending' | 'accepted'
  link: string
  documentLinks: TosDocumentLinks
  acceptedAt: string | null
  token: string
  ipAddress?: string
}

export interface Merchant {
  id: string
  organizationId?: string
  externalId: string
  legalBusinessName: string
  tradeLicenseNumber: string
  jurisdiction: string
  categoryType?: string
  representativeName: string
  representativeEmail: string
  status: MerchantStatus
  settlementMode: SettlementMode
  nextStep?: OnboardingStep | null

  // Tri-Wallet Split Topology & Fee Caps
  orkiFeeWallet?: string
  pspFeeWallet?: string
  merchantWallet?: string
  orkiFeeBps?: number // Customizable by Orki (default 100 = 1.00%)
  orkiFeeCapPercent?: number // e.g. 1.00%
  orkiFeeCapAmount?: number // e.g. 25.00 USDC cap
  pspFeeBps?: number // Customizable by PSP, NEVER beyond 100 bps (1.00%)
  feeLockUntil?: string // 30-day lock on fee adjustments

  baseWalletAddress?: string
  solanaWalletAddress?: string
  passkeyId?: string
  statusReason?: string
  noticeAcknowledgedAt?: string
  kybInformationSubmittedAt?: string
  termsAcceptedAt?: string
  sumsubCompletedAt?: string
  passkeyRegisteredAt?: string
  verifiedAt?: string
  activatedAt?: string
  createdAt: string
  volumeUsdc?: number
  balanceUsdc?: number
}

export interface Paylink {
  id: string
  merchantId?: string
  organizationId?: string
  slug: string
  title: string
  description?: string
  amountType: 'fixed' | 'open'
  amount?: number
  currency: 'USDC' | 'USDT'
  settlementMode: SettlementMode
  allowedChains: string[]
  status: 'active' | 'expired' | 'disabled'
  checkoutUrl: string
  createdAt: string
}

export interface Transaction {
  id: string
  merchantId: string
  organizationId?: string
  type: 'payment_collection' | 'auto_offramp_payout' | 'transfer_out' | 'conversion_offramp'
  grossAmount: number
  currency: string
  orkiFeeBps: number
  orkiFeeAmount: number
  pspMarkupBps: number
  pspMarkupAmount: number
  netAmount: number
  chain: string
  txHash: string
  payerAddress: string
  status: 'completed' | 'pending'
  createdAt: string
}

export interface Conversion {
  id: string
  sourceAmount: number
  sourceCurrency: string
  targetAmount: number
  targetCurrency: string
  exchangeRate: number
  feeAmount: number
  status: 'completed' | 'pending'
  payoutIban: string
  createdAt: string
}

// -----------------------------------------------------------------------------
// PSP / Organization Domain Types
// -----------------------------------------------------------------------------

export type PspCategory = 'LOGISTICS' | 'FINANCE' | 'MARKET'

export type OrganizationCategoryType = 'psp' | 'fintech' | 'bank' | 'neo_broker' | 'marketplace'

export type PspStatus = 'sandbox' | 'in_review' | 'approved' | 'suspended' | 'declined'

export interface PspContact {
  name: string
  email: string
  phone?: string
  role: 'technical' | 'compliance' | 'commercial' | 'signatory'
}

export interface PspFeeSchedule {
  orkiFeeBps: number // Default 100 bps (1.00%)
  orkiFeeCapPercent: number // e.g. 1.00%
  orkiFeeCapAmount: number // Max fee amount in USDC e.g. 25.00
  pspMarkupBps: number // Set by PSP, hard-capped at 100 bps (1.00% max)
  combinedCapBps: number // Combined cap e.g. 200 bps (2.00%)
  lockedUntil: string // 30-day lock timestamp
  orkiFeeWallet: string
  pspFeeWallet: string
  offrampSpreadBps: number // Orki-only offramp markup (PSP cannot charge offramp)
  pendingChangeRequest?: {
    requestedMarkupBps: number
    requestedAt: string
    status: 'pending_approval' | 'approved' | 'rejected'
  }
}

export interface PspUbo {
  name: string
  ownershipPercentage: number
  nationality: string
  idDocumentType: 'passport' | 'emirates_id' | 'national_id'
  idDocumentVerified: boolean
  proofOfAddressVerified: boolean
  pepOrSanctionsClear: boolean
}

export interface PspDueDiligence {
  isRegulatedEntity: boolean // Licensed vs Unlicensed
  regulatorName?: string // e.g. CBUAE, VARA, FSRA, FCA
  licenseNumber?: string
  licenseVerifiedAt?: string
  amlPolicyVerified: boolean
  caseReference: string
  riskRating: 'low' | 'medium' | 'high'
  reviewDate: string
  nextReviewDate: string
  ubos?: PspUbo[]
  notes?: string
}

export interface PspGoLiveChecklist {
  webhookSignatureVerified: boolean
  idempotencyHandled: boolean
  duplicateEventsHandled: boolean
  onboardingComponentMounted: boolean
  merchantStatusesHandled: boolean
  passkeyHooksVerified: boolean
  termsDisclosuresIncluded: boolean
  cspAllowed: boolean
  supportContactNamed: boolean
  signedBy?: string
  signedAt?: string
}

export interface PspKeyDelivery {
  environment: 'sandbox' | 'production'
  publicKey: string
  secretKeyMasked: string
  webhookSecretMasked: string
  shareUrl?: string
  status: 'pending' | 'link_sent' | 'claimed' | 'expired'
  sentTo: string
  expiresAt: string
}

export interface Organization {
  id: string // e.g. psp_xsquare01
  name: string
  category?: PspCategory
  categoryType: OrganizationCategoryType
  status: PspStatus
  isRegulatedEntity?: boolean
  feeWallet: string
  contacts: PspContact[]
  ndaSignedAt?: string
  agreementDetails?: {
    signedAt: string
    version: string
    signatoryName: string
    signatoryProofType: string
  }
  dueDiligence?: PspDueDiligence
  feeSchedule?: PspFeeSchedule
  goLiveChecklist?: PspGoLiveChecklist
  apiCredentials?: {
    sandbox?: PspKeyDelivery
    production?: PspKeyDelivery
  }
  preparedBy?: string
  approvedBy?: string
  approvedAt?: string
  webhookUrl?: string
  createdAt: string
  volumeUsdc?: number
  balanceUsdc?: number
}
