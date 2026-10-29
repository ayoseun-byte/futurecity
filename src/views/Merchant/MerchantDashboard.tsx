import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { Merchant, Paylink, SettlementMode, Transaction } from '../../types'
import { StatusBadge } from '../../components/StatusBadge'
import { resolveMonotonicStep } from '../../services/onboardingStepService'
import { CreatePaylinkModal } from './CreatePaylinkModal'
import { OffRampModal } from './OffRampModal'
import { TransferModal } from './TransferModal'
import { getApiConfig, requestApi, saveApiConfig, resolveMerchantSession } from '../../services/apiConfig'
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
  Building,
  CheckCircle2,
  RotateCcw,
  RotateCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Key,
  RefreshCw,
  AlertCircle,
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

function inferCountryCode(jurisdiction?: string): string {
  if (!jurisdiction) return 'ARE'
  const j = jurisdiction.trim().toUpperCase()
  if (
    j === 'ARE' ||
    j === 'AE' ||
    j.includes('DUBAI') ||
    j.includes('ABU DHABI') ||
    j.includes('DMCC') ||
    j.includes('DED') ||
    j.includes('ADGM') ||
    j.includes('IFZA') ||
    j.includes('DIFC') ||
    j.includes('UAE')
  ) {
    return 'ARE'
  }
  if (
    j === 'GBR' ||
    j === 'GB' ||
    j.includes('UK') ||
    j.includes('COMPANIES HOUSE') ||
    j.includes('UNITED KINGDOM') ||
    j.includes('LONDON')
  ) {
    return 'GBR'
  }
  if (
    j === 'NGA' ||
    j === 'NG' ||
    j.includes('NIGERIA') ||
    j.includes('LAGOS')
  ) {
    return 'NGA'
  }
  if (
    j === 'USA' ||
    j === 'US' ||
    j.includes('UNITED STATES') ||
    j.includes('DELAWARE')
  ) {
    return 'USA'
  }
  if (
    j === 'SGP' ||
    j === 'SG' ||
    j.includes('SINGAPORE')
  ) {
    return 'SGP'
  }
  if (/^[A-Z]{3}$/.test(j)) {
    return j
  }
  return 'ARE'
}

function inferEntityType(legalName?: string): string {
  if (!legalName) return 'Private Limited Company'
  const n = legalName.toUpperCase()
  if (n.includes('FZ-LLC') || n.includes('FZ LLC')) return 'Free Zone Limited Liability Company (FZ-LLC)'
  if (n.includes('FZCO') || n.includes('FZ-CO')) return 'Free Zone Company (FZCO)'
  if (n.includes('LLC')) return 'Limited Liability Company (LLC)'
  if (n.includes('PLC')) return 'Public Limited Company (PLC)'
  if (n.includes('LTD') || n.includes('LIMITED')) return 'Private Limited Company (Ltd)'
  if (n.includes('INC') || n.includes('CORP')) return 'Corporation (Inc)'
  return 'Private Limited Company'
}

function inferIncorporationDate(createdAt?: string): string {
  if (createdAt) {
    const candidate = createdAt.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
      return candidate
    }
  }
  return '2023-01-15'
}

function inferLegalAddress(jurisdiction?: string, country = 'ARE'): { legalAddress: string; postalAddress: string; phone: string } {
  const j = (jurisdiction || '').toUpperCase()
  if (country === 'ARE') {
    if (j.includes('DMCC')) {
      return {
        legalAddress: 'Almas Tower, Jumeirah Lakes Towers, Dubai, United Arab Emirates',
        postalAddress: 'P.O. Box 48800, Dubai, United Arab Emirates',
        phone: '+971 4 200 1234',
      }
    }
    if (j.includes('IFZA')) {
      return {
        legalAddress: 'Building A2, IFZA Business Park, DDP, Dubai, United Arab Emirates',
        postalAddress: 'P.O. Box 342001, Dubai, United Arab Emirates',
        phone: '+971 4 200 5678',
      }
    }
    if (j.includes('ADGM')) {
      return {
        legalAddress: 'Al Khatem Tower, ADGM Square, Al Maryah Island, Abu Dhabi, United Arab Emirates',
        postalAddress: 'P.O. Box 111999, Abu Dhabi, United Arab Emirates',
        phone: '+971 2 300 4567',
      }
    }
    if (j.includes('DIFC')) {
      return {
        legalAddress: 'Gate Precinct Building 4, DIFC, Dubai, United Arab Emirates',
        postalAddress: 'P.O. Box 74777, Dubai, United Arab Emirates',
        phone: '+971 4 362 7000',
      }
    }
    if (j.includes('ABU DHABI')) {
      return {
        legalAddress: 'Corniche Road, Al Danah, Abu Dhabi, United Arab Emirates',
        postalAddress: 'P.O. Box 2626, Abu Dhabi, United Arab Emirates',
        phone: '+971 2 400 1234',
      }
    }
    return {
      legalAddress: `${jurisdiction || 'Dubai DED'}, Business Bay, Dubai, United Arab Emirates`,
      postalAddress: 'P.O. Box 45001, Dubai, United Arab Emirates',
      phone: '+971 4 200 1234',
    }
  }
  if (country === 'GBR') {
    return {
      legalAddress: '100 Bishopsgate, London, EC2N 4AG, United Kingdom',
      postalAddress: 'PO Box 789, London, EC2N 4AG, United Kingdom',
      phone: '+44 20 7946 0912',
    }
  }
  if (country === 'NGA') {
    return {
      legalAddress: '1 Commercial Avenue, Victoria Island, Lagos, Nigeria',
      postalAddress: 'P.O. Box 1024, Marina, Lagos, Nigeria',
      phone: '+234 1 234 5678',
    }
  }
  if (country === 'USA') {
    return {
      legalAddress: '1209 North Orange Street, Wilmington, DE 19801, United States',
      postalAddress: 'PO Box 8740, Wilmington, DE 19899, United States',
      phone: '+1 212 555 0199',
    }
  }
  if (country === 'SGP') {
    return {
      legalAddress: '1 Marina Boulevard, #28-00, Singapore 018989',
      postalAddress: 'Robinson Road PO Box 1500, Singapore 902950',
      phone: '+65 6789 0123',
    }
  }
  return {
    legalAddress: `${jurisdiction || 'Registered Office'}, Corporate Suite 400`,
    postalAddress: 'P.O. Box 45001, Dubai, United Arab Emirates',
    phone: '+971 4 200 1234',
  }
}

function inferTaxId(tradeLicenseNumber?: string): string {
  const digits = (tradeLicenseNumber || '').replace(/\D/g, '')
  return `TRN-100${digits ? digits.padEnd(8, '0').slice(0, 8) : '23456780'}00003`
}

function inferWebsite(email?: string, legalName?: string): string {
  if (email && email.includes('@')) {
    const domain = email.split('@')[1]
    if (domain && domain.includes('.')) {
      return `https://www.${domain}`
    }
  }
  const slug = (legalName || 'merchant').toLowerCase().replace(/[^a-z0-9]/g, '')
  return `https://www.${slug || 'company'}.example`
}

