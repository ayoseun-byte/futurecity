import type { Organization, Merchant, Paylink, Transaction } from '../types'
import {
  INITIAL_MERCHANTS,
  INITIAL_PAYLINKS,
  INITIAL_TRANSACTIONS,
} from './mockData'

const DEMO_ORGANIZATION_IDS = new Set(['psp_xsquare01', 'psp_sandbox02', 'psp_gulfpay03'])
const DEMO_MERCHANT_IDS = new Set(INITIAL_MERCHANTS.map((merchant) => merchant.id))
const DEMO_PAYLINK_IDS = new Set(INITIAL_PAYLINKS.map((paylink) => paylink.id))
const DEMO_TRANSACTION_IDS = new Set(INITIAL_TRANSACTIONS.map((transaction) => transaction.id))

const STORAGE_KEYS = {
  ORGANIZATIONS: 'orki_organizations_v2',
  MERCHANTS: 'orki_merchants_v2',
  PAYLINKS: 'orki_paylinks_v2',
  TRANSACTIONS: 'orki_transactions_v2',
}

// ---------------------------------------------------------------------------
// ORGANIZATIONS
// ---------------------------------------------------------------------------
export function getStoredOrganizations(): Organization[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORGANIZATIONS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const organizations = parsed.filter((organization): organization is Organization =>
          organization && typeof organization.id === 'string' && !DEMO_ORGANIZATION_IDS.has(organization.id)
        )
        if (organizations.length !== parsed.length) saveStoredOrganizations(organizations)
        return organizations
      }
    }
    return []
  } catch {
    return []
  }
}

export function saveStoredOrganizations(orgs: Organization[]): void {
  localStorage.setItem(STORAGE_KEYS.ORGANIZATIONS, JSON.stringify(
    orgs.filter((organization) => !DEMO_ORGANIZATION_IDS.has(organization.id))
  ))
}

export function addStoredOrganization(org: Organization): void {
  const current = getStoredOrganizations()
  const exists = current.find((o) => o.id === org.id)
  if (exists) {
    saveStoredOrganizations(current.map((o) => (o.id === org.id ? org : o)))
  } else {
    saveStoredOrganizations([org, ...current])
  }
}

export function updateStoredOrganization(id: string, updates: Partial<Organization>): Organization | null {
  const current = getStoredOrganizations()
  let updatedOrg: Organization | null = null
  const next = current.map((o) => {
    if (o.id === id) {
      updatedOrg = { ...o, ...updates }
      return updatedOrg
    }
    return o
  })
  if (updatedOrg) {
    saveStoredOrganizations(next)
  }
  return updatedOrg
}

// ---------------------------------------------------------------------------
// MERCHANTS
// ---------------------------------------------------------------------------
export function getStoredMerchants(): Merchant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MERCHANTS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter((merchant): merchant is Merchant =>
          merchant && typeof merchant.id === 'string' && !DEMO_MERCHANT_IDS.has(merchant.id)
        )
      }
    }
    return []
  } catch {
    return []
  }
}

export function saveStoredMerchants(merchants: Merchant[]): void {
  localStorage.setItem(STORAGE_KEYS.MERCHANTS, JSON.stringify(
    merchants.filter((merchant) => !DEMO_MERCHANT_IDS.has(merchant.id))
  ))
}

