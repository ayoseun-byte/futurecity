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

export interface Merchant {
  id: string
  organizationId?: string
  externalId: string
  legalBusinessName: string
  tradeLicenseNumber: string
  jurisdiction: string
  representativeName: string
  representativeEmail: string
  status: MerchantStatus
  settlementMode: SettlementMode
  baseWalletAddress?: string
  solanaWalletAddress?: string
  passkeyId?: string
  statusReason?: string
  verifiedAt?: string
  activatedAt?: string
  createdAt: string
  volumeUsdc?: number
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
// PSP / Organization Domain Types (Part 1 of Darshan Specification)
// -----------------------------------------------------------------------------

export type PspStatus = 'sandbox' | 'in_review' | 'approved' | 'suspended' | 'declined'

export interface PspContact {
  name: string
  email: string
  phone?: string
  role: 'technical' | 'compliance' | 'commercial' | 'signatory'
}

export interface PspFeeSchedule {
  orkiFeeBps: number // Default 100 bps (1.00%)
  pspMarkupBps: number // Set by PSP e.g. 35 bps (0.35%)
  combinedCapBps: number // Safety cap e.g. 300 bps (3.00%)
  lockedUntil: string // 30-day lock timestamp
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
  ubos?: PspUbo[] // Required if Unlicensed or for major shareholders
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
  status: PspStatus
  isRegulatedEntity: boolean
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
}
