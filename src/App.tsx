import { useState } from 'react'
import { Header } from './components/Header'
import type { ActiveRole } from './components/Header'
import { OrgDashboard } from './views/Organization/OrgDashboard'
import { MerchantDashboard } from './views/Merchant/MerchantDashboard'
import { CustomerCheckoutView } from './views/Checkout/CustomerCheckoutView'
import { AdminPortalView } from './views/Admin/AdminPortalView'
import type { Merchant, Paylink, Transaction } from './types'
import {
  INITIAL_MERCHANTS,
  INITIAL_PAYLINKS,
  INITIAL_TRANSACTIONS,
} from './services/mockData'

export function App() {
  const [activeRole, setActiveRole] = useState<ActiveRole>('org')
  const [merchants, setMerchants] = useState<Merchant[]>(INITIAL_MERCHANTS)
  const [paylinks, setPaylinks] = useState<Paylink[]>(INITIAL_PAYLINKS)
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS)
  const [activeMerchantId, setActiveMerchantId] = useState<string>('mrch_9f2a1c')
  const [checkoutTargetPaylink, setCheckoutTargetPaylink] = useState<Paylink | null>(INITIAL_PAYLINKS[0])

  const activeMerchant =
    merchants.find((m) => m.id === activeMerchantId) || merchants[0]

  // Handlers
  const handleAddMerchant = (newMerchantData: Partial<Merchant>) => {
    const newMerchant: Merchant = {
      id: 'mrch_' + Math.random().toString(36).substring(7),
      externalId: newMerchantData.externalId || 'XSQ-MERCH-' + Math.floor(1000 + Math.random() * 9000),
      legalBusinessName: newMerchantData.legalBusinessName || 'New Merchant LLC',
      tradeLicenseNumber: newMerchantData.tradeLicenseNumber || 'TL-00000',
      jurisdiction: newMerchantData.jurisdiction || 'Dubai DED',
      representativeName: newMerchantData.representativeName || 'Signer',
      representativeEmail: newMerchantData.representativeEmail || 'signer@example.com',
      status: 'invited',
      settlementMode: newMerchantData.settlementMode || 'hold_as_received',
      createdAt: new Date().toISOString(),
      volumeUsdc: 0.0,
    }

    setMerchants([newMerchant, ...merchants])
  }

  const handleBatchCreated = (newMerchants: Merchant[]) => {
    setMerchants([...newMerchants, ...merchants])
  }

  const handleToggleMerchantStatus = (
    merchantId: string,
    newStatus: 'active' | 'disabled'
  ) => {
    setMerchants(
      merchants.map((m) => (m.id === merchantId ? { ...m, status: newStatus } : m))
    )
  }

  const handleUpdateActiveMerchant = (updated: Partial<Merchant>) => {
    setMerchants(
      merchants.map((m) =>
        m.id === activeMerchant.id ? { ...m, ...updated } : m
      )
    )
  }

  const handlePaylinkCreated = (newPaylink: Paylink) => {
    setPaylinks([newPaylink, ...paylinks])
  }

  const handleLaunchCheckout = (paylink: Paylink) => {
    setCheckoutTargetPaylink(paylink)
    setActiveRole('checkout')
  }

  const handlePaymentSettled = (newTx: Transaction) => {
    setTransactions([newTx, ...transactions])
  }

  const handleSelectMerchantForDashboard = (merchantId: string) => {
    setActiveMerchantId(merchantId)
    setActiveRole('merchant')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header
        activeRole={activeRole}
        onRoleChange={setActiveRole}
        activeMerchantName={activeMerchant?.legalBusinessName}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeRole === 'org' && (
          <OrgDashboard
            merchants={merchants}
            paylinks={paylinks}
            transactions={transactions}
            onAddMerchant={handleAddMerchant}
            onBatchCreated={handleBatchCreated}
            onToggleMerchantStatus={handleToggleMerchantStatus}
            onSelectMerchantForDashboard={handleSelectMerchantForDashboard}
          />
        )}

        {activeRole === 'merchant' && (
          <MerchantDashboard
            merchant={activeMerchant}
            paylinks={paylinks.filter(
              (p) => p.status === 'active' || p.status === 'disabled'
            )}
            transactions={transactions}
            onUpdateMerchant={handleUpdateActiveMerchant}
            onPaylinkCreated={handlePaylinkCreated}
            onLaunchCheckout={handleLaunchCheckout}
          />
        )}

        {activeRole === 'checkout' && (
          <CustomerCheckoutView
            activePaylink={checkoutTargetPaylink}
            onPaymentSettled={handlePaymentSettled}
          />
        )}

        {activeRole === 'admin' && <AdminPortalView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p className="font-medium text-slate-700">
          Orki × PSP Multi-Tenancy Architecture · Non-Custodial Stablecoin & Fiat Settlement Core
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Base (EVM) · Solana (SVM) · Bridge Liquidity Rails · Sumsub KYB · ZeroDev Passkeys
        </p>
      </footer>
    </div>
  )
}

export default App
