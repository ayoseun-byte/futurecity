import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Merchant, Paylink } from '../../types'
import { getApiConfig, requestApi, saveApiConfig, saveActiveMerchantId, savePspSessionToken, clearAdminSessionToken } from '../../services/apiConfig'
import { fetchPspDashboard } from '../../services/pspMerchantService'
import { MerchantDashboard } from '../Merchant/MerchantDashboard'
import { HostedCheckoutConsoleView } from '../Rails/consoles/HostedCheckoutConsoleView'
import { PaylinkConsoleView } from '../Rails/consoles/PaylinkConsoleView'
import { CheckoutWidgetView } from '../Rails/consoles/CheckoutWidgetView'
import { CornerShopHeadlessView } from '../Rails/consoles/CornerShopHeadlessView'
import { InvoicelyConsoleView } from '../Rails/consoles/InvoicelyConsoleView'
import { PluginConsoleView } from '../Rails/consoles/PluginConsoleView'
import orkiLogo from '../../assets/logo.svg'
import {
  Building2,
  CreditCard,
  ArrowRight,
  Store,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Lock,
  Mail,
  AlertCircle,
  ExternalLink,
  Code2,
  Link2,
  FileText,
  Blocks,
  ArrowLeft,
} from 'lucide-react'

interface SimMerchant {
  id: string
  externalId: string
  legalBusinessName: string
  tradeLicenseNumber: string
  jurisdiction: string
  representativeName: string
  representativeEmail: string
  orkiMerchant?: Merchant
}

function buildFivePartnerMerchants(orgId: string, orgName: string): SimMerchant[] {
  const prefix = orgName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4) || 'PRTN'
  const templates = [
    {
      legalBusinessName: 'Al-Manara Electronics LLC',
      tradeLicenseNumber: 'DED-882910',
      jurisdiction: 'ARE',
      representativeName: 'Tariq Al-Sayed',
      representativeEmail: 'tariq@almanara.ae',
    },
    {
      legalBusinessName: 'Cedar Cloud Technologies FZCO',
      tradeLicenseNumber: 'IFZA-441209',
      jurisdiction: 'ARE',
      representativeName: 'Nadia Haddad',
      representativeEmail: 'nadia@cedarcloud.io',
    },
    {
      legalBusinessName: 'Oasis Luxury Hospitality DMCC',
      tradeLicenseNumber: 'DMCC-773120',
      jurisdiction: 'ARE',
      representativeName: 'Omar Al-Maktoum',
      representativeEmail: 'omar@oasishospitality.ae',
    },
    {
      legalBusinessName: 'Atlas Maritime Logistics Ltd',
      tradeLicenseNumber: 'ADGM-330192',
      jurisdiction: 'ARE',
      representativeName: 'Layla Mansoor',
      representativeEmail: 'layla@atlasmaritime.ae',
    },
    {
      legalBusinessName: 'Horizon Fine Collectibles LLC',
      tradeLicenseNumber: 'DIFC-559011',
      jurisdiction: 'ARE',
      representativeName: 'Kareem Nassar',
      representativeEmail: 'kareem@horizoncollectibles.ae',
    },
  ]

  return templates.map((t, i) => ({
    id: `sim_${orgId}_${i + 1}`,
    externalId: `${prefix}-M-${1001 + i}`,
    ...t,
  }))
}

