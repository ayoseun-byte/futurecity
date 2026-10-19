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
