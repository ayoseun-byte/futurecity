import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import type { UserRole } from './context/AuthContext'
import { AdminLayout } from './components/layout/AdminLayout'
import { RailsLabView } from './views/Rails/RailsLabView'
import { PspRailsView } from './views/Rails/PspRailsView'
import { MerchantRailsView } from './views/Rails/MerchantRailsView'
import { InvoicelyConsoleView } from './views/Rails/consoles/InvoicelyConsoleView'
import { ShoplaneConsoleView } from './views/Rails/consoles/ShoplaneConsoleView'
import { CornerShopHeadlessView } from './views/Rails/consoles/CornerShopHeadlessView'
import { CheckoutWidgetView } from './views/Rails/consoles/CheckoutWidgetView'
import { PspLayout } from './components/layout/PspLayout'
import { MerchantLayout } from './components/layout/MerchantLayout'
import { LoginView } from './views/Auth/LoginView'
import { OrgDashboard } from './views/Organization/OrgDashboard'
import { MerchantDetailPage } from './views/Organization/MerchantDetailPage'
import { MerchantDashboard } from './views/Merchant/MerchantDashboard'
import { CustomerCheckoutView } from './views/Checkout/CustomerCheckoutView'
import { OrkiAdminPortal } from './views/Admin/OrkiAdminPortal'
import { AdminMerchantDetailPage } from './views/Admin/AdminMerchantDetailPage'
import { AdminPspDetailPage } from './views/Admin/AdminPspDetailPage'
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
} from './services/storageService'
import { createPspMerchant,
fetchPspDashboard, type PspDashboardMetrics } from './services/pspMerchantService'
import { resolveMonotonicStep } from './services/onboardingStepService'
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
    if (user.role === 'admin') return <Navigate to="/admin" replace />
    if (user.role === 'org') return <Navigate to="/psp" replace />
    if (user.role === 'merchant') return <Navigate to="/merchant" replace />
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Redirect legacy /org/merchants/:id to /psp/merchants/:id
function OrgMerchantRedirect() {
  const { id } = useParams()
  return <Navigate to={id ? `/psp/merchants/${id}` : '/psp'} replace />
}

