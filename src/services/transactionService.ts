import { getApiConfig, requestApi, resolveMerchantSession } from './apiConfig'
import type { Transaction } from '../types'

export type TransactionViewerRole = 'admin' | 'org' | 'merchant'

export interface TransactionSplitDetail {
  merchantNetAmount: number
  merchantDestinationWallet?: string | null
  pspMarkupAmount: number
  pspMarkupBps: number
  pspDestinationWallet?: string | null
  orkiFeeAmount: number
  orkiFeeBps: number
  orkiDestinationWallet?: string | null
}

export interface TransactionPaymentContext {
  paymentId?: string | null
  chargeToken?: string | null
  paymentType?: string | null
  pricing?: string | null
  description?: string | null
  attemptId?: string | null
  attemptStatus?: string | null
  paymentRef?: string | null
  sourceNetwork?: string | null
  settlementNetwork?: string | null
  sourceToken?: string | null
  amountRaw?: string | null
  submittedAt?: string | null
  confirmedAt?: string | null
  orderMetadata?: Record<string, unknown> | null
  quote?: Record<string, unknown> | null
}

export interface TransactionDetail {
  id: string
  organizationId: string
  organizationName?: string | null
  merchantId: string
  merchantName?: string | null
  merchantExternalId?: string | null
  settlementMode?: string | null
  type: string
  grossAmount: number
  currency: string
  split: TransactionSplitDetail
  chain: string
  txHash?: string | null
  explorerUrl?: string | null
  payerAddress?: string | null
  status: string
  paymentContext?: TransactionPaymentContext | null
  createdAt: string
  updatedAt?: string | null
  raw?: Record<string, unknown>
}

const asNum = (val: unknown, fallback = 0): number => {
  if (typeof val === 'number' && Number.isFinite(val)) return val
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const asStr = (val: unknown): string | null =>
  typeof val === 'string' && val.trim() !== '' ? val.trim() : null

export function normalizeTransactionDetail(
  raw: Record<string, unknown>,
  fallbackTx?: Partial<Transaction> | null,
): TransactionDetail {
  const rawSplit = (raw.split && typeof raw.split === 'object' ? raw.split : {}) as Record<string, unknown>
  const chain = asStr(raw.chain) || fallbackTx?.chain || 'base'
  const txHash = asStr(raw.txHash ?? raw.tx_hash) || fallbackTx?.txHash || null
  const explorerUrl =
    asStr(raw.explorerUrl) ||
    (txHash
      ? chain.toLowerCase() === 'solana'
        ? `https://solscan.io/tx/${txHash}`
        : `https://basescan.org/tx/${txHash}`
      : null)

  return {
    id: asStr(raw.id) || fallbackTx?.id || '',
    organizationId: asStr(raw.organizationId ?? raw.organization_id) || fallbackTx?.organizationId || '',
    organizationName: asStr(raw.organizationName ?? raw.organization_name),
    merchantId: asStr(raw.merchantId ?? raw.merchant_id) || fallbackTx?.merchantId || '',
    merchantName: asStr(raw.merchantName ?? raw.merchant_name),
    merchantExternalId: asStr(raw.merchantExternalId ?? raw.merchant_external_id),
    settlementMode: asStr(raw.settlementMode ?? raw.settlement_mode),
    type: asStr(raw.type) || fallbackTx?.type || 'payment_collection',
    grossAmount: asNum(raw.grossAmount ?? raw.gross_amount, fallbackTx?.grossAmount ?? 0),
    currency: asStr(raw.currency) || fallbackTx?.currency || 'USDC',
    split: {
      merchantNetAmount: asNum(
        rawSplit.merchantNetAmount ?? rawSplit.merchantNet ?? raw.netAmount ?? raw.net_amount,
        fallbackTx?.netAmount ?? 0,
      ),
      merchantDestinationWallet: asStr(rawSplit.merchantDestinationWallet),
      pspMarkupAmount: asNum(
        rawSplit.pspMarkupAmount ?? raw.pspMarkupAmount ?? raw.psp_markup_amount,
        fallbackTx?.pspMarkupAmount ?? 0,
      ),
      pspMarkupBps: Math.round(
        asNum(rawSplit.pspMarkupBps ?? raw.pspMarkupBps ?? raw.psp_markup_bps, fallbackTx?.pspMarkupBps ?? 0),
      ),
      pspDestinationWallet: asStr(rawSplit.pspDestinationWallet),
      orkiFeeAmount: asNum(
        rawSplit.orkiFeeAmount ?? raw.orkiFeeAmount ?? raw.orki_fee_amount,
        fallbackTx?.orkiFeeAmount ?? 0,
      ),
      orkiFeeBps: Math.round(
        asNum(rawSplit.orkiFeeBps ?? raw.orkiFeeBps ?? raw.orki_fee_bps, fallbackTx?.orkiFeeBps ?? 0),
      ),
      orkiDestinationWallet: asStr(rawSplit.orkiDestinationWallet),
    },
    chain,
    txHash,
    explorerUrl,
    payerAddress: asStr(raw.payerAddress ?? raw.payer_address) || fallbackTx?.payerAddress || null,
    status: asStr(raw.status) || fallbackTx?.status || 'completed',
    paymentContext:
      raw.paymentContext && typeof raw.paymentContext === 'object'
        ? (raw.paymentContext as TransactionPaymentContext)
        : null,
    createdAt: asStr(raw.createdAt ?? raw.created_at) || fallbackTx?.createdAt || '',
    updatedAt: asStr(raw.updatedAt ?? raw.updated_at),
    raw,
  }
}

export async function fetchTransactionDetail(
  role: TransactionViewerRole,
  id: string,
  fallbackTx?: Partial<Transaction> | null,
): Promise<TransactionDetail> {
  const config = getApiConfig()
  const encodedId = encodeURIComponent(id)

  if (role === 'admin') {
    const raw = await requestApi<Record<string, unknown>>(
      config,
      'GET',
      `/api/v1/admin/transactions/${encodedId}`,
      undefined,
      'admin',
    )
    return normalizeTransactionDetail(raw, fallbackTx)
  }

  if (role === 'org') {
    if (config.pspKey) {
      const raw = await requestApi<Record<string, unknown>>(
        config,
        'GET',
        `/api/v1/psp/transactions/${encodedId}`,
        undefined,
        'psp',
      )
      return normalizeTransactionDetail(raw, fallbackTx)
    }

    if (config.adminKey) {
      const raw = await requestApi<Record<string, unknown>>(
        config,
        'GET',
        `/api/v1/admin/transactions/${encodedId}`,
        undefined,
        'admin',
      )
      return normalizeTransactionDetail(raw, fallbackTx)
    }

    throw new Error('PSP API key is required to load live transaction details.')
  }

  const merchantSession = resolveMerchantSession(config)
  const raw = await requestApi<Record<string, unknown>>(
    { ...config, merchantSession },
    'GET',
    `/api/v1/merchant/transactions/${encodedId}`,
    undefined,
    'merchant',
  )
  return normalizeTransactionDetail(raw, fallbackTx)
}
