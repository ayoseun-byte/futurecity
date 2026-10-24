import React, { useState, useEffect, useCallback } from 'react'
import type { Merchant, Paylink, SettlementMode, Transaction } from '../../types'
import { StatusBadge } from '../../components/StatusBadge'
import { CreatePaylinkModal } from './CreatePaylinkModal'
import { OffRampModal } from './OffRampModal'
import { TransferModal } from './TransferModal'
import { getApiConfig, requestApi, saveApiConfig } from '../../services/apiConfig'
import {
  ArrowRightLeft,
  Send,
  Plus,
  Lock,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  Layers,
  TrendingUp,
  Coins,
  PieChart,
  BarChart3,
  X,
  CreditCard,
  FileText,
} from 'lucide-react'

interface MerchantMetrics {
  last30dSettlementsUsdc?: string
  settlementBreakdown30d?: { liquidatedToBankAed?: string; liquidatedUsdcEquivalent?: string; heldInCryptoUsdc?: string }
  settlementsByChain?: Record<string, { percentage?: number; volumeUsdc?: string; currency?: string }>
  settlementsByAsset?: Record<string, string>
  checkoutPerformance?: { conversionRate?: string; avgCheckoutTimeSeconds?: number; avgSettlementUsdc?: string }
  transfersSummary?: { totalTransfersExecuted?: number; totalVolumeTransferredUsdc?: string; failedTransfers?: number }
}

interface MerchantTransactionRecord {
  id: string
  merchant_id: string
  organization_id?: string
  type: Transaction['type']
  gross_amount: string | number
  currency: string
  orki_fee_bps?: number
  orki_fee_amount?: string | number
  psp_markup_bps?: number
  psp_markup_amount?: string | number
  net_amount: string | number
  chain?: string | null
  tx_hash?: string | null
  payer_address?: string | null
  status: string
  created_at: string
}

