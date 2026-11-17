import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Organization } from '../../types'
import {
  saveStoredOrganizations,
} from '../../services/storageService'
import { clearAdminSessionToken, getApiConfig, requestApi, saveApiConfig } from '../../services/apiConfig'
import {
  Building2,
  ArrowRight,
  Key,
  AlertCircle,
  ShieldCheck,
  Store,
  CheckCircle2,
} from 'lucide-react'

export const PspLoginView: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [pspApiKey, setPspApiKey] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    const config = getApiConfig()
    let active = true

    // Fetch existing live PSPs if any
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

  const handlePspLogin = async (e: React.FormEvent) => {
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
      setLoginError(reason instanceof Error ? reason.message : 'PSP authentication failed.')
    } finally {
      setLoggingIn(false)
    }
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
          Institutional access for Payment Service Providers, merchant onboarding & split fees
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

          <form onSubmit={handlePspLogin} className="space-y-4">
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

          {/* Partner Features Pill */}
          <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-3 space-y-1.5 text-[11px] text-emerald-800">
            <div className="flex items-center space-x-1.5 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Non-Custodial Fee Split Engine</span>
            </div>
            <p className="text-emerald-700/80 leading-relaxed">
              Real-time payment settlements, autonomous merchant onboarding with KYB, and instant on-chain markup splits.
            </p>
          </div>

          {/* Navigation to Admin and Merchant Portals */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <Link to="/merchant/login" className="hover:text-onion-800 flex items-center space-x-1 transition">
              <Store className="w-3 h-3" />
              <span>Merchant Portal</span>
            </Link>
            <Link to="/admin/login" className="hover:text-slate-800 flex items-center space-x-1 transition">
              <ShieldCheck className="w-3 h-3" />
              <span>Orki SuperAdmin</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
