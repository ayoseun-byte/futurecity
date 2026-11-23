import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Organization } from '../../types'
import {
  saveStoredOrganizations,
} from '../../services/storageService'
import {
  clearAdminSessionToken,
  getApiConfig,
  requestApi,
  saveApiConfig,
  savePspSessionToken,
} from '../../services/apiConfig'
import {
  Building2,
  ArrowRight,
  Mail,
  Lock,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

export const PspLoginView: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pendingFirstLogin, setPendingFirstLogin] = useState<{
    accessToken: string
    user: { id: string; name: string; email: string; organizationId: string; role: string }
  } | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')

  const completePspSession = async (loginData: {
    accessToken: string
    user: { id: string; name: string; email: string; organizationId: string; role: string }
  }) => {
    const currentConfig = getApiConfig()
    const updatedConfig = {
      ...currentConfig,
      adminKey: '',
      feeApproverKey: '',
    }
    saveApiConfig(updatedConfig)

    let profile: { pspId: string; pspName: string; status: Organization['status']; feeSchedule?: Organization['feeSchedule'] } | null = null
    try {
      profile = await requestApi<{
        pspId: string
        pspName: string
        status: Organization['status']
        feeSchedule?: Organization['feeSchedule']
      }>(updatedConfig, 'GET', '/api/v1/psp/profile', undefined, 'psp')
    } catch (err) {
      console.warn('Could not fetch live PSP profile after login:', err)
    }

    const organization: Organization = {
      id: loginData.user.organizationId,
      name: profile?.pspName || loginData.user.name,
      category: 'FINANCE',
      categoryType: 'psp',
      status: profile?.status || 'approved',
      isRegulatedEntity: true,
      feeWallet: '',
      contacts: [],
      feeSchedule: profile?.feeSchedule,
      createdAt: new Date().toISOString(),
    }

    saveStoredOrganizations([organization])

    login('org', organization.id, {
      id: loginData.user.id,
      name: loginData.user.name,
      email: loginData.user.email,
      organizationId: organization.id,
      status: organization.status,
    })

    navigate('/psp')
  }

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
          name: string
          email: string
          organizationId: string
          role: string
          mustChangePassword?: boolean
        }
      }>(config, 'POST', '/api/v1/psp/auth/login', {
        email: email.trim(),
        password,
      })

      savePspSessionToken(loginRes.accessToken)
      clearAdminSessionToken()

      if (loginRes.user.mustChangePassword) {
        setPendingFirstLogin(loginRes)
        return
      }

      await completePspSession(loginRes)
    } catch (reason) {
      setLoginError(reason instanceof Error ? reason.message : 'PSP authentication failed.')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleFirstLoginPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingFirstLogin) return
    setLoginError('')

    if (newPassword.length < 8) {
      setLoginError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setLoginError('New password and confirmation do not match.')
      return
    }

    setLoggingIn(true)
    try {
      const config = getApiConfig()
      await requestApi(
        config,
        'POST',
        '/api/v1/psp/auth/change-password',
        {
          current_password: password,
          password: newPassword,
          password_confirmation: confirmPassword,
        },
        'psp'
      )
      await completePspSession(pendingFirstLogin)
    } catch (reason) {
      setLoginError(reason instanceof Error ? reason.message : 'Failed to update password.')
    } finally {
      setLoggingIn(false)
    }
  }

  const fillQuickCredentials = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('Password123!')
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
          {loginError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          {pendingFirstLogin ? (
            <form onSubmit={handleFirstLoginPasswordChange} className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <div className="font-semibold">First Login — Set Your New Password</div>
                <p className="mt-1 text-[11px] text-amber-800">
                  Signed in as <span className="font-mono font-semibold">{pendingFirstLogin.user.email}</span>. Please choose a permanent password to activate your partner portal access.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  New Password (min 8 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-onion-500/20 focus:border-onion-700 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-onion-500/20 focus:border-onion-700 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full mat-btn-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50"
              >
                <span>{loggingIn ? 'Updating Password…' : 'Save Password & Enter Portal'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
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

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <Link to="/admin" className="hover:text-slate-900 transition flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Orki Admin</span>
            </Link>
            <Link to="/merchant/login" className="hover:text-slate-900 transition">
              Merchant Portal
            </Link>
            <Link to="/partner-demo" className="hover:text-slate-900 transition font-medium text-onion-800">
              Partner Simulator
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