export function ensureDemoDataForOrganization(organizationId: string): void {
  const storedMerchants = getStoredMerchants()
  const organizationSlug = organizationId.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(-12) || 'org'
  const demoTemplates = INITIAL_MERCHANTS.filter((merchant) => merchant.organizationId === 'psp_xsquare01')
  const existingDemoMerchants = storedMerchants.filter((merchant) =>
    merchant.organizationId === organizationId && merchant.id.startsWith('mrch_demo_')
  )

  const existingByExternalId = new Map(existingDemoMerchants.map((merchant) => [merchant.externalId, merchant]))
  const merchantIds = new Map(
    demoTemplates.map((merchant, index) => [merchant.id, `mrch_demo_${organizationSlug}_${index + 1}`])
  )
  const demoMerchants = demoTemplates.map((merchant, index) => {
    const externalId = `${organizationSlug.toUpperCase()}-${index + 1}`
    const existing = existingByExternalId.get(externalId)
    return {
      ...merchant,
      ...existing,
      id: existing?.id ?? merchantIds.get(merchant.id) ?? merchant.id,
      organizationId,
      externalId,
      status: 'invited' as const,
      nextStep: 'OPT_IN' as const,
      merchantWallet: undefined,
      baseWalletAddress: undefined,
      solanaWalletAddress: undefined,
      passkeyId: undefined,
      noticeAcknowledgedAt: undefined,
      kybInformationSubmittedAt: undefined,
      termsAcceptedAt: undefined,
      sumsubCompletedAt: undefined,
      passkeyRegisteredAt: undefined,
      verifiedAt: undefined,
      activatedAt: undefined,
      volumeUsdc: 0,
      balanceUsdc: 0,
    }
  })

  saveStoredMerchants([
    ...demoMerchants,
    ...storedMerchants.filter((merchant) =>
      merchant.organizationId !== organizationId || !merchant.id.startsWith('mrch_demo_')
    ),
  ])

  const demoPaylinks = INITIAL_PAYLINKS
    .filter((paylink) => paylink.organizationId === 'psp_xsquare01')
    .map((paylink, index) => ({
      ...paylink,
      id: `plk_demo_${organizationSlug}_${index + 1}`,
      merchantId: merchantIds.get(paylink.merchantId ?? ''),
      organizationId,
      slug: `${paylink.slug}-${organizationSlug}`,
      checkoutUrl: `/checkout/${paylink.slug}-${organizationSlug}`,
    }))
  const storedPaylinks = getStoredPaylinks()
  const demoPaylinkPrefix = `plk_demo_${organizationSlug}_`
  saveStoredPaylinks([
    ...demoPaylinks,
    ...storedPaylinks.filter((paylink) =>
      !DEMO_PAYLINK_IDS.has(paylink.id) && !paylink.id.startsWith(demoPaylinkPrefix)
    ),
  ])

  const demoTransactions = INITIAL_TRANSACTIONS
    .filter((transaction) => transaction.organizationId === 'psp_xsquare01')
    .map((transaction, index) => ({
      ...transaction,
      id: `tx_demo_${organizationSlug}_${index + 1}`,
      merchantId: merchantIds.get(transaction.merchantId) ?? transaction.merchantId,
      organizationId,
    }))
  const storedTransactions = getStoredTransactions()
  const demoTransactionPrefix = `tx_demo_${organizationSlug}_`
  saveStoredTransactions([
    ...demoTransactions,
    ...storedTransactions.filter((transaction) =>
      !DEMO_TRANSACTION_IDS.has(transaction.id) && !transaction.id.startsWith(demoTransactionPrefix)
    ),
  ])
}

export function addStoredMerchant(merchant: Merchant): void {
  const current = getStoredMerchants()
  const exists = current.find((m) => m.id === merchant.id)
  if (exists) {
    saveStoredMerchants(current.map((m) => (m.id === merchant.id ? merchant : m)))
  } else {
    saveStoredMerchants([merchant, ...current])
  }
}

export function updateStoredMerchant(id: string, updates: Partial<Merchant>): Merchant | null {
  const current = getStoredMerchants()
  let updatedMerch: Merchant | null = null
  const next = current.map((m) => {
    if (m.id === id) {
      updatedMerch = { ...m, ...updates }
      return updatedMerch
    }
    return m
  })
  if (updatedMerch) {
    saveStoredMerchants(next)
  }
  return updatedMerch
}

// ---------------------------------------------------------------------------
// PAYLINKS
// ---------------------------------------------------------------------------
export function getStoredPaylinks(): Paylink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYLINKS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter((paylink): paylink is Paylink =>
          paylink && typeof paylink.id === 'string' && !DEMO_PAYLINK_IDS.has(paylink.id)
        )
      }
    }
    return []
  } catch {
    return []
  }
}

export function saveStoredPaylinks(paylinks: Paylink[]): void {
  localStorage.setItem(STORAGE_KEYS.PAYLINKS, JSON.stringify(
    paylinks.filter((paylink) => !DEMO_PAYLINK_IDS.has(paylink.id))
  ))
}

export function addStoredPaylink(paylink: Paylink): void {
  const current = getStoredPaylinks()
  saveStoredPaylinks([paylink, ...current])
}

// ---------------------------------------------------------------------------
// TRANSACTIONS
// ---------------------------------------------------------------------------
export function getStoredTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter((transaction): transaction is Transaction =>
          transaction && typeof transaction.id === 'string' && !DEMO_TRANSACTION_IDS.has(transaction.id)
        )
      }
    }
    return []
  } catch {
    return []
  }
}

export function saveStoredTransactions(txs: Transaction[]): void {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(
    txs.filter((transaction) => !DEMO_TRANSACTION_IDS.has(transaction.id))
  ))
}

export function addStoredTransaction(tx: Transaction): void {
  const current = getStoredTransactions()
  saveStoredTransactions([tx, ...current])
}

// ---------------------------------------------------------------------------
// RESET & SEEDING UTILITIES
// ---------------------------------------------------------------------------
export function clearAllStoredData(): void {
  localStorage.removeItem(STORAGE_KEYS.ORGANIZATIONS)
  localStorage.removeItem(STORAGE_KEYS.MERCHANTS)
  localStorage.removeItem(STORAGE_KEYS.PAYLINKS)
  localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS)
}
