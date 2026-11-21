import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Organization } from '../../types'
import {
  saveStoredOrganizations,
} from '../../services/storageService'
import {
  clearAdminSessionToken,
  clearPspSessionToken,
  getApiConfig,
  requestApi,
  saveApiConfig,
  savePspSessionToken,
} from '../../services/apiConfig'
import {
  Building2,
  ArrowRight,
  Key,
  Mail,
  Lock,
  AlertCircle,
  ShieldCheck,
  Store,
  Sparkles,
} from 'lucide-react'

export const PspLoginView: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [authMode, setAuthMode] = useState<'credentials' | 'apiKey'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pspApiKey, setPspApiKey] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    const config = getApiConfig()
    let active = true

    // Fetch existing live PSPs if admin key is configured
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
        if (rows.length > 0) {
          setSelectedOrgId(rows[0].id)
        }
      })
      .catch(() => {
        // Fallback gracefully if admin key not loaded yet
      })

    return () => {
      active = false
    }
  }, [])

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoggingIn(true)

    try {
      if (!email.trim() || !password) {
        throw new Error('Please enter both your PSP user email and password.')
      }

      const config = getApiConfig()
      const loginRes = await requestApi<{
        accessToken: string
        tokenType: string
        expiresIn: number
        user: {
          id: string
          organizationId: string
          name: string
          email: string
          role: string
          status: string
        }
        organization: {
          id: string
          name: string
          status: Organization['status']
        }
      }>(config, 'POST', '/api/v1/psp/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      }, 'none')

      clearAdminSessionToken()
      clearPspSessionToken()
      savePspSessionToken(loginRes.accessToken)

      // Fetch complete profile with authenticated session token
      const authedConfig = { ...getApiConfig(), pspKey: loginRes.accessToken }
      let profile: { pspId: string; pspName: string; status: Organization['status']; feeSchedule?: Organization['feeSchedule'] } | null = null
      try {
        profile = await requestApi<{
          pspId: string
          pspName: string
          status: Organization['status']
          feeSchedule?: Organization['feeSchedule']
        }>(authedConfig, 'GET', '/api/v1/psp/profile', undefined, 'psp')
      } catch {
        // Profile fetch fallback using login response
      }

      const orgId = profile?.pspId || loginRes.organization.id
      const orgName = profile?.pspName || loginRes.organization.name
      const orgStatus = profile?.status || loginRes.organization.status

      const organization: Organization = {
        id: orgId,
        name: orgName,
        category: 'FINANCE',
        categoryType: 'psp',
        status: orgStatus,
        isRegulatedEntity: false,
        feeWallet: '',
        contacts: [],
        feeSchedule: profile?.feeSchedule,
        createdAt: new Date().toISOString(),
      }

      saveStoredOrganizations([organization])
      setOrganizations([organization])

      login('org', organization.id, {
        id: loginRes.user.id,
        name: loginRes.user.name,
        email: loginRes.user.email,
        organizationId: organization.id,
        status: organization.status,
      })

      navigate('/psp')
    } catch (reason) {
      setLoginError(reason instanceof Error ? reason.message : 'PSP authentication failed.')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleApiKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoggingIn(true)

    try {
      if (!pspApiKey.trim()) {
        throw new Error('Please enter the PSP API Key issued for your organization.')
      }

      const config = { ...getApiConfig(), pspKey: pspApiKey.trim() }
      const profile = await requestApi<{
        pspId: string
        pspName: string
        status: Organization['status']
        feeSchedule?: Organization['feeSchedule']
      }>(config, 'GET', '/api/v1/psp/profile', undefined, 'psp')

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
      setLoginError(reason instanceof Error ? reason.message : 'PSP API Key authentication failed.')
    } finally {
      setLoggingIn(false)
    }
  }

  const fillQuickCredentials = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('Password123!')
    setAuthMode('credentials')
    setLoginError('')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-onion-800 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
          <Building2 className="w-6 h-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          PSP Partner Portal
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Institutional access for Payment Service Providers, merchant onboarding &amp; fee splits
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mat-card p-6 sm:p-8 space-y-6 shadow-sm border border-slate-200">
          {/* Mode Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => {
                setAuthMode('credentials')
                setLoginError('')
              }}
              className={`py-1.5 rounded-md transition ${
                authMode === 'credentials'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              Email &amp; Password
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('apiKey')
                setLoginError('')
              }}
              className={`py-1.5 rounded-md transition ${
                authMode === 'apiKey'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              PSP API Key
            </button>
          </div>

          {loginError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          {authMode === 'credentials' ? (
            <form onSubmit={handleCredentialsLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  PSP Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="user@psp-partner.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-onion-500/20 focus:border-onion-700 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-onion-500/20 focus:border-onion-700 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full mat-btn-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50"
              >
                <span>{loggingIn ? 'Authenticating…' : 'Sign In to Partner Portal'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Demo Accounts Quick-Fill */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1 mb-2">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Demo Accounts</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('tariq@xsquare.example')}
                    className="p-2 text-left rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition"
                  >
                    <div className="font-semibold text-slate-800">Tariq Mansoor</div>
                    <div className="text-[10px] text-slate-500 truncate">tariq@xsquare.example</div>
                    <div className="text-[9px] text-emerald-700 font-medium mt-0.5">XSquare (Approved)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('liam@apexpay.io')}
                    className="p-2 text-left rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition"
                  >
                    <div className="font-semibold text-slate-800">Liam Vance</div>
                    <div className="text-[10px] text-slate-500 truncate">liam@apexpay.io</div>
                    <div className="text-[9px] text-amber-700 font-medium mt-0.5">Apex Pay (Sandbox)</div>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleApiKeyLogin} className="space-y-4">
              {organizations.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Registered Partner Organization
                  </label>
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-onion-500/20 focus:border-onion-700 transition"
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.id.slice(0, 16)}…)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  PSP API Key
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="psp_live_... or psp_test_..."
                    value={pspApiKey}
                    onChange={(e) => setPspApiKey(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-onion-500/20 focus:border-onion-700 transition"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Issued by Orki SuperAdmin during partner onboarding
                </p>
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full mat-btn-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50"
              >
                <span>{loggingIn ? 'Connecting…' : 'Access Partner Dashboard'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Partner Features Pill */}
          <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-3 space-y-1.5 text-[11px] text-emerald-800">
            <div className="font-semibold flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Partner Capabilities</span>
            </div>
            <ul className="space-y-1 text-emerald-700/90 pl-5 list-disc text-[10px]">
              <li>Notice-consented merchant lifecycle &amp; KYB tracking</li>
              <li>Automated fee-split settlement (Base &amp; Solana)</li>
              <li>Webhook deliveries with cryptographic signatures</li>
            </ul>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <Link to="/admin" className="hover:text-slate-900 transition flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Orki Admin</span>
            </Link>
            <Link to="/merchant" className="hover:text-slate-900 transition flex items-center gap-1">
              <Store className="w-3.5 h-3.5" />
              <span>Merchant Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
