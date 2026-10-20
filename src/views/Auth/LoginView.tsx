import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { UserRole } from '../../context/AuthContext'
import { INITIAL_ORGANIZATIONS, INITIAL_MERCHANTS } from '../../services/mockData'
import {
  Building2,
  Store,
  ShieldCheck,
  ArrowRight,
  Fingerprint,
  Lock,
} from 'lucide-react'

export const LoginView: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<UserRole>('org')
  const [selectedOrgId, setSelectedOrgId] = useState<string>(INITIAL_ORGANIZATIONS[0].id)
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>(INITIAL_MERCHANTS[0].id)

  const handleOrgLogin = (e: React.FormEvent) => {
    e.preventDefault()
    login('org', selectedOrgId)
    navigate('/org')
  }

  const handleMerchantLogin = (e: React.FormEvent) => {
    e.preventDefault()
    login('merchant', selectedMerchantId)
    navigate('/merchant')
  }

  const handleAdminLogin = () => {
    login('admin')
    navigate('/admin')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
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
              onClick={() => setActiveTab('org')}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-md transition-all ${
                activeTab === 'org'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>PSP & FinTech</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('merchant')}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-md transition-all ${
                activeTab === 'merchant'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Merchant</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-md transition-all ${
                activeTab === 'admin'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Orki HQ</span>
            </button>
          </div>

          {/* TAB 1: PSP & FINTECH LOGIN */}
          {activeTab === 'org' && (
            <form onSubmit={handleOrgLogin} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  Select Organization Tenant:
                </label>
                <div className="space-y-2">
                  {INITIAL_ORGANIZATIONS.map((org) => (
                    <label
                      key={org.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                        selectedOrgId === org.id
                          ? 'border-onion bg-onion-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="org_selector"
                          value={org.id}
                          checked={selectedOrgId === org.id}
                          onChange={() => setSelectedOrgId(org.id)}
                          className="text-onion focus:ring-onion-500/20"
                        />
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-slate-900">{org.name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                              {org.categoryType?.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">{org.id}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {org.feeSchedule?.pspMarkupBps ? `${org.feeSchedule.pspMarkupBps / 100}% Markup` : '1.00% Cap'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="mat-btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center space-x-2"
                >
                  <span>Authenticate as Organization</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: MERCHANT LOGIN */}
          {activeTab === 'merchant' && (
            <form onSubmit={handleMerchantLogin} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  Select Merchant Entity:
                </label>
                <div className="space-y-2">
                  {INITIAL_MERCHANTS.map((m) => (
                    <label
                      key={m.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                        selectedMerchantId === m.id
                          ? 'border-onion bg-onion-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="merchant_selector"
                          value={m.id}
                          checked={selectedMerchantId === m.id}
                          onChange={() => setSelectedMerchantId(m.id)}
                          className="text-onion focus:ring-onion-500/20"
                        />
                        <div>
                          <div className="font-semibold text-slate-900">{m.legalBusinessName}</div>
                          <div className="text-[11px] text-slate-400">
                            {m.tradeLicenseNumber} · {m.jurisdiction}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          m.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {m.status === 'active' ? 'Active' : `Step: ${m.nextStep || 'Setup'}`}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="mat-btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center space-x-2"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>Authenticate with Passkey</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ORKI PROTOCOL HEADQUARTERS ADMIN */}
          {activeTab === 'admin' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-onion-700" />
                  <span className="font-bold text-slate-900 text-xs">Orki Risk & Compliance Portal</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Manage the 8-stage offline onboarding pipeline, licensed vs unlicensed due diligence, UBO screening, and two-person production key authorizations.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAdminLogin}
                  className="mat-btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center space-x-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Enter Orki Headquarters</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
