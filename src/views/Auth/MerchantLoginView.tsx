import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Merchant } from '../../types'
import {
  addStoredMerchant,
} from '../../services/storageService'
import {
  clearAdminSessionToken,
  clearAllMerchantSessions,
  getApiConfig,
  requestApi,
  saveActiveMerchantId,
  saveApiConfig,
} from '../../services/apiConfig'
import {
  Store,
  ArrowRight,
  Key,
  AlertCircle,
  Building2,
  ShieldCheck,
  Fingerprint,
} from 'lucide-react'

function mapPspMerchantPayload(raw: Record<string, unknown>): Merchant {
  const m = (raw.merchant as Record<string, unknown> | undefined) || raw
  const id = String(m.id || '')
  return {
    id,
    organizationId: String(m.organizationId || m.organization_id || ''),
    externalId: String(m.externalId || m.external_id || id),
    legalBusinessName: String(m.legalBusinessName || m.legal_business_name || id),
    tradeLicenseNumber: String(m.tradeLicenseNumber || m.trade_license_number || ''),
    jurisdiction: String(m.jurisdiction || ''),
    representativeName: String(m.representativeName || m.representative_name || ''),
    representativeEmail: String(m.representativeEmail || m.representative_email || ''),
    status: String(m.status || 'pending').toLowerCase() as Merchant['status'],
    nextStep: (m.nextStep ?? m.next_step) as Merchant['nextStep'],
    settlementMode: ((m.settlementMode || m.settlement_mode || 'hold_as_received') as Merchant['settlementMode']),
    baseWalletAddress: (m.baseWalletAddress || m.base_wallet_address || m.merchantWallet || m.merchant_wallet) as string | undefined,
    solanaWalletAddress: (m.solanaWalletAddress || m.solana_wallet_address) as string | undefined,
    orkiFeeBps: (m.orkiFeeBps ?? m.orki_fee_bps) as number | undefined,
    pspFeeBps: (m.pspFeeBps ?? m.psp_fee_bps) as number | undefined,
    noticeAcknowledgedAt: (m.noticeAcknowledgedAt ?? m.notice_acknowledged_at) as string | undefined,
    termsAcceptedAt: (m.termsAcceptedAt ?? m.terms_accepted_at) as string | undefined,
    kybInformationSubmittedAt: (m.kybInformationSubmittedAt ?? m.kyb_information_submitted_at) as string | undefined,
    sumsubCompletedAt: (m.sumsubCompletedAt ?? m.sumsub_completed_at) as string | undefined,
    passkeyRegisteredAt: (m.passkeyRegisteredAt ?? m.passkey_registered_at) as string | undefined,
    verifiedAt: (m.verifiedAt ?? m.verified_at) as string | undefined,
    activatedAt: (m.activatedAt ?? m.activated_at) as string | undefined,
    createdAt: String(m.createdAt || m.created_at || new Date().toISOString()),
  }
}

export const MerchantLoginView: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const initialConfig = getApiConfig()

  const [authMode, setAuthMode] = useState<'psp' | 'onboarding'>(
    initialConfig.pspKey ? 'psp' : 'onboarding'
  )
  const [pspKeyInput, setPspKeyInput] = useState(initialConfig.pspKey || '')
  const [merchantIdInput, setMerchantIdInput] = useState(initialConfig.merchantId || '')
  const [merchantSession, setMerchantSession] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')

  const handleMerchantLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoggingIn(true)

    try {
      if (authMode === 'psp') {
        const trimmedKey = pspKeyInput.trim()
        const trimmedMerchantId = merchantIdInput.trim()
        if (!trimmedKey) {
          throw new Error('Enter your PSP API Key (Authorization: Bearer sk_...).')
        }
        if (!trimmedMerchantId.startsWith('mrch_')) {
          throw new Error('Enter a valid Merchant ID starting with mrch_... for the X-Merchant-Id header.')
        }

        const config = {
          ...getApiConfig(),
          adminKey: '',
          feeApproverKey: '',
          pspKey: trimmedKey,
          merchantSession: '',
          merchantId: trimmedMerchantId,
        }
        const payload = await requestApi<Record<string, unknown>>(
          config,
          'GET',
          `/api/v1/psp/merchants/${encodeURIComponent(trimmedMerchantId)}`,
          undefined,
          'psp'
        )
        const merchant = mapPspMerchantPayload(payload)

        clearAdminSessionToken()
        clearAllMerchantSessions()
        saveApiConfig(config)
        saveActiveMerchantId(merchant.id || trimmedMerchantId)
        addStoredMerchant(merchant)

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
        return
      }

      const rawSession = merchantSession.trim()
      const token = rawSession.includes('#')
        ? new URLSearchParams(rawSession.split('#', 2)[1]).get('session') || ''
        : rawSession

      if (!token.startsWith('onb_sec_')) {
        throw new Error('Please paste your valid merchant onboarding session token (starting with onb_sec_).')
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
      saveApiConfig({ ...config, adminKey: '', feeApproverKey: '', pspKey: '', merchantId: merchant.id })
      saveActiveMerchantId(merchant.id)
      sessionStorage.setItem(`orki_merchant_session:${merchant.externalId}`, token)
      sessionStorage.setItem('orki_active_merchant_session', token)
      addStoredMerchant(merchant)

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
    } finally {
      setLoggingIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
          <Store className="w-6 h-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Merchant Business Portal
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Signatory access for payment checkouts, rails metrics, and multi-chain settlement wallets
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

          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => {
                setAuthMode('psp')
                setLoginError('')
              }}
              className={`py-1.5 px-2.5 rounded-md font-semibold transition ${
                authMode === 'psp'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              PSP API + Merchant ID
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('onboarding')
                setLoginError('')
              }}
              className={`py-1.5 px-2.5 rounded-md font-semibold transition ${
                authMode === 'onboarding'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Onboarding Token
            </button>
          </div>

          <form onSubmit={handleMerchantLogin} className="space-y-4">
            {authMode === 'psp' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    PSP Secret Key (<code className="font-mono text-[11px]">Bearer sk_...</code>)
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      placeholder="sk_live_... or sk_test_..."
                      value={pspKeyInput}
                      onChange={(e) => setPspKeyInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Merchant ID (<code className="font-mono text-[11px]">X-Merchant-Id</code>)
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="mrch_..."
                      value={merchantIdInput}
                      onChange={(e) => setMerchantIdInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Standard server-to-server PSP auth for post-onboarding merchant endpoints — does not require or consume onboarding session keys.
                  </p>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Merchant Onboarding / Session Token
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Paste onb_sec_... token or invitation link"
                    value={merchantSession}
                    onChange={(e) => setMerchantSession(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Required during KYB, notice, terms, and wallet setup (capped at 20 onboarding sessions per merchant)
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loggingIn ? 'Authenticating…' : 'Open Merchant Console'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Passkey Ceremony Prompt */}
          <div className="rounded-lg bg-indigo-50/60 border border-indigo-100 p-3.5 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
              <Fingerprint className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-1">
              <div className="font-semibold text-indigo-900">Need to complete Key Ceremony?</div>
              <p className="text-[11px] text-indigo-700/80 leading-relaxed">
                If your PSP recently registered your business, complete your biometric passkey registration to unlock your smart settlement accounts.
              </p>
              <Link
                to="/setup"
                className="inline-flex items-center space-x-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 pt-1 underline"
              >
                <span>Launch Passkey Ceremony Page</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Navigation to PSP and Admin Portals */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <Link to="/psp/login" className="hover:text-slate-800 flex items-center space-x-1 transition">
              <Building2 className="w-3 h-3" />
              <span>PSP Partner Portal</span>
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
