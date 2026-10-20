import React, { useState } from 'react'
import type { Merchant, Paylink, SettlementMode, Transaction, OnboardingStep } from '../../types'
import { StatusBadge } from '../../components/StatusBadge'
import { OnboardingModal } from '../../components/OnboardingModal'
import { CreatePaylinkModal } from './CreatePaylinkModal'
import { OffRampModal } from './OffRampModal'
import { TransferModal } from './TransferModal'
import {
  ArrowRightLeft,
  Send,
  Plus,
  Lock,
  ChevronRight,
  Layers,
  Sparkles,
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
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false)
  const [isPaylinkModalOpen, setIsPaylinkModalOpen] = useState(false)
  const [isOffRampModalOpen, setIsOffRampModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const isSetupComplete = merchant.status === 'active' && !merchant.nextStep

  const handleStartOnboarding = () => {
    setIsOnboardingModalOpen(true)
  }

  const handleOnboardingComplete = (
    _merchantId: string,
    merchantWallet: string,
    pspWallet: string,
    orkiWallet: string,
    passkeyId: string
  ) => {
    onUpdateMerchant({
      status: 'active',
      nextStep: null,
      merchantWallet: merchantWallet,
      baseWalletAddress: merchantWallet,
      pspFeeWallet: pspWallet,
      orkiFeeWallet: orkiWallet,
      passkeyId: passkeyId,
      activatedAt: new Date().toISOString(),
    })
  }

  const handleStepChange = (step: OnboardingStep | null) => {
    onUpdateMerchant({ nextStep: step })
  }

  const handleToggleSettlementMode = (newMode: SettlementMode) => {
    onUpdateMerchant({ settlementMode: newMode })
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
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
          {!isSetupComplete && (
            <button
              onClick={handleStartOnboarding}
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
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-onion-800 bg-onion-100/80 px-2.5 py-0.5 rounded-md">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next Step: {merchant.nextStep || 'NOTICE'}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight pt-1">
                Complete Your USDC Merchant Activation
              </h2>
              <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                Complete the 4-step onboarding journey: Regulatory Notice acknowledgement, Orki Terms & split fee agreement, SumSub KYB identity verification, and hardware Passkey creation.
              </p>
            </div>

            <button
              onClick={handleStartOnboarding}
              className="mat-btn-primary px-5 py-2.5 text-xs font-semibold flex items-center space-x-2 shrink-0 shadow-sm"
            >
              <span>Accept USDC & Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
            <div className={`p-2.5 rounded-lg text-xs border ${
              merchant.nextStep === 'NOTICE' || !merchant.nextStep
                ? 'bg-white border-onion-300 shadow-xs'
                : merchant.noticeAcknowledgedAt
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider">Step 1</p>
              <p className="font-bold text-xs mt-0.5">Regulatory Notice</p>
            </div>

            <div className={`p-2.5 rounded-lg text-xs border ${
              merchant.nextStep === 'TERMS'
                ? 'bg-white border-onion-300 shadow-xs'
                : merchant.termsAcceptedAt
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider">Step 2</p>
              <p className="font-bold text-xs mt-0.5">Terms & Fee Split</p>
            </div>

            <div className={`p-2.5 rounded-lg text-xs border ${
              merchant.nextStep === 'SUMSUB'
                ? 'bg-white border-onion-300 shadow-xs'
                : merchant.sumsubCompletedAt
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider">Step 3</p>
              <p className="font-bold text-xs mt-0.5">SumSub KYB Check</p>
            </div>

            <div className={`p-2.5 rounded-lg text-xs border ${
              merchant.nextStep === 'PASSKEY'
                ? 'bg-white border-onion-300 shadow-xs'
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

      {/* TRI-WALLET SPLIT CONTRACT TOPOLOGY SURFACE */}
      <div className="mat-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center space-x-2.5">
            <Layers className="w-4 h-4 text-onion-700" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Tri-Wallet Split Contract Architecture
            </h3>
          </div>
          <span className="inline-flex items-center text-[11px] font-mono font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded">
            <Lock className="w-3 h-3 mr-1 text-slate-400" />
            30-Day Rate Lock Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Vault 1: Merchant Net Proceed Wallet */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                1. Merchant Settlement Wallet
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                Net Proceeds
              </span>
            </div>
            <p className="font-mono text-xs font-semibold text-slate-900 break-all">
              {merchant.merchantWallet || merchant.baseWalletAddress || 'Pending passkey deployment'}
            </p>
            <p className="text-[11px] text-slate-500">
              Receives net sales proceeds immediately upon checkout completion.
            </p>
          </div>

          {/* Vault 2: PSP Fee Vault */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                2. PSP Commission Wallet
              </span>
              <span className="text-[10px] font-bold text-onion-800 bg-onion-50 px-1.5 py-0.2 rounded border border-onion-200">
                {(merchant.pspFeeBps || 35) / 100}% Markup
              </span>
            </div>
            <p className="font-mono text-xs font-semibold text-slate-900 break-all">
              {merchant.pspFeeWallet || '0xPspXsquareVault000000000000000000001'}
            </p>
            <p className="text-[11px] text-slate-500">
              Receives PSP markup cut (strictly bounded to max 1.00% ceiling).
            </p>
          </div>

          {/* Vault 3: Orki Protocol Fee Vault */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                3. Orki Protocol Fee Wallet
              </span>
              <span className="text-[10px] font-bold text-slate-700 bg-slate-200/70 px-1.5 py-0.2 rounded">
                1.00% (Cap $25)
              </span>
            </div>
            <p className="font-mono text-xs font-semibold text-slate-900 break-all">
              {merchant.orkiFeeWallet || '0xOrkiProtocolFeeVault0000000000000000001'}
            </p>
            <p className="text-[11px] text-slate-500">
              Receives base network fee (1.00%, capped at $25.00 USDC per tx).
            </p>
          </div>
        </div>
      </div>

      {/* FINANCIAL KPI TILES (Material 3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Base USDC Float */}
        <div className="mat-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>USDC Float (Base)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Non-Custodial
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 font-mono tracking-tight mt-2 tabular-nums">
              12,450.00 <span className="text-xs font-medium text-slate-400">USDC</span>
            </p>
            <p className="font-mono text-[10px] text-slate-400 mt-1 truncate">
              {merchant.baseWalletAddress || '0x71C25e36...949A'}
            </p>
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

        {/* Solana USDT Float */}
        <div className="mat-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>USDT Float (Solana)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Non-Custodial
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 font-mono tracking-tight mt-2 tabular-nums">
              4,200.00 <span className="text-xs font-medium text-slate-400">USDT</span>
            </p>
            <p className="font-mono text-[10px] text-slate-400 mt-1 truncate">
              {merchant.solanaWalletAddress || '4Nd1mBQtr...6P58'}
            </p>
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

        {/* Bank Liquidation Setting */}
        <div className="mat-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Bank Settlement (AED)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Emirates NBD
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 font-mono tracking-tight mt-2 tabular-nums">
              AED 84,120.00
            </p>
            <p className="font-mono text-[10px] text-slate-400 mt-1">
              IBAN: AE0702600012345678901
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-slate-800 block text-xs">Auto Off-Ramp</span>
              <span className="text-[10px] text-slate-400">
                {merchant.settlementMode === 'auto_offramp' ? 'Instant AED Liquidation' : 'Hold in Vault'}
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

      {/* TRANSACTIONS TABLE */}
      <div className="mat-card overflow-hidden">
        <div className="p-6 border-b border-slate-200/80">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Recent Payment Settlements</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Atomic on-chain distribution between Merchant Net, PSP Markup, and Orki Base Fee.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="px-6 py-3 text-left">Gross Paid</th>
                <th className="px-6 py-3 text-left">Orki Cut (1%)</th>
                <th className="px-6 py-3 text-left">PSP Cut</th>
                <th className="px-6 py-3 text-left">Net Merchant</th>
                <th className="px-6 py-3 text-left">Chain</th>
                <th className="px-6 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-mono tabular-nums">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-6 py-3.5 font-bold text-slate-900">
                    {tx.grossAmount.toFixed(2)} {tx.currency}
                  </td>
                  <td className="px-6 py-3.5 text-slate-600">
                    -${tx.orkiFeeAmount.toFixed(2)}
                  </td>
                  <td className="px-6 py-3.5 text-onion-700 font-medium">
                    -${tx.pspMarkupAmount.toFixed(2)}
                  </td>
                  <td className="px-6 py-3.5 font-bold text-emerald-700">
                    +{tx.netAmount.toFixed(2)} {tx.currency}
                  </td>
                  <td className="px-6 py-3.5 font-sans uppercase font-medium text-slate-600 text-[11px]">
                    {tx.chain}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Settled
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      <OnboardingModal
        merchant={merchant}
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        onComplete={handleOnboardingComplete}
        onStepChange={handleStepChange}
      />

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
            balanceUsdc: Math.max(0, (merchant.balanceUsdc || 0) - sourceAmount),
          })
          setIsOffRampModalOpen(false)
        }}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onCompleteTransfer={(amount) => {
          onUpdateMerchant({
            balanceUsdc: Math.max(0, (merchant.balanceUsdc || 0) - amount),
          })
          setIsTransferModalOpen(false)
        }}
      />
    </div>
  )
}
