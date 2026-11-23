import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import type { UserRole } from './context/AuthContext'
import { AdminLayout } from './components/layout/AdminLayout'
import { RailsLabView } from './views/Rails/RailsLabView'
import { PspRailsView } from './views/Rails/PspRailsView'
import { PartnerSimulationView } from './views/Simulation/PartnerSimulationView'
import { MerchantRailsView } from './views/Rails/MerchantRailsView'
import { InvoicelyConsoleView } from './views/Rails/consoles/InvoicelyConsoleView'
import { HostedCheckoutConsoleView } from './views/Rails/consoles/HostedCheckoutConsoleView'
import { PaylinkConsoleView } from './views/Rails/consoles/PaylinkConsoleView'
import { CornerShopHeadlessView } from './views/Rails/consoles/CornerShopHeadlessView'
import { PluginConsoleView } from './views/Rails/consoles/PluginConsoleView'
import { CheckoutWidgetView } from './views/Rails/consoles/CheckoutWidgetView'
import { PspLayout } from './components/layout/PspLayout'
import { MerchantLayout } from './components/layout/MerchantLayout'
import { AdminLoginView } from './views/Auth/AdminLoginView'
import { PspLoginView } from './views/Auth/PspLoginView'
import { MerchantLoginView } from './views/Auth/MerchantLoginView'
import { OrgDashboard } from './views/Organization/OrgDashboard'
import { MerchantDetailPage } from './views/Organization/MerchantDetailPage'
import { MerchantDashboard } from './views/Merchant/MerchantDashboard'
import { DemoStorefrontView } from './views/Store/DemoStorefrontView'
import { PublicCheckoutPage } from './views/Checkout/PublicCheckoutPage'
import { resolveLocalCheckoutHref } from './services/pspConsoleService'
import { Web3AuthShell } from './context/Web3AuthShell'
import { OrkiAdminPortal } from './views/Admin/OrkiAdminPortal'
import { AdminMerchantDetailPage } from './views/Admin/AdminMerchantDetailPage'
import { AdminPspDetailPage } from './views/Admin/AdminPspDetailPage'
import { TransactionDetailPage } from './views/Transactions/TransactionDetailPage'
import { PasskeyCeremonyPage } from './views/Onboarding/PasskeyCeremonyPage'
import { SignTransferPage } from './views/Merchant/SignTransferPage'
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
  ensureMerchantsForOrganization,
} from './services/storageService'
import { fetchPspDashboard, type PspDashboardMetrics } from './services/pspMerchantService'
import { fetchAdminPsps } from './services/adminService'
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
    if (allowedRoles.includes('admin')) return <Navigate to="/admin/login" replace />
    if (allowedRoles.includes('merchant')) return <Navigate to="/merchant/login" replace />
    return <Navigate to="/psp/login" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />
    if (user.role === 'org') return <Navigate to="/psp" replace />
    if (user.role === 'merchant') return <Navigate to="/merchant" replace />
    return <Navigate to="/psp/login" replace />
  }

  return <>{children}</>
}

// Redirect legacy /org/merchants/:id to /psp/merchants/:id
function OrgMerchantRedirect() {
  const { id } = useParams()
  return <Navigate to={id ? `/psp/merchants/${id}` : '/psp'} replace />
}