interface MerchantDashboardProps {
  merchant: Merchant
  onUpdateMerchant: (updated: Partial<Merchant>) => void
  onPaylinkCreated: (paylink: Paylink) => void
  onLaunchCheckout: (paylink: Paylink) => void
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({
  merchant,
  onUpdateMerchant,
  onPaylinkCreated,
  onLaunchCheckout,
}) => {
  const [isPaylinkModalOpen, setIsPaylinkModalOpen] = useState(false)
  const [isOffRampModalOpen, setIsOffRampModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showAssetBreakdown, setShowAssetBreakdown] = useState(false)
  const [selectedTxForSplit, setSelectedTxForSplit] = useState<Transaction | null>(null)

  // Guided Onboarding Dialog States
  const [showNoticeModal, setShowNoticeModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showKybModal, setShowKybModal] = useState(false)
  const [apiBusy, setApiBusy] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [dashboardMetrics, setDashboardMetrics] = useState<MerchantMetrics | null>(null)
  const [dashboardBalances, setDashboardBalances] = useState<Record<string, unknown> | null>(null)
  const [dashboardPaylinks, setDashboardPaylinks] = useState<Paylink[]>([])
  const [dashboardTransactions, setDashboardTransactions] = useState<Transaction[]>([])
  const [dashboardDataLoaded, setDashboardDataLoaded] = useState(false)
  const [notice, setNotice] = useState<{ title?: string; sections?: { heading: string; content: string }[] } | null>(null)
  const [termsData, setTermsData] = useState<{ tos?: { token?: string; entityName?: string; documentLinks?: { tos?: string; privacyPolicy?: string } }; title?: string; clauses?: string[] } | null>(null)
  const [signatory, setSignatory] = useState({ name: merchant.representativeName || '', email: merchant.representativeEmail || '', title: '' })
  const [kybData, setKybData] = useState({ companyName: merchant.legalBusinessName, registrationNumber: merchant.tradeLicenseNumber, country: '', incorporatedOn: '', type: '', legalAddress: '', registrationLocation: '', email: merchant.representativeEmail || '', phone: '', taxId: '', website: '', postalAddress: '', controlScheme: '', applicantPosition: '' })
  const merchantApiConfig = useCallback(() => {
    const config = getApiConfig()
    const merchantSession = sessionStorage.getItem(`orki_merchant_session:${merchant.externalId}`)
    return merchantSession ? { ...config, merchantSession } : config
  }, [merchant.externalId])
  const hasMerchantSession = Boolean(merchantApiConfig().merchantSession)
  const visiblePaylinks = hasMerchantSession ? dashboardPaylinks : []
  const visibleTransactions = hasMerchantSession ? dashboardTransactions : []
  const asAmount = useCallback((value: string | number | undefined): number => {
    const amount = Number(value ?? 0)
    return Number.isFinite(amount) ? amount : 0
  }, [])

  const isSetupComplete = merchant.status === 'active' && !merchant.nextStep
  const [hasAgreedTos, setHasAgreedTos] = useState(false)

  // Browser messages are navigation hints only; backend state is authoritative.
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'ORKI_TOS_ACCEPTED' && event.data?.merchantId === merchant.id) {
        onUpdateMerchant({
          termsAcceptedAt: new Date().toISOString(),
          status: 'terms_accepted',
          nextStep: 'SUMSUB',
        })
        setShowTermsModal(false)
      }
    }
    window.addEventListener('message', handleWindowMessage)
    return () => window.removeEventListener('message', handleWindowMessage)
  }, [merchant.id, onUpdateMerchant])

  // Stepper handlers
  const handleStartOptIn = async () => {
    setApiBusy(true)
    setApiError(null)
    try {
      const config = getApiConfig()
      if (!config.pspKey) throw new Error('Set the PSP API key in the Backend API workbench before starting this demo merchant onboarding.')
      const session = await requestApi<{ clientSecret: string }>(config, 'POST', '/api/v1/psp/merchant-onboarding-sessions', {
        merchantExternalId: merchant.externalId,
        legalBusinessName: merchant.legalBusinessName,
        tradeLicenseNumber: merchant.tradeLicenseNumber,
        jurisdiction: merchant.jurisdiction,
        representativeName: merchant.representativeName,
        representativeEmail: merchant.representativeEmail,
        returnUrl: `${window.location.origin}/merchant`,
        ttlMinutes: 60,
      }, 'psp')
      const sessionConfig = { ...config, merchantSession: session.clientSecret }
      saveApiConfig(sessionConfig)
      sessionStorage.setItem(`orki_merchant_session:${merchant.externalId}`, session.clientSecret)
      await requestApi(sessionConfig, 'POST', '/api/v1/merchant/accept-usdc', {}, 'merchant')
      const fetchedNotice = await requestApi<typeof notice>(sessionConfig, 'GET', '/api/v1/merchant/notice', undefined, 'merchant')
      setNotice(fetchedNotice)
      onUpdateMerchant({ nextStep: 'NOTICE' })
      setShowNoticeModal(true)
    } catch (reason) {
      setApiError(reason instanceof Error ? reason.message : 'Could not start merchant onboarding.')
    } finally {
      setApiBusy(false)
    }
  }

  const handleOpenNotice = async () => {
    setApiBusy(true); setApiError(null)
    try {
      const value = await requestApi<typeof notice>(merchantApiConfig(), 'GET', '/api/v1/merchant/notice', undefined, 'merchant')
      setNotice(value)
      setShowNoticeModal(true)
    } catch (reason) { setApiError(reason instanceof Error ? reason.message : 'Could not load regulatory notice.') }
    finally { setApiBusy(false) }
  }

  const handleOpenTerms = async () => {
    setApiBusy(true); setApiError(null)
    try {
      const value = await requestApi<typeof termsData>(merchantApiConfig(), 'GET', '/api/v1/merchant/terms', undefined, 'merchant')
      setTermsData(value)
      setShowTermsModal(true)
    } catch (reason) { setApiError(reason instanceof Error ? reason.message : 'Could not load terms.') }
    finally { setApiBusy(false) }
  }

  const handleAcknowledgeNotice = async () => {
    setApiBusy(true)
    setApiError(null)
    try {
      await requestApi(merchantApiConfig(), 'POST', '/api/v1/merchant/notice/acknowledge', {
        isAuthorisedSignatory: true,
        signatoryName: signatory.name,
        signatoryEmail: signatory.email,
        signatoryTitle: signatory.title,
      }, 'merchant')
      onUpdateMerchant({ noticeAcknowledgedAt: new Date().toISOString(), nextStep: 'KYB_INFORMATION' })
      setShowNoticeModal(false)
      setShowKybModal(true)
    } catch (reason) {
      setApiError(reason instanceof Error ? reason.message : 'Could not record notice acknowledgement.')
    } finally {
      setApiBusy(false)
    }
  }

  const handleSubmitKyb = async (event: React.FormEvent) => {
    event.preventDefault()
    setApiBusy(true)
    setApiError(null)
    try {
      const config = merchantApiConfig()
      await requestApi(config, 'POST', '/api/v1/merchant/kyb-information', { companyInfo: kybData }, 'merchant')
      const fetchedTerms = await requestApi<typeof termsData>(config, 'GET', '/api/v1/merchant/terms', undefined, 'merchant')
      setTermsData(fetchedTerms)
      onUpdateMerchant({ nextStep: 'TERMS' })
      setShowKybModal(false)
      setShowTermsModal(true)
    } catch (reason) {
      setApiError(reason instanceof Error ? reason.message : 'Could not submit KYB information.')
    } finally {
      setApiBusy(false)
    }
  }

  const handleAcceptTerms = async () => {
    const token = termsData?.tos?.token
    if (!token) { setApiError('The backend did not return an active terms acceptance token.'); return }
    setApiBusy(true)
    setApiError(null)
    try {
      await requestApi(merchantApiConfig(), 'POST', `/api/v1/tos/${encodeURIComponent(token)}`, {
        signerName: signatory.name,
        signerEmail: signatory.email,
        signerTitle: signatory.title,
        isAuthorisedSignatory: true,
      }, 'none')
      onUpdateMerchant({ termsAcceptedAt: new Date().toISOString(), status: 'terms_accepted', nextStep: 'SUMSUB' })
      setShowTermsModal(false)
    } catch (reason) {
      setApiError(reason instanceof Error ? reason.message : 'Could not record terms acceptance.')
    } finally {
      setApiBusy(false)
    }
  }

  const handleOpenSumsubTab = async () => {
    const tab = window.open('about:blank', '_blank')
    setApiBusy(true)
    setApiError(null)
    try {
      const result = await requestApi<{ url: string }>(merchantApiConfig(), 'GET', '/api/v1/merchant/kyc/start', undefined, 'merchant')
      if (!result.url) throw new Error('The backend did not return the Sumsub hosted URL.')
      if (tab) tab.location.href = result.url
      else window.open(result.url, '_blank', 'noopener,noreferrer')
    } catch (reason) {
      tab?.close()
      setApiError(reason instanceof Error ? reason.message : 'Could not start Sumsub verification.')
    } finally {
      setApiBusy(false)
    }
  }

  const refreshDashboardData = useCallback(async () => {
    const config = merchantApiConfig()
    if (!config.merchantSession) return
    try {
      const [metricsResponse, balancesResponse, paylinksResponse, transactionsResponse] = await Promise.all([
        requestApi<{ metrics?: MerchantMetrics }>(config, 'GET', '/api/v1/merchant/metrics', undefined, 'merchant'),
        requestApi<{ balances?: Record<string, unknown> }>(config, 'GET', '/api/v1/merchant/balances', undefined, 'merchant'),
        requestApi<{ paylinks?: Array<Omit<Paylink, 'amount' | 'createdAt'> & { amount?: string | number; createdAt?: string }> }>(config, 'GET', '/api/v1/merchant/paylinks', undefined, 'merchant'),
        requestApi<{ data?: MerchantTransactionRecord[] }>(config, 'GET', '/api/v1/merchant/transactions', undefined, 'merchant'),
      ])
      setDashboardMetrics(metricsResponse.metrics || null)
      setDashboardBalances(balancesResponse.balances || null)
      setDashboardPaylinks((paylinksResponse.paylinks || []).map((link) => ({
        ...link,
        amount: link.amount === undefined || link.amount === null ? undefined : asAmount(link.amount),
        createdAt: link.createdAt || '',
      })))
      setDashboardTransactions((transactionsResponse.data || []).map((transaction) => ({
        id: transaction.id,
        merchantId: transaction.merchant_id,
        organizationId: transaction.organization_id,
        type: transaction.type,
        grossAmount: asAmount(transaction.gross_amount),
        currency: transaction.currency,
        orkiFeeBps: transaction.orki_fee_bps || 0,
        orkiFeeAmount: asAmount(transaction.orki_fee_amount),
        pspMarkupBps: transaction.psp_markup_bps || 0,
        pspMarkupAmount: asAmount(transaction.psp_markup_amount),
        netAmount: asAmount(transaction.net_amount),
        chain: transaction.chain || 'unknown',
        txHash: transaction.tx_hash || '',
        payerAddress: transaction.payer_address || '',
        status: transaction.status === 'completed' ? 'completed' : 'pending',
        createdAt: transaction.created_at,
      })))
      setDashboardDataLoaded(true)
    } catch (reason) {
      setApiError(reason instanceof Error ? reason.message : 'Could not load merchant dashboard data.')
    }
  }, [asAmount, merchantApiConfig])

  useEffect(() => {
    const config = merchantApiConfig()
    if (!config.merchantSession) return
    let active = true
    const refresh = async () => {
      try {
        const state = await requestApi<{ status: string; statusReason?: string | null; nextStep?: string | null; noticeAcknowledgedAt?: string | null; kybInformationSubmittedAt?: string | null; termsAcceptedAt?: string | null; sumsubCompletedAt?: string | null; verifiedAt?: string | null; passkeyRegisteredAt?: string | null; settlementMode?: SettlementMode; orkiFeeBps?: number; pspFeeBps?: number; orkiFeeWallet?: string | null; pspFeeWallet?: string | null; merchantWallet?: string | null }>(config, 'GET', '/api/v1/merchant/onboarding', undefined, 'merchant')
        if (!active) return
        onUpdateMerchant({ status: state.status as Merchant['status'], statusReason: state.statusReason || undefined, nextStep: state.nextStep as Merchant['nextStep'], noticeAcknowledgedAt: state.noticeAcknowledgedAt || undefined, kybInformationSubmittedAt: state.kybInformationSubmittedAt || undefined, termsAcceptedAt: state.termsAcceptedAt || undefined, sumsubCompletedAt: state.sumsubCompletedAt || undefined, verifiedAt: state.verifiedAt || undefined, passkeyRegisteredAt: state.passkeyRegisteredAt || undefined, settlementMode: state.settlementMode, orkiFeeBps: state.orkiFeeBps, pspFeeBps: state.pspFeeBps, orkiFeeWallet: state.orkiFeeWallet || undefined, pspFeeWallet: state.pspFeeWallet || undefined, merchantWallet: state.merchantWallet || undefined })
      } catch (reason) {
        if (active) setApiError(reason instanceof Error ? reason.message : 'Could not refresh onboarding status.')
      }
    }
    void refresh()
    void refreshDashboardData()
    const timer = window.setInterval(refresh, 15000)
    const dataTimer = window.setInterval(() => { void refreshDashboardData() }, 60000)
    window.addEventListener('focus', refresh)
    return () => { active = false; window.clearInterval(timer); window.clearInterval(dataTimer); window.removeEventListener('focus', refresh) }
  }, [merchant.id, merchantApiConfig, onUpdateMerchant, refreshDashboardData])

  const handleToggleSettlementMode = async (newMode: SettlementMode) => {
    setApiBusy(true)
    setApiError(null)
    try {
      await requestApi(merchantApiConfig(), 'PATCH', '/api/v1/merchant/settlement-mode', { mode: newMode }, 'merchant')
      onUpdateMerchant({ settlementMode: newMode })
    } catch (reason) {
      setApiError(reason instanceof Error ? reason.message : 'Settlement mode could not be changed.')
    } finally {
      setApiBusy(false)
    }
  }

  const handlePaylinkCreated = async (paylink: Paylink) => {
    try {
      const created = await requestApi<{
        id: string
        slug: string
        title: string
        checkoutUrl: string
        status: Paylink['status']
      }>(merchantApiConfig(), 'POST', '/api/v1/merchant/paylinks', {
        title: paylink.title,
        description: paylink.description,
        amountType: paylink.amountType,
        amount: paylink.amount,
        currency: paylink.currency,
        settlementMode: paylink.settlementMode,
        allowedChains: paylink.allowedChains,
      }, 'merchant')
      onPaylinkCreated({
        ...paylink,
        id: created.id,
        slug: created.slug,
        title: created.title,
        checkoutUrl: created.checkoutUrl,
        status: created.status,
      })
      await refreshDashboardData()
    } catch (reason) {
      setApiError(reason instanceof Error ? reason.message : 'Paylink could not be created.')
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Calculated Metrics
  const balances = dashboardBalances as {
    totalCryptoBalanceUsdcEquivalent?: string
    usdcBase?: { balance?: string }
    usdtSolana?: { balance?: string }
    eurcBase?: { balance?: string }
  } | null
  const baseUsdcBalance = asAmount(balances?.usdcBase?.balance)
  const solanaUsdtBalance = asAmount(balances?.usdtSolana?.balance)
  const totalCryptoBalance = asAmount(balances?.totalCryptoBalanceUsdcEquivalent)
  const total30dSettlements = asAmount(dashboardMetrics?.last30dSettlementsUsdc)
  const chainMetrics = dashboardMetrics?.settlementsByChain || {}
  const assetMetrics = dashboardMetrics?.settlementsByAsset || {}
  const settlementBreakdown = dashboardMetrics?.settlementBreakdown30d
  const checkoutMetrics = dashboardMetrics?.checkoutPerformance
  const transferMetrics = dashboardMetrics?.transfersSummary
  const walletAddress = (balances as { usdcBase?: { walletAddress?: string } } | null)?.usdcBase?.walletAddress
  const activePaylinkCount = visiblePaylinks.filter((link) => link.status === 'active').length
  const metricValue = (value: string | number | undefined, suffix = '') =>
    dashboardDataLoaded && value !== undefined ? `${value}${suffix}` : '—'

  return (
    <div className="space-y-6 font-sans">
      {apiError && <div role="alert" className="mat-card border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-start justify-between gap-3"><span>{apiError}</span><button type="button" onClick={() => setApiError(null)} aria-label="Dismiss error"><X className="h-4 w-4" /></button></div>}
      {/* Merchant Title & Profile Bar */}
      <div className="mat-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-onion-50 text-onion-800 border border-onion-200/80 flex items-center justify-center font-bold text-xl shadow-xs">
            {merchant.legalBusinessName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {merchant.legalBusinessName}
              </h1>
              <StatusBadge status={merchant.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              License: <span className="font-semibold text-slate-700">{merchant.tradeLicenseNumber}</span> · {merchant.jurisdiction} · Rep: {merchant.representativeName}
            </p>

          </div>
        </div>

        {/* Quick Mode Indicator */}
        <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 py-2 px-3.5 rounded-lg text-xs">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Payment Acceptance
            </p>
            <p className="font-bold text-slate-800 text-xs mt-0.5">
              {isSetupComplete ? 'USDC Live (Multi-Chain)' : 'Onboarding Pending'}
            </p>
          </div>
          {merchant.status === 'invited' && (!merchant.nextStep || merchant.nextStep === 'OPT_IN') && (
            <button
              onClick={() => void handleStartOptIn()}
              disabled={apiBusy}
              className="mat-btn-primary px-3 py-1.5 text-xs font-medium ml-2 shadow-xs"
            >
              Accept USDC
            </button>
          )}
        </div>
      </div>

      {/* GUIDED ONBOARDING STEPPER HERO (If not yet complete) */}
      {!isSetupComplete && (
        <div className="mat-card p-6 border-l-4 border-l-onion bg-gradient-to-r from-onion-50/40 via-white to-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-onion-800 bg-onion-100/80 px-2.5 py-0.5 rounded-md">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next Step: {merchant.nextStep || 'OPT_IN'}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight pt-1">
                Complete Your USDC Merchant Activation
              </h2>
              <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                Walk through the steps to accept USDC: review the regulatory notice, accept the current terms, and complete Sumsub verification. Wallet activation remains gated on production WebAuthn support.
              </p>
            </div>

            {/* Contextual Action Button based on current nextStep */}
            <div>
              {merchant.status === 'invited' && (!merchant.nextStep || merchant.nextStep === 'OPT_IN') && (
                <button
              onClick={() => void handleStartOptIn()}
              disabled={apiBusy}
                  className="mat-btn-primary px-5 py-2.5 text-xs font-semibold flex items-center space-x-2 shadow-sm"
                >
                  <span>{apiBusy ? 'Starting secure onboarding…' : 'Accept USDC Payments'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {merchant.nextStep === 'NOTICE' && (
                <button
                  onClick={() => void handleOpenNotice()}
                  className="mat-btn-primary px-5 py-2.5 text-xs font-semibold flex items-center space-x-2 shadow-sm"
                >
                  <span>Read Regulatory Notice</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {merchant.nextStep === 'KYB_INFORMATION' && (
                <button onClick={() => setShowKybModal(true)} className="mat-btn-primary px-5 py-2.5 text-xs font-semibold flex items-center space-x-2 shadow-sm"><span>Submit KYB Information</span><ChevronRight className="w-4 h-4" /></button>
              )}
              {merchant.nextStep === 'TERMS' && (
                <button
                  onClick={() => void handleOpenTerms()}
                  className="mat-btn-primary px-5 py-2.5 text-xs font-semibold flex items-center space-x-2 shadow-sm"
                >
                  <span>Accept Terms & Fee Split</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {merchant.nextStep === 'SUMSUB' && (
                <button
                  onClick={handleOpenSumsubTab}
                  className="mat-btn-primary px-5 py-2.5 text-xs font-semibold flex items-center space-x-2 shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open SumSub Verification (New Tab)</span>
                </button>
              )}
              {merchant.nextStep === 'PASSKEY' && (
                <div className="max-w-sm space-y-2"><p className="text-xs leading-5 text-amber-800">KYB is verified. Passkey registration is currently unavailable until the server-side WebAuthn ceremony is enabled; activation remains gated.</p></div>
              )}
              {merchant.status === 'verification_action_required' && merchant.statusReason && (
                <p className="max-w-sm text-xs leading-5 text-amber-800 mt-2">
                  Compliance note: {merchant.statusReason}
                </p>
              )}
              {merchant.status === 'rejected' && (
                <p className="max-w-sm text-xs leading-5 text-rose-700">
                  {merchant.statusReason || 'The backend reports that KYB verification was rejected. Contact Orki compliance for next steps.'}
                </p>
              )}
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100">
            <div className={`p-2.5 rounded-lg text-xs border ${
              merchant.nextStep === 'NOTICE'
                ? 'bg-white border-onion-300 shadow-xs ring-1 ring-onion-200'
                : merchant.noticeAcknowledgedAt
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider">Step 1</p>
              <p className="font-bold text-xs mt-0.5">Regulatory Notice</p>
            </div>

            <div className={`p-2.5 rounded-lg text-xs border ${
              merchant.nextStep === 'KYB_INFORMATION'
                ? 'bg-white border-onion-300 shadow-xs ring-1 ring-onion-200'
                : merchant.kybInformationSubmittedAt
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider">Step 2</p>
              <p className="font-bold text-xs mt-0.5">Company KYB Information</p>
            </div>

            <div className={`p-2.5 rounded-lg text-xs border ${merchant.nextStep === 'TERMS' ? 'bg-white border-onion-300 shadow-xs ring-1 ring-onion-200' : merchant.termsAcceptedAt ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider">Step 3</p><p className="font-bold text-xs mt-0.5">Terms & Fee Split</p>
            </div>

            <div className={`p-2.5 rounded-lg text-xs border ${
              merchant.nextStep === 'SUMSUB'
                ? 'bg-white border-onion-300 shadow-xs ring-1 ring-onion-200'
                : merchant.sumsubCompletedAt
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider">Step 4</p>
              <p className="font-bold text-xs mt-0.5">SumSub KYB Check</p>
            </div>

            <div className={`p-2.5 rounded-lg text-xs border ${
              merchant.nextStep === 'PASSKEY'
                ? 'bg-white border-onion-300 shadow-xs ring-1 ring-onion-200'
                : merchant.passkeyRegisteredAt
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider">Step 5</p>
              <p className="font-bold text-xs mt-0.5">Passkey Biometric</p>
            </div>
          </div>
        </div>
      )}

      {/* FINANCIAL KPI TILES (Material 3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: CRYPTO BALANCE (With Assets Breakdown Dropdown) */}
        <div className="mat-card p-5 flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span className="flex items-center space-x-1.5">
                <Coins className="w-4 h-4 text-onion-700" />
                <span>Crypto Balance</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Non-Custodial
              </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <p className="text-2xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">
                {totalCryptoBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <span className="text-xs font-medium text-slate-400">USDC eq.</span>
              </p>

              <button
                type="button"
                onClick={() => setShowAssetBreakdown(!showAssetBreakdown)}
                className="text-xs font-medium text-onion hover:text-onion-800 flex items-center space-x-0.5"
              >
                <span>Breakdown</span>
                <ChevronDown className={`w-3.5 h-3.5 transform transition-transform ${showAssetBreakdown ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Dropdown for Asset Breakdown per Chain & Blockchain */}
            {showAssetBreakdown && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="font-medium text-slate-800">USDC on Base (EVM)</span>
                  </div>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    ${baseUsdcBalance.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="font-medium text-slate-800">USDT on Solana (SVM)</span>
                  </div>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    ${solanaUsdtBalance.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span className="font-medium text-slate-500">EURC on Base (EVM)</span>
                  </div>
                  <span className="font-mono text-slate-400 tabular-nums">
                    ${asAmount(balances?.eurcBase?.balance).toFixed(2)}
                  </span>
                </div>

                <div className="pt-2 text-[10px] font-mono text-slate-400 truncate border-t border-slate-200">
                  Base wallet: {walletAddress || 'Not registered'}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsOffRampModalOpen(true)}
              disabled={!isSetupComplete}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-xs font-medium transition flex items-center justify-center space-x-1 disabled:opacity-50"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Convert AED</span>
            </button>
            <button
              onClick={() => setIsTransferModalOpen(true)}
              disabled={!isSetupComplete}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-xs font-medium transition flex items-center justify-center space-x-1 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Transfer</span>
            </button>
          </div>
        </div>

        {/* CARD 2: TOTAL SETTLEMENTS (LAST 30 DAYS) */}
        <div className="mat-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span className="flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Total Settlements (30D)</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Gross Inflow
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 font-mono tracking-tight mt-2 tabular-nums">
              ${total30dSettlements.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              AED liquidated: {metricValue(settlementBreakdown?.liquidatedToBankAed)} · Held: {metricValue(settlementBreakdown?.heldInCryptoUsdc, ' USDC')}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-slate-800 block text-xs">Settlement Preference</span>
              <span className="text-[10px] text-slate-400">
                {merchant.settlementMode === 'auto_offramp' ? 'Automatic off-ramp selected' : 'Hold as received'}
              </span>
            </div>
            <button
              onClick={() =>
                handleToggleSettlementMode(
                  merchant.settlementMode === 'auto_offramp' ? 'hold_as_received' : 'auto_offramp'
                )
              }
              disabled={!hasMerchantSession || apiBusy}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                merchant.settlementMode === 'auto_offramp' ? 'bg-onion' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-transform ${
                  merchant.settlementMode === 'auto_offramp' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* CARD 3: HOSTED PAYLINKS & CHECKOUT */}
        <div className="mat-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span className="flex items-center space-x-1.5">
                <CreditCard className="w-4 h-4 text-onion-700" />
                <span>Hosted Paylinks</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-onion-50 text-onion-800 border border-onion-200">
                Multi-Chain
              </span>
            </div>

            <div className="mt-2 space-y-1">
              <p className="text-2xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">
                {activePaylinkCount} <span className="text-xs font-normal text-slate-400">active links</span>
              </p>
              <p className="text-xs text-slate-500 font-medium">
                API-reported links
              </p>
            </div>

            <div className="mt-3 space-y-1 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Checkout Speed:</span>
                <span className="font-semibold text-slate-700 font-mono">{metricValue(checkoutMetrics?.avgCheckoutTimeSeconds, ' s')}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Success Rate:</span>
                <span className="font-semibold text-slate-900 font-mono">{metricValue(checkoutMetrics?.conversionRate)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsPaylinkModalOpen(true)}
              disabled={!isSetupComplete}
              className="w-full py-1.5 px-3 mat-btn-primary text-xs font-medium flex items-center justify-center space-x-1.5 shadow-xs disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Paylink</span>
            </button>
          </div>
        </div>
      </div>

      {/* METRICS & ANALYTICS DASHBOARD (Per Chain, Per Asset, Per Paylink) */}
      <div className="mat-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-onion-700" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Settlement Analytics & Metrics</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Backend-reported metrics</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Metric 1: By Blockchain */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-slate-600 font-semibold">
              <span className="flex items-center space-x-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Volume by Chain</span>
              </span>
              <span className="font-mono text-[11px] text-slate-500">{metricValue(100, '%')}</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Base (EVM):</span>
                <span className="font-semibold text-slate-900 font-mono">{metricValue(chainMetrics.base?.percentage, '%')} (${asAmount(chainMetrics.base?.volumeUsdc).toLocaleString()})</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                <div className="bg-blue-600 h-full" style={{ width: `${chainMetrics.base?.percentage || 0}%` }} />
                <div className="bg-purple-600 h-full" style={{ width: `${chainMetrics.solana?.percentage || 0}%` }} />
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Solana (SVM):</span>
                <span className="font-semibold text-slate-900 font-mono">{metricValue(chainMetrics.solana?.percentage, '%')} (${asAmount(chainMetrics.solana?.volumeUsdc).toLocaleString()})</span>
              </div>
            </div>
          </div>

          {/* Metric 2: By Asset */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-slate-600 font-semibold">
              <span className="flex items-center space-x-1">
                <PieChart className="w-3.5 h-3.5 text-onion-700" />
                <span>Volume by Asset</span>
              </span>
              <span className="font-mono text-[11px] text-slate-500">{Object.keys(assetMetrics).length} assets</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                <span className="text-slate-500">USDC:</span>
                <span className="font-semibold text-slate-800 font-mono">${asAmount(assetMetrics.USDC).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                <span className="text-slate-500">USDT:</span>
                <span className="font-semibold text-slate-800 font-mono">${asAmount(assetMetrics.USDT).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">EURC:</span>
                <span className="text-slate-400 font-mono">${asAmount(assetMetrics.EURC).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Metric 3: Paylink & Checkout Stats */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-slate-600 font-semibold">
              <span className="flex items-center space-x-1">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>Checkout Conversions</span>
              </span>
              <span className="font-mono text-[11px] text-emerald-700 font-bold">{metricValue(checkoutMetrics?.conversionRate)}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                <span className="text-slate-500">Active Paylinks:</span>
                <span className="font-semibold text-slate-800 font-mono">{activePaylinkCount}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                <span className="text-slate-500">Avg Settlement:</span>
                <span className="font-semibold text-slate-800 font-mono">${asAmount(checkoutMetrics?.avgSettlementUsdc).toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Checkout Speed:</span>
                <span className="font-semibold text-emerald-700 font-mono">{metricValue(checkoutMetrics?.avgCheckoutTimeSeconds, ' sec')}</span>
              </div>
            </div>
          </div>

          {/* Metric 4: Transfers & Off-Ramps */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-slate-600 font-semibold">
              <span className="flex items-center space-x-1">
                <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600" />
                <span>Transfers & Liquidations</span>
              </span>
              <span className="font-mono text-[11px] text-purple-700 font-bold">{metricValue(transferMetrics?.failedTransfers, ' failed')}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                <span className="text-slate-500">Transfer count:</span>
                <span className="font-semibold text-slate-800 font-mono">{metricValue(transferMetrics?.totalTransfersExecuted)}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                <span className="text-slate-500">Transferred volume:</span>
                <span className="font-semibold text-slate-800 font-mono">${asAmount(transferMetrics?.totalVolumeTransferredUsdc).toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">AED liquidated:</span>
                <span className="font-semibold text-slate-800 font-mono">AED {asAmount(settlementBreakdown?.liquidatedToBankAed).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PAYLINKS TABLE */}
      <div className="mat-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Active Paylinks</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hosted checkout links with built-in 3-wallet split settlement.
            </p>
          </div>
          <button
            onClick={() => setIsPaylinkModalOpen(true)}
            disabled={!isSetupComplete}
            className="mat-btn-primary px-3.5 py-2 text-xs font-medium flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Create Paylink</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="px-6 py-3 text-left">Title / Slug</th>
                <th className="px-6 py-3 text-left">Amount</th>
                <th className="px-6 py-3 text-left">Chains</th>
                <th className="px-6 py-3 text-left">Mode</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {visiblePaylinks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No active paylinks created yet.
                  </td>
                </tr>
              ) : (
                visiblePaylinks.map((link) => (
                  <tr key={link.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      <div>{link.title}</div>
                      <span className="font-mono text-[11px] text-slate-400">{link.slug}</span>
                    </td>
                    <td className="px-6 py-3.5 font-mono font-semibold text-slate-800 tabular-nums">
                      {link.amountType === 'fixed' ? `${link.amount?.toFixed(2)} ${link.currency}` : 'Customer Defined'}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex space-x-1">
                        {link.allowedChains.map((c) => (
                          <span
                            key={c}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 uppercase"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 capitalize">
                      {link.settlementMode.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}${link.checkoutUrl}`, link.id)}
                        className="px-2.5 py-1 rounded text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition"
                      >
                        {copiedId === link.id ? 'Copied!' : 'Copy Link'}
                      </button>
                      <button
                        onClick={() => onLaunchCheckout(link)}
                        className="px-2.5 py-1 rounded text-onion-800 hover:text-onion-900 bg-onion-50 border border-onion-200 transition font-medium"
                      >
                        Launch
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TRANSACTIONS TABLE (With Tri-Wallet Split Detail Viewer) */}
      <div className="mat-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Settlement Transactions</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any transaction to inspect the on-chain Tri-Wallet atomic fee split.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="px-6 py-3 text-left">Transaction ID</th>
                <th className="px-6 py-3 text-left">Type / Chain</th>
                <th className="px-6 py-3 text-left">Gross Amount</th>
                <th className="px-6 py-3 text-left">Net Merchant Payout</th>
                <th className="px-6 py-3 text-right">Atomic Split</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {visibleTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No transactions settled yet.
                  </td>
                </tr>
              ) : (
                visibleTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition cursor-pointer" onClick={() => setSelectedTxForSplit(tx)}>
                    <td className="px-6 py-3.5 font-mono text-slate-900">
                      <div>{tx.id}</div>
                      <span className="text-[10px] text-slate-400">{new Date(tx.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="capitalize text-slate-700 font-medium">{tx.type.replace(/_/g, ' ')}</span>
                      <div className="text-[10px] font-mono text-slate-400 uppercase mt-0.5">{tx.chain}</div>
                    </td>
                    <td className="px-6 py-3.5 font-mono font-semibold text-slate-900 tabular-nums">
                      ${tx.grossAmount.toFixed(2)} {tx.currency}
                    </td>
                    <td className="px-6 py-3.5 font-mono font-bold text-emerald-700 tabular-nums">
                      ${tx.netAmount.toFixed(2)} {tx.currency}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTxForSplit(tx)
                        }}
                        className="px-2.5 py-1 rounded bg-onion-50 text-onion-800 hover:bg-onion-100 border border-onion-200 text-xs font-medium transition"
                      >
                        View Split
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* STEP 2: MERCHANT KYB INFORMATION */}
      {/* ------------------------------------------------------------- */}
      {showKybModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between"><div><h3 className="font-bold text-sm">Submit company information for KYB</h3><p className="text-[11px] text-slate-400 mt-1">This submission is separate from Sumsub verification.</p></div><button onClick={() => setShowKybModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleSubmitKyb} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {([['companyName','Legal company name'],['registrationNumber','Company registration number'],['country','Country code (ISO 3166-1 alpha-3)'],['incorporatedOn','Incorporation date'],['type','Legal entity type'],['legalAddress','Registered legal address']] as const).map(([key,label])=><label key={key} className="font-semibold text-slate-700">{label}<input required type={key==='incorporatedOn'?'date':'text'} maxLength={key==='country'?3:undefined} value={kybData[key]} onChange={e=>setKybData({...kybData,[key]:key==='country'?e.target.value.toUpperCase():e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal" /></label>)}
              {([['registrationLocation','Registration location'],['email','Company email'],['phone','Company phone'],['taxId','Tax ID'],['website','Company website'],['postalAddress','Postal address'],['controlScheme','Ownership and control structure'],['applicantPosition','Applicant position']] as const).map(([key,label])=><label key={key} className="font-semibold text-slate-700">{label}<input value={kybData[key]} onChange={e=>setKybData({...kybData,[key]:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal" /></label>)}
              {apiError&&<p role="alert" className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-red-800">{apiError}</p>}
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2"><button type="button" onClick={()=>setShowKybModal(false)} className="px-4 py-2 rounded-lg border text-slate-700">Cancel</button><button disabled={apiBusy} type="submit" className="mat-btn-primary px-4 py-2 disabled:opacity-50">{apiBusy?'Submitting…':'Submit KYB information'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 1: REGULATORY NOTICE MODAL */}
      {/* ------------------------------------------------------------- */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm tracking-tight">Step 1 of 4: Regulatory Notice</h3>
              </div>
              <button onClick={() => setShowNoticeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="p-3.5 bg-onion-50 border border-onion-200 rounded-xl text-slate-800 space-y-2">
                <p className="font-semibold text-onion-900 text-sm">{notice?.title || 'Regulatory & Stablecoin Operations Disclosure'}</p>
                {notice?.sections?.map(section => <div key={section.heading} className="mt-2"><p className="font-semibold text-slate-800">{section.heading}</p><p className="text-[11px] text-slate-600 leading-relaxed">{section.content}</p></div>)}
              </div>

              <div className="space-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                <p>Review the disclosure above. Your company information is submitted for KYB after you acknowledge this notice.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-[11px] font-semibold text-slate-700">Authorised signatory name<input value={signatory.name} onChange={e=>setSignatory({...signatory,name:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal" required /></label>
                <label className="text-[11px] font-semibold text-slate-700">Signatory email<input type="email" value={signatory.email} onChange={e=>setSignatory({...signatory,email:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal" required /></label>
                <label className="text-[11px] font-semibold text-slate-700 sm:col-span-2">Signatory title<input value={signatory.title} onChange={e=>setSignatory({...signatory,title:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal" placeholder="e.g. Director" required /></label>
              </div>

              <button
                onClick={() => void handleAcknowledgeNotice()}
                disabled={apiBusy || !signatory.name || !signatory.email || !signatory.title}
                className="w-full mat-btn-primary py-3 text-xs font-semibold flex items-center justify-center space-x-2 shadow-sm mt-4"
              >
                <span>{apiBusy ? 'Recording acknowledgement…' : 'Acknowledge notice and continue'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 2: TERMS OF SERVICE (TOS ACCEPTANCE SCHEMA) */}
      {/* ------------------------------------------------------------- */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Lock className="w-5 h-5 text-onion-300" />
                <div>
                  <h3 className="font-bold text-sm tracking-tight">Step 2 of 4: Terms of Service Acceptance</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Entity: {termsData?.tos?.entityName || 'Loading legal entity'}</p>
                </div>
              </div>
              <button onClick={() => setShowTermsModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600 leading-relaxed">
              {/* Document Presentation (Step 2 - Present Documents) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Required Legal Documents
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">GET /merchant/terms · POST /tos/{termsData?.tos?.token ? 'token' : '…'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <a
                    href={termsData?.tos?.documentLinks?.tos || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-onion-700" />
                      <div>
                        <p className="font-semibold text-slate-800 text-xs">Terms of Service</p>
                        <p className="text-[10px] text-slate-400 font-mono">documentLinks.tos</p>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                  </a>

                  <a
                    href={termsData?.tos?.documentLinks?.privacyPolicy || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-slate-800 text-xs">Privacy Policy</p>
                        <p className="text-[10px] text-slate-400 font-mono">documentLinks.privacyPolicy</p>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                  </a>
                </div>
              </div>

              {/* 30-Day Locked Rate Disclosure */}
              <div className="p-3.5 bg-onion-50/50 border border-onion-200/80 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-slate-800">
                  <span className="font-semibold">Orki Protocol Fee:</span>
                  <span className="font-mono font-bold text-slate-900">{merchant.orkiFeeBps === undefined ? 'Not configured' : `${(merchant.orkiFeeBps / 100).toFixed(2)}%`}</span>
                </div>
                <div className="flex justify-between items-center text-slate-800">
                  <span className="font-semibold">PSP Markup:</span>
                  <span className="font-mono font-bold text-slate-900">{merchant.pspFeeBps === undefined ? 'Not configured' : `${(merchant.pspFeeBps / 100).toFixed(2)}%`}</span>
                </div>
                <p className="text-[10px] text-slate-500 pt-0.5">
                  Neither Orki nor your PSP holds your funds at any time. Settlements partition atomically on-chain.
                </p>
              </div>

              {/* Acceptance Checkbox */}
              <label className="flex items-start space-x-2.5 cursor-pointer p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={hasAgreedTos}
                  onChange={(e) => setHasAgreedTos(e.target.checked)}
                  className="mt-0.5 rounded text-onion focus:ring-onion"
                />
                <span className="text-[11px] text-slate-600 leading-snug">
                  I confirm that I have reviewed the Terms of Service and Privacy Policy issued by <strong>{termsData?.tos?.entityName || 'the entity named in the Terms'}</strong> and accept the settlement terms.
                </span>
              </label>

              {/* Two Options: Option B (Manual in Dashboard) & Option A (Hosted Page) */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => void handleAcceptTerms()}
                  disabled={!hasAgreedTos || apiBusy}
                  className="w-full mat-btn-primary py-3 text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50"
                >
                  <span>{apiBusy ? 'Recording acceptance…' : 'Accept terms and continue'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const token = termsData?.tos?.token
                    if (token) window.open(`/tos/${encodeURIComponent(token)}`, '_blank', 'width=620,height=720')
                  }}
                  disabled={!termsData?.tos?.token}
                  className="w-full py-2.5 px-3 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 rounded-xl text-xs font-medium text-slate-700 transition flex items-center justify-center space-x-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>Open Hosted Acceptance Page (Option A: Due / Orki Hosted)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TRANSACTION TRI-WALLET SPLIT DETAILS MODAL */}
      {/* ------------------------------------------------------------- */}
      {selectedTxForSplit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Layers className="w-5 h-5 text-onion-400" />
                <div>
                  <h3 className="font-bold text-sm tracking-tight">Recorded transaction fee breakdown</h3>
                  <p className="text-[10px] text-slate-400 font-mono">TX: {selectedTxForSplit.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTxForSplit(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500">Gross Payment</span>
                  <p className="text-xl font-bold text-slate-900 font-mono">
                    ${selectedTxForSplit.grossAmount.toFixed(2)} {selectedTxForSplit.currency}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-500">Chain Network</span>
                  <p className="text-xs font-bold text-slate-800 uppercase font-mono">{selectedTxForSplit.chain}</p>
                </div>
              </div>

              {/* 3-Way Atomic Breakdown */}
              <div className="space-y-2 pt-1">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Transaction record
                </h4>

                {/* Split 1: Merchant Net Proceeds */}
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-emerald-900">1. Merchant Settlement Wallet</span>
                    <span className="font-mono font-bold text-emerald-800 text-sm">
                      ${selectedTxForSplit.netAmount.toFixed(2)} USDC
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-emerald-700 break-all">
                    Destination: {merchant.merchantWallet || merchant.baseWalletAddress || 'Not registered'}
                  </p>
                </div>

                {/* Split 2: PSP Markup Cut */}
                <div className="p-3 bg-onion-50/60 border border-onion-200 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-onion-900">2. PSP Commission Wallet ({selectedTxForSplit.pspMarkupBps / 100}%)</span>
                    <span className="font-mono font-bold text-onion-800 text-sm">
                      ${selectedTxForSplit.pspMarkupAmount.toFixed(2)} USDC
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-onion-700 break-all">
                    Destination: {merchant.pspFeeWallet || 'Not registered'}
                  </p>
                </div>

                {/* Split 3: Orki Protocol Vault */}
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-800">3. Orki Protocol Fee Wallet ({(selectedTxForSplit.orkiFeeBps / 100).toFixed(2)}%)</span>
                    <span className="font-mono font-bold text-slate-800 text-sm">
                      ${selectedTxForSplit.orkiFeeAmount.toFixed(2)} USDC
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-slate-600 break-all">
                    Destination: {merchant.orkiFeeWallet || 'Not registered'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-500 break-all">
                TxHash: {selectedTxForSplit.txHash || 'Not available'}
              </div>

              <button
                onClick={() => setSelectedTxForSplit(null)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-medium text-xs transition"
              >
                Close Transaction Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPERATIONAL MODALS */}
      <CreatePaylinkModal
        isOpen={isPaylinkModalOpen}
        onClose={() => setIsPaylinkModalOpen(false)}
        onPaylinkCreated={(link) => { void handlePaylinkCreated(link) }}
        merchantDefaultSettlement={merchant.settlementMode}
      />

      <OffRampModal
        isOpen={isOffRampModalOpen}
        onClose={() => setIsOffRampModalOpen(false)}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />
    </div>
  )
}
