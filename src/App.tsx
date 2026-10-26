import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import type { UserRole } from './context/AuthContext'
import { Header } from './components/Header'
import { LoginView } from './views/Auth/LoginView'
import { OrgDashboard } from './views/Organization/OrgDashboard'
import { MerchantDetailPage } from './views/Organization/MerchantDetailPage'
import { MerchantDashboard } from './views/Merchant/MerchantDashboard'
import { CustomerCheckoutView } from './views/Checkout/CustomerCheckoutView'
import { OrkiAdminPortal } from './views/Admin/OrkiAdminPortal'
import { PasskeyCeremonyPage } from './views/Onboarding/PasskeyCeremonyPage'
import { HostedTosPage } from './views/Onboarding/HostedTosPage'
import { LegalDocumentPage } from './views/Legal/LegalDocumentPage'
import { ApiWorkbench } from './views/ApiWorkbench'
import type { Merchant, Paylink, Transaction, Organization } from './types'
import {
  getStoredOrganizations,
  saveStoredOrganizations,
  getStoredMerchants,
  saveStoredMerchants,
  getStoredPaylinks,
  saveStoredPaylinks,
  getStoredTransactions,
  saveStoredTransactions,
  ensureDemoDataForOrganization,
  clearAllStoredData,
} from './services/storageService'
import { fetchPspDashboard, type PspDashboardMetrics } from './services/pspMerchantService'
import { getApiConfig, requestApi } from './services/apiConfig'
import { AlertCircle, ArrowRight } from 'lucide-react'

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
        <div className="mt-2">
          <button
            onClick={() => {
              if (window.confirm('Reset all locally stored organizations and merchants?')) {
                clearAllStoredData()
                window.location.href = '/login'
              }
            }}
            className="text-[10px] text-slate-400 hover:text-slate-600 underline"
          >
            Clear Local Test Data
          </button>
        </div>
      </footer>
    </div>
  )
}

