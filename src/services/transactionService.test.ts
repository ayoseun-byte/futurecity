import { describe, expect, it } from 'vitest'
import { normalizeTransactionDetail } from './transactionService'

describe('transactionService.normalizeTransactionDetail', () => {
  it('normalizes full tri-wallet split and payment context payloads', () => {
    const detail = normalizeTransactionDetail({
      id: 'tx_123',
      organizationId: 'psp_alpha',
      organizationName: 'Alpha PSP',
      merchantId: 'mrch_01',
      merchantName: 'Coffee Shop',
      merchantExternalId: 'ext_coffee',
      settlementMode: 'auto_offramp',
      type: 'PAYMENT_COLLECTION',
      grossAmount: 250,
      currency: 'USDC',
      split: {
        merchantNetAmount: 246.25,
        merchantDestinationWallet: '0x1111',
        pspMarkupAmount: 1.25,
        pspMarkupBps: 50,
        pspDestinationWallet: '0x2222',
        orkiFeeAmount: 2.5,
        orkiFeeBps: 100,
        orkiDestinationWallet: '0x3333',
      },
      chain: 'base',
      txHash: '0xabc',
      payerAddress: '0x999',
      status: 'COMPLETED',
      createdAt: '2026-11-18T12:00:00Z',
    })

    expect(detail.id).toBe('tx_123')
    expect(detail.split.merchantNetAmount).toBe(246.25)
    expect(detail.split.pspMarkupBps).toBe(50)
    expect(detail.split.orkiDestinationWallet).toBe('0x3333')
    expect(detail.explorerUrl).toBe('https://basescan.org/tx/0xabc')
  })

  it('derives Solscan URL and falls back to summary transaction attributes cleanly', () => {
    const detail = normalizeTransactionDetail({}, {
      id: 'tx_sol_1',
      organizationId: 'psp_sol',
      merchantId: 'mrch_sol',
      type: 'payment_collection',
      grossAmount: 100,
      currency: 'USDC',
      orkiFeeBps: 100,
      orkiFeeAmount: 1,
      pspMarkupBps: 25,
      pspMarkupAmount: 0.25,
      netAmount: 98.75,
      chain: 'solana',
      txHash: '5sigSolana123',
      payerAddress: 'So1111111',
      status: 'completed',
      createdAt: '2026-11-18T13:00:00Z',
    })

    expect(detail.explorerUrl).toBe('https://solscan.io/tx/5sigSolana123')
    expect(detail.split.merchantNetAmount).toBe(98.75)
    expect(detail.split.pspMarkupBps).toBe(25)
  })
})
