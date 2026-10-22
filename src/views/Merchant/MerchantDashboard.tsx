import React, { useState, useEffect } from 'react'
import type { Merchant, Paylink, SettlementMode, Transaction } from '../../types'
import { StatusBadge } from '../../components/StatusBadge'
import { CreatePaylinkModal } from './CreatePaylinkModal'
import { OffRampModal } from './OffRampModal'
import { TransferModal } from './TransferModal'
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
  Globe,
} from 'lucide-react'

interface MerchantDashboardProps {
  merchant: Merchant
  paylinks: Paylink[]
  transactions: Transaction[]
  onUpdateMerchant: (updated: Partial<Merchant>) => void
  onPaylinkCreated: (paylink: Paylink) => void
  onLaunchCheckout: (paylink: Paylink) => void
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({
  merchant,
  paylinks,
  transactions,
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

  const isSetupComplete = merchant.status === 'active' && !merchant.nextStep
  const [clientIp, setClientIp] = useState('203.0.113.42')
  const [hasAgreedTos, setHasAgreedTos] = useState(false)
  const tosToken = `token_tos_${merchant.id.substring(0, 8)}`

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then((r) => r.json())
      .then((data) => {
        if (data?.ip) setClientIp(data.ip)
      })
      .catch(() => {})
  }, [])

