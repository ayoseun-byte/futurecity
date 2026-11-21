import type { Organization, Merchant, Paylink, Transaction } from '../types'
import {
  INITIAL_PAYLINKS,
  INITIAL_TRANSACTIONS,
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
        const cleaned = parsed.filter((merchant): merchant is Merchant =>
          merchant &&
          typeof merchant.id === 'string' &&
          !merchant.representativeEmail?.endsWith('.example') &&
          !merchant.id.includes('_template_') &&
          !merchant.id.includes('mrch_org_')
        )
        if (cleaned.length !== parsed.length) {
          saveStoredMerchants(cleaned)
        }
        return cleaned
      }
    }
    return []
  } catch {
    return []
  }
}

export function saveStoredMerchants(merchants: Merchant[]): void {
  const filtered = merchants.filter(
    (m) => !m.representativeEmail?.endsWith('.example') && !m.id.includes('_template_')
  )
  localStorage.setItem(STORAGE_KEYS.MERCHANTS, JSON.stringify(filtered))
}

const RANDOM_MERCHANT_CANDIDATES: Array<{
  legalBusinessName: string
  tradeLicensePrefix: string
  jurisdiction: string
  representativeName: string
  emailDomain: string
}> = [
  {
    legalBusinessName: 'Almas Jewels & Bullion DMCC',
    tradeLicensePrefix: 'DMCC',
    jurisdiction: 'Dubai DMCC',
    representativeName: 'Fatima Al-Mansoor',
    emailDomain: 'almasbullion.ae',
  },
  {
    legalBusinessName: 'Falcon Maritime Logistics LLC',
    tradeLicensePrefix: 'DED',
    jurisdiction: 'Dubai DED',
    representativeName: 'Tariq Al-Hashimi',
    emailDomain: 'falconmaritime.ae',
  },
  {
    legalBusinessName: 'Oasis Cloud Infrastructure FZCO',
    tradeLicensePrefix: 'IFZA',
    jurisdiction: 'Dubai IFZA',
    representativeName: 'Nadia El-Masri',
    emailDomain: 'oasiscloud.io',
  },
  {
    legalBusinessName: 'Crescent Capital Advisory Ltd',
    tradeLicensePrefix: 'DIFC',
    jurisdiction: 'DIFC',
    representativeName: 'Omar Al-Suwaidi',
    emailDomain: 'crescentadvisory.ae',
  },
  {
    legalBusinessName: 'Maryah Digital Commerce Ltd',
    tradeLicensePrefix: 'ADGM',
    jurisdiction: 'Abu Dhabi ADGM',
    representativeName: 'Layla Al-Ketbi',
    emailDomain: 'maryahcommerce.ae',
  },
  {
    legalBusinessName: 'Veridian Luxury Hospitality LLC',
    tradeLicensePrefix: 'DED',
    jurisdiction: 'Dubai DED',
    representativeName: 'Zayd Al-Maktoum',
    emailDomain: 'veridianhospitality.ae',
  },
  {
    legalBusinessName: 'SilkRoad Commodities Trading DMCC',
    tradeLicensePrefix: 'DMCC',
    jurisdiction: 'Dubai DMCC',
    representativeName: 'Rohan Malhotra',
    emailDomain: 'silkroadcommodities.ae',
  },
  {
    legalBusinessName: 'GulfStream Aviation Parts FZ-LLC',
    tradeLicensePrefix: 'IFZA',
    jurisdiction: 'Dubai IFZA',
    representativeName: 'Kareem Nassar',
    emailDomain: 'gulfstreamaviation.ae',
  },
  {
    legalBusinessName: 'Bishopsgate FinTech Solutions Ltd',
    tradeLicensePrefix: 'CH',
    jurisdiction: 'United Kingdom',
    representativeName: 'Eleanor Vance',
    emailDomain: 'bishopsgatefintech.co.uk',
  },
  {
    legalBusinessName: 'Marina Bay Global Exports Pte Ltd',
    tradeLicensePrefix: 'UEN',
    jurisdiction: 'Singapore',
    representativeName: 'Marcus Tan',
    emailDomain: 'marinabayexports.sg',
  },
  {
    legalBusinessName: 'Qaryat Fine Art & Collectibles Ltd',
    tradeLicensePrefix: 'ADGM',
    jurisdiction: 'Abu Dhabi ADGM',
    representativeName: 'Amira Khoury',
    emailDomain: 'qaryatart.ae',
  },
  {
    legalBusinessName: 'Atlas Medical Supplies FZCO',
    tradeLicensePrefix: 'IFZA',
    jurisdiction: 'Dubai IFZA',
    representativeName: 'Dr. Bilal Haddad',
    emailDomain: 'atlasmedical.ae',
  },
]

export function generateMerchantsForPsp(organizationId = 'psp_default', orgName?: string): Merchant[] {
  const cleanOrgPrefix = (orgName || organizationId)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4) || 'PSP'
  const orgSlug = organizationId.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'org'

  // Shuffle candidate pool so each PSP gets 5 random pre-Orki merchants
  const pool = [...RANDOM_MERCHANT_CANDIDATES]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  const now = Date.now()
  return pool.slice(0, 5).map((candidate, index) => {
    const randNum = Math.floor(100000 + Math.random() * 900000)
    const extRand = Math.floor(1000 + Math.random() * 9000)
    const firstName = candidate.representativeName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8) || 'rep'
    return {
      // Pre-Orki PSP roster ID (becomes mrch_... only when the merchant reads and accepts the notice)
      id: `psp_roster_${orgSlug}_${index + 1}_${extRand}`,
      organizationId,
      externalId: `${cleanOrgPrefix}-MERCH-${extRand}`,
      legalBusinessName: candidate.legalBusinessName,
      tradeLicenseNumber: `${candidate.tradeLicensePrefix}-${randNum}`,
      jurisdiction: candidate.jurisdiction,
      representativeName: candidate.representativeName,
      representativeEmail: `${firstName}@${candidate.emailDomain}`,
      status: 'invited',
      nextStep: 'OPT_IN',
      settlementMode: 'hold_as_received',
      createdAt: new Date(now - index * 3600_000).toISOString(),
      volumeUsdc: 0,
      balanceUsdc: 0,
    }
  })
}

export function ensureMerchantsForOrganization(organizationId: string, _orgName?: string): Merchant[] {
  const storedMerchants = getStoredMerchants()
  return storedMerchants.filter((m) => m.organizationId === organizationId)
}

export function ensureDemoDataForOrganization(_organizationId: string, _orgName?: string): void {
  // Mock merchants are not auto-generated
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
