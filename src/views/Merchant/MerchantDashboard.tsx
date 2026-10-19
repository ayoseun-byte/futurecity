import React, { useState } from 'react'
import type { Merchant, Paylink, SettlementMode, Transaction } from '../../types'
import { StatusBadge } from '../../components/StatusBadge'
import { OnboardingModal } from '../../components/OnboardingModal'
import { CreatePaylinkModal } from './CreatePaylinkModal'
import { OffRampModal } from './OffRampModal'
import { TransferModal } from './TransferModal'
import {
  ArrowRightLeft,
  Send,
  Plus,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  QrCode,
  ArrowUpRight,
  X,
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
  const [isConsentNoticeOpen, setIsConsentNoticeOpen] = useState(false)
  const [isPaylinkModalOpen, setIsPaylinkModalOpen] = useState(false)
  const [isOffRampModalOpen, setIsOffRampModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [activeQrModal, setActiveQrModal] = useState<Paylink | null>(null)

  const isSetupComplete = merchant.status === 'active'

  const handleToggleSwitch = () => {
    if (!isSetupComplete) {
      setIsConsentNoticeOpen(true)
    }
  }

  const handleConsentContinue = () => {
    setIsConsentNoticeOpen(false)
    setIsOnboardingModalOpen(true)
  }

  const handleOnboardingComplete = (
    _merchantId: string,
    baseWallet: string,
    solanaWallet: string,
    passkeyId: string
  ) => {
    onUpdateMerchant({
      status: 'active',
      baseWalletAddress: baseWallet,
      solanaWalletAddress: solanaWallet,
      passkeyId: passkeyId,
      activatedAt: new Date().toISOString(),
    })
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
      {/* Top Banner: Merchant Business Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-onion-50 text-onion-800 border border-onion-200 flex items-center justify-center font-black text-2xl shadow-sm">
            {merchant.legalBusinessName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-extrabold text-slate-900">{merchant.legalBusinessName}</h1>
              <StatusBadge status={merchant.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Licence: <span className="font-semibold text-slate-800">{merchant.tradeLicenseNumber}</span> · {merchant.jurisdiction} · Rep: {merchant.representativeName}
            </p>
          </div>
        </div>

        {/* SETTINGS CARD (Darshan Part 3) */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs text-slate-900">USDC payments</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isSetupComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {isSetupComplete ? 'Active' : 'Off'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Accept stablecoin payments from your customers.</p>
          </div>

          <button
            onClick={handleToggleSwitch}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              isSetupComplete ? 'bg-onion' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                isSetupComplete ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* If Not Setup: Show Prompt to Complete Verification */}
      {!isSetupComplete && (
        <div className="bg-onion-50 border-2 border-onion-200 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-onion text-white flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Finish setting up USDC payments</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
              Complete the 3-step Orki setup: Terms acceptance, Sumsub business verification, and Passkey creation.
            </p>
          </div>
          <button
            onClick={() => setIsConsentNoticeOpen(true)}
            className="py-2.5 px-6 bg-onion hover:bg-onion-700 text-white font-bold rounded-xl text-xs transition shadow-md"
          >
            Start Setup Modal
          </button>
        </div>
      )}

      {/* If Setup Complete: Full Financial Operating Center */}
      {isSetupComplete && (
        <>
          {/* Multi-Chain Balances & Settlement Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>USDC Balance (Base)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                    Non-Custodial
                  </span>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">12,450.00 <span className="text-xs font-bold text-slate-400">USDC</span></p>
                <p className="font-mono text-[10px] text-slate-400 mt-1 truncate">
                  Account: {merchant.baseWalletAddress}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  onClick={() => setIsOffRampModalOpen(true)}
                  className="py-1.5 px-2 bg-onion-50 hover:bg-onion-100 text-onion-800 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Convert to AED</span>
                </button>
                <button
                  onClick={() => setIsTransferModalOpen(true)}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transfer Out</span>
                </button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>USDT Balance (Solana)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                    Non-Custodial
                  </span>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">4,200.00 <span className="text-xs font-bold text-slate-400">USDT</span></p>
                <p className="font-mono text-[10px] text-slate-400 mt-1 truncate">
                  Account: {merchant.solanaWalletAddress}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  onClick={() => setIsOffRampModalOpen(true)}
                  className="py-1.5 px-2 bg-onion-50 hover:bg-onion-100 text-onion-800 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Convert to AED</span>
                </button>
                <button
                  onClick={() => setIsTransferModalOpen(true)}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transfer Out</span>
                </button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Settled to Bank (AED)</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                    Emirates NBD
                  </span>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">AED 84,120.00</p>
                <p className="font-mono text-[10px] text-slate-400 mt-1">
                  IBAN: AE0702600012345678901
                </p>
              </div>

              {/* Settlement Preference Toggle */}
              <div className="mt-4 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 block text-[11px]">Auto Off-Ramp</span>
                  <span className="text-[10px] text-slate-400">
                    {merchant.settlementMode === 'auto_offramp' ? 'Bridge Liquidation Active' : 'Hold in Custody'}
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleToggleSettlementMode(
                      merchant.settlementMode === 'auto_offramp' ? 'hold_as_received' : 'auto_offramp'
                    )
                  }
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                    merchant.settlementMode === 'auto_offramp' ? 'bg-onion' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${
                      merchant.settlementMode === 'auto_offramp' ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Paylinks Engine Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-base text-slate-900">Payment Links & Checkout IDs</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Shareable buyer links with slippage protection and dynamic deposit addresses.
                </p>
              </div>
              <button
                onClick={() => setIsPaylinkModalOpen(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-onion hover:bg-onion-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create Payment Link</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {paylinks.map((pl) => (
                <div key={pl.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-slate-50/80 transition">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">{pl.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {pl.settlementMode === 'auto_offramp' ? 'Auto-AED' : 'Crypto Hold'}
                      </span>
                    </div>
                    <p className="text-slate-500">{pl.description || 'No description provided'}</p>
                    <p className="font-mono text-[11px] text-slate-400">
                      ID: <span className="font-semibold text-slate-700">{pl.id}</span> · URL: {pl.checkoutUrl}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <span className="font-black text-slate-900 text-base">
                        {pl.amountType === 'fixed' ? `${pl.amount} ${pl.currency}` : 'Open Amount'}
                      </span>
                      <p className="text-[10px] text-slate-400">Base & Solana Supported</p>
                    </div>

                    <button
                      onClick={() => setActiveQrModal(pl)}
                      className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition"
                      title="Show QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => copyToClipboard(pl.checkoutUrl, pl.id)}
                      className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition flex items-center space-x-1"
                    >
                      {copiedId === pl.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => onLaunchCheckout(pl)}
                      className="px-3 py-2 bg-onion-50 text-onion-800 hover:bg-onion-100 font-bold rounded-lg transition flex items-center space-x-1"
                    >
                      <span>Test Checkout</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Granular Transactions & Fee Split Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h2 className="font-extrabold text-base text-slate-900">Recent Transactions & On-Chain Splits</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every payment splits Orki fee (1.00%) + XSquare markup (0.25%) on-chain, and credits 98.75% to your wallet.
              </p>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{tx.type.replace('_', ' ').toUpperCase()}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Tx: {tx.txHash.substring(0, 16)}... · Payer: {tx.payerAddress}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-black text-slate-900 text-sm">+{tx.grossAmount} {tx.currency}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Net: <strong className="text-slate-800">{tx.netAmount}</strong> (Orki -{tx.orkiFeeAmount} · XSquare -{tx.pspMarkupAmount})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Notice Dialog (Darshan Part 3 Screen 2) */}
      {isConsentNoticeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4 border border-onion-200 text-xs">
            <h3 className="font-bold text-base text-slate-900">Set up USDC payments</h3>
            <p className="text-slate-600 leading-relaxed">
              To accept USDC payments, <strong className="text-slate-800">XSquare</strong> will share your business name, licence number and contact details with <strong className="text-slate-800">Orki</strong>, which provides the payment and wallet service, so Orki can verify your business. Orki's terms and privacy notice apply.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsConsentNoticeOpen(false)}
                className="py-2 px-4 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConsentContinue}
                className="py-2 px-5 bg-onion hover:bg-onion-700 text-white font-bold rounded-xl shadow-md transition"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Popup */}
      {activeQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center space-y-4 border border-onion-200">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-900">Scan to Pay with USDC</h3>
              <button onClick={() => setActiveQrModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-48 h-48 bg-slate-100 mx-auto rounded-2xl flex items-center justify-center border-2 border-onion-200">
              <QrCode className="w-32 h-32 text-onion" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">{activeQrModal.title}</p>
              <p className="font-mono text-xs text-slate-500 mt-1 truncate">{activeQrModal.checkoutUrl}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <OnboardingModal
        merchant={merchant}
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        onComplete={handleOnboardingComplete}
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
        onCompleteConversion={() => {}}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onCompleteTransfer={() => {}}
      />
    </div>
  )
}