  // Listen for cross-window messages from Hosted TOS, SumSub, or Passkey tabs
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ORKI_TOS_ACCEPTED' && event.data?.merchantId === merchant.id) {
        onUpdateMerchant({
          termsAcceptedAt: new Date().toISOString(),
          status: 'terms_accepted',
          nextStep: 'SUMSUB',
        })
        setShowTermsModal(false)
      } else if (event.data?.type === 'ORKI_SUMSUB_COMPLETED' && event.data?.merchantId === merchant.id) {
        onUpdateMerchant({
          sumsubCompletedAt: new Date().toISOString(),
          nextStep: 'PASSKEY',
        })
      } else if (event.data?.type === 'ORKI_PASSKEY_COMPLETED' && event.data?.merchantId === merchant.id) {
        onUpdateMerchant({
          merchantWallet: event.data.baseAddr,
          baseWalletAddress: event.data.baseAddr,
          solanaWalletAddress: event.data.solAddr,
          passkeyRegisteredAt: new Date().toISOString(),
          status: 'active',
          nextStep: null,
          activatedAt: new Date().toISOString(),
        })
      }
    }
    window.addEventListener('message', handleWindowMessage)
    return () => window.removeEventListener('message', handleWindowMessage)
  }, [merchant.id, onUpdateMerchant])

  // Stepper handlers
  const handleStartOptIn = () => {
    onUpdateMerchant({ nextStep: 'NOTICE' })
    setShowNoticeModal(true)
  }

  const handleAcknowledgeNotice = () => {
    onUpdateMerchant({
      noticeAcknowledgedAt: new Date().toISOString(),
      nextStep: 'TERMS',
    })
    setShowNoticeModal(false)
    setShowTermsModal(true)
  }

  const handleAcceptTerms = () => {
    onUpdateMerchant({
      termsAcceptedAt: new Date().toISOString(),
      nextStep: 'SUMSUB',
    })
    setShowTermsModal(false)
  }

  const handleOpenSumsubTab = () => {
    const url = `/verify/sumsub?merchantId=${merchant.id}`
    window.open(url, '_blank', 'width=600,height=720')
  }

  const handleOpenPasskeyTab = () => {
    const url = `/onboarding/passkey?merchantId=${merchant.id}`
    window.open(url, '_blank', 'width=600,height=720')
  }

  const handleToggleSettlementMode = (newMode: SettlementMode) => {
    onUpdateMerchant({ settlementMode: newMode })
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Calculated Metrics
  const baseUsdcBalance = merchant.balanceUsdc || 12450.0
  const solanaUsdtBalance = 4200.0
  const totalCryptoBalance = baseUsdcBalance + solanaUsdtBalance
  const total30dSettlements = transactions.reduce((acc, t) => acc + (t.grossAmount || 0), 18400.0)

  return (
    <div className="space-y-6 font-sans">
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

            {/* Payment Rails / Gateway Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                Connected Rails:
              </span>

              {/* Stripe (Active) */}
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#635BFF]/10 text-[#635BFF] border border-[#635BFF]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#635BFF] mr-1"></span>
                Stripe
              </span>

              {/* MoonPay (Active) */}
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#7D00FF]/10 text-[#7D00FF] border border-[#7D00FF]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7D00FF] mr-1"></span>
                MoonPay
              </span>

              {/* Orki Badge (Active when onboarded, Disabled look when pending) */}
              {isSetupComplete ? (
                <span
                  title="Orki multi-chain USDC rails active"
                  className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                  Orki (Active · Multi-Chain Live)
                </span>
              ) : (
                <span
                  title="Click Accept USDC below to complete onboarding and activate Orki"
                  className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200 opacity-60 cursor-pointer hover:bg-slate-200 transition"
                  onClick={handleStartOptIn}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-1.5"></span>
                  Orki (Disabled · Setup Pending)
                </span>
              )}
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
          {!isSetupComplete && (
            <button
              onClick={handleStartOptIn}
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
                Walk through the steps to accept USDC: Review regulatory data sharing notice, agree to Orki terms & transparent fee splits, verify company with SumSub, and generate your biometric wallet.
              </p>
            </div>

            {/* Contextual Action Button based on current nextStep */}
            <div>
              {(!merchant.nextStep || merchant.nextStep === 'OPT_IN') && (
                <button
                  onClick={handleStartOptIn}
                  className="mat-btn-primary px-5 py-2.5 text-xs font-semibold flex items-center space-x-2 shadow-sm"
                >
                  <span>Accept USDC Payments</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {merchant.nextStep === 'NOTICE' && (
                <button
                  onClick={() => setShowNoticeModal(true)}
                  className="mat-btn-primary px-5 py-2.5 text-xs font-semibold flex items-center space-x-2 shadow-sm"
                >
                  <span>Read Regulatory Notice</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {merchant.nextStep === 'TERMS' && (
                <button
                  onClick={() => setShowTermsModal(true)}
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
                <button
                  onClick={handleOpenPasskeyTab}
                  className="mat-btn-primary px-5 py-2.5 text-xs font-semibold flex items-center space-x-2 shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Create Wallet & Passkey (New Tab)</span>
                </button>
              )}
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
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
              merchant.nextStep === 'TERMS'
                ? 'bg-white border-onion-300 shadow-xs ring-1 ring-onion-200'
                : merchant.termsAcceptedAt
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider">Step 2</p>
              <p className="font-bold text-xs mt-0.5">Terms & Fee Split</p>
            </div>

            <div className={`p-2.5 rounded-lg text-xs border ${
              merchant.nextStep === 'SUMSUB'
                ? 'bg-white border-onion-300 shadow-xs ring-1 ring-onion-200'
                : merchant.sumsubCompletedAt
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider">Step 3</p>
              <p className="font-bold text-xs mt-0.5">SumSub KYB Check</p>
            </div>

            <div className={`p-2.5 rounded-lg text-xs border ${
              merchant.nextStep === 'PASSKEY'
                ? 'bg-white border-onion-300 shadow-xs ring-1 ring-onion-200'
                : merchant.passkeyRegisteredAt
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider">Step 4</p>
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
                  <span className="font-mono text-slate-400 tabular-nums">$0.00</span>
                </div>

                <div className="pt-2 text-[10px] font-mono text-slate-400 truncate border-t border-slate-200">
                  Base: {merchant.merchantWallet || merchant.baseWalletAddress || '0x71C25e36F7682245353526E3d2a7620E15dB949A'}
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
              $14,200.00 AED Liquidated · $4,200.00 Held in Stablecoin
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-slate-800 block text-xs">Settlement Preference</span>
              <span className="text-[10px] text-slate-400">
                {merchant.settlementMode === 'auto_offramp' ? 'Instant AED Liquidation' : 'Hold as Received'}
              </span>
            </div>
            <button
              onClick={() =>
                handleToggleSettlementMode(
                  merchant.settlementMode === 'auto_offramp' ? 'hold_as_received' : 'auto_offramp'
                )
              }
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
                {paylinks.length} <span className="text-xs font-normal text-slate-400">active links</span>
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Base (EVM) · Solana (SVM)
              </p>
            </div>

            <div className="mt-3 space-y-1 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Checkout Speed:</span>
                <span className="font-semibold text-emerald-700 font-mono">&lt; 3.2s</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Success Rate:</span>
                <span className="font-semibold text-slate-900 font-mono">99.4%</span>
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
          <span className="text-xs text-slate-500 font-medium">Real-Time Inflow Distribution</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Metric 1: By Blockchain */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-slate-600 font-semibold">
              <span className="flex items-center space-x-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Volume by Chain</span>
              </span>
              <span className="font-mono text-[11px] text-slate-500">100%</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Base (EVM):</span>
                <span className="font-semibold text-slate-900 font-mono">75% ($12.4k)</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                <div className="bg-blue-600 h-full" style={{ width: '75%' }} />
                <div className="bg-purple-600 h-full" style={{ width: '25%' }} />
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Solana (SVM):</span>
                <span className="font-semibold text-slate-900 font-mono">25% ($4.2k)</span>
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
              <span className="font-mono text-[11px] text-slate-500">2 Assets</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                <span className="text-slate-500">USDC:</span>
                <span className="font-semibold text-slate-800 font-mono">$12,450.00</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                <span className="text-slate-500">USDT:</span>
                <span className="font-semibold text-slate-800 font-mono">$4,200.00</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">EURC:</span>
                <span className="text-slate-400 font-mono">$0.00</span>
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
              <span className="font-mono text-[11px] text-emerald-700 font-bold">99.4%</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                <span className="text-slate-500">Active Paylinks:</span>
                <span className="font-semibold text-slate-800 font-mono">{paylinks.length}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                <span className="text-slate-500">Avg Settlement:</span>
                <span className="font-semibold text-slate-800 font-mono">$485 USDC</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Checkout Speed:</span>
                <span className="font-semibold text-emerald-700 font-mono">&lt; 3.2 sec</span>
              </div>
            </div>
          </div>

          {/* Metric 4: Transfers & Off-Ramps */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-slate-600 font-semibold">
              <span className="flex items-center space-x-1">
                <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600" />
                <span>Transfers & Payouts</span>
              </span>
              <span className="font-mono text-[11px] text-purple-700 font-bold">0 Failed</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                <span className="text-slate-500">Total Transfers:</span>
                <span className="font-semibold text-slate-800 font-mono">$3,500 USDC</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                <span className="text-slate-500">AED Payouts:</span>
                <span className="font-semibold text-slate-800 font-mono">AED 51,400</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Settlement Bank:</span>
                <span className="font-semibold text-slate-800">Emirates NBD</span>
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
              {paylinks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No active paylinks created yet.
                  </td>
                </tr>
              ) : (
                paylinks.map((link) => (
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
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No transactions settled yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
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
                <p className="font-semibold text-onion-900 text-sm">Notice of Data Sharing with Orki Protocol</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Enabling <strong>Accept USDC</strong> will securely transmit your merchant onboarding information to Orki Protocol to initialize your non-custodial smart wallet settlement rails under UAE VARA / CBUAE regulations.
                </p>

                {/* Data to be shared preview */}
                <div className="mt-2 p-2.5 bg-white/80 rounded-lg border border-onion-100 font-mono text-[10px] space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Legal Entity:</span>
                    <span className="font-semibold text-slate-900">{merchant.legalBusinessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Trade License:</span>
                    <span className="font-semibold text-slate-900">{merchant.tradeLicenseNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Jurisdiction:</span>
                    <span className="font-semibold text-slate-900">{merchant.jurisdiction}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Representative:</span>
                    <span className="font-semibold text-slate-900">{merchant.representativeName} ({merchant.representativeEmail})</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                <p>• Neither Orki nor your PSP holds your merchant funds at any time.</p>
                <p>• Payments are deposited directly to your non-custodial smart wallet.</p>
                <p>• Your business details are verified through institutional SumSub KYB.</p>
              </div>

              <button
                onClick={handleAcknowledgeNotice}
                className="w-full mat-btn-primary py-3 text-xs font-semibold flex items-center justify-center space-x-2 shadow-sm mt-4"
              >
                <span>Enable Accept USDC & Share Data with Orki</span>
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
                  <p className="text-[10px] text-slate-400 font-mono">Entity: ORKI PROTOCOL LTD</p>
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
                  <span className="text-[10px] text-slate-400 font-mono">POST /v1/tos/{tosToken}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <a
                    href="https://legal.orki.network/documents/merchant-terms-of-service.pdf"
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
                    href="https://legal.orki.network/documents/privacy-policy.pdf"
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

              {/* Client IP Capture (Step 3 - Collect Client IP) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700 flex items-center space-x-1">
                    <Globe className="w-3.5 h-3.5 text-onion-700" />
                    <span>Real Client IP Address</span>
                  </span>
                  <span className="font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                    {clientIp}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Required: The actual client IP address (extracted from X-Forwarded-For) is logged for financial audit compliance.
                </p>
              </div>

              {/* 30-Day Locked Rate Disclosure */}
              <div className="p-3.5 bg-onion-50/50 border border-onion-200/80 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-slate-800">
                  <span className="font-semibold">Orki Protocol Fee:</span>
                  <span className="font-mono font-bold text-slate-900">1.00% (Cap $25.00 USDC)</span>
                </div>
                <div className="flex justify-between items-center text-slate-800">
                  <span className="font-semibold">PSP Markup:</span>
                  <span className="font-mono font-bold text-slate-900">{((merchant.pspFeeBps || 35) / 100).toFixed(2)}% (Max 1.00%)</span>
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
                  I confirm that I have reviewed the Terms of Service and Privacy Policy issued by <strong>ORKI PROTOCOL LTD</strong> and accept the non-custodial settlement terms.
                </span>
              </label>

              {/* Two Options: Option B (Manual in Dashboard) & Option A (Hosted Page) */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleAcceptTerms}
                  disabled={!hasAgreedTos}
                  className="w-full mat-btn-primary py-3 text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50"
                >
                  <span>Submit TOS Acceptance (Option B: Manual)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    window.open(`/tos/${tosToken}`, '_blank', 'width=620,height=720')
                  }}
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
                  <h3 className="font-bold text-sm tracking-tight">On-Chain Tri-Wallet Split</h3>
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
                  Atomic Contract Partition
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
                    Destination: {merchant.merchantWallet || merchant.baseWalletAddress || '0x71C25e36F7682245353526E3d2a7620E15dB949A'}
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
                    Destination: {merchant.pspFeeWallet || '0xPspXsquareVault000000000000000000001'}
                  </p>
                </div>

                {/* Split 3: Orki Protocol Vault */}
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-800">3. Orki Protocol Fee Wallet (1.00% cap)</span>
                    <span className="font-mono font-bold text-slate-800 text-sm">
                      ${selectedTxForSplit.orkiFeeAmount.toFixed(2)} USDC
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-slate-600 break-all">
                    Destination: {merchant.orkiFeeWallet || '0xOrkiProtocolFeeVault0000000000000000001'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-500 break-all">
                TxHash: {selectedTxForSplit.txHash}
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
        onPaylinkCreated={onPaylinkCreated}
        merchantDefaultSettlement={merchant.settlementMode}
      />

      <OffRampModal
        isOpen={isOffRampModalOpen}
        onClose={() => setIsOffRampModalOpen(false)}
        onCompleteConversion={(sourceAmount) => {
          onUpdateMerchant({
            balanceUsdc: Math.max(0, (merchant.balanceUsdc || baseUsdcBalance) - sourceAmount),
          })
          setIsOffRampModalOpen(false)
        }}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onCompleteTransfer={(amount) => {
          onUpdateMerchant({
            balanceUsdc: Math.max(0, (merchant.balanceUsdc || baseUsdcBalance) - amount),
          })
          setIsTransferModalOpen(false)
        }}
      />
    </div>
  )
}
