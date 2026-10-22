import type { Organization, Merchant, Paylink, Transaction } from '../types'
import {
  INITIAL_ORGANIZATIONS,
  INITIAL_MERCHANTS,
  INITIAL_PAYLINKS,
  INITIAL_TRANSACTIONS,
} from './mockData'

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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    saveStoredOrganizations(INITIAL_ORGANIZATIONS)
    return INITIAL_ORGANIZATIONS
  } catch {
    return INITIAL_ORGANIZATIONS
  }
}

export function saveStoredOrganizations(orgs: Organization[]): void {
  localStorage.setItem(STORAGE_KEYS.ORGANIZATIONS, JSON.stringify(orgs))
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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    saveStoredMerchants(INITIAL_MERCHANTS)
    return INITIAL_MERCHANTS
  } catch {
    return INITIAL_MERCHANTS
  }
}

export function saveStoredMerchants(merchants: Merchant[]): void {
  localStorage.setItem(STORAGE_KEYS.MERCHANTS, JSON.stringify(merchants))
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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    saveStoredPaylinks(INITIAL_PAYLINKS)
    return INITIAL_PAYLINKS
  } catch {
    return INITIAL_PAYLINKS
  }
}

export function saveStoredPaylinks(paylinks: Paylink[]): void {
  localStorage.setItem(STORAGE_KEYS.PAYLINKS, JSON.stringify(paylinks))
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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    saveStoredTransactions(INITIAL_TRANSACTIONS)
    return INITIAL_TRANSACTIONS
  } catch {
    return INITIAL_TRANSACTIONS
  }
}

export function saveStoredTransactions(txs: Transaction[]): void {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs))
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
