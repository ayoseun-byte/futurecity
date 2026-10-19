import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { UserRole } from '../../context/AuthContext'
import { INITIAL_ORGANIZATIONS, INITIAL_MERCHANTS } from '../../services/mockData'
import {
  Building2,
  Store,
  ShieldCheck,
  Lock,
  ArrowRight,
  Fingerprint,
  CheckCircle2,
  UserCheck,
} from 'lucide-react'

export const LoginView: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<UserRole>('org')
  const [selectedOrgId, setSelectedOrgId] = useState<string>(INITIAL_ORGANIZATIONS[0].id)
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>(INITIAL_MERCHANTS[0].id)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-onion-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-onion-800/30 rounded-full blur-3xl pointer-events-none" />

      {/* Header Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-onion-700 via-onion to-onion-400 flex items-center justify-center shadow-xl shadow-onion/30 border border-onion-300/30">
          <span className="text-white font-black text-3xl tracking-tighter">O</span>
        </div>
        <h2 className="mt-4 text-3xl font-extrabold text-white tracking-tight">
          ORKI Gateway
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Non-Custodial Multi-Tenant PSP & Settlement Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-800">
          {/* Persona Tabs (Three Core Sections) */}
          <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800 mb-8">
            <button
              type="button"
              onClick={() => setActiveTab('org')}
              className={`flex items-center justify-center space-x-1.5 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'org'
                  ? 'bg-onion text-white shadow-lg shadow-onion/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Login as PSP</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('merchant')}
              className={`flex items-center justify-center space-x-1.5 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'merchant'
                  ? 'bg-onion text-white shadow-lg shadow-onion/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Login as Merchant</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`flex items-center justify-center space-x-1.5 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'admin'
                  ? 'bg-onion text-white shadow-lg shadow-onion/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Orki Admin</span>
            </button>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              TAB 1: LOGIN AS ANY PSP
             ───────────────────────────────────────────────────────────── */}
          {activeTab === 'org' && (
            <form onSubmit={handleOrgLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Select Registered PSP Organization
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {INITIAL_ORGANIZATIONS.map((org) => {
                    const isSelected = selectedOrgId === org.id
                    return (
                      <div
                        key={org.id}
                        onClick={() => setSelectedOrgId(org.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-onion-500 bg-onion-950/40 text-white'
                            : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-onion/20 border border-onion-500/40 flex items-center justify-center text-onion-300 font-bold text-xs">
                            {org.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-bold text-white">{org.name}</p>
                              {org.isRegulatedEntity ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40 flex items-center">
                                  <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                                  Licensed
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 flex items-center">
                                  <UserCheck className="w-2.5 h-2.5 mr-0.5" />
                                  Unlicensed
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Status: <span className="capitalize">{org.status}</span> · Markup: {((org.feeSchedule?.pspMarkupBps || 35) / 100).toFixed(2)}%
                            </p>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-onion" />}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. tariq@xsquare.example"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-onion transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-onion transition-colors"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute right-4 top-3" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-onion-700 to-onion text-white font-bold rounded-xl shadow-lg shadow-onion/30 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 text-xs"
              >
                <span>Access PSP Management Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 2: LOGIN AS ANY MERCHANT
             ───────────────────────────────────────────────────────────── */}
          {activeTab === 'merchant' && (
            <form onSubmit={handleMerchantLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Select Registered Merchant (Across Any PSP)
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {INITIAL_MERCHANTS.map((merch) => {
                    const isSelected = selectedMerchantId === merch.id
                    const parentPsp = INITIAL_ORGANIZATIONS.find((o) => o.id === merch.organizationId)

                    return (
                      <div
                        key={merch.id}
                        onClick={() => setSelectedMerchantId(merch.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-onion-500 bg-onion-950/40 text-white'
                            : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                            {merch.legalBusinessName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-bold text-white">{merch.legalBusinessName}</p>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                  merch.status === 'active'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                }`}
                              >
                                {merch.status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              PSP: <span className="text-slate-300">{parentPsp?.name || merch.organizationId}</span> · Ref: {merch.externalId}
                            </p>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-onion" />}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-onion-950/60 border border-onion-500/30 flex items-center space-x-3">
                <Fingerprint className="w-6 h-6 text-onion flex-shrink-0" />
                <p className="text-xs text-onion-200">
                  WebAuthn Passkey biometric authentication simulation active for this session.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-onion-700 to-onion text-white font-bold rounded-xl shadow-lg shadow-onion/30 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 text-xs"
              >
                <Fingerprint className="w-4 h-4" />
                <span>Authenticate & Enter Merchant Portal</span>
              </button>
            </form>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 3: ORKI HEADQUARTERS ADMIN PORTAL
             ───────────────────────────────────────────────────────────── */}
          {activeTab === 'admin' && (
            <div className="space-y-5 text-xs text-slate-300">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-onion-300 font-bold">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-sm text-white">Orki Internal Operations & Compliance</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Manage the 8-stage offline onboarding lifecycle for all prospective PSPs. Perform regulator verification for <strong>Licensed Entities</strong> (VARA, CBUAE, FSRA, FCA) and heightened UBO/AML due diligence for <strong>Unlicensed FinTechs</strong>.
                </p>
                <div className="p-3 bg-onion-950/40 rounded-xl border border-onion-500/30 text-[11px] text-onion-200">
                  🔒 Enforces the mandatory <strong>Two-Person Rule</strong>: Preparer and Approver cannot be the same compliance officer.
                </div>
              </div>

              <button
                type="button"
                onClick={handleAdminLogin}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-onion-700 to-onion text-white font-bold rounded-xl shadow-lg shadow-onion/30 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 text-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Launch Orki Headquarters Admin Portal</span>
              </button>
            </div>
          )}
        </div>

        {/* Security Disclosures */}
        <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
          <p>
            🔒 Non-custodial rule: Neither Orki nor the PSP ever holds merchant funds.
          </p>
          <p className="text-[11px] text-slate-600">
            Hosted securely on Orki infrastructure · Base EVM & Solana SVM Settlement Core
          </p>
        </div>
      </div>
    </div>
  )
}