function MainRoutes() {
  const { user, isAuthenticated } = useAuth()
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

  const loadPspData = useCallback(async () => {
    if (user?.role !== 'org') return

    const storedOrganizations = getStoredOrganizations()
    const activeOrganization = storedOrganizations.find((organization) => organization.id === user.organizationId)
    if (!activeOrganization) return

    setPspDashboardLoading(true)
    setPspDashboardError(null)

    try {
      const dashboard = await fetchPspDashboard(activeOrganization.id)
      if (dashboard === null) {
        setPspMetrics(null)
        setTransactions([])
        setPspDashboardError('Configure Orki Admin or PSP API key to sync live backend data.')
        return
      }

      setPspMetrics(dashboard.metrics)
      setTransactions(dashboard.transactions)
      if (dashboard.feeSchedule) {
        setOrganizations((current) => current.map((organization) =>
          organization.id === activeOrganization.id
            ? { ...organization, feeSchedule: dashboard.feeSchedule }
            : organization
        ))
      }

      if (Array.isArray(dashboard.merchants)) {
        setMerchants((current) => [
          ...current.filter((merchant) => merchant.organizationId !== activeOrganization.id),
          ...dashboard.merchants,
        ])
      }
    } catch (error: unknown) {
      setPspDashboardError(error instanceof Error ? error.message : 'Failed to load PSP dashboard data.')
      setTransactions([])
      setPspMetrics(null)
    } finally {
      setPspDashboardLoading(false)
    }
  }, [user?.role, user?.organizationId])

  useEffect(() => {
    if (user?.role !== 'org') return

    const storedOrganizations = getStoredOrganizations()
    const activeOrganization = storedOrganizations.find((organization) => organization.id === user.organizationId)
    if (!activeOrganization) return

    setOrganizations(storedOrganizations)
    setMerchants(getStoredMerchants())
    setPaylinks(getStoredPaylinks())
    setTransactions(getStoredTransactions().filter((transaction) => !transaction.id.startsWith('tx_demo_')))

    void loadPspData()
  }, [user?.role, user?.organizationId, loadPspData])

  // Derive active organization for org view based on auth user
  const activeOrg = organizations.find((o) => o.id === user?.organizationId)

  // Derive active merchant for merchant view based on auth user
  const activeMerchant = merchants.find((m) => m.id === user?.merchantId) ?? user?.merchantProfile

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
  const handleAddMerchant = async (newMerchantData: Partial<Merchant>) => {
    if (!activeOrg) throw new Error('No active PSP is selected.')
    if (
      !newMerchantData.externalId ||
      !newMerchantData.legalBusinessName ||
      !newMerchantData.tradeLicenseNumber ||
      !newMerchantData.jurisdiction ||
      !newMerchantData.representativeName ||
      !newMerchantData.representativeEmail
    ) {
      throw new Error('All merchant registration fields are required.')
    }

    const newMerchant = await createPspMerchant(activeOrg.id, {
      externalId: newMerchantData.externalId,
      legalBusinessName: newMerchantData.legalBusinessName,
      tradeLicenseNumber: newMerchantData.tradeLicenseNumber,
      jurisdiction: newMerchantData.jurisdiction,
      representativeName: newMerchantData.representativeName,
      representativeEmail: newMerchantData.representativeEmail,
    })
    setMerchants((current) => [
      newMerchant,
      ...current.filter((merchant) => merchant.id !== newMerchant.id),
    ])
  }

  const handleBatchCreated = (newMerchants: Merchant[]) => {
    const orgId = activeOrg?.id || 'psp_default'
    const tagged = newMerchants.map((merchant) => ({ ...merchant, organizationId: orgId }))
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

  const handleUpdateActiveMerchant = useCallback((updated: Partial<Merchant>, isEnforcedByAdmin = false) => {
    const merchantId = activeMerchant?.id
    if (!merchantId) return
    setMerchants((current) => {
      const existing = current.find((m) => m.id === merchantId) ?? activeMerchant
      if (!existing) return current

      const safeUpdates: Partial<Merchant> = { ...updated }
      const mergedCandidate = { ...existing, ...updated }

      // Step monotonicity invariant: steps can NEVER go backwards unless enforced by Orki Admin
      const resolvedStep = resolveMonotonicStep(mergedCandidate, updated.nextStep ?? existing.nextStep, isEnforcedByAdmin)
      safeUpdates.nextStep = resolvedStep

      const hasRealChange = Object.entries(safeUpdates).some(
        ([key, val]) => (existing as unknown as Record<string, unknown>)[key] !== val
      )
      if (!hasRealChange) return current
      const updatedMerchant = { ...existing, ...safeUpdates }
      return current.some((merchant) => merchant.id === merchantId)
        ? current.map((merchant) => merchant.id === merchantId ? updatedMerchant : merchant)
        : [updatedMerchant, ...current]
    })
  }, [activeMerchant])

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

      {/* PSP Portal (Standard Route: /psp, Backwards-Compatible Alias: /org) */}
      <Route
        path="/psp"
        element={
          <ProtectedRoute allowedRoles={['org']}>
            <PspLayout>
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
                  onSelectMerchantForDashboard={(id) => navigate(`/psp/merchants/${id}`)}
                  onRequestFeeChange={handleRequestFeeChange}
                  onRefreshDashboard={loadPspData}
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
            </PspLayout>
          </ProtectedRoute>
        }
      />

      {/* Dedicated Merchant Detail / Inspection Route under PSP */}
      <Route
        path="/psp/merchants/:id"
        element={
          <ProtectedRoute allowedRoles={['org']}>
            <PspLayout>
              <MerchantDetailPage
                merchants={merchants}
                paylinks={paylinks}
                transactions={transactions}
                onToggleStatus={handleToggleMerchantStatus}
              />
            </PspLayout>
          </ProtectedRoute>
        }
      />

      {/* Legacy /org aliases for backwards compatibility */}
      <Route path="/org" element={<Navigate to="/psp" replace />} />
      <Route path="/org/merchants/:id" element={<OrgMerchantRedirect />} />

      {/* Merchant Portal */}
      <Route
        path="/merchant"
        element={
          <ProtectedRoute allowedRoles={['merchant']}>
            <MerchantLayout>
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
                    href="/psp"
                    className="mat-btn-primary py-2.5 px-4 text-xs font-semibold inline-flex items-center space-x-1.5"
                  >
                    <span>Go to PSP Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </MerchantLayout>
          </ProtectedRoute>
        }
      />

      {/* Orki Headquarters Admin Portal (Part 1 8-Stage Onboarding) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <OrkiAdminPortal
                organizations={organizations}
                onUpdateOrganization={handleUpdateOrganization}
                onAddOrganization={handleAddOrganization}
              />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Counterparty consoles: the integration styles, as the platforms that use them */}
      <Route
        path="/psp/console/invoicely"
        element={
          <ProtectedRoute allowedRoles={['org']}>
            <PspLayout>
              <InvoicelyConsoleView />
            </PspLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/psp/console/shoplane"
        element={
          <ProtectedRoute allowedRoles={['org']}>
            <PspLayout>
              <ShoplaneConsoleView />
            </PspLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/psp/console/headless"
        element={
          <ProtectedRoute allowedRoles={['org']}>
            <PspLayout>
              <CornerShopHeadlessView />
            </PspLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/psp/console/widget"
        element={
          <ProtectedRoute allowedRoles={['org']}>
            <PspLayout>
              <CheckoutWidgetView />
            </PspLayout>
          </ProtectedRoute>
        }
      />

      {/* PSP integration test bench */}
      <Route
        path="/psp/rails"
        element={
          <ProtectedRoute allowedRoles={['org']}>
            <PspLayout>
              <PspRailsView />
            </PspLayout>
          </ProtectedRoute>
        }
      />

      {/* Merchant payment-rails test bench */}
      <Route
        path="/merchant/rails"
        element={
          <ProtectedRoute allowedRoles={['merchant']}>
            <MerchantLayout>
              <MerchantRailsView />
            </MerchantLayout>
          </ProtectedRoute>
        }
      />

      {/* Rails Lab: run the integration styles against the live chain-service */}
      <Route
        path="/admin/rails"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <RailsLabView />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin PSP Detail Dedicated Page */}
      <Route
        path="/admin/psps/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <AdminPspDetailPage
                organizations={organizations}
                onUpdateOrganization={handleUpdateOrganization}
              />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin Cross-Tenant Merchant Detail Dedicated Page */}
      <Route
        path="/admin/merchants/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <AdminMerchantDetailPage />
            </AdminLayout>
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
      <Route
        path="/pay/:paymentId"
        element={
          <CustomerCheckoutView />
        }
      />

      {/* Root redirect */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            user?.role === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : user?.role === 'org' ? (
              <Navigate to="/psp" replace />
            ) : (
              <Navigate to="/merchant" replace />
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
