import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, isMerchantOnboardingPath, type ApiConfig } from './apiConfig'

function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.get(key) ?? null
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
  }
}

describe('apiConfig merchant auth routing', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('sessionStorage', createMemoryStorage())
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    })
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('distinguishes strict onboarding routes from post-onboarding merchant routes', () => {
    expect(isMerchantOnboardingPath('/api/v1/merchant/onboarding')).toBe(true)
    expect(isMerchantOnboardingPath('/api/v1/merchant/wallets/challenge')).toBe(true)
    expect(isMerchantOnboardingPath('/api/v1/merchant/notice/acknowledge')).toBe(true)
    expect(isMerchantOnboardingPath('/api/v1/merchant/sumsub/token')).toBe(true)
    expect(isMerchantOnboardingPath('/api/v1/merchant/session/reissue')).toBe(true)

    expect(isMerchantOnboardingPath('/api/v1/merchant/metrics')).toBe(false)
    expect(isMerchantOnboardingPath('/api/v1/merchant/balances')).toBe(false)
    expect(isMerchantOnboardingPath('/api/v1/merchant/preferences')).toBe(false)
    expect(isMerchantOnboardingPath('/api/v1/merchant/settlement-mode')).toBe(false)
    expect(isMerchantOnboardingPath('/api/v1/merchant/settlement/offramp')).toBe(false)
    expect(isMerchantOnboardingPath('/api/v1/merchant/paylinks')).toBe(false)
    expect(isMerchantOnboardingPath('/api/v1/merchant/transactions/tx_123')).toBe(false)
  })

  it('requires an onboarding session secret (onb_sec_...) on onboarding routes even when pspKey is present', async () => {
    const pspOnlyConfig: ApiConfig = {
      baseUrl: 'https://api.example.com',
      adminKey: '',
      feeApproverKey: '',
      pspKey: 'sk_test_psp_123',
      merchantSession: '',
      merchantId: 'mrch_abc123',
    }

    await expect(
      apiRequest(pspOnlyConfig, 'GET', '/api/v1/merchant/onboarding', undefined, 'merchant')
    ).rejects.toThrow(/onb_sec_/i)

    await apiRequest(
      { ...pspOnlyConfig, merchantSession: 'onb_sec_live_999' },
      'POST',
      '/api/v1/merchant/wallets/challenge',
      '{}',
      'merchant'
    )

    const [, init] = fetchMock.mock.calls[0]
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer onb_sec_live_999')
    expect(headers['X-Merchant-Id']).toBeUndefined()
  })

  it('uses PSP Bearer key + X-Merchant-Id on post-onboarding merchant routes without an onboarding key', async () => {
    const pspConfig: ApiConfig = {
      baseUrl: 'https://api.example.com',
      adminKey: '',
      feeApproverKey: '',
      pspKey: 'sk_test_psp_123',
      merchantSession: '',
      merchantId: 'mrch_abc123',
    }

    await apiRequest(pspConfig, 'GET', '/api/v1/merchant/metrics', undefined, 'merchant')
    await apiRequest(pspConfig, 'PATCH', '/api/v1/merchant/preferences', JSON.stringify({ enabledChains: ['base'] }), 'merchant')
    await apiRequest(pspConfig, 'PATCH', '/api/v1/merchant/settlement-mode', JSON.stringify({ mode: 'auto_offramp' }), 'merchant')

    expect(fetchMock).toHaveBeenCalledTimes(3)
    for (const [, init] of fetchMock.mock.calls) {
      const headers = init.headers as Record<string, string>
      expect(headers.Authorization).toBe('Bearer sk_test_psp_123')
      expect(headers['X-Merchant-Id']).toBe('mrch_abc123')
    }
  })

  it('falls back to merchant onboarding session Bearer token on post-onboarding routes when pspKey is absent', async () => {
    const standaloneMerchantConfig: ApiConfig = {
      baseUrl: 'https://api.example.com',
      adminKey: '',
      feeApproverKey: '',
      pspKey: '',
      merchantSession: 'onb_sec_standalone_1',
      merchantId: 'mrch_abc123',
    }

    await apiRequest(standaloneMerchantConfig, 'GET', '/api/v1/merchant/balances', undefined, 'merchant')

    const [, init] = fetchMock.mock.calls[0]
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer onb_sec_standalone_1')
    expect(headers['X-Merchant-Id']).toBeUndefined()
  })
})
