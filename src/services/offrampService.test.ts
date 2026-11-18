import { describe, expect, it } from 'vitest'
import { normalizeOfframpStatus } from './offrampService'

describe('offrampService.normalizeOfframpStatus', () => {
  it('respects backend USE_BRIDGE and USE_DUE feature switches cleanly', () => {
    const bridgeOnly = normalizeOfframpStatus({
      merchantId: 'mrch_01',
      settlementMode: 'auto_offramp',
      providersEnabled: { bridge: true, due: false },
      offrampEligible: true,
      bridgeKybStatus: 'approved',
      dueKybStatus: 'not_started',
      bridge: {
        enabled: true,
        status: 'approved',
        customerId: 'cust_123',
        signedAgreementId: 'agree_123',
        tosUrl: null,
        kycUrl: null,
        externalAccountId: 'ext_123',
        eligible: true,
        lastError: null,
        liquidationAddresses: [
          {
            id: 'liq_local_1',
            provider: 'bridge',
            externalAccountId: 'ext_123',
            providerLiquidationId: 'liq_bridge_1',
            chain: 'base',
            currency: 'usdc',
            destinationCurrency: 'usd',
            destinationPaymentRail: 'ach',
            address: '0x1234567890abcdef',
            blockchainMemo: null,
            status: 'active',
          },
        ],
      },
    })

    expect(bridgeOnly.providersEnabled.bridge).toBe(true)
    expect(bridgeOnly.providersEnabled.due).toBe(false)
    expect(bridgeOnly.due.enabled).toBe(false)
    expect(bridgeOnly.bridge.enabled).toBe(true)
    expect(bridgeOnly.liquidationAddresses).toHaveLength(1)
    expect(bridgeOnly.liquidationAddresses[0]?.chain).toBe('base')
  })

  it('falls back gracefully for legacy dueStatus payloads', () => {
    const legacy = normalizeOfframpStatus({
      merchantId: 'mrch_legacy',
      settlementMode: 'hold_as_received',
      dueKybStatus: 'approved',
      offrampEligible: true,
    })

    expect(legacy.providersEnabled.bridge).toBe(false)
    expect(legacy.providersEnabled.due).toBe(true)
    expect(legacy.due.status).toBe('approved')
    expect(legacy.liquidationAddresses).toEqual([])
  })
})