function MainRoutes() {
  const { user, isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const [organizations, setOrganizations] = useState<Organization[]>(getStoredOrganizations)
  const [merchants, setMerchants] = useState<Merchant[]>(getStoredMerchants)
  const [paylinks, setPaylinks] = useState<Paylink[]>(getStoredPaylinks)
  const [transactions, setTransactions] = useState<Transaction[]>(getStoredTransactions)
  const [pspMetrics, setPspMetrics] = useState<PspDashboardMetrics | null>(null)
  const [pspDashboardLoading, setPspDashboardLoading] = useState(false)
  const [pspDashboardError, setPspDashboardError] = useState<string | null>(null)

  // Persist state changes to storageService
  useEffect(() => {
    saveStoredOrganizations(organizations)
  }, [organizations])

  useEffect(() => {
    saveStoredMerchants(merchants)
  }, [merchants])

  useEffect(() => {
    saveStoredPaylinks(paylinks)
  }, [paylinks])

  useEffect(() => {
    saveStoredTransactions(transactions)
  }, [transactions])

  useEffect(() => {
    if (user?.role !== 'org') return

    const storedOrganizations = getStoredOrganizations()
    const activeOrganization = storedOrganizations.find((organization) => organization.id === user.organizationId)
    if (!activeOrganization) return

    ensureDemoDataForOrganization(activeOrganization.id)
    setOrganizations(storedOrganizations)
    setMerchants(getStoredMerchants())
    setPaylinks(getStoredPaylinks())
    setTransactions(getStoredTransactions().filter((transaction) => !transaction.id.startsWith('tx_demo_')))
    const demoMerchantIdsByExternalId = new Map(
      getStoredMerchants()
        .filter((merchant) =>
          merchant.organizationId === activeOrganization.id && merchant.id.startsWith('mrch_demo_')
        )
        .map((merchant) => [merchant.externalId, merchant.id])
    )

    let active = true
    setPspDashboardLoading(true)
    setPspDashboardError(null)
    void fetchPspDashboard(activeOrganization.id)
      .then((dashboard) => {
        if (!active) return
        if (dashboard === null) {
          setPspMetrics(null)
          setTransactions([])
          setPspDashboardError('Set the PSP API key in the Backend API workbench to load live dashboard data.')
          return
        }
        setPspMetrics(dashboard.metrics)
        setTransactions(dashboard.transactions)
        setOrganizations((current) => current.map((organization) =>
          organization.id === activeOrganization.id && dashboard.feeSchedule
            ? { ...organization, feeSchedule: dashboard.feeSchedule }
            : organization
        ))
        const merchantIdReplacements = new Map(
          dashboard.merchants.flatMap((merchant) => {
            const demoId = demoMerchantIdsByExternalId.get(merchant.externalId)
            return demoId && demoId !== merchant.id ? [[demoId, merchant.id] as const] : []
          })
        )
        const savedExternalIds = new Set(
          dashboard.merchants.map((merchant) => merchant.externalId).filter(Boolean)
        )
        setMerchants((current) => [
          ...current.filter((merchant) =>
            merchant.organizationId !== activeOrganization.id ||
            !savedExternalIds.has(merchant.externalId)
          ),
          ...dashboard.merchants,
        ])
        if (merchantIdReplacements.size > 0) {
          setPaylinks((current) => current.map((paylink) => ({
            ...paylink,
            merchantId: paylink.merchantId
              ? merchantIdReplacements.get(paylink.merchantId) ?? paylink.merchantId
              : undefined,
          })))
          setTransactions((current) => current.map((transaction) => ({
            ...transaction,
            merchantId: merchantIdReplacements.get(transaction.merchantId) ?? transaction.merchantId,
          })))
        }
      })
      .catch((error: unknown) => {
        if (!active) return
        setPspDashboardError(error instanceof Error ? error.message : 'Failed to load PSP dashboard data.')
        setTransactions([])
        setPspMetrics(null)
      })
      .finally(() => {
        if (active) setPspDashboardLoading(false)
      })

    return () => {
      active = false
    }
  }, [user?.role, user?.organizationId])

  // Derive active organization for org view based on auth user
  const activeOrg = organizations.find((o) => o.id === user?.organizationId)

  // Derive active merchant for merchant view based on auth user
  const activeMerchant = merchants.find((m) => m.id === user?.merchantId)

  // Organization Handlers
  const handleUpdateOrganization = (updated: Organization) => {
    setOrganizations(
      organizations.map((org) => (org.id === updated.id ? updated : org))
    )
  }

  const handleAddOrganization = (newOrg: Organization) => {
    setOrganizations([newOrg, ...organizations])
  }

  const handleRequestFeeChange = async (
    orgId: string,
    requestedMarkupBps: number,
    requestedBy: string,
    reason: string
  ) => {
    const result = await requestApi<{
      id: string
      status: 'pending_approval'
      requestedMarkupBps: number
      submittedAt: string
      effectiveAt: string
    }>(getApiConfig(), 'POST', '/api/v1/psp/fee-change-requests', {
      requestedMarkupBps,
      requestedBy,
      reason,
    }, 'psp')
    setOrganizations((current) => current.map((organization) =>
      organization.id === orgId && organization.feeSchedule
        ? {
            ...organization,
            feeSchedule: {
              ...organization.feeSchedule,
              pendingChangeRequest: {
                id: result.id,
                requestedMarkupBps: result.requestedMarkupBps,
                requestedAt: result.submittedAt,
                effectiveAt: result.effectiveAt,
                status: result.status,
              },
            },
          }
        : organization
    ))
  }

  // Merchant Handlers
  const handleAddMerchant = (newMerchantData: Partial<Merchant>) => {
    const orgId = activeOrg?.id || 'psp_default'
    const newMerchant: Merchant = {
      id: 'mrch_' + Math.random().toString(36).substring(7),
      organizationId: orgId,
      externalId:
        newMerchantData.externalId ||
        'XSQ-MERCH-' + Math.floor(1000 + Math.random() * 9000),
      legalBusinessName: newMerchantData.legalBusinessName || 'New Merchant LLC',
      tradeLicenseNumber: newMerchantData.tradeLicenseNumber || 'TL-00000',
      jurisdiction: newMerchantData.jurisdiction || 'Dubai DED',
      representativeName: newMerchantData.representativeName || 'Signer',
      representativeEmail: newMerchantData.representativeEmail || 'signer@example.com',
      status: 'invited',
      nextStep: 'OPT_IN',
      settlementMode: newMerchantData.settlementMode || 'hold_as_received',
      orkiFeeWallet: undefined,
      pspFeeWallet: activeOrg?.feeWallet || undefined,
      orkiFeeBps: activeOrg?.feeSchedule?.orkiFeeBps ?? 100,
      orkiFeeCapPercent: activeOrg?.feeSchedule?.orkiFeeCapPercent ?? 1.00,
      orkiFeeCapAmount: activeOrg?.feeSchedule?.orkiFeeCapAmount ?? 25.00,
      pspFeeBps: activeOrg?.feeSchedule?.pspMarkupBps ?? 0,
      createdAt: new Date().toISOString(),
      volumeUsdc: 0.0,
      balanceUsdc: 0.0,
    }
    setMerchants([newMerchant, ...merchants])
  }

  const handleBatchCreated = (newMerchants: Merchant[]) => {
    const orgId = activeOrg?.id || 'psp_default'
    const tagged = newMerchants.map((m) => ({ ...m, organizationId: orgId, nextStep: 'OPT_IN' as const }))
    setMerchants([...tagged, ...merchants])
  }

  const handleToggleMerchantStatus = async (
    merchantId: string,
    newStatus: 'active' | 'disabled'
  ): Promise<void> => {
    const merchant = merchants.find((item) => item.id === merchantId)
    if (!merchant) return
    if (
      newStatus === 'active' &&
      (merchant.status !== 'disabled' || !merchant.verifiedAt || !merchant.activatedAt)
    ) return
    if (newStatus === 'disabled' && merchant.status !== 'active') return

    await requestApi(getApiConfig(), 'PATCH', `/api/v1/psp/merchants/${encodeURIComponent(merchantId)}/status`, {
      status: newStatus,
    }, 'psp')
    setMerchants(
      merchants.map((m) => (m.id === merchantId ? { ...m, status: newStatus } : m))
    )
  }

  const handleUpdateActiveMerchant = useCallback((updated: Partial<Merchant>) => {
    const merchantId = activeMerchant?.id
    if (!merchantId) return
    setMerchants((current) =>
      current.map((merchant) => merchant.id === merchantId ? { ...merchant, ...updated } : merchant)
    )
  }, [activeMerchant?.id])

  const handlePaylinkCreated = (newPaylink: Paylink) => {
    setPaylinks([newPaylink, ...paylinks])
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route path="/api-workbench" element={<ApiWorkbench />} />

      {/* External Ceremony Routes (Open in New Tab / Hosted Gateway) */}
      <Route path="/tos/:token" element={<HostedTosPage />} />
      <Route path="/setup" element={<PasskeyCeremonyPage />} />
      <Route path="/legal/:doc" element={<LegalDocumentPage />} />
      <Route path="/legal/terms" element={<LegalDocumentPage documentType="terms" />} />
      <Route path="/legal/privacy" element={<LegalDocumentPage documentType="privacy" />} />

      {/* Organization Portal */}
      <Route
        path="/org"
        element={
          <ProtectedRoute allowedRoles={['org']}>
            <AppLayout>
              {activeOrg ? (
                <OrgDashboard
                  organization={activeOrg}
                  merchants={merchants}
                  paylinks={paylinks}
                  transactions={transactions}
                  dashboardMetrics={pspMetrics}
                  dashboardLoading={pspDashboardLoading}
                  dashboardError={pspDashboardError}
                  onAddMerchant={handleAddMerchant}
                  onBatchCreated={handleBatchCreated}
                  onSelectMerchantForDashboard={(id) => {
                    login('merchant', id)
                    navigate('/merchant')
                  }}
                  onRequestFeeChange={handleRequestFeeChange}
                />
              ) : (
                <div className="mat-card p-8 text-center max-w-md mx-auto space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">No Organization Registered</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      You need to register a PSP or FinTech in the Orki Admin Portal first.
                    </p>
                  </div>
                  <a
                    href="/admin"
                    className="mat-btn-primary py-2.5 px-4 text-xs font-semibold inline-flex items-center space-x-1.5"
                  >
                    <span>Go to Orki Admin</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
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
              {activeMerchant ? (
                <MerchantDashboard
                  merchant={activeMerchant}
                  onUpdateMerchant={handleUpdateActiveMerchant}
                  onPaylinkCreated={handlePaylinkCreated}
                  onLaunchCheckout={(plk) => {
                    window.open(`/checkout/${plk.slug}`, '_blank')
                  }}
                />
              ) : (
                <div className="mat-card p-8 text-center max-w-md mx-auto space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">No Merchant Profile Found</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Merchants must be invited by their PSP first. Log into your PSP dashboard to add this business.
                    </p>
                  </div>
                  <a
                    href="/org"
                    className="mat-btn-primary py-2.5 px-4 text-xs font-semibold inline-flex items-center space-x-1.5"
                  >
                    <span>Go to PSP Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
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
          <CustomerCheckoutView />
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