function PspMerchantConsoleRoute({
  merchants,
  onUpdateMerchantById,
  onPaylinkCreated,
  onLaunchCheckout,
}: {
  merchants: Merchant[]
  onUpdateMerchantById: (merchantId: string, updated: Partial<Merchant>) => void
  onPaylinkCreated: (paylink: Paylink) => void
  onLaunchCheckout: (paylink: Paylink) => void
}) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const merchant = merchants.find((m) => m.id === id || m.externalId === id)

  if (!merchant) {
    return (
      <div className="mat-card p-8 text-center max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Merchant Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">
            Return to the PSP Merchant Directory to select a merchant.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/psp')}
          className="mat-btn-primary py-2.5 px-4 text-xs font-semibold inline-flex items-center space-x-1.5"
        >
          <span>Back to PSP Portal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(`/psp/merchants/${encodeURIComponent(merchant.id)}`)}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
        >
          <span>← Back to Merchant Overview</span>
        </button>
        <span className="text-[11px] font-mono text-slate-500">
          PSP View · X-Merchant-Id: {merchant.id}
        </span>
      </div>
      <MerchantDashboard
        key={merchant.id}
        merchant={merchant}
        onUpdateMerchant={(updated) => {
          onUpdateMerchantById(merchant.id, updated)
          if (updated.id && updated.id !== merchant.id) {
            navigate(`/psp/merchants/${encodeURIComponent(updated.id)}/console`, { replace: true })
          }
        }}
        onPaylinkCreated={onPaylinkCreated}
        onLaunchCheckout={onLaunchCheckout}
      />
    </div>
  )
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

    const seededForOrg = ensureMerchantsForOrganization(activeOrganization.id, activeOrganization.name)

    setPspDashboardLoading(true)
    setPspDashboardError(null)

    try {
      const dashboard = await fetchPspDashboard(activeOrganization.id)
      if (dashboard === null) {
        setPspMetrics(null)
        setTransactions([])
        setMerchants((current) => [
          ...current.filter((merchant) => merchant.organizationId !== activeOrganization.id),
          ...seededForOrg,
        ])
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
        const registeredExternalIds = new Set(dashboard.merchants.map((m) => m.externalId))
        const registeredIds = new Set(dashboard.merchants.map((m) => m.id))
        setMerchants((current) => {
          const existingForOrg = current.filter((m) => m.organizationId === activeOrganization.id)
          const pool = existingForOrg.length > 0 ? existingForOrg : seededForOrg
          const unregisteredRoster = pool.filter(
            (m) =>
              !m.id.startsWith('mrch_') &&
              !registeredIds.has(m.id) &&
              !registeredExternalIds.has(m.externalId)
          )
          return [
            ...current.filter((merchant) => merchant.organizationId !== activeOrganization.id),
            ...dashboard.merchants,
            ...unregisteredRoster,
          ]
        })
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

  useEffect(() => {
    if (user?.role !== 'admin') return

    void fetchAdminPsps()
      .then((livePsps) => {
        if (livePsps.length > 0) {
          setOrganizations(livePsps)
          saveStoredOrganizations(livePsps)
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch real admin PSPs from DB:', err)
      })
  }, [user?.role])

  // Derive active organization for org view based on auth user
  const activeOrg = organizations.find((o) => o.id === user?.organizationId)

  // Derive active merchant for merchant view based on auth user
  const activeMerchant =
    merchants.find(
      (m) =>
        m.id === user?.merchantId ||
        (user?.merchantProfile?.externalId && m.externalId === user.merchantProfile.externalId)
    ) ?? user?.merchantProfile

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
  // Merchants added in the PSP roster start in local pre-Orki state (OPT_IN -> NOTICE)
  // and are registered in Orki when the merchant reads and accepts the regulatory notice.
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

    const orgSlug = activeOrg.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'org'
    const newMerchant: Merchant = {
      id: `psp_roster_${orgSlug}_${Date.now().toString(36)}`,
      organizationId: activeOrg.id,
      externalId: newMerchantData.externalId,
      legalBusinessName: newMerchantData.legalBusinessName,
      tradeLicenseNumber: newMerchantData.tradeLicenseNumber,
      jurisdiction: newMerchantData.jurisdiction,
      representativeName: newMerchantData.representativeName,
      representativeEmail: newMerchantData.representativeEmail,
      status: 'invited',
      nextStep: 'OPT_IN',
      settlementMode: 'hold_as_received',
      createdAt: new Date().toISOString(),
      volumeUsdc: 0,
      balanceUsdc: 0,
    }
    setMerchants((current) => [
      newMerchant,
      ...current.filter((merchant) => merchant.id !== newMerchant.id && merchant.externalId !== newMerchant.externalId),
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

  const updateMerchantRecord = useCallback((
    merchantId: string,
    updated: Partial<Merchant>,
    fallbackMerchant?: Merchant,
    isEnforcedByAdmin = false
  ) => {
    if (!merchantId) return
    setMerchants((current) => {
      const existing = current.find((m) => m.id === merchantId) ?? fallbackMerchant
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
  }, [])

  const handleUpdateActiveMerchant = useCallback((updated: Partial<Merchant>, isEnforcedByAdmin = false) => {
    if (!activeMerchant?.id) return
    updateMerchantRecord(activeMerchant.id, updated, activeMerchant, isEnforcedByAdmin)
  }, [activeMerchant, updateMerchantRecord])

  const handlePaylinkCreated = (newPaylink: Paylink) => {
    setPaylinks([newPaylink, ...paylinks])
  }

  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLoginView />} />
      <Route path="/psp/login" element={<PspLoginView />} />
      <Route path="/merchant/login" element={<MerchantLoginView />} />
      <Route path="/login" element={<Navigate to="/psp/login" replace />} />
      <Route path="/api-workbench" element={<ApiWorkbench />} />

      {/* External Ceremony Routes (Open in New Tab / Hosted Gateway) */}
      <Route path="/tos/:token" element={<HostedTosPage />} />
      <Route
        path="/setup"
        element={
          <Web3AuthShell>
            <PasskeyCeremonyPage />
          </Web3AuthShell>
        }
      />
      <Route path="/sign" element={<SignTransferPage />} />
      <Route path="/transfers/sign" element={<SignTransferPage />} />
      <Route path="/merchant/sign" element={<SignTransferPage />} />
      <Route path="/legal/:doc" element={<LegalDocumentPage />} />
      <Route path="/legal/terms" element={<LegalDocumentPage documentType="terms" />} />
      <Route path="/legal/privacy" element={<LegalDocumentPage documentType="privacy" />} />

      {/* PSP Portal (Standard Route: /psp, Backwards-Compatible Alias: /org) */}
      <Route
        path="/psp"
        element={
          <ProtectedRoute allowedRoles={['org']}>
            <PspLayout organization={activeOrg}>
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
                  onSelectMerchantForDashboard={(id) => navigate(`/psp/merchants/${id}/console`)}
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
            <PspLayout organization={activeOrg}>
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

      <Route
        path="/psp/merchants/:id/console"
        element={
          <ProtectedRoute allowedRoles={['org']}>
            <PspLayout organization={activeOrg}>
              <PspMerchantConsoleRoute
                merchants={merchants}
                onUpdateMerchantById={(merchantId, updated) => updateMerchantRecord(merchantId, updated)}
                onPaylinkCreated={handlePaylinkCreated}
                onLaunchCheckout={(plk) => {
                  const target = plk.checkoutUrl
                    ? resolveLocalCheckoutHref(plk.checkoutUrl)
                    : `/checkout/${plk.slug}`
                  window.open(target, '_blank')
                }}
              />
            </PspLayout>
          </ProtectedRoute>
        }
      />

      {/* PSP Full-Page Transaction Detail */}
      <Route
        path="/psp/transactions/:id"
        element={
          <ProtectedRoute allowedRoles={['org']}>
            <PspLayout organization={activeOrg}>
              <TransactionDetailPage role="org" transactions={transactions} />
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
                    const target = plk.checkoutUrl
                      ? resolveLocalCheckoutHref(plk.checkoutUrl)
                      : `/checkout/${plk.slug}`
                    window.open(target, '_blank')
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

      {/* Merchant Full-Page Transaction Detail */}
      <Route
        path="/merchant/transactions/:id"
        element={
          <ProtectedRoute allowedRoles={['merchant']}>
            <MerchantLayout>
              <TransactionDetailPage role="merchant" transactions={transactions} />
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

      {/* Existing Partner + Merchant Simulation (e.g. Wafeq/Fazapay pre-Orki backoffice + Merchant onboarding & collection) */}
      <Route
        path="/partner-demo"
        element={
          <PartnerSimulationView
            onPaylinkCreated={handlePaylinkCreated}
            onLaunchCheckout={(plk) => {
              const target = plk.checkoutUrl
                ? resolveLocalCheckoutHref(plk.checkoutUrl)
                : `/checkout/${plk.slug}`
              window.open(target, '_blank')
            }}
          />
        }
      />

      {/* Merchant collection & integration consoles */}
      <Route
        path="/merchant/console/hosted"
        element={
          <ProtectedRoute allowedRoles={['merchant', 'org']}>
            <MerchantLayout>
              <HostedCheckoutConsoleView />
            </MerchantLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/merchant/console/paylink"
        element={
          <ProtectedRoute allowedRoles={['merchant', 'org']}>
            <MerchantLayout>
              <PaylinkConsoleView />
            </MerchantLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/merchant/console/invoicely"
        element={
          <ProtectedRoute allowedRoles={['merchant', 'org']}>
            <MerchantLayout>
              <InvoicelyConsoleView />
            </MerchantLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/merchant/console/headless"
        element={
          <ProtectedRoute allowedRoles={['merchant', 'org']}>
            <MerchantLayout>
              <CornerShopHeadlessView />
            </MerchantLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/merchant/console/widget"
        element={
          <ProtectedRoute allowedRoles={['merchant', 'org']}>
            <MerchantLayout>
              <CheckoutWidgetView />
            </MerchantLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/merchant/console/plugin"
        element={
          <ProtectedRoute allowedRoles={['merchant', 'org']}>
            <MerchantLayout>
              <PluginConsoleView />
            </MerchantLayout>
          </ProtectedRoute>
        }
      />

      {/* Counterparty consoles: legacy aliases */}
      <Route
        path="/psp/console/hosted"
        element={
          <ProtectedRoute allowedRoles={['org']}>
            <PspLayout>
              <HostedCheckoutConsoleView />
            </PspLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/psp/console/paylink"
        element={
          <ProtectedRoute allowedRoles={['org']}>
            <PspLayout>
              <PaylinkConsoleView />
            </PspLayout>
          </ProtectedRoute>
        }
      />
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
              <HostedCheckoutConsoleView />
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
      <Route
        path="/psp/console/plugin"
        element={
          <ProtectedRoute allowedRoles={['org']}>
            <PspLayout>
              <PluginConsoleView />
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

      {/* Admin Full-Page Transaction Detail */}
      <Route
        path="/admin/transactions/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <TransactionDetailPage role="admin" transactions={transactions} />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Standalone Hosted Customer Checkout & Demo E-Commerce Storefront */}
      <Route
        path="/store"
        element={<DemoStorefrontView />}
      />
      <Route
        path="/store/:merchantExternalId"
        element={<DemoStorefrontView />}
      />
      <Route
        path="/checkout/:slug"
        element={<PublicCheckoutPage mode="auto" />}
      />
      <Route
        path="/pay/:paymentId"
        element={<PublicCheckoutPage mode="b2b" />}
      />
      <Route
        path="/charge/:paymentId"
        element={<PublicCheckoutPage mode="b2b" />}
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
            <Navigate to="/psp/login" replace />
          )
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/psp/login" replace />} />
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
