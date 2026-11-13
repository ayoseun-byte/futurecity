import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { UserRole } from '../../context/AuthContext'
import type { Organization, Merchant } from '../../types'
import {
  addStoredMerchant,
  saveStoredOrganizations,
} from '../../services/storageService'
import { clearAdminSessionToken, getApiConfig, requestApi, saveAdminSessionToken, saveApiConfig } from '../../services/apiConfig'
import { fetchAllMerchantsFromBackend } from '../../services/pspMerchantService'
import { loginAdminApi } from '../../services/adminService'
import {
  Building2,
  Store,
  ShieldCheck,
  ArrowRight,
  Lock,
  Key,
  Mail,
  AlertCircle,
  Sparkles,
} from 'lucide-react'

export const LoginView: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [merchants, setMerchants] = useState<Merchant[]>([])

  const [activeTab, setActiveTab] = useState<UserRole>('org')
  const [organizationsLoading, setOrganizationsLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // PSP form state
  const [pspApiKey, setPspApiKey] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState('')

  // Merchant form state
  const [merchantSession, setMerchantSession] = useState('')

  // Admin form state
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminLoggingIn, setAdminLoggingIn] = useState(false)
  const [adminLoginError, setAdminLoginError] = useState('')

  useEffect(() => {
    const config = getApiConfig()
    if (!config.adminKey) {
      setOrganizations([])
      saveStoredOrganizations([])
      return
    }

    let active = true
    setOrganizationsLoading(true)

    // 1. Fetch live PSP organizations
    requestApi<{
      data: {
        pspId: string
        pspName: string
        category: Organization['category']
        categoryType: Organization['categoryType']
        status: Organization['status']
        webhookUrl?: string | null
        createdAt: string
      }[]
    }>(config, 'GET', '/api/v1/admin/psps', undefined, 'admin')
      .then(({ data }) => {
        if (!active) return
        const rows: Organization[] = data.map((psp) => ({
          id: psp.pspId,
          name: psp.pspName,
          category: psp.category,
          categoryType: psp.categoryType,
          status: psp.status,
          webhookUrl: psp.webhookUrl || undefined,
          createdAt: psp.createdAt,
          isRegulatedEntity: false,
          feeWallet: '',
          contacts: [],
        }))
        setOrganizations(rows)
        saveStoredOrganizations(rows)
        setSelectedOrgId((current) => rows.some((row) => row.id === current) ? current : rows[0]?.id || '')
      })
      .catch(() => {
        if (active) {
          setOrganizations([])
          saveStoredOrganizations([])
        }
      })
      .finally(() => {
        if (active) setOrganizationsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleOrgLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    try {
      if (!pspApiKey.trim()) throw new Error('Enter the PSP API key issued by the backend.')
      const config = { ...getApiConfig(), pspKey: pspApiKey.trim() }
      const profile = await requestApi<{
        pspId: string
        pspName: string
        status: Organization['status']
        feeSchedule?: Organization['feeSchedule']
      }>(config, 'GET', '/api/v1/psp/profile', undefined, 'psp')
      if (selectedOrgId && selectedOrgId !== profile.pspId) {
        throw new Error('The API key belongs to a different PSP than the selected record.')
      }
      clearAdminSessionToken()
      saveApiConfig({ ...config, adminKey: '', feeApproverKey: '' })
      const organization: Organization = {
        id: profile.pspId,
        name: profile.pspName,
        category: 'FINANCE',
        categoryType: 'psp',
        status: profile.status,
        isRegulatedEntity: false,
        feeWallet: '',
        contacts: [],
        feeSchedule: profile.feeSchedule,
        createdAt: new Date().toISOString(),
      }
      saveStoredOrganizations([organization])
      setOrganizations([organization])
      login('org', organization.id, {
        id: organization.id,
        name: organization.name,
        organizationId: organization.id,
        status: organization.status,
      })
      navigate('/psp')
    } catch (reason) {
      setLoginError(reason instanceof Error ? reason.message : 'PSP authentication failed.')
    }
  }

  const handleMerchantLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    try {
      const rawSession = merchantSession.trim()
      const token = rawSession.includes('#')
        ? new URLSearchParams(rawSession.split('#', 2)[1]).get('session') || ''
        : rawSession
      if (!token.startsWith('onb_sec_')) {
        throw new Error('Open the merchant onboarding/session link or paste its onb_sec_ session token.')
      }

      const config = { ...getApiConfig(), merchantSession: token }
      const state = await requestApi<{
        merchantId: string
        merchantExternalId?: string
        organizationId?: string
        legalBusinessName: string
        tradeLicenseNumber?: string | null
        jurisdiction?: string | null
        representativeName?: string | null
        representativeEmail?: string | null
        status: string
        nextStep?: Merchant['nextStep']
        settlementMode?: Merchant['settlementMode']
        baseWalletAddress?: string | null
        solanaWalletAddress?: string | null
        orkiFeeBps?: number
        pspFeeBps?: number
        noticeAcknowledgedAt?: string | null
        termsAcceptedAt?: string | null
        kybInformationSubmittedAt?: string | null
        sumsubCompletedAt?: string | null
        passkeyRegisteredAt?: string | null
        verifiedAt?: string | null
        activatedAt?: string | null
      }>(config, 'GET', '/api/v1/merchant/onboarding', undefined, 'merchant')

      const merchant: Merchant = {
        id: state.merchantId,
        organizationId: state.organizationId || '',
        externalId: state.merchantExternalId || state.merchantId,
        legalBusinessName: state.legalBusinessName,
        tradeLicenseNumber: state.tradeLicenseNumber || '',
        jurisdiction: state.jurisdiction || '',
        representativeName: state.representativeName || '',
        representativeEmail: state.representativeEmail || '',
        status: state.status.toLowerCase() as Merchant['status'],
        nextStep: state.nextStep,
        settlementMode: state.settlementMode || 'hold_as_received',
        baseWalletAddress: state.baseWalletAddress || undefined,
        solanaWalletAddress: state.solanaWalletAddress || undefined,
        orkiFeeBps: state.orkiFeeBps,
        pspFeeBps: state.pspFeeBps,
        noticeAcknowledgedAt: state.noticeAcknowledgedAt || undefined,
        termsAcceptedAt: state.termsAcceptedAt || undefined,
        kybInformationSubmittedAt: state.kybInformationSubmittedAt || undefined,
        sumsubCompletedAt: state.sumsubCompletedAt || undefined,
        passkeyRegisteredAt: state.passkeyRegisteredAt || undefined,
        verifiedAt: state.verifiedAt || undefined,
        activatedAt: state.activatedAt || undefined,
        createdAt: new Date().toISOString(),
      }
      clearAdminSessionToken()
      saveApiConfig({ ...config, adminKey: '', feeApproverKey: '', pspKey: '' })
      sessionStorage.setItem(`orki_merchant_session:${merchant.externalId}`, token)
      sessionStorage.setItem('orki_active_merchant_session', token)
      addStoredMerchant(merchant)
      setMerchants([merchant])
      login('merchant', merchant.id, {
        id: merchant.id,
        name: merchant.legalBusinessName,
        email: merchant.representativeEmail,
        organizationId: merchant.organizationId,
        merchantId: merchant.id,
        status: merchant.status,
        merchantProfile: merchant,
      })
      navigate('/merchant')
    } catch (reason) {
      setLoginError(reason instanceof Error ? reason.message : 'Merchant session could not be verified.')
    }
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminLoginError('')
    setAdminLoggingIn(true)
    try {
      const res = await loginAdminApi(adminEmail.trim(), adminPassword)
      saveAdminSessionToken(res.accessToken)
      const config = getApiConfig()
      const [{ data: pspRows }, liveMerchants] = await Promise.all([
        requestApi<{ data: Array<{
          pspId: string
          pspName: string
          category: Organization['category']
          categoryType: Organization['categoryType']
          status: Organization['status']
          createdAt: string
        }> }>(config, 'GET', '/api/v1/admin/psps', undefined, 'admin'),
        fetchAllMerchantsFromBackend(),
      ])
      const liveOrganizations = pspRows.map((psp) => ({
        id: psp.pspId,
        name: psp.pspName,
        category: psp.category,
        categoryType: psp.categoryType,
        status: psp.status,
        createdAt: psp.createdAt,
        isRegulatedEntity: false,
        feeWallet: '',
        contacts: [],
      }))
      setOrganizations(liveOrganizations)
      setMerchants(liveMerchants)
      saveStoredOrganizations(liveOrganizations)
      login('admin', undefined, {
        id: res.admin.id,
        name: res.admin.name,
        email: res.admin.email,
      })
      navigate('/admin')
    } catch (err: unknown) {
      clearAdminSessionToken()
      saveApiConfig({ ...getApiConfig(), adminKey: '' })
      console.warn('Backend admin login failed:', err)
      const message = err instanceof Error ? err.message : 'Invalid admin credentials.'
      setAdminLoginError(message)
    } finally {
      setAdminLoggingIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-onion text-white flex items-center justify-center font-bold text-2xl shadow-sm">
          O
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Orki Settlement Portal
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Multi-Tenant Non-Custodial PSP & Merchant Gateway
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="mat-card p-6 sm:p-8 space-y-6">
          {/* Segmented Persona Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`py-2 px-3 rounded-md transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'admin'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-onion" />
              <span>Orki Admin</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('org')}
              className={`py-2 px-3 rounded-md transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'org'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-onion" />
              <span>PSP Portal</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('merchant')}
              className={`py-2 px-3 rounded-md transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'merchant'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="w-3.5 h-3.5 text-onion" />
              <span>Merchant</span>
            </button>
          </div>

          {/* TAB 1: ORKI ADMIN */}
          {activeTab === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-onion" />
                  <span>Protocol Headquarters Access</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Authenticate with an admin account provisioned by the backend to manage PSP approvals, rate governance, and API keys.
                </p>
              </div>

              {adminLoginError && (
                <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1">
                  <div className="font-semibold flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Authentication Failed</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{adminLoginError}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin Officer Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                    placeholder="ayoseunsolomon@internal.orki.io"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-onion focus:border-onion bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Officer Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-onion focus:border-onion bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={adminLoggingIn}
                className="w-full mat-btn-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs mt-2 disabled:opacity-60"
              >
                <span>{adminLoggingIn ? 'Authenticating...' : 'Enter Orki Admin Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TAB 2: PSP / ORGANIZATION PORTAL */}
          {activeTab === 'org' && (
            <form onSubmit={handleOrgLogin} className="space-y-4">
              <p className="text-xs text-slate-600">
                Authenticate with the PSP API key issued by the backend. The key is kept only for this browser session.
              </p>
              {organizationsLoading && <p className="text-xs text-slate-500">Loading PSP records…</p>}
              {organizations.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expected PSP (optional)</label>
                  <select
                    value={selectedOrgId}
                    onChange={(event) => setSelectedOrgId(event.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-onion focus:border-onion bg-white"
                  >
                    <option value="">Verify PSP from API key</option>
                    {organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>{organization.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">PSP API Key</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={pspApiKey}
                    onChange={(event) => setPspApiKey(event.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-onion focus:border-onion bg-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full mat-btn-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs mt-2"
              >
                <span>Authenticate PSP API Key</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {loginError && <p role="alert" className="text-xs text-red-600">{loginError}</p>}
            </form>
          )}

          {/* TAB 3: MERCHANT PORTAL */}
          {activeTab === 'merchant' && (
            <form onSubmit={handleMerchantLogin} className="space-y-4">
              <p className="text-xs text-slate-600">
                Merchant access uses a backend-issued, time-limited onboarding session. A name and email alone do not authenticate a merchant.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Onboarding/session link or session token</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={merchantSession}
                    onChange={(event) => setMerchantSession(event.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-onion focus:border-onion bg-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full mat-btn-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs mt-2"
              >
                <span>Verify merchant session</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {loginError && <p role="alert" className="text-xs text-red-600">{loginError}</p>}
            </form>
          )}

          {/* Quick-Start Helper Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-onion" />
              <span>Backend-authenticated sessions</span>
            </span>
            <span className="font-mono text-slate-400">
              {organizations.length} Orgs · {merchants.length} Merchants
            </span>
          </div>
          <Link to="/api-workbench" className="block text-center text-xs font-semibold text-onion hover:underline">
            Open backend API workbench →
          </Link>
        </div>
      </div>
    </div>
  )
}