function getPrefilledKybData(merchant: Merchant, applicantPosition = 'Managing Director') {
  const country = inferCountryCode(merchant.jurisdiction)
  const addressInfo = inferLegalAddress(merchant.jurisdiction, country)

  return {
    companyName: merchant.legalBusinessName || '',
    registrationNumber: merchant.tradeLicenseNumber || '',
    country,
    incorporatedOn: inferIncorporationDate(merchant.createdAt),
    type: inferEntityType(merchant.legalBusinessName),
    legalAddress: addressInfo.legalAddress,
    registrationLocation: merchant.jurisdiction || 'Dubai, United Arab Emirates',
    email: merchant.representativeEmail || '',
    phone: addressInfo.phone,
    taxId: inferTaxId(merchant.tradeLicenseNumber),
    website: inferWebsite(merchant.representativeEmail, merchant.legalBusinessName),
    postalAddress: addressInfo.postalAddress,
    controlScheme: '100% Ultimate Beneficial Ownership (Single Shareholder)',
    applicantPosition: applicantPosition || 'Managing Director',
  }
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
  const [copiedSessionKey, setCopiedSessionKey] = useState(false)
  const [isReissuingSession, setIsReissuingSession] = useState(false)
  const [reissueSuccess, setReissueSuccess] = useState<string | null>(null)
  const [reissueError, setReissueError] = useState<string | null>(null)
  const [isPspKeyPromptOpen, setIsPspKeyPromptOpen] = useState(false)
  const [inputPspKey, setInputPspKey] = useState('')
  const [showSessionSecret, setShowSessionSecret] = useState(false)
  const [sumsubUrl, setSumsubUrl] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
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
  const [termsData, setTermsData] = useState<{ tos?: { token?: string; entityName?: string; status?: string; documentLinks?: { tos?: string; privacyPolicy?: string } }; title?: string; clauses?: string[] } | null>(null)
  const [signatory, setSignatory] = useState({
    name: merchant.representativeName || '',
    email: merchant.representativeEmail || '',
    title: 'Managing Director',
  })
  const [kybData, setKybData] = useState(() => getPrefilledKybData(merchant, 'Managing Director'))

  // Synchronize prefill when representative data updates from props
  useEffect(() => {
    setSignatory((prev) => {
      const repName = merchant.representativeName || ''
      const repEmail = merchant.representativeEmail || ''
      const name = prev.name || repName
      const email = prev.email || repEmail
      if (prev.name === name && prev.email === email) return prev
      return { ...prev, name, email }
    })
  }, [merchant.representativeName, merchant.representativeEmail])

  const openKybModal = () => {
    setKybData((prev) => {
      const prefill = getPrefilledKybData(merchant, signatory.title || 'Managing Director')
      return {
        companyName: prev.companyName || prefill.companyName,
        registrationNumber: prev.registrationNumber || prefill.registrationNumber,
        country: prev.country || prefill.country,
        incorporatedOn: prev.incorporatedOn || prefill.incorporatedOn,
        type: prev.type || prefill.type,
        legalAddress: prev.legalAddress || prefill.legalAddress,
        registrationLocation: prev.registrationLocation || prefill.registrationLocation,
        email: prev.email || prefill.email,
        phone: prev.phone || prefill.phone,
        taxId: prev.taxId || prefill.taxId,
        website: prev.website || prefill.website,
        postalAddress: prev.postalAddress || prefill.postalAddress,
        controlScheme: prev.controlScheme || prefill.controlScheme,
        applicantPosition: prev.applicantPosition || prefill.applicantPosition,
      }
    })
    setShowKybModal(true)
  }

  const resetKybToPrefill = () => {
    setKybData(getPrefilledKybData(merchant, signatory.title || 'Managing Director'))
  }
  const merchantApiConfig = useCallback(() => {
    const config = getApiConfig()
    const cachedForMerchant = sessionStorage.getItem(`orki_merchant_session:${merchant.externalId}`)
    const resolved =
      (cachedForMerchant && cachedForMerchant.startsWith('onb_sec_') ? cachedForMerchant : null) ||
      resolveMerchantSession(config)

    return resolved ? { ...config, merchantSession: resolved } : config
  }, [merchant.externalId])

  const ensureMerchantSession = useCallback(async (forceRefresh = false): Promise<ReturnType<typeof getApiConfig>> => {
    const activeConfig = merchantApiConfig()
    const expiryStr = sessionStorage.getItem(`orki_merchant_session_expiry:${merchant.externalId}`)
    const isExpired = expiryStr ? new Date(expiryStr) <= new Date() : false

    if (!forceRefresh && !isExpired && activeConfig.merchantSession && activeConfig.merchantSession.startsWith('onb_sec_')) {
      return activeConfig
    }
    const baseConfig = getApiConfig()
    if (!baseConfig.pspKey) {
      if (activeConfig.merchantSession) return activeConfig
      throw new Error('A PSP API key or active merchant session is required to initiate onboarding.')
    }
    const session = await requestApi<{ clientSecret: string; expiresAt?: string }>(baseConfig, 'POST', '/api/v1/psp/merchant-onboarding-sessions', {
      merchantExternalId: merchant.externalId,
      legalBusinessName: merchant.legalBusinessName,
      tradeLicenseNumber: merchant.tradeLicenseNumber,
      jurisdiction: merchant.jurisdiction,
      representativeName: merchant.representativeName,
      representativeEmail: merchant.representativeEmail,
      returnUrl: `${window.location.origin}/merchant`,
      ttlMinutes: 120,
    }, 'psp')

    const newConfig = { ...baseConfig, merchantSession: session.clientSecret }
    saveApiConfig(newConfig)
    sessionStorage.setItem(`orki_merchant_session:${merchant.externalId}`, session.clientSecret)
    sessionStorage.setItem('orki_active_merchant_session', session.clientSecret)
    if (session.expiresAt) {
      sessionStorage.setItem(`orki_merchant_session_expiry:${merchant.externalId}`, session.expiresAt)
    }
    return newConfig
  }, [
    merchant.externalId,
    merchant.legalBusinessName,
    merchant.tradeLicenseNumber,
    merchant.jurisdiction,
    merchant.representativeName,
    merchant.representativeEmail,
    merchantApiConfig,
  ])

  const handleReissueMerchantSession = async (providedPspKey?: string) => {
    setIsReissuingSession(true)
    setReissueError(null)
    setReissueSuccess(null)
    try {
      const activeConfig = merchantApiConfig()
      const baseConfig = getApiConfig()
      const effectivePspKey = providedPspKey || baseConfig.pspKey

      // 1. Direct merchant reissue endpoint if an active session key exists
      if (activeConfig.merchantSession && activeConfig.merchantSession.startsWith('onb_sec_')) {
        try {
          const freshSession = await requestApi<{ clientSecret: string; expiresAt?: string }>(
            activeConfig,
            'POST',
            '/api/v1/merchant/session/reissue',
            { ttlMinutes: 120 },
            'merchant'
          )
          const newConfig = { ...baseConfig, merchantSession: freshSession.clientSecret }
          saveApiConfig(newConfig)
          sessionStorage.setItem(`orki_merchant_session:${merchant.externalId}`, freshSession.clientSecret)
          sessionStorage.setItem('orki_active_merchant_session', freshSession.clientSecret)
          if (freshSession.expiresAt) {
            sessionStorage.setItem(`orki_merchant_session_expiry:${merchant.externalId}`, freshSession.expiresAt)
          }
          setReissueSuccess('Merchant onboarding session key successfully reissued!')
          setIsPspKeyPromptOpen(false)
          setTimeout(() => setReissueSuccess(null), 5000)
          return
        } catch {
          // If merchant session is already invalid/expired, fall back to PSP route
        }
      }

      // 2. Reissue via PSP endpoint if PSP key is provided or already saved
      if (effectivePspKey) {
        const pspConfig = { ...baseConfig, pspKey: effectivePspKey }
        saveApiConfig(pspConfig)

        let freshSession: { clientSecret: string; expiresAt?: string }
        if (merchant.id && merchant.id.startsWith('mrch_')) {
          try {
            freshSession = await requestApi<{ clientSecret: string; expiresAt?: string }>(
              pspConfig,
              'POST',
              `/api/v1/psp/merchants/${encodeURIComponent(merchant.id)}/onboarding-sessions`,
              { returnUrl: `${window.location.origin}/merchant`, ttlMinutes: 120 },
              'psp'
            )
          } catch {
            freshSession = await requestApi<{ clientSecret: string; expiresAt?: string }>(
              pspConfig,
              'POST',
              '/api/v1/psp/merchant-onboarding-sessions',
              {
                merchantExternalId: merchant.externalId,
                legalBusinessName: merchant.legalBusinessName,
                tradeLicenseNumber: merchant.tradeLicenseNumber,
                jurisdiction: merchant.jurisdiction,
                representativeName: merchant.representativeName,
                representativeEmail: merchant.representativeEmail,
                returnUrl: `${window.location.origin}/merchant`,
                ttlMinutes: 120,
              },
              'psp'
            )
          }
        } else {
          freshSession = await requestApi<{ clientSecret: string; expiresAt?: string }>(
            pspConfig,
            'POST',
            '/api/v1/psp/merchant-onboarding-sessions',
            {
              merchantExternalId: merchant.externalId,
              legalBusinessName: merchant.legalBusinessName,
              tradeLicenseNumber: merchant.tradeLicenseNumber,
              jurisdiction: merchant.jurisdiction,
              representativeName: merchant.representativeName,
              representativeEmail: merchant.representativeEmail,
              returnUrl: `${window.location.origin}/merchant`,
              ttlMinutes: 120,
            },
            'psp'
          )
        }

        const newConfig = { ...pspConfig, merchantSession: freshSession.clientSecret }
        saveApiConfig(newConfig)
        sessionStorage.setItem(`orki_merchant_session:${merchant.externalId}`, freshSession.clientSecret)
        sessionStorage.setItem('orki_active_merchant_session', freshSession.clientSecret)
        if (freshSession.expiresAt) {
          sessionStorage.setItem(`orki_merchant_session_expiry:${merchant.externalId}`, freshSession.expiresAt)
        }
        setReissueSuccess('Merchant onboarding session key successfully reissued!')
        setIsPspKeyPromptOpen(false)
        setTimeout(() => setReissueSuccess(null), 5000)
        return
      }

      // 3. Prompt user for PSP API Key to reissue if missing
      setIsPspKeyPromptOpen(true)
    } catch (err) {
      setReissueError(err instanceof Error ? err.message : 'Failed to reissue merchant session key.')
      setTimeout(() => setReissueError(null), 6000)
    } finally {
      setIsReissuingSession(false)
    }
  }

  const hasMerchantSession = Boolean(merchantApiConfig().merchantSession)
  const visiblePaylinks = hasMerchantSession ? dashboardPaylinks : []
  const visibleTransactions = hasMerchantSession ? dashboardTransactions : []
  const asAmount = useCallback((value: string | number | undefined): number => {
    const amount = Number(value ?? 0)
    return Number.isFinite(amount) ? amount : 0
  }, [])

  // Derive the active onboarding step monotonically so the UI auto-continues from the exact current step
  // and CANNOT be taken back to any earlier completed step unless enforced by Orki admin
  const derivedStep = resolveMonotonicStep(merchant, merchant.nextStep)

  const isSetupComplete = (merchant.status?.toUpperCase() === 'ACTIVE') && !derivedStep
  const [hasAgreedTos, setHasAgreedTos] = useState(false)

  // Browser messages are navigation hints only; backend state is authoritative.
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'ORKI_TOS_ACCEPTED') {
        const incomingId = event.data?.merchantId
        if (!incomingId || incomingId === merchant.id || incomingId === merchant.externalId) {
          onUpdateMerchant({
            termsAcceptedAt: new Date().toISOString(),
            status: 'terms_accepted',
            nextStep: 'SUMSUB',
          })
          setShowTermsModal(false)
        }
      }
    }
    window.addEventListener('message', handleWindowMessage)
    return () => window.removeEventListener('message', handleWindowMessage)
  }, [merchant.id, merchant.externalId, onUpdateMerchant])

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
      onUpdateMerchant({ nextStep: resolveMonotonicStep(merchant, 'NOTICE') })
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
      const config = await ensureMerchantSession()
      const value = await requestApi<typeof notice>(config, 'GET', '/api/v1/merchant/notice', undefined, 'merchant')
      setNotice(value)
      setShowNoticeModal(true)
    } catch (reason) { setApiError(reason instanceof Error ? reason.message : 'Could not load regulatory notice.') }
    finally { setApiBusy(false) }
  }

  const handleOpenTerms = async () => {
    setApiBusy(true); setApiError(null)
    try {
      const config = await ensureMerchantSession()
      const value = await requestApi<typeof termsData>(config, 'GET', '/api/v1/merchant/terms', undefined, 'merchant')
      setTermsData(value)
      setShowTermsModal(true)
    } catch (reason) { setApiError(reason instanceof Error ? reason.message : 'Could not load terms.') }
    finally { setApiBusy(false) }
  }

  const handleAcknowledgeNotice = async () => {
    setApiBusy(true)
    setApiError(null)
    try {
      const config = await ensureMerchantSession()
      await requestApi(config, 'POST', '/api/v1/merchant/notice/acknowledge', {
        isAuthorisedSignatory: true,
        signatoryName: signatory.name,
        signatoryEmail: signatory.email,
        signatoryTitle: signatory.title,
      }, 'merchant')
      onUpdateMerchant({ noticeAcknowledgedAt: new Date().toISOString(), nextStep: resolveMonotonicStep(merchant, 'KYB_INFORMATION') })
      setShowNoticeModal(false)
      openKybModal()
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
      const config = await ensureMerchantSession()
      await requestApi(config, 'POST', '/api/v1/merchant/kyb-information', { companyInfo: kybData }, 'merchant')
      const fetchedTerms = await requestApi<typeof termsData>(config, 'GET', '/api/v1/merchant/terms', undefined, 'merchant')
      setTermsData(fetchedTerms)
      onUpdateMerchant({ kybInformationSubmittedAt: new Date().toISOString(), nextStep: resolveMonotonicStep(merchant, 'TERMS') })
      setShowKybModal(false)
      setShowTermsModal(true)
    } catch (reason) {
      setApiError(reason instanceof Error ? reason.message : 'Could not submit KYB information.')
    } finally {
      setApiBusy(false)
    }
  }

  const handleAcceptTerms = async () => {
    // If terms were already accepted on backend, advance directly
    if (merchant.termsAcceptedAt || termsData?.tos?.status === 'accepted') {
      onUpdateMerchant({ termsAcceptedAt: merchant.termsAcceptedAt || new Date().toISOString(), status: 'terms_accepted', nextStep: resolveMonotonicStep(merchant, 'SUMSUB') })
      setShowTermsModal(false)
      return
    }

    const token = termsData?.tos?.token
    if (!token) {
      setApiError('The backend did not return an active terms acceptance token. Please close and reopen to reload.')
      return
    }

    const signerName = (signatory.name || merchant.representativeName || '').trim()
    const signerEmail = (signatory.email || merchant.representativeEmail || '').trim()
    const signerTitle = (signatory.title || 'Managing Director').trim()

    if (!signerName || !signerEmail) {
      setApiError('Please fill in both the Authorised Signatory Name and Email address below.')
      return
    }

    setApiBusy(true)
    setApiError(null)
    try {
      const baseConfig = getApiConfig()
      await requestApi(baseConfig, 'POST', `/api/v1/tos/${encodeURIComponent(token)}`, {
        signerName,
        signerEmail,
        signerTitle,
        isAuthorisedSignatory: true,
      }, 'none')

      onUpdateMerchant({ termsAcceptedAt: new Date().toISOString(), status: 'terms_accepted', nextStep: resolveMonotonicStep(merchant, 'SUMSUB') })
      setShowTermsModal(false)
    } catch (reason) {
      const msg = reason instanceof Error ? reason.message : 'Could not record terms acceptance.'
      if (msg.includes('already been accepted') || msg.includes('already accepted')) {
        onUpdateMerchant({ termsAcceptedAt: new Date().toISOString(), status: 'terms_accepted', nextStep: resolveMonotonicStep(merchant, 'SUMSUB') })
        setShowTermsModal(false)
      } else {
        setApiError(msg)
      }
    } finally {
      setApiBusy(false)
    }
  }

  const handleOpenSumsubTab = async () => {
    // Open a temporary tab with an informative loading UI rather than a raw about:blank
    const tab = window.open('', '_blank')
    if (tab) {
      try {
        tab.document.title = 'Preparing Verification | Orki'
        tab.document.body.style.margin = '0'
        tab.document.body.style.fontFamily = 'system-ui, -apple-system, sans-serif'
        tab.document.body.style.backgroundColor = '#f8fafc'
        tab.document.body.style.display = 'flex'
        tab.document.body.style.alignItems = 'center'
        tab.document.body.style.justifyContent = 'center'
        tab.document.body.style.height = '100vh'
        tab.document.body.innerHTML = `
          <div style="text-align: center; max-width: 440px; padding: 32px; background: white; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <div style="width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #0f172a; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
            <h2 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 8px;">Connecting to SumSub...</h2>
            <p style="font-size: 13px; color: #64748b; margin: 0;">Generating your secure identity verification session. You will be redirected momentarily.</p>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
          </div>
        `
      } catch {
        // Fallback if browser security denies document manipulation
      }
    }

    setApiBusy(true)
    setApiError(null)
    try {
      // Ensure we have a fresh, non-expired merchant session token
      const config = await ensureMerchantSession()
      const result = await requestApi<{ url: string }>(config, 'GET', '/api/v1/merchant/kyc/start', undefined, 'merchant')
      if (!result.url) throw new Error('The backend did not return the Sumsub hosted URL.')

      setSumsubUrl(result.url)

      if (tab && !tab.closed) {
        tab.location.replace(result.url)
      } else {
        window.open(result.url, '_blank', 'noopener,noreferrer')
      }
    } catch (reason) {
      const errorMsg = reason instanceof Error ? reason.message : 'Could not start Sumsub verification.'
      setApiError(errorMsg)

      if (tab && !tab.closed) {
        try {
          tab.document.title = 'Verification Setup Error | Orki'
          tab.document.body.innerHTML = `
            <div style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; padding: 16px;">
              <div style="max-width: 520px; width: 100%; padding: 32px; background: white; border-radius: 16px; border: 1px solid #fecdd3; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); text-align: center;">
                <div style="width: 48px; height: 48px; border-radius: 12px; background: #fff1f2; color: #e11d48; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px; font-weight: bold;">!</div>
                <h2 style="font-size: 18px; font-weight: 700; color: #9f1239; margin: 0 0 10px;">SumSub Verification Could Not Start</h2>
                <p style="font-size: 13px; color: #475569; line-height: 1.5; margin: 0 0 20px;">${errorMsg}</p>
                <div style="font-size: 12px; color: #475569; background: #f8fafc; padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0; text-align: left; margin-bottom: 20px;">
                  <strong style="color: #0f172a;">Render Backend Environment Checklist:</strong>
                  <ul style="margin: 8px 0 0; padding-left: 18px; line-height: 1.6;">
                    <li><code>SUMSUB_APP_TOKEN</code> — SumSub App Token (starts with <code>sbx:</code> or <code>prd:</code>)</li>
                    <li><code>SUMSUB_SECRET_KEY</code> — SumSub Secret Key</li>
                    <li><code>SUMSUB_LEVEL_NAME</code> — Must match the exact Level Name configured in your SumSub dashboard (e.g. <code>basic-kyc-level</code>)</li>
                    <li><code>SUMSUB_BASE_URL</code> — Default: <code>https://api.sumsub.com</code></li>
                  </ul>
                </div>
                <button onclick="window.close()" style="background: #0f172a; color: white; border: none; padding: 10px 20px; font-size: 13px; font-weight: 600; border-radius: 8px; cursor: pointer;">Close Window</button>
              </div>
            </div>
          `
        } catch {
          tab.close()
        }
      }
    } finally {
      setApiBusy(false)
    }
  }

  const merchantRef = useRef(merchant)
  merchantRef.current = merchant

  const isRefreshingRef = useRef(false)
  const isDataRefreshingRef = useRef(false)

  const refreshDashboardData = useCallback(async () => {
    if (isDataRefreshingRef.current) return
    const config = merchantApiConfig()
    if (!config.merchantSession) return

    isDataRefreshingRef.current = true
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
        status: transaction.status?.toLowerCase() === 'completed' ? 'completed' : 'pending',
        createdAt: transaction.created_at,
      })))
      setDashboardDataLoaded(true)
    } catch (reason) {
      setApiError(reason instanceof Error ? reason.message : 'Could not load merchant dashboard data.')
    } finally {
      isDataRefreshingRef.current = false
    }
  }, [asAmount, merchantApiConfig])

  useEffect(() => {
    let active = true

    const refresh = async () => {
      if (document.hidden || isRefreshingRef.current) return
      isRefreshingRef.current = true
      try {
        let config = merchantApiConfig()
        if (!config.merchantSession) {
          try {
            config = await ensureMerchantSession()
          } catch {
            // Cannot auto-resolve session yet, fallback to local derivedStep
          }
        }
        if (!config.merchantSession || !active) return

        const state = await requestApi<{
          status: string
          statusReason?: string | null
          nextStep?: string | null
          noticeAcknowledgedAt?: string | null
          kybInformationSubmittedAt?: string | null
          termsAcceptedAt?: string | null
          sumsubCompletedAt?: string | null
          verifiedAt?: string | null
          passkeyRegisteredAt?: string | null
          settlementMode?: SettlementMode
          orkiFeeBps?: number
          pspFeeBps?: number
          orkiFeeWallet?: string | null
          pspFeeWallet?: string | null
          merchantWallet?: string | null
        }>(config, 'GET', '/api/v1/merchant/onboarding', undefined, 'merchant')

        if (!active) return

        const current = merchantRef.current
        const updates: Partial<Merchant> = {}

        if (state.status && state.status !== current.status) {
          updates.status = state.status as Merchant['status']
        }
        if (state.statusReason !== undefined && (state.statusReason || undefined) !== current.statusReason) {
          updates.statusReason = state.statusReason || undefined
        }
        if (state.nextStep !== undefined) {
          const candidate = {
            ...current,
            noticeAcknowledgedAt: state.noticeAcknowledgedAt || current.noticeAcknowledgedAt,
            kybInformationSubmittedAt: state.kybInformationSubmittedAt || current.kybInformationSubmittedAt,
            termsAcceptedAt: state.termsAcceptedAt || current.termsAcceptedAt,
            sumsubCompletedAt: state.sumsubCompletedAt || current.sumsubCompletedAt,
            verifiedAt: state.verifiedAt || current.verifiedAt,
            passkeyRegisteredAt: state.passkeyRegisteredAt || current.passkeyRegisteredAt,
            status: (state.status as Merchant['status']) || current.status,
          }
          const monotonic = resolveMonotonicStep(candidate, state.nextStep)
          if ((monotonic || undefined) !== current.nextStep) {
            updates.nextStep = monotonic as Merchant['nextStep']
          }
        }
        if (state.noticeAcknowledgedAt && state.noticeAcknowledgedAt !== current.noticeAcknowledgedAt) {
          updates.noticeAcknowledgedAt = state.noticeAcknowledgedAt
        }
        if (state.kybInformationSubmittedAt && state.kybInformationSubmittedAt !== current.kybInformationSubmittedAt) {
          updates.kybInformationSubmittedAt = state.kybInformationSubmittedAt
        }
        if (state.termsAcceptedAt && state.termsAcceptedAt !== current.termsAcceptedAt) {
          updates.termsAcceptedAt = state.termsAcceptedAt
        }
        if (state.sumsubCompletedAt && state.sumsubCompletedAt !== current.sumsubCompletedAt) {
          updates.sumsubCompletedAt = state.sumsubCompletedAt
        }
        if (state.verifiedAt && state.verifiedAt !== current.verifiedAt) {
          updates.verifiedAt = state.verifiedAt
        }
        if (state.passkeyRegisteredAt && state.passkeyRegisteredAt !== current.passkeyRegisteredAt) {
          updates.passkeyRegisteredAt = state.passkeyRegisteredAt
        }
        if (state.settlementMode && state.settlementMode !== current.settlementMode) {
          updates.settlementMode = state.settlementMode
        }
        if (state.orkiFeeBps !== undefined && state.orkiFeeBps !== current.orkiFeeBps) {
          updates.orkiFeeBps = state.orkiFeeBps
        }
        if (state.pspFeeBps !== undefined && state.pspFeeBps !== current.pspFeeBps) {
          updates.pspFeeBps = state.pspFeeBps
        }
        if (state.orkiFeeWallet !== undefined && (state.orkiFeeWallet || undefined) !== current.orkiFeeWallet) {
          updates.orkiFeeWallet = state.orkiFeeWallet || undefined
        }
        if (state.pspFeeWallet !== undefined && (state.pspFeeWallet || undefined) !== current.pspFeeWallet) {
          updates.pspFeeWallet = state.pspFeeWallet || undefined
        }
        if (state.merchantWallet !== undefined && (state.merchantWallet || undefined) !== current.merchantWallet) {
          updates.merchantWallet = state.merchantWallet || undefined
        }

        if (Object.keys(updates).length > 0) {
          onUpdateMerchant(updates)
        }
      } catch (reason) {
        const msg = reason instanceof Error ? reason.message : ''
        if (msg.includes('expired') || msg.includes('merchant_session_required')) {
          sessionStorage.removeItem(`orki_merchant_session:${merchant.externalId}`)
          sessionStorage.removeItem(`orki_merchant_session_expiry:${merchant.externalId}`)
        }
        if (active) setApiError(reason instanceof Error ? reason.message : 'Could not refresh onboarding status.')
      } finally {
        isRefreshingRef.current = false
      }
    }

    void refresh()
    void refreshDashboardData()

    // 30s interval for onboarding status check, 60s for general dashboard metrics
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh()
    }, 30000)

    const dataTimer = window.setInterval(() => {
      if (!document.hidden) void refreshDashboardData()
    }, 60000)

    const handleFocus = () => {
      if (!document.hidden) {
        void refresh()
        void refreshDashboardData()
      }
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      active = false
      window.clearInterval(timer)
      window.clearInterval(dataTimer)
      window.removeEventListener('focus', handleFocus)
    }
  }, [merchant.id, merchant.externalId, merchantApiConfig, onUpdateMerchant, refreshDashboardData])

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
  const activePaylinkCount = visiblePaylinks.filter((link) => (link.status || '').toLowerCase() === 'active').length
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
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Key className="w-3 h-3 text-slate-400" /> Session Key:
              </span>
              {merchantApiConfig().merchantSession ? (
                <>
                  <code className="text-[11px] font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {merchantApiConfig().merchantSession.slice(0, 16)}…
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(merchantApiConfig().merchantSession)
                      setCopiedSessionKey(true)
                      setTimeout(() => setCopiedSessionKey(false), 2000)
                    }}
                    className="px-2 py-0.5 text-slate-600 hover:text-slate-900 rounded bg-white hover:bg-slate-50 border border-slate-200 transition inline-flex items-center gap-1 text-[11px] font-medium shadow-2xs"
                    title="Copy active merchant onboarding session key (onb_sec_...)"
                  >
                    {copiedSessionKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSessionKey ? 'Copied Key!' : 'Copy Key'}</span>
                  </button>
                </>
              ) : (
                <span className="text-[11px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  No active session key
                </span>
              )}

              <button
                type="button"
                onClick={() => void handleReissueMerchantSession()}
                disabled={isReissuingSession}
                className="px-2.5 py-0.5 text-onion-800 hover:text-white hover:bg-onion rounded bg-onion-50 border border-onion-200 transition inline-flex items-center gap-1 text-[11px] font-bold shadow-2xs disabled:opacity-50"
                title="Reissue a fresh single-merchant onboarding session token"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isReissuingSession ? 'animate-spin' : ''}`} />
                <span>{isReissuingSession ? 'Reissuing…' : 'Reissue Session Key'}</span>
              </button>
            </div>

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
          {derivedStep === 'OPT_IN' && (
            <button
              onClick={() => void handleStartOptIn()}
              disabled={apiBusy}
              className="mat-btn-primary px-3 py-1.5 text-xs font-medium ml-2 shadow-xs"
            >
              Accept USDC
            </button>
          )}
          {derivedStep === 'NOTICE' && (
            <button
              onClick={() => void handleOpenNotice()}
              disabled={apiBusy}
              className="mat-btn-primary px-3 py-1.5 text-xs font-medium ml-2 shadow-xs"
            >
              Review Notice
            </button>
          )}
          {derivedStep === 'KYB_INFORMATION' && (
            <button
              onClick={openKybModal}
              disabled={apiBusy}
              className="mat-btn-primary px-3 py-1.5 text-xs font-medium ml-2 shadow-xs"
            >
              Submit KYB
            </button>
          )}
          {derivedStep === 'TERMS' && (
            <button
              onClick={() => void handleOpenTerms()}
              disabled={apiBusy}
              className="mat-btn-primary px-3 py-1.5 text-xs font-medium ml-2 shadow-xs"
            >
              Review Terms
            </button>
          )}
          {(derivedStep === 'SUMSUB' || derivedStep === 'BUSINESS_VERIFICATION') && (
            <button
              onClick={handleOpenSumsubTab}
              disabled={apiBusy}
              className="mat-btn-primary px-3 py-1.5 text-xs font-medium ml-2 shadow-xs"
            >
              Verify Business
            </button>
          )}
          {derivedStep === 'PASSKEY' && (
            <a
              href={`/setup${merchantApiConfig().merchantSession ? `#session=${encodeURIComponent(merchantApiConfig().merchantSession)}` : ''}`}
              className="mat-btn-primary px-3 py-1.5 text-xs font-medium ml-2 shadow-xs inline-flex items-center"
            >
              Setup Wallets
            </a>
          )}
        </div>
      </div>

      {/* Session Action Alerts */}
      {reissueSuccess && (
        <div className="mat-card p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{reissueSuccess}</span>
          </div>
          <span className="font-mono text-[11px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200">
            {merchantApiConfig().merchantSession.slice(0, 20)}…
          </span>
        </div>
      )}

      {reissueError && (
        <div className="mat-card p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{reissueError}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsPspKeyPromptOpen(true)}
            className="text-[11px] font-bold underline hover:text-rose-950"
          >
            Configure PSP Key
          </button>
        </div>
      )}

      {/* Active Merchant Onboarding Session Credentials Bar */}
      {merchantApiConfig().merchantSession && (
        <div className="mat-card p-4 sm:p-5 border border-slate-200 bg-white space-y-3 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-onion" />
              Active Merchant Onboarding Session Key (Single-Merchant Bearer Token):
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleReissueMerchantSession()}
                disabled={isReissuingSession}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isReissuingSession ? 'animate-spin' : ''}`} />
                <span>{isReissuingSession ? 'Reissuing…' : 'Reissue Key'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showSessionSecret ? 'text' : 'password'}
                readOnly
                value={merchantApiConfig().merchantSession}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono text-slate-900 select-all pr-10 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowSessionSecret(!showSessionSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showSessionSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(merchantApiConfig().merchantSession)
                setCopiedSessionKey(true)
                setTimeout(() => setCopiedSessionKey(false), 2000)
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0 shadow-xs"
            >
              {copiedSessionKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSessionKey ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}

      {/* GUIDED ONBOARDING STEPPER HERO (If not yet complete) */}
      {!isSetupComplete && (
        <div className="mat-card p-6 border-l-4 border-l-onion bg-gradient-to-r from-onion-50/40 via-white to-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-onion-800 bg-onion-100/80 px-2.5 py-0.5 rounded-md">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next Step: {derivedStep || 'ACTIVE'}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight pt-1">
                Complete Your USDC Merchant Activation
              </h2>
              <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                Walk through the steps to accept USDC: review the regulatory notice, accept the current terms, complete Sumsub KYB verification, and provision your non-custodial ZeroDev & Web3Auth wallets with Passkey MFA.
              </p>
            </div>

            {/* Contextual Action Button based on current nextStep */}
            <div>
              {derivedStep === 'OPT_IN' && (
                <button
                  onClick={() => void handleStartOptIn()}
                  disabled={apiBusy}
                  className="mat-btn-primary px-5 py-2.5 text-xs font-semibold flex items-center space-x-2 shadow-sm"
                >
                  <span>{apiBusy ? 'Starting secure onboarding…' : 'Accept USDC Payments'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {derivedStep === 'NOTICE' && (
                <button
                  onClick={() => void handleOpenNotice()}
                  className="mat-btn-primary px-5 py-2.5 text-xs font-semibold flex items-center space-x-2 shadow-sm"
                >
                  <span>Read Regulatory Notice</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {derivedStep === 'KYB_INFORMATION' && (
                <button onClick={openKybModal} className="mat-btn-primary px-5 py-2.5 text-xs font-semibold flex items-center space-x-2 shadow-sm"><span>Submit KYB Information</span><ChevronRight className="w-4 h-4" /></button>
              )}
              {derivedStep === 'TERMS' && (
                <button
                  onClick={() => void handleOpenTerms()}
                  className="mat-btn-primary px-5 py-2.5 text-xs font-semibold flex items-center space-x-2 shadow-sm"
                >
                  <span>Accept Terms & Fee Split</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {(derivedStep === 'SUMSUB' || derivedStep === 'BUSINESS_VERIFICATION') && (
                <div className="space-y-2">
                  <button
                    onClick={handleOpenSumsubTab}
                    disabled={apiBusy}
                    className="mat-btn-primary px-5 py-2.5 text-xs font-semibold flex items-center space-x-2 shadow-sm disabled:opacity-50"
                  >
                    {apiBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    <span>{apiBusy ? 'Connecting to Verification Rail…' : 'Open Business Verification (New Tab)'}</span>
                  </button>
                  {sumsubUrl && (
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <a
                        href={sumsubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-onion font-bold hover:underline inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Direct Verification Link
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(sumsubUrl)
                          setCopiedField('sumsubUrl')
                          setTimeout(() => setCopiedField(null), 2000)
                        }}
                        className="text-[11px] text-slate-500 hover:text-slate-700 underline"
                      >
                        {copiedField === 'sumsubUrl' ? 'Copied Link!' : 'Copy Link'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {derivedStep === 'PASSKEY' && (
                <a
                  href={`/setup${merchantApiConfig().merchantSession ? `#session=${encodeURIComponent(merchantApiConfig().merchantSession)}` : ''}`}
                  className="mat-btn-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center space-x-2 shadow-sm"
                >
                  <span>Set Up Wallets & Passkey</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
              )}
              {merchant.status?.toLowerCase() === 'verification_action_required' && merchant.statusReason && (
                <p className="max-w-sm text-xs leading-5 text-amber-800 mt-2">
                  Compliance note: {merchant.statusReason}
                </p>
              )}
              {merchant.status?.toLowerCase() === 'rejected' && (
                <p className="max-w-sm text-xs leading-5 text-rose-700">
                  {merchant.statusReason || 'The backend reports that KYB verification was rejected. Contact Orki compliance for next steps.'}
                </p>
              )}
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100">
            <div className={`p-2.5 rounded-lg text-xs border ${
              derivedStep === 'NOTICE'
                ? 'bg-white border-onion-300 shadow-xs ring-1 ring-onion-200'
                : merchant.noticeAcknowledgedAt
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider">Step 1</p>
              <p className="font-bold text-xs mt-0.5">Regulatory Notice</p>
            </div>

            <div className={`p-2.5 rounded-lg text-xs border ${
              derivedStep === 'KYB_INFORMATION'
                ? 'bg-white border-onion-300 shadow-xs ring-1 ring-onion-200'
                : merchant.kybInformationSubmittedAt
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider">Step 2</p>
              <p className="font-bold text-xs mt-0.5">Company KYB Information</p>
            </div>

            <div className={`p-2.5 rounded-lg text-xs border ${derivedStep === 'TERMS' ? 'bg-white border-onion-300 shadow-xs ring-1 ring-onion-200' : merchant.termsAcceptedAt ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider">Step 3</p><p className="font-bold text-xs mt-0.5">Terms & Fee Split</p>
            </div>

            <div className={`p-2.5 rounded-lg text-xs border ${
              derivedStep === 'SUMSUB' || derivedStep === 'BUSINESS_VERIFICATION'
                ? 'bg-white border-onion-300 shadow-xs ring-1 ring-onion-200'
                : merchant.sumsubCompletedAt
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider">Step 4</p>
              <p className="font-bold text-xs mt-0.5">Business Verification</p>
            </div>

            <div className={`p-2.5 rounded-lg text-xs border ${
              derivedStep === 'PASSKEY'
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
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Building className="w-5 h-5 text-onion-300" />
                <div>
                  <h3 className="font-bold text-sm tracking-tight">Step 2 of 4: Submit Company KYB Information</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Prefilled from your PSP registration record. Review and confirm below.</p>
                </div>
              </div>
              <button onClick={() => setShowKybModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prefill reassurance banner */}
            <div className="bg-emerald-50/90 border-b border-emerald-100 px-6 py-3 flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Prefilled from PSP:</strong> Company details were pre-populated from the merchant record registered by your PSP. Verify or edit any fields as needed.
                </span>
              </div>
              <button
                type="button"
                onClick={resetKybToPrefill}
                className="inline-flex items-center space-x-1 font-semibold text-emerald-700 hover:text-emerald-900 text-[11px] underline ml-3 shrink-0"
                title="Restore default prefilled values from PSP"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <form onSubmit={handleSubmitKyb} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs max-h-[70vh] overflow-y-auto">
              <label className="font-semibold text-slate-700">
                Legal company name
                <input
                  required
                  type="text"
                  value={kybData.companyName}
                  onChange={(e) => setKybData({ ...kybData, companyName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal focus:ring-2 focus:ring-onion-500/20 focus:border-onion-500 focus:outline-none"
                />
              </label>

              <label className="font-semibold text-slate-700">
                Company registration number / License
                <input
                  required
                  type="text"
                  value={kybData.registrationNumber}
                  onChange={(e) => setKybData({ ...kybData, registrationNumber: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal font-mono focus:ring-2 focus:ring-onion-500/20 focus:border-onion-500 focus:outline-none"
                />
              </label>

              <label className="font-semibold text-slate-700">
                Country code (ISO 3166-1 alpha-3)
                <input
                  required
                  type="text"
                  maxLength={3}
                  value={kybData.country}
                  onChange={(e) => setKybData({ ...kybData, country: e.target.value.toUpperCase() })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal font-mono uppercase focus:ring-2 focus:ring-onion-500/20 focus:border-onion-500 focus:outline-none"
                  placeholder="e.g. ARE, GBR, NGA"
                />
              </label>

              <label className="font-semibold text-slate-700">
                Incorporation date
                <input
                  required
                  type="date"
                  value={kybData.incorporatedOn}
                  onChange={(e) => setKybData({ ...kybData, incorporatedOn: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal focus:ring-2 focus:ring-onion-500/20 focus:border-onion-500 focus:outline-none"
                />
              </label>

              <label className="font-semibold text-slate-700">
                Legal entity type
                <input
                  required
                  type="text"
                  value={kybData.type}
                  onChange={(e) => setKybData({ ...kybData, type: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal focus:ring-2 focus:ring-onion-500/20 focus:border-onion-500 focus:outline-none"
                  placeholder="e.g. Limited Liability Company (LLC)"
                />
              </label>

              <label className="font-semibold text-slate-700">
                Registration location / Authority
                <input
                  type="text"
                  value={kybData.registrationLocation}
                  onChange={(e) => setKybData({ ...kybData, registrationLocation: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal focus:ring-2 focus:ring-onion-500/20 focus:border-onion-500 focus:outline-none"
                  placeholder="e.g. Dubai DED"
                />
              </label>

              <label className="font-semibold text-slate-700 sm:col-span-2">
                Registered legal address
                <input
                  required
                  type="text"
                  value={kybData.legalAddress}
                  onChange={(e) => setKybData({ ...kybData, legalAddress: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal focus:ring-2 focus:ring-onion-500/20 focus:border-onion-500 focus:outline-none"
                />
              </label>

              <label className="font-semibold text-slate-700">
                Company email
                <input
                  type="email"
                  value={kybData.email}
                  onChange={(e) => setKybData({ ...kybData, email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal focus:ring-2 focus:ring-onion-500/20 focus:border-onion-500 focus:outline-none"
                />
              </label>

              <label className="font-semibold text-slate-700">
                Company phone
                <input
                  type="text"
                  value={kybData.phone}
                  onChange={(e) => setKybData({ ...kybData, phone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal focus:ring-2 focus:ring-onion-500/20 focus:border-onion-500 focus:outline-none"
                />
              </label>

              <label className="font-semibold text-slate-700">
                Tax ID / TRN
                <input
                  type="text"
                  value={kybData.taxId}
                  onChange={(e) => setKybData({ ...kybData, taxId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal font-mono focus:ring-2 focus:ring-onion-500/20 focus:border-onion-500 focus:outline-none"
                />
              </label>

              <label className="font-semibold text-slate-700">
                Company website
                <input
                  type="url"
                  value={kybData.website}
                  onChange={(e) => setKybData({ ...kybData, website: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal focus:ring-2 focus:ring-onion-500/20 focus:border-onion-500 focus:outline-none"
                  placeholder="https://www.example.com"
                />
              </label>

              <label className="font-semibold text-slate-700 sm:col-span-2">
                Postal address
                <input
                  type="text"
                  value={kybData.postalAddress}
                  onChange={(e) => setKybData({ ...kybData, postalAddress: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal focus:ring-2 focus:ring-onion-500/20 focus:border-onion-500 focus:outline-none"
                />
              </label>

              <label className="font-semibold text-slate-700">
                Ownership and control structure
                <input
                  type="text"
                  value={kybData.controlScheme}
                  onChange={(e) => setKybData({ ...kybData, controlScheme: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal focus:ring-2 focus:ring-onion-500/20 focus:border-onion-500 focus:outline-none"
                />
              </label>

              <label className="font-semibold text-slate-700">
                Applicant position
                <input
                  type="text"
                  value={kybData.applicantPosition}
                  onChange={(e) => setKybData({ ...kybData, applicantPosition: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal focus:ring-2 focus:ring-onion-500/20 focus:border-onion-500 focus:outline-none"
                />
              </label>

              {apiError && <p role="alert" className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-red-800">{apiError}</p>}

              <div className="sm:col-span-2 flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowKybModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  disabled={apiBusy}
                  type="submit"
                  className="mat-btn-primary px-5 py-2.5 disabled:opacity-50 inline-flex items-center space-x-1.5 shadow-sm"
                >
                  <span>{apiBusy ? 'Submitting KYB…' : 'Submit KYB Information & Continue'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
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
              {apiError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-rose-900">Acceptance Error</p>
                    <p className="mt-0.5 text-rose-700">{apiError}</p>
                  </div>
                </div>
              )}

              {(merchant.termsAcceptedAt || termsData?.tos?.status === 'accepted') ? (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-emerald-900">Terms of Service Already Accepted</p>
                      <p className="mt-0.5 text-emerald-700">
                        The authorised signatory has already been recorded on the backend. You can proceed directly to identity verification.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onUpdateMerchant({
                        termsAcceptedAt: merchant.termsAcceptedAt || new Date().toISOString(),
                        status: 'terms_accepted',
                        nextStep: 'SUMSUB',
                      })
                      setShowTermsModal(false)
                    }}
                    className="w-full mat-btn-primary py-3 text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    <span>Continue to SumSub Verification</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
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
                        href={
                          termsData?.tos?.documentLinks?.tos &&
                          termsData.tos.documentLinks.tos !== '#' &&
                          !termsData.tos.documentLinks.tos.includes('link.to')
                            ? termsData.tos.documentLinks.tos
                            : '/legal/terms'
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition flex items-center justify-between group"
                      >
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-onion-700" />
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">Terms of Service</p>
                            <p className="text-[10px] text-slate-400 font-mono">documentLinks.tos · Opens full text</p>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                      </a>

                      <a
                        href={
                          termsData?.tos?.documentLinks?.privacyPolicy &&
                          termsData.tos.documentLinks.privacyPolicy !== '#' &&
                          !termsData.tos.documentLinks.privacyPolicy.includes('link.to')
                            ? termsData.tos.documentLinks.privacyPolicy
                            : '/legal/privacy'
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition flex items-center justify-between group"
                      >
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-emerald-600" />
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">Privacy Policy</p>
                            <p className="text-[10px] text-slate-400 font-mono">documentLinks.privacyPolicy · Opens full text</p>
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                      </a>
                    </div>
                  </div>

                  {/* Key Protocol Terms & Clauses */}
                  {termsData?.clauses && termsData.clauses.length > 0 && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 max-h-32 overflow-y-auto">
                      <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Key Protocol Provisions</p>
                      <ul className="space-y-1 text-[11px] text-slate-600 leading-relaxed">
                        {termsData.clauses.map((clause, idx) => (
                          <li key={idx} className="flex items-start space-x-1.5">
                            <span className="text-onion-600 font-bold">•</span>
                            <span>{clause}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

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

                  {/* Authorised Signatory Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Authorised signatory name
                      <input
                        type="text"
                        value={signatory.name}
                        onChange={(e) => setSignatory({ ...signatory, name: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal"
                        placeholder="e.g. Alice Smith"
                        required
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-slate-700">
                      Signatory email
                      <input
                        type="email"
                        value={signatory.email}
                        onChange={(e) => setSignatory({ ...signatory, email: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal"
                        placeholder="e.g. alice@falconluxury.example"
                        required
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-slate-700 sm:col-span-2">
                      Signatory title
                      <input
                        type="text"
                        value={signatory.title}
                        onChange={(e) => setSignatory({ ...signatory, title: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal"
                        placeholder="e.g. Managing Director"
                        required
                      />
                    </label>
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
                      disabled={!hasAgreedTos || apiBusy || !signatory.name || !signatory.email}
                      className="w-full mat-btn-primary py-3 text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50"
                    >
                      {apiBusy && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>{apiBusy ? 'Recording acceptance…' : 'Accept terms and continue'}</span>
                      {!apiBusy && <ChevronRight className="w-4 h-4" />}
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
                </>
              )}
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

      {/* PSP API KEY PROMPT MODAL (When neither session nor PSP key is found) */}
      {isPspKeyPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Key className="w-4 h-4 text-onion" />
                <span>Reissue Merchant Onboarding Session</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPspKeyPromptOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              No active session or PSP key was found in local storage. Provide your partner PSP API key (<code className="font-mono text-slate-700">sk_test_...</code> / <code className="font-mono text-slate-700">sk_live_...</code>) to reissue a fresh session token from the backend.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (inputPspKey.trim()) {
                  void handleReissueMerchantSession(inputPspKey.trim())
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  PSP Secret API Key
                </label>
                <input
                  type="password"
                  required
                  placeholder="sk_test_••••••••••••••••"
                  value={inputPspKey}
                  onChange={(e) => setInputPspKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-onion focus:outline-none"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPspKeyPromptOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReissuingSession || !inputPspKey.trim()}
                  className="w-1/2 py-2.5 bg-onion text-white rounded-xl text-xs font-bold hover:bg-onion-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isReissuingSession ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Reissuing…</span>
                    </>
                  ) : (
                    <span>Reissue Session Key</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