export const PartnerSimulationView: React.FC<{
  onPaylinkCreated?: (paylink: Paylink) => void
  onLaunchCheckout?: (paylink: Paylink) => void
}> = ({ onPaylinkCreated, onLaunchCheckout }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [partnerOrg, setPartnerOrg] = useState<{ id: string; name: string; status: string } | null>(null)
  const [simMerchants, setSimMerchants] = useState<SimMerchant[]>([])
  const [selectedMerchant, setSelectedMerchant] = useState<SimMerchant | null>(null)
  const [merchantSection, setMerchantSection] = useState<'overview' | 'oski_onboarding' | 'collection'>('overview')
  const [collectionConsole, setCollectionConsole] = useState<'hosted' | 'widget' | 'paylink' | 'headless' | 'invoicely' | 'plugin'>('hosted')
  const [enablingOrki, setEnablingOrki] = useState(false)
  const [enableError, setEnableError] = useState('')

  const handlePartnerLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoggingIn(true)
    try {
      const config = getApiConfig()
      const loginRes = await requestApi<{
        accessToken: string
        user: { id: string; name: string; email: string; organizationId: string }
        organization?: { id: string; name: string; status: string }
      }>(config, 'POST', '/api/v1/psp/auth/login', {
        email: email.trim(),
        password,
      })

      savePspSessionToken(loginRes.accessToken)
      clearAdminSessionToken()

      const org = loginRes.organization ?? {
        id: loginRes.user.organizationId,
        name: loginRes.user.name,
        status: 'sandbox',
      }
      setPartnerOrg(org)

      // Fetch real notice-accepted merchants already onboarded into Orki (mapped via fetchPspDashboard)
      const generated = buildFivePartnerMerchants(org.id, org.name)
      try {
        const dashboard = await fetchPspDashboard(org.id)
        const liveMerchants = dashboard?.merchants ?? []
        const merged = generated.map((g) => {
          const match = liveMerchants.find(
            (m) => m.externalId === g.externalId || m.legalBusinessName === g.legalBusinessName
          )
          return match ? { ...g, orkiMerchant: match } : g
        })
        // Also append any other real notice-accepted merchants not in the 5 templates
        for (const lm of liveMerchants) {
          if (!merged.some((m) => m.orkiMerchant?.id === lm.id)) {
            merged.unshift({
              id: lm.id,
              externalId: lm.externalId,
              legalBusinessName: lm.legalBusinessName,
              tradeLicenseNumber: lm.tradeLicenseNumber,
              jurisdiction: lm.jurisdiction,
              representativeName: lm.representativeName || 'Authorized Signatory',
              representativeEmail: lm.representativeEmail || '',
              orkiMerchant: lm,
            })
          }
        }
        setSimMerchants(merged)
      } catch {
        setSimMerchants(generated)
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Partner login failed.')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleEnableOrkiForMerchant = async (sm: SimMerchant) => {
    if (!partnerOrg) return
    setEnablingOrki(true)
    setEnableError('')
    try {
      const config = getApiConfig()
      if (!sm.orkiMerchant) {
        // Merchant accepts Orki Data-Sharing Notice -> provisions real merchant in DB & appears in /psp
        const ackRes = await requestApi<{
          merchantId: string
          sessionSecret?: string
          onboardingSession?: { clientSecret?: string }
          status?: string
          nextStep?: string
        }>(
          config,
          'POST',
          '/api/v1/merchant/notice/acknowledge',
          {
            isAuthorisedSignatory: true,
            signatoryName: sm.representativeName,
            signatoryEmail: sm.representativeEmail,
            signatoryTitle: 'Authorized Signatory',
            merchantExternalId: sm.externalId,
            legalBusinessName: sm.legalBusinessName,
            tradeLicenseNumber: sm.tradeLicenseNumber,
            jurisdiction: sm.jurisdiction,
            representativeName: sm.representativeName,
            representativeEmail: sm.representativeEmail,
            returnUrl: window.location.href,
          },
          'psp'
        )

        const createdMerchant: Merchant = {
          id: ackRes.merchantId,
          organizationId: partnerOrg.id,
          externalId: sm.externalId,
          legalBusinessName: sm.legalBusinessName,
          tradeLicenseNumber: sm.tradeLicenseNumber,
          jurisdiction: sm.jurisdiction,
          representativeName: sm.representativeName,
          representativeEmail: sm.representativeEmail,
          status: (ackRes.status as Merchant['status']) || 'notice',
          nextStep: (ackRes.nextStep as Merchant['nextStep']) || 'KYB_INFORMATION',
          settlementMode: 'hold_as_received',
          createdAt: new Date().toISOString(),
          volumeUsdc: 0,
        }

        const issuedSecret = ackRes.onboardingSession?.clientSecret || ackRes.sessionSecret || ''
        saveActiveMerchantId(createdMerchant.id)
        saveApiConfig({
          ...getApiConfig(),
          merchantId: createdMerchant.id,
          merchantSession: issuedSecret,
        })
        if (issuedSecret) {
          sessionStorage.setItem(`orki_merchant_session:${createdMerchant.externalId}`, issuedSecret)
          sessionStorage.setItem(`orki_merchant_session:${createdMerchant.id}`, issuedSecret)
          sessionStorage.setItem('orki_active_merchant_session', issuedSecret)
        } else {
          sessionStorage.removeItem('orki_active_merchant_session')
        }

        const updated = { ...sm, orkiMerchant: createdMerchant }
        setSimMerchants((prev) => prev.map((m) => (m.id === sm.id ? updated : m)))
        setSelectedMerchant(updated)
      } else {
        const existingId = sm.orkiMerchant.id
        const existingSession =
          sessionStorage.getItem(`orki_merchant_session:${existingId}`) ||
          sessionStorage.getItem(`orki_merchant_session:${sm.externalId}`) ||
          ''
        saveActiveMerchantId(existingId)
        saveApiConfig({
          ...getApiConfig(),
          merchantId: existingId,
          merchantSession: existingSession,
        })
        if (existingSession) {
          sessionStorage.setItem('orki_active_merchant_session', existingSession)
        } else {
          sessionStorage.removeItem('orki_active_merchant_session')
        }
      }
      setMerchantSection('oski_onboarding')
    } catch (err) {
      setEnableError(err instanceof Error ? err.message : 'Failed to initiate Orki onboarding.')
    } finally {
      setEnablingOrki(false)
    }
  }

  // 1. Login Screen for Existing Partner (e.g. Wafeq / Fazapay)
  if (!partnerOrg) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Existing Partner Platform Simulator
          </h1>
          
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-5">
            {loginError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handlePartnerLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Partner Login Email (from Orki Claim Link)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partner@company.com"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Partner Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                <span>{loggingIn ? 'Signing in…' : 'Open Partner Backoffice'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

           
          </div>
        </div>
      </div>
    )
  }

  // 2. Existing Partner's Merchant Dashboard (Stripe, MoonPay, Cards + Enable Orki + Collection Consoles)
  if (selectedMerchant) {
    const orkiM = selectedMerchant.orkiMerchant
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        {/* Existing Partner Merchant Topbar */}
        <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => {
                setSelectedMerchant(null)
                setMerchantSection('overview')
              }}
              className="inline-flex items-center space-x-1 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to {partnerOrg.name} Merchants</span>
            </button>
            <span className="text-slate-300">|</span>
            <div className="flex items-center space-x-2">
              <Store className="w-4 h-4 text-slate-700" />
              <span className="text-sm font-bold text-slate-900">{selectedMerchant.legalBusinessName}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600">
                {selectedMerchant.externalId}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setMerchantSection('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                merchantSection === 'overview' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Payment Methods
            </button>
            {orkiM && (
              <button
                type="button"
                onClick={() => setMerchantSection('oski_onboarding')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  merchantSection === 'oski_onboarding' ? 'bg-onion-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Orki Onboarding &amp; Wallet
              </button>
            )}
            <button
              type="button"
              onClick={() => setMerchantSection('collection')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                merchantSection === 'collection' ? 'bg-onion-800 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Test Payment Collection
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-6 space-y-6">
          {enableError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {enableError}
            </div>
          )}

          {merchantSection === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Enabled Payment Methods</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Payment rails configured for {selectedMerchant.legalBusinessName} inside {partnerOrg.name}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Traditional Method 1: Stripe */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">Stripe</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Enabled
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Global card processing, Apple Pay &amp; Google Pay.</p>
                  <div className="text-[11px] font-mono text-slate-400">2.9% + $0.30 · T+2 payout</div>
                </div>

                {/* Traditional Method 2: MoonPay */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">MoonPay</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Enabled
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Fiat-to-crypto card on-ramp widget.</p>
                  <div className="text-[11px] font-mono text-slate-400">4.5% card fee · Instant</div>
                </div>

                {/* Traditional Method 3: Cards / Bank */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">Visa / Mastercard</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Enabled
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Direct acquiring rail via {partnerOrg.name}.</p>
                  <div className="text-[11px] font-mono text-slate-400">2.4% MDR · T+1 settlement</div>
                </div>

                {/* Orki Stablecoin Payment Method */}
                <div className="bg-white rounded-xl border-2 border-onion-300 p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <img src={orkiLogo} alt="Orki" className="h-5 w-auto" />
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        orkiM?.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : orkiM
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {orkiM ? orkiM.status.toUpperCase() : 'Not Enabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Non-custodial USDC settlement on Base &amp; Solana with instant atomic split &amp; AED/USD offramp.
                  </p>
                  <button
                    type="button"
                    disabled={enablingOrki}
                    onClick={() => void handleEnableOrkiForMerchant(selectedMerchant)}
                    className="w-full py-2 px-3 rounded-lg bg-onion-800 hover:bg-onion-900 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {enablingOrki
                        ? 'Starting Orki Notice…'
                        : orkiM
                          ? 'Open Orki Onboarding & Dashboard'
                          : 'Enable Orki (Accept Notice & Onboard)'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {merchantSection === 'oski_onboarding' && orkiM && (
            <MerchantDashboard
              merchant={orkiM}
              onUpdateMerchant={(updated) => {
                const nextMerchant = { ...orkiM, ...updated }
                const nextSim = { ...selectedMerchant, orkiMerchant: nextMerchant }
                setSelectedMerchant(nextSim)
                setSimMerchants((prev) => prev.map((m) => (m.id === selectedMerchant.id ? nextSim : m)))
              }}
              onPaylinkCreated={onPaylinkCreated ?? (() => {})}
              onLaunchCheckout={onLaunchCheckout ?? ((plk) => window.open(`/checkout/${plk.slug}`, '_blank'))}
            />
          )}

          {merchantSection === 'collection' && (
            <div className="space-y-5">
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Collect Payment with Orki (Integration Styles)</h2>
                  <p className="text-xs text-slate-500">
                    Test Hosted Checkout, Embeddable Script Widget, Paylinks, Headless API, Invoicing, and Plugins.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'hosted', label: 'Hosted Checkout', icon: ExternalLink },
                    { id: 'widget', label: 'Script / Widget', icon: Code2 },
                    { id: 'paylink', label: 'Paylinks', icon: Link2 },
                    { id: 'headless', label: 'Headless API', icon: CreditCard },
                    { id: 'invoicely', label: 'Invoicely', icon: FileText },
                    { id: 'plugin', label: 'Plugins', icon: Blocks },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCollectionConsole(item.id as typeof collectionConsole)}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          collectionConsole === item.id
                            ? 'bg-onion-800 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {collectionConsole === 'hosted' && <HostedCheckoutConsoleView />}
              {collectionConsole === 'widget' && <CheckoutWidgetView />}
              {collectionConsole === 'paylink' && <PaylinkConsoleView />}
              {collectionConsole === 'headless' && <CornerShopHeadlessView />}
              {collectionConsole === 'invoicely' && <InvoicelyConsoleView />}
              {collectionConsole === 'plugin' && <PluginConsoleView />}
            </div>
          )}
        </main>
      </div>
    )
  }

  // 3. Existing Partner's Own PSP Backoffice showing their 5 Generated Merchants
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-slate-900 text-white px-6 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Building2 className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-sm">{partnerOrg.name} — Existing Partner Backoffice</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            Pre-Orki Simulation
          </span>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <Link to="/psp" className="text-slate-300 hover:text-white transition">
            Open Orki Partner Portal (/psp) →
          </Link>
          <button
            type="button"
            onClick={() => setPartnerOrg(null)}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{partnerOrg.name} Merchant Portfolio</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Merchants below live in {partnerOrg.name}&apos;s system. Once a merchant enables Orki &amp; accepts the notice, they appear in your Orki Partner Portal (<code className="font-mono">/psp</code>).
            </p>
          </div>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>{simMerchants.filter((m) => Boolean(m.orkiMerchant)).length} / {simMerchants.length} Opted into Orki</span>
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="px-5 py-3 text-left">Merchant Business</th>
                <th className="px-5 py-3 text-left">Existing Rails</th>
                <th className="px-5 py-3 text-left">Orki Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {simMerchants.map((sm) => (
                <tr key={sm.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-900">{sm.legalBusinessName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {sm.externalId} · {sm.representativeEmail}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">Stripe</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">MoonPay</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">Cards</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {sm.orkiMerchant ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{sm.orkiMerchant.status.toUpperCase()}</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                        Not on Orki yet
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMerchant(sm)
                        setMerchantSection('overview')
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
                    >
                      <span>Open Merchant Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
