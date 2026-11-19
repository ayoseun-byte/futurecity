import { getApiConfig, requestApi } from './apiConfig'
import type { ApiConfig } from './apiConfig'

/**
 * The PSP-facing API, as an integration platform would call it.
 *
 * These are the endpoints the counterparty consoles (Invoicely, Shoplane,
 * Corner Shop) use — the same ones the Blade demo used, driven straight from
 * the browser with the PSP credential loaded in this tab.
 */

export interface ChargeSummary {
  chargeToken: string
  paymentLinkId?: string | null
  merchantExternalId?: string | null
  amount: string
  currency: string
  description?: string | null
  invoice?: { number?: string; issuedAt?: string; dueAt?: string } | null
  orderMetadata?: Record<string, unknown> | null
  status: string
  statusGroup?: string | null
  checkoutUrl?: string | null
  chain?: string | null
  txHash?: string | null
  paidAt?: string | null
  expiresAt?: string | null
}

export interface PaymentLinkSummary {
  id: string
  merchantExternalId?: string | null
  pricing: string
  amount?: string | null
  currency: string
  description?: string | null
  status: string
  checkoutUrl?: string | null
}

export interface Paged<T> {
  data: T[]
  total?: number
  current_page?: number
  per_page?: number
}

export async function listCharges(
  filters: { merchantExternalId?: string; status?: string } = {},
  config: ApiConfig = getApiConfig(),
): Promise<Paged<ChargeSummary>> {
  const query = new URLSearchParams()
  if (filters.merchantExternalId) query.set('merchantExternalId', filters.merchantExternalId)
  if (filters.status) query.set('status', filters.status)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return requestApi<Paged<ChargeSummary>>(config, 'GET', `/api/v1/psp/charges${suffix}`, undefined, 'psp')
}

export async function createCharge(
  body: Record<string, unknown>,
  config: ApiConfig = getApiConfig(),
): Promise<ChargeSummary> {
  return requestApi<ChargeSummary>(config, 'POST', '/api/v1/psp/charges', body, 'psp')
}

export async function cancelCharge(chargeToken: string, config: ApiConfig = getApiConfig()): Promise<ChargeSummary> {
  return requestApi<ChargeSummary>(config, 'PATCH', `/api/v1/psp/charges/${chargeToken}`, { status: 'cancelled' }, 'psp')
}

export async function listPaymentLinks(
  filters: { merchantExternalId?: string } = {},
  config: ApiConfig = getApiConfig(),
): Promise<Paged<PaymentLinkSummary>> {
  const query = new URLSearchParams()
  if (filters.merchantExternalId) query.set('merchantExternalId', filters.merchantExternalId)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return requestApi<Paged<PaymentLinkSummary>>(config, 'GET', `/api/v1/psp/payment-links${suffix}`, undefined, 'psp')
}

export async function createPaymentLink(
  body: Record<string, unknown>,
  config: ApiConfig = getApiConfig(),
): Promise<PaymentLinkSummary> {
  return requestApi<PaymentLinkSummary>(config, 'POST', '/api/v1/psp/payment-links', body, 'psp')
}

export interface MarkupSettings {
  markupBps?: number
  [key: string]: unknown
}

export async function fetchMarkupSettings(config: ApiConfig = getApiConfig()): Promise<MarkupSettings> {
  return requestApi<MarkupSettings>(config, 'GET', '/api/v1/psp/settings/markup', undefined, 'psp')
}

export interface MerchantSettings {
  id?: string
  externalId?: string
  name?: string
  acceptedTokens?: string[]
  acceptedChains?: string[]
  settlementMode?: string
  [key: string]: unknown
}

export async function fetchMerchantSettings(
  merchantId: string,
  config: ApiConfig = getApiConfig(),
): Promise<MerchantSettings> {
  return requestApi<MerchantSettings>(config, 'GET', `/api/v1/psp/merchants/${merchantId}`, undefined, 'psp')
}

const LOCAL_CHECKOUT_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

/**
 * Preserve explicit hosted checkout URLs returned by the backend (e.g. https://orki-pay-checkout.netlify.app/charge/...).
 * Only fall back to VITE_CHECKOUT_URL or window.location.origin for relative paths or stale localhost URLs.
 */
export function resolveLocalCheckoutHref(checkoutUrl: string): string {
  const trimmed = checkoutUrl.trim()
  if (!trimmed) return window.location.origin

  const configuredCheckoutBase = (import.meta.env.VITE_CHECKOUT_URL || '').trim().replace(/\/$/, '')
  const fallbackOrigin = configuredCheckoutBase || window.location.origin

  if (!/^https?:\/\//i.test(trimmed)) {
    const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    return `${fallbackOrigin}${normalizedPath}`
  }

  try {
    const parsed = new URL(trimmed)
    const isCurrentHostLocal = LOCAL_CHECKOUT_HOSTS.has(window.location.hostname)
    if (LOCAL_CHECKOUT_HOSTS.has(parsed.hostname) && (!isCurrentHostLocal || configuredCheckoutBase !== '')) {
      return `${fallbackOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`
    }
    return parsed.toString()
  } catch {
    return trimmed
  }
}
