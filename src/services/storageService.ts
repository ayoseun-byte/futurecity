import type { Organization, Merchant, Paylink, Transaction } from '../types'
import {
  INITIAL_PAYLINKS,
  INITIAL_TRANSACTIONS,
  MASTER_MERCHANT_TEMPLATES,
} from './mockData'

const DEMO_ORGANIZATION_IDS = new Set(['psp_xsquare01', 'psp_sandbox02', 'psp_gulfpay03'])
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
          merchant && typeof merchant.id === 'string'
        )
      }
    }
    return []
  } catch {
    return []
  }
}

export function saveStoredMerchants(merchants: Merchant[]): void {
  localStorage.setItem(STORAGE_KEYS.MERCHANTS, JSON.stringify(merchants))
}

/**
 * Dynamically generate a fresh set of sample merchants for a newly onboarded PSP from the Master Template.
 * Each merchant is isolated to that specific organizationId with unique externalId and credentials.
 */
export function generateMerchantsForPsp(organizationId: string, orgName?: string): Merchant[] {
  const organizationSlug = organizationId.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(-8) || 'org'
  const prefix = (orgName || organizationSlug).toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 4) || 'MERCH'

  return MASTER_MERCHANT_TEMPLATES.map((tmpl, idx) => {
    const externalId = `${prefix}-${idx + 1001}`
    const id = `mrch_${organizationSlug}_${tmpl.templateKey}_${idx + 1}`
    const pspDomain = organizationSlug.toLowerCase().replace(/[^a-z0-9]/g, '') || 'psp'
    const repEmail = `${tmpl.representativeName.toLowerCase().replace(/\s+/g, '.')}@${pspDomain}.example`

    return {
      id,
      organizationId,
      externalId,
      legalBusinessName: `${orgName || 'PSP'} ${tmpl.businessNameSuffix}`,
      tradeLicenseNumber: `${tmpl.tradeLicensePrefix}-${Math.floor(10000 + Math.random() * 90000)}`,
      jurisdiction: tmpl.jurisdiction,
      categoryType: tmpl.categoryType,
      representativeName: tmpl.representativeName,
      representativeEmail: repEmail,
      status: 'invited' as const,
      settlementMode: tmpl.settlementMode,
      nextStep: 'OPT_IN' as const,
      orkiFeeBps: 100,
      pspFeeBps: 35,
      volumeUsdc: 0,
      balanceUsdc: 0,
      createdAt: new Date().toISOString(),
    }
  })
}

/**
 * Ensures merchants exist for a given organization without overwriting in-progress states.
 * If merchants already exist for this organization, their progress (SumSub, KYB, Wallets, etc.) is preserved.
 */
export function ensureMerchantsForOrganization(organizationId: string, orgName?: string): Merchant[] {
  const storedMerchants = getStoredMerchants()
  const existingForOrg = storedMerchants.filter((m) => m.organizationId === organizationId)

  // CRITICAL: If this PSP already has merchants, NEVER wipe or overwrite their onboarding progress!
  if (existingForOrg.length > 0) {
    return existingForOrg
  }

  // Generate dynamic merchants from the master template for this new PSP
  const newMerchants = generateMerchantsForPsp(organizationId, orgName)
  const updatedMerchants = [...newMerchants, ...storedMerchants]
  saveStoredMerchants(updatedMerchants)
  return newMerchants
}

export function ensureDemoDataForOrganization(organizationId: string, orgName?: string): void {
  ensureMerchantsForOrganization(organizationId, orgName)
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
