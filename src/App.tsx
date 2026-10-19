import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import type { UserRole } from './context/AuthContext'
import { Header } from './components/Header'
import { LoginView } from './views/Auth/LoginView'
import { OrgDashboard } from './views/Organization/OrgDashboard'
import { MerchantDetailPage } from './views/Organization/MerchantDetailPage'
import { MerchantDashboard } from './views/Merchant/MerchantDashboard'
import { CustomerCheckoutView } from './views/Checkout/CustomerCheckoutView'
import { OrkiAdminPortal } from './views/Admin/OrkiAdminPortal'
import type { Merchant, Paylink, Transaction, Organization } from './types'
import {
  INITIAL_ORGANIZATIONS,
  INITIAL_MERCHANTS,
  INITIAL_PAYLINKS,
  INITIAL_TRANSACTIONS,
} from './services/mockData'

// Protected Route Guard
function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles: UserRole[]
}) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'org') return <Navigate to="/org" replace />
    if (user.role === 'merchant') return <Navigate to="/merchant" replace />
    if (user.role === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Main Authenticated Layout
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
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

function MainRoutes() {
  const { user, isAuthenticated } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>(INITIAL_ORGANIZATIONS)
  const [merchants, setMerchants] = useState<Merchant[]>(INITIAL_MERCHANTS)
  const [paylinks, setPaylinks] = useState<Paylink[]>(INITIAL_PAYLINKS)
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS)

  // Derive active organization for org view based on auth user
  const activeOrgId = user?.organizationId || 'psp_xsquare01'
  const activeOrg =
    organizations.find((o) => o.id === activeOrgId) || organizations[0]

  // Derive active merchant for merchant view based on auth user
  const activeMerchantId = user?.merchantId || 'mrch_9f2a1c'
  const activeMerchant =
    merchants.find((m) => m.id === activeMerchantId) || merchants[0]

  // Organization Handlers
  const handleUpdateOrganization = (updated: Organization) => {
    setOrganizations(
      organizations.map((org) => (org.id === updated.id ? updated : org))
    )
  }

  const handleAddOrganization = (newOrg: Organization) => {
    setOrganizations([newOrg, ...organizations])
  }

  const handleUpdateFeeSchedule = (orgId: string, newMarkupBps: number) => {
    setOrganizations(
      organizations.map((org) => {
        if (org.id === orgId && org.feeSchedule) {
          return {
            ...org,
            feeSchedule: {
              ...org.feeSchedule,
              pspMarkupBps: newMarkupBps,
              lockedUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
            },
          }
        }
        return org
      })
    )
  }

  // Merchant Handlers
  const handleAddMerchant = (newMerchantData: Partial<Merchant>) => {
    const newMerchant: Merchant = {
      id: 'mrch_' + Math.random().toString(36).substring(7),
      organizationId: activeOrg.id,
      externalId:
        newMerchantData.externalId ||
        'XSQ-MERCH-' + Math.floor(1000 + Math.random() * 9000),
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
    const tagged = newMerchants.map((m) => ({ ...m, organizationId: activeOrg.id }))
    setMerchants([...tagged, ...merchants])
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

  const handlePaymentSettled = (newTx: Transaction) => {
    setTransactions([newTx, ...transactions])
  }

  return (
    <Routes>
      {/* Public Login Route */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            user?.role === 'org' ? (
              <Navigate to="/org" replace />
            ) : user?.role === 'merchant' ? (
              <Navigate to="/merchant" replace />
            ) : (
              <Navigate to="/admin" replace />
            )
          ) : (
            <LoginView />
          )
        }
      />

      {/* Organization Portal */}
      <Route
        path="/org"
        element={
          <ProtectedRoute allowedRoles={['org']}>
            <AppLayout>
              <OrgDashboard
                organization={activeOrg}
                merchants={merchants}
                paylinks={paylinks}
                transactions={transactions}
                onAddMerchant={handleAddMerchant}
                onBatchCreated={handleBatchCreated}
                onToggleMerchantStatus={handleToggleMerchantStatus}
                onSelectMerchantForDashboard={(id) => {
                  window.location.href = `/org/merchants/${id}`
                }}
                onUpdateFeeSchedule={handleUpdateFeeSchedule}
              />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Dedicated Merchant Detail / Inspection Route */}
      <Route
        path="/org/merchants/:id"
        element={
          <ProtectedRoute allowedRoles={['org']}>
            <AppLayout>
              <MerchantDetailPage
                merchants={merchants}
                paylinks={paylinks}
                transactions={transactions}
                onToggleStatus={handleToggleMerchantStatus}
              />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Merchant Portal */}
      <Route
        path="/merchant"
        element={
          <ProtectedRoute allowedRoles={['merchant']}>
            <AppLayout>
              <MerchantDashboard
                merchant={activeMerchant}
                paylinks={paylinks.filter(
                  (p) => p.status === 'active' || p.status === 'disabled'
                )}
                transactions={transactions}
                onUpdateMerchant={handleUpdateActiveMerchant}
                onPaylinkCreated={handlePaylinkCreated}
                onLaunchCheckout={(plk) => {
                  window.open(`/checkout/${plk.slug}`, '_blank')
                }}
              />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Orki Headquarters Admin Portal (Part 1 8-Stage Onboarding) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout>
              <OrkiAdminPortal
                organizations={organizations}
                onUpdateOrganization={handleUpdateOrganization}
                onAddOrganization={handleAddOrganization}
              />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Standalone Hosted Customer Checkout */}
      <Route
        path="/checkout/:slug"
        element={
          <CustomerCheckoutView
            allPaylinks={paylinks}
            onPaymentSettled={handlePaymentSettled}
          />
        }
      />

      {/* Root redirect */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            user?.role === 'org' ? (
              <Navigate to="/org" replace />
            ) : user?.role === 'merchant' ? (
              <Navigate to="/merchant" replace />
            ) : (
              <Navigate to="/admin" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
