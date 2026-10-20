import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { UserRole } from '../../context/AuthContext'
import { getStoredOrganizations, getStoredMerchants } from '../../services/storageService'
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

  const organizations = getStoredOrganizations()
  const merchants = getStoredMerchants()

  const [activeTab, setActiveTab] = useState<UserRole>('org')

  // PSP form state
  const [pspEmail, setPspEmail] = useState(organizations[0]?.contacts[0]?.email || '')
  const [pspPassword, setPspPassword] = useState('password123')
  const [selectedOrgId, setSelectedOrgId] = useState<string>(organizations[0]?.id || '')

  // Merchant form state
  const [merchantEmail, setMerchantEmail] = useState(merchants[0]?.representativeEmail || '')
  const [merchantPassword, setMerchantPassword] = useState('password123')
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>(merchants[0]?.id || '')

  // Admin form state
  const [adminEmail, setAdminEmail] = useState('admin@orki.com')
  const [adminPassword, setAdminPassword] = useState('admin123')

  const handleOrgLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Match by selected ID or by email
    const org = organizations.find((o) => o.id === selectedOrgId || o.contacts.some((c) => c.email.toLowerCase() === pspEmail.toLowerCase())) || organizations[0]
    if (org) {
      login('org', org.id)
    } else {
      login('org', undefined, {
        name: pspEmail.split('@')[0] || 'FinTech Partner',
        email: pspEmail || 'partner@example.com',
      })
    }
    navigate('/org')
  }

  const handleMerchantLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const merch = merchants.find((m) => m.id === selectedMerchantId || m.representativeEmail.toLowerCase() === merchantEmail.toLowerCase()) || merchants[0]
    if (merch) {
      login('merchant', merch.id)
    } else {
      login('merchant', undefined, {
        name: merchantEmail.split('@')[0] || 'Merchant User',
        email: merchantEmail || 'merchant@example.com',
      })
    }
    navigate('/merchant')
  }

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    login('admin')
    navigate('/admin')
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
                  Manage PSP onboarding, fee caps, regulatory verification (VARA/CBUAE), and institutional key generation.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Compliance Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-onion focus:border-onion bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Master Password
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
                className="w-full mat-btn-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs mt-2"
              >
                <span>Enter Orki Admin Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TAB 2: PSP / ORGANIZATION PORTAL */}
          {activeTab === 'org' && (
            <form onSubmit={handleOrgLogin} className="space-y-4">
              {organizations.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-2">
                  <div className="flex items-center space-x-2 font-semibold">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>No Organizations Registered Yet</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    To start the full workflow from scratch, log in as <strong>Orki Admin</strong> to register your first PSP, FinTech, or Bank partner.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin')}
                    className="mt-2 text-xs font-semibold text-onion hover:underline flex items-center space-x-1"
                  >
                    <span>Go to Orki Admin Tab</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Registered Organization
                    </label>
                    <select
                      value={selectedOrgId}
                      onChange={(e) => {
                        setSelectedOrgId(e.target.value)
                        const found = organizations.find((o) => o.id === e.target.value)
                        if (found) setPspEmail(found.contacts[0]?.email || '')
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-onion focus:border-onion bg-white"
                    >
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} ({org.categoryType?.toUpperCase()} · {org.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Technical / Operator Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        value={pspEmail}
                        onChange={(e) => setPspEmail(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-onion focus:border-onion bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password / API Secret
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        value={pspPassword}
                        onChange={(e) => setPspPassword(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-onion focus:border-onion bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mat-btn-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs mt-2"
                  >
                    <span>Log In to PSP Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </form>
          )}

          {/* TAB 3: MERCHANT PORTAL */}
          {activeTab === 'merchant' && (
            <form onSubmit={handleMerchantLogin} className="space-y-4">
              {merchants.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-2">
                  <div className="flex items-center space-x-2 font-semibold">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>No Merchants Onboarded Yet</span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Merchants are invited by their PSP. Log into your PSP portal to register a merchant with pre-fill details.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('org')}
                    className="mt-2 text-xs font-semibold text-onion hover:underline flex items-center space-x-1"
                  >
                    <span>Switch to PSP Portal</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Merchant Entity
                    </label>
                    <select
                      value={selectedMerchantId}
                      onChange={(e) => {
                        setSelectedMerchantId(e.target.value)
                        const found = merchants.find((m) => m.id === e.target.value)
                        if (found) setMerchantEmail(found.representativeEmail)
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-onion focus:border-onion bg-white"
                    >
                      {merchants.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.legalBusinessName} ({m.status.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Authorized Signatory Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        value={merchantEmail}
                        onChange={(e) => setMerchantEmail(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-onion focus:border-onion bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Passkey / Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        value={merchantPassword}
                        onChange={(e) => setMerchantPassword(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-onion focus:border-onion bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mat-btn-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs mt-2"
                  >
                    <span>Access Merchant Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </form>
          )}

          {/* Quick-Start Helper Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-onion" />
              <span>Interactive Local Storage Mode</span>
            </span>
            <span className="font-mono text-slate-400">
              {organizations.length} Orgs · {merchants.length} Merchants
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
