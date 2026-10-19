import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { UserRole } from '../../context/AuthContext'
import {
  Building2,
  Store,
  ShieldCheck,
  Lock,
  ArrowRight,
  Fingerprint,
  CheckCircle2,
} from 'lucide-react'

export const LoginView: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<UserRole>('org')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedDemoEntity, setSelectedDemoEntity] = useState<string>('psp_xsquare01')

  const handleOrgLogin = (e: React.FormEvent) => {
    e.preventDefault()
    login('org', selectedDemoEntity)
    navigate('/org')
  }

  const handleMerchantLogin = (e: React.FormEvent) => {
    e.preventDefault()
    login('merchant', selectedDemoEntity)
    navigate('/merchant')
  }

  const handleAdminLogin = () => {
    login('admin')
    navigate('/admin')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-onion-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-onion-800/30 rounded-full blur-3xl pointer-events-none" />

      {/* Header Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-onion-700 to-onion flex items-center justify-center shadow-xl shadow-onion/30 border border-onion-400/30">
          <span className="text-white font-black text-2xl tracking-tighter">O</span>
        </div>
        <h2 className="mt-4 text-3xl font-extrabold text-white tracking-tight">
          ORKI Gateway
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Non-Custodial PSP Multi-Tenancy & Settlement Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg z-10">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-800">
          {/* Persona Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800 mb-8">
            <button
              type="button"
              onClick={() => {
                setActiveTab('org')
                setSelectedDemoEntity('psp_xsquare01')
              }}
              className={`flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold transition-all ${
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
              onClick={() => {
                setActiveTab('merchant')
                setSelectedDemoEntity('mrch_9f2a1c')
              }}
              className={`flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'merchant'
                  ? 'bg-onion text-white shadow-lg shadow-onion/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Login as Merchant</span>
            </button>
          </div>

          {/* Form Content */}
          {activeTab === 'org' && (
            <form onSubmit={handleOrgLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Organization / PSP Account
                </label>
                <div className="space-y-2">
                  <div
                    onClick={() => setSelectedDemoEntity('psp_xsquare01')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedDemoEntity === 'psp_xsquare01'
                        ? 'border-onion-500 bg-onion-950/40 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-onion/20 border border-onion-500/40 flex items-center justify-center text-onion-300 font-bold text-xs">
                        XQ
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">XSquare Financial Technologies</p>
                        <p className="text-xs text-slate-400">Approved Tier 1 PSP · Live Production Keys</p>
                      </div>
                    </div>
                    {selectedDemoEntity === 'psp_xsquare01' && (
                      <CheckCircle2 className="w-5 h-5 text-onion" />
                    )}
                  </div>

                  <div
                    onClick={() => setSelectedDemoEntity('psp_sandbox02')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedDemoEntity === 'psp_sandbox02'
                        ? 'border-onion-500 bg-onion-950/40 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
                        AP
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Apex Pay Global</p>
                        <p className="text-xs text-slate-400">Sandbox Status · Testing Keys Active</p>
                      </div>
                    </div>
                    {selectedDemoEntity === 'psp_sandbox02' && (
                      <CheckCircle2 className="w-5 h-5 text-onion" />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedDemoEntity === 'psp_xsquare01' ? 'tariq@xsquare.example' : 'liam@apexpay.io'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-onion transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-onion transition-colors"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute right-4 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-onion-700 to-onion text-white font-bold rounded-xl shadow-lg shadow-onion/30 hover:shadow-onion/50 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 text-sm"
              >
                <span>Access PSP Management Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {activeTab === 'merchant' && (
            <form onSubmit={handleMerchantLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Select Registered Merchant
                </label>
                <div className="space-y-2">
                  <div
                    onClick={() => setSelectedDemoEntity('mrch_9f2a1c')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedDemoEntity === 'mrch_9f2a1c'
                        ? 'border-onion-500 bg-onion-950/40 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                        FL
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Falcon Luxury Goods FZ-LLC</p>
                        <p className="text-xs text-emerald-400">Status: Active · Passkey & Wallets Ready</p>
                      </div>
                    </div>
                    {selectedDemoEntity === 'mrch_9f2a1c' && (
                      <CheckCircle2 className="w-5 h-5 text-onion" />
                    )}
                  </div>

                  <div
                    onClick={() => setSelectedDemoEntity('mrch_3d8b2e')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedDemoEntity === 'mrch_3d8b2e'
                        ? 'border-onion-500 bg-onion-950/40 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
                        AN
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Al-Noor Electronics Trading</p>
                        <p className="text-xs text-amber-400">Status: Pending Verification (KYB)</p>
                      </div>
                    </div>
                    {selectedDemoEntity === 'mrch_3d8b2e' && (
                      <CheckCircle2 className="w-5 h-5 text-onion" />
                    )}
                  </div>

                  <div
                    onClick={() => setSelectedDemoEntity('mrch_7c1a9f')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedDemoEntity === 'mrch_7c1a9f'
                        ? 'border-onion-500 bg-onion-950/40 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-xs">
                        DO
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Desert Oasis Hospitality</p>
                        <p className="text-xs text-slate-400">Status: Terms Pending (Not onboarded yet)</p>
                      </div>
                    </div>
                    {selectedDemoEntity === 'mrch_7c1a9f' && (
                      <CheckCircle2 className="w-5 h-5 text-onion" />
                    )}
                  </div>
                </div>
              </div>

              {selectedDemoEntity === 'mrch_9f2a1c' && (
                <div className="p-3 rounded-xl bg-onion-950/60 border border-onion-500/30 flex items-center space-x-3">
                  <Fingerprint className="w-6 h-6 text-onion flex-shrink-0" />
                  <p className="text-xs text-onion-200">
                    This merchant has WebAuthn biometrics configured. Fast-track login with your passkey is active.
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-onion-700 to-onion text-white font-bold rounded-xl shadow-lg shadow-onion/30 hover:shadow-onion/50 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 text-sm"
              >
                <Fingerprint className="w-4 h-4" />
                <span>Enter Merchant Portal</span>
              </button>
            </form>
          )}

          {/* Orki Admin Link */}
          <div className="mt-8 pt-6 border-t border-slate-800 text-center flex items-center justify-between text-xs text-slate-400">
            <span>Orki Operational Officer?</span>
            <button
              type="button"
              onClick={handleAdminLogin}
              className="text-onion-300 font-bold hover:text-white flex items-center space-x-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Orki Admin Portal</span>
            </button>
          </div>
        </div>

        {/* Security Disclosures */}
        <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
          <p>
            🔒 Non-custodial guarantee: Neither Orki nor the PSP ever holds merchant funds.
          </p>
          <p className="text-[11px] text-slate-600">
            Hosted securely on Orki infrastructure · Base EVM & Solana SVM Settlement Core
          </p>
        </div>
      </div>
    </div>
  )
}
