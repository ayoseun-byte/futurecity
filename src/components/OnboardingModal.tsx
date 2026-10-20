import React, { useState } from 'react'
import type { Merchant, OnboardingStep } from '../types'
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Fingerprint,
  ExternalLink,
  ChevronRight,
  KeyRound,
  ArrowRight,
} from 'lucide-react'

interface OnboardingModalProps {
  merchant: Merchant
  isOpen: boolean
  onClose: () => void
  onComplete: (
    merchantId: string,
    merchantWallet: string,
    pspWallet: string,
    orkiWallet: string,
    passkeyId: string
  ) => void
  onStepChange?: (step: OnboardingStep | null) => void
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  merchant,
  isOpen,
  onClose,
  onComplete,
  onStepChange,
}) => {
  // Determine initial step based on merchant's current nextStep or default to 'NOTICE'
  const getInitialStep = (): OnboardingStep => {
    if (merchant.nextStep === 'OPT_IN' || !merchant.nextStep) return 'NOTICE'
    return merchant.nextStep
  }

  const [currentStep, setCurrentStep] = useState<OnboardingStep>(getInitialStep)
  const [noticeAccepted, setNoticeAccepted] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Sumsub simulation states
  const [isSumsubOpen, setIsSumsubOpen] = useState(false)
  const [sumsubProgress, setSumsubProgress] = useState<
    'idle' | 'uploading_doc' | 'scanning_face' | 'registry_check' | 'approved'
  >('idle')

  // Passkey simulation states
  const [isCreatingPasskey, setIsCreatingPasskey] = useState(false)
  const [passkeySuccess, setPasskeySuccess] = useState(false)

  if (!isOpen) return null

  // 1. Advance to Terms after Notice
  const handleAcknowledgeNotice = () => {
    setCurrentStep('TERMS')
    onStepChange?.('TERMS')
  }

  // 2. Advance to SumSub after Terms
  const handleAcceptTerms = () => {
    if (!termsAccepted) return
    setCurrentStep('SUMSUB')
    onStepChange?.('SUMSUB')
  }

  // 3. Launch SumSub Window
  const handleStartSumsub = () => {
    setIsSumsubOpen(true)
    setSumsubProgress('uploading_doc')

    setTimeout(() => {
      setSumsubProgress('scanning_face')
    }, 1500)

    setTimeout(() => {
      setSumsubProgress('registry_check')
    }, 3000)

    setTimeout(() => {
      setSumsubProgress('approved')
      setTimeout(() => {
        // Automatically closes Sumsub window and moves back to dashboard passkey step
        setIsSumsubOpen(false)
        setCurrentStep('PASSKEY')
        onStepChange?.('PASSKEY')
      }, 1000)
    }, 4500)
  }

  // 4. Biometric Passkey Ceremony
  const handleRegisterPasskey = async () => {
    setIsCreatingPasskey(true)

    try {
      // Attempt native WebAuthn if available, or fall back to high-grade simulated credential
      if (window.PublicKeyCredential) {
        // WebAuthn ceremony signature placeholder
        await new Promise((resolve) => setTimeout(resolve, 1200))
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1200))
      }

      setPasskeySuccess(true)
      const passkeyId = 'pk_bio_' + Math.random().toString(36).substring(2, 10)
      const merchantWallet = merchant.merchantWallet || '0x71C25e36F7682245353526E3d2a7620E15dB949A'
      const pspWallet = merchant.pspFeeWallet || '0xPspXsquareVault000000000000000000001'
      const orkiWallet = merchant.orkiFeeWallet || '0xOrkiProtocolFeeVault0000000000000000001'

      setTimeout(() => {
        onComplete(merchant.id, merchantWallet, pspWallet, orkiWallet, passkeyId)
        onClose()
      }, 1200)
    } catch {
      setIsCreatingPasskey(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-onion-50 text-onion-800 border border-onion-200/60 flex items-center justify-center font-bold text-lg">
              O
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                USDC Merchant Activation
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {merchant.legalBusinessName} · {merchant.jurisdiction}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progression Indicator */}
        <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <span
              className={`px-2 py-0.5 rounded font-medium text-[11px] ${
                currentStep === 'NOTICE'
                  ? 'bg-onion-100 text-onion-900 font-semibold'
                  : 'text-slate-400'
              }`}
            >
              1. Notice
            </span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span
              className={`px-2 py-0.5 rounded font-medium text-[11px] ${
                currentStep === 'TERMS'
                  ? 'bg-onion-100 text-onion-900 font-semibold'
                  : 'text-slate-400'
              }`}
            >
              2. Terms & Split
            </span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span
              className={`px-2 py-0.5 rounded font-medium text-[11px] ${
                currentStep === 'SUMSUB'
                  ? 'bg-onion-100 text-onion-900 font-semibold'
                  : 'text-slate-400'
              }`}
            >
              3. SumSub KYB
            </span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span
              className={`px-2 py-0.5 rounded font-medium text-[11px] ${
                currentStep === 'PASSKEY'
                  ? 'bg-onion-100 text-onion-900 font-semibold'
                  : 'text-slate-400'
              }`}
            >
              4. Passkey
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* STEP 1: NOTICE API */}
          {currentStep === 'NOTICE' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Regulatory & Stablecoin Operations Notice
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Please review the mandatory disclosures regarding non-custodial stablecoin processing, smart accounts, and settlement routing.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs text-slate-600 max-h-52 overflow-y-auto leading-relaxed">
                <div>
                  <p className="font-semibold text-slate-800">1. Non-Custodial Multi-Chain Float</p>
                  <p className="mt-0.5">
                    Neither Orki nor your PSP holds your funds in custody. Customer payments transfer directly into your smart account on Base or Solana, or auto-offramp into your verified bank account.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">2. Tri-Wallet Atomic Split Settlement</p>
                  <p className="mt-0.5">
                    On every checkout, fees are divided at point of transaction into designated fee vaults: Orki Protocol Fee (1.00%), PSP Markup Fee, and your Net Proceeds.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">3. Off-Ramp Exclusivity</p>
                  <p className="mt-0.5">
                    PSPs cannot charge conversion markups on fiat off-ramping. Only Orki applies standard conversion spreads to liquid bank rail off-ramps.
                  </p>
                </div>
              </div>

              <label className="flex items-start space-x-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noticeAccepted}
                  onChange={(e) => setNoticeAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-onion focus:ring-onion-500/20"
                />
                <span className="text-xs font-medium text-slate-700">
                  I acknowledge receipt and understanding of the regulatory notice.
                </span>
              </label>

              <div className="flex justify-end pt-3">
                <button
                  onClick={handleAcknowledgeNotice}
                  disabled={!noticeAccepted}
                  className="mat-btn-primary px-5 py-2 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5"
                >
                  <span>Continue to Terms</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: TERMS AND CONDITIONS & SPLIT BREAKDOWN */}
          {currentStep === 'TERMS' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Orki Terms & Conditions & Fee Split Schedule
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Upon contract activation, your payments will automatically split into the designated smart account vaults below.
                </p>
              </div>

              {/* Fee Breakdown Box */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Orki Base Fee
                  </p>
                  <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                    1.00% <span className="text-xs font-normal text-slate-500">(Cap $25.00)</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    Vault: {merchant.orkiFeeWallet?.substring(0, 10)}...
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    PSP Commission Markup
                  </p>
                  <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                    {(merchant.pspFeeBps || 35) / 100}%{' '}
                    <span className="text-xs font-normal text-emerald-600">(Under 1.00% Cap)</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    Vault: {merchant.pspFeeWallet?.substring(0, 10)}...
                  </p>
                </div>
              </div>

              {/* Terms Clauses */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-600 max-h-36 overflow-y-auto">
                <p className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>30-Day Rate Lock: Processing fee changes are locked for 30 days.</span>
                </p>
                <p className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>No Off-Ramp Markups from PSP: Off-ramp is handled exclusively by Orki.</span>
                </p>
                <p className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Direct settlement to verified merchant non-custodial smart wallet.</span>
                </p>
              </div>

              <label className="flex items-start space-x-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-onion focus:ring-onion-500/20"
                />
                <span className="text-xs font-medium text-slate-700">
                  I accept the Orki Merchant Agreement and authorize automatic tri-wallet split settlements.
                </span>
              </label>

              <div className="flex justify-between items-center pt-3">
                <button
                  onClick={() => setCurrentStep('NOTICE')}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Back
                </button>
                <button
                  onClick={handleAcceptTerms}
                  disabled={!termsAccepted}
                  className="mat-btn-primary px-5 py-2 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5"
                >
                  <span>Proceed to Identity Check</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUMSUB IDENTITY VERIFICATION */}
          {currentStep === 'SUMSUB' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Business Identity Verification (SumSub)
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  We verify your trade license and representative credentials via SumSub. A verification session will open in a secure window.
                </p>
              </div>

              {/* Status Box */}
              <div className="p-5 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-onion-50 text-onion border border-onion-200 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Trade License & Representative KYC
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {merchant.tradeLicenseNumber} · {merchant.jurisdiction}
                  </p>
                </div>

                <button
                  onClick={handleStartSumsub}
                  disabled={isSumsubOpen}
                  className="mat-btn-primary px-4 py-2 text-xs font-medium flex items-center space-x-1.5 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch SumSub Verification</span>
                </button>
              </div>

              {/* Sumsub Simulated Window */}
              {isSumsubOpen && (
                <div className="p-4 bg-slate-900 text-white rounded-xl shadow-lg space-y-3 animate-in fade-in duration-200 border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                      SumSub Secure Verification Window
                    </span>
                    <span className="text-[10px] text-slate-400">Auto-closing on complete</span>
                  </div>

                  <div className="text-xs space-y-1.5 py-1">
                    {sumsubProgress === 'uploading_doc' && (
                      <p className="text-slate-300">Scanning Trade License DMCC-2024-88912...</p>
                    )}
                    {sumsubProgress === 'scanning_face' && (
                      <p className="text-slate-300">Biometric Liveness Check in progress...</p>
                    )}
                    {sumsubProgress === 'registry_check' && (
                      <p className="text-slate-300">Verifying Public Chamber of Commerce registry...</p>
                    )}
                    {sumsubProgress === 'approved' && (
                      <p className="text-emerald-400 font-bold flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        Verification Passed! Closing window & returning to dashboard...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: PASSKEY REGISTRATION & CONTRACT DEPLOYMENT */}
          {currentStep === 'PASSKEY' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Register Biometric Passkey
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Your WebAuthn passkey enables non-custodial authorization for float off-ramping and multi-chain payments directly via your device hardware.
                </p>
              </div>

              {/* Passkey Visual Surface */}
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-onion-50 text-onion-800 border border-onion-200/80 flex items-center justify-center">
                  <Fingerprint className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Touch ID / Face ID / Platform Authenticator
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                    Never stored on Orki servers. Your cryptographic key remains sealed inside your device secure enclave.
                  </p>
                </div>

                {!passkeySuccess ? (
                  <button
                    onClick={handleRegisterPasskey}
                    disabled={isCreatingPasskey}
                    className="mat-btn-primary px-6 py-2.5 text-xs font-semibold flex items-center space-x-2 mx-auto disabled:opacity-60"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isCreatingPasskey ? 'Prompting Device Authenticator...' : 'Register Passkey Now'}</span>
                  </button>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center justify-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Passkey Enrolled! Deploying Tri-Wallet Contract...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
