import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Organization } from '../../types'
import {
  saveStoredOrganizations,
  saveStoredMerchants,
} from '../../services/storageService'
import { clearAdminSessionToken, getApiConfig, requestApi, saveAdminSessionToken, saveApiConfig } from '../../services/apiConfig'
import { fetchAllMerchantsFromBackend } from '../../services/pspMerchantService'
import { loginAdminApi } from '../../services/adminService'
import {
  ShieldCheck,
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  Building2,
  Store,
  Key,
} from 'lucide-react'

export const AdminLoginView: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminLoggingIn, setAdminLoggingIn] = useState(false)
  const [adminLoginError, setAdminLoginError] = useState('')

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminLoginError('')
    setAdminLoggingIn(true)
    try {
      const res = await loginAdminApi(adminEmail.trim(), adminPassword)
      saveAdminSessionToken(res.accessToken)
      const config = getApiConfig()
      const [{ data: pspRows }, liveMerchants] = await Promise.all([
        requestApi<{
          data: Array<{
            pspId: string
            pspName: string
            category: Organization['category']
            categoryType: Organization['categoryType']
            status: Organization['status']
            createdAt: string
          }>
        }>(config, 'GET', '/api/v1/admin/psps', undefined, 'admin'),
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
      saveStoredOrganizations(liveOrganizations)
      saveStoredMerchants(liveMerchants)
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

  const fillQuickAdmin = (email: string) => {
    setAdminEmail(email)
    setAdminPassword('password')
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg border border-indigo-400/30">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
          Orki Platform Administration
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Master administrative portal for platform officers, settlement audit & partner management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
          {adminLoginError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{adminLoginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Admin Officer Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="admin@internal.orki.io"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={adminLoggingIn}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{adminLoggingIn ? 'Authenticating…' : 'Sign In to SuperAdmin'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Credential Helpers */}
          <div className="pt-2 border-t border-slate-700/60 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Quick Credentials:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                onClick={() => fillQuickAdmin('admin@internal.orki.io')}
                className="px-2.5 py-1 bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded text-[11px] border border-slate-600/50 flex items-center space-x-1 transition"
              >
                <Key className="w-3 h-3 text-indigo-400" />
                <span>admin@internal.orki.io</span>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAdmin('ayoseunsolomon@internal.orki.io')}
                className="px-2.5 py-1 bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded text-[11px] border border-slate-600/50 flex items-center space-x-1 transition"
              >
                <Key className="w-3 h-3 text-indigo-400" />
                <span>ayoseunsolomon@...</span>
              </button>
            </div>
          </div>

          {/* Other Portal Navigation */}
          <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
            <Link to="/psp/login" className="hover:text-indigo-400 flex items-center space-x-1 transition">
              <Building2 className="w-3 h-3" />
              <span>PSP Partner Portal</span>
            </Link>
            <Link to="/merchant/login" className="hover:text-indigo-400 flex items-center space-x-1 transition">
              <Store className="w-3 h-3" />
              <span>Merchant Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
