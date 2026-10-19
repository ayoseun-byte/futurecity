import React, { useState } from 'react'
import type { Merchant } from '../types'
import { X, ShieldCheck, CheckCircle2, Key, Fingerprint, Lock, UploadCloud, AlertCircle } from 'lucide-react'

interface OnboardingModalProps {
  merchant: Merchant
  isOpen: boolean
  onClose: () => void
  onComplete: (merchantId: string, baseWallet: string, solanaWallet: string, passkeyId: string) => void
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  merchant,
  isOpen,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [kybResult, setKybResult] = useState<'pending' | 'green' | 'retry' | 'red'>('pending')
  const [isSecureWindowOpen, setIsSecureWindowOpen] = useState(false)
  const [emailCode, setEmailCode] = useState('849201')
  const [passkeyCreated, setPasskeyCreated] = useState(false)

  if (!isOpen) return null

  const handleTermsSubmit = () => {
    if (!termsAccepted) return
    setStep(2)
  }

  const handleSimulateKyb = (result: 'green' | 'retry' | 'red') => {
    setKybResult(result)
    if (result === 'green') {
      setTimeout(() => {
        setStep(3)
      }, 700)
    }
  }

  const handleCompleteSetup = () => {
    const baseWallet = '0x71C25e36F7682245353526E3d2a7620E15dB949A'
    const solanaWallet = '4Nd1mBQtrMJVYVfKf2PJyGChdLkeR428kwBpdWgw6P58'
    const passkeyId = 'cred_passkey_' + Math.random().toString(36).substring(7)

    onComplete(merchant.id, baseWallet, solanaWallet, passkeyId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-[500px] bg-white rounded-2xl shadow-2xl border border-onion-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-onion p-5 text-white flex items-center justify-between border-b border-onion-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-white text-onion flex items-center justify-center font-bold text-sm">
              O
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Set up USDC payments</h2>
              <p className="text-xs text-onion-200">Powered by Orki · XSquare Integration</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-onion-700/80 font-semibold text-onion-100">
              Step {step} of 3
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-onion-700/60 transition text-onion-200 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* STEP 1: TERMS */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Step 1: Merchant Terms & Privacy Notice</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Orki records your browser fingerprint, direct IP address, and cryptographic text hash.
                </p>
              </div>

              <div className="h-44 p-3 bg-slate-50 border border-slate-200 rounded-xl overflow-y-auto text-xs text-slate-600 leading-relaxed space-y-2">
                <p className="font-semibold text-slate-800">1. Non-Custodial Stablecoin Operations</p>
                <p>
                  Neither Orki nor your Payment Service Provider (XSquare) ever takes custody of merchant float. All payments settle directly to your self-custody smart account or route non-custodially to UAE AED bank rails.
                </p>
                <p className="font-semibold text-slate-800">2. Passkey Authentication & Key Custody</p>
                <p>
                  Your browser passkey is held strictly on your device. Orki cannot recover or sign transactions on your behalf without your explicit biometric authorization.
                </p>
                <p className="font-semibold text-slate-800">3. Fee Schedule Enforcement</p>
                <p>
                  Platform fee (1.00%) and PSP markup are deducted on-chain at point of payment. AED off-ramp fees apply on conversion.
                </p>
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <input
                  id="terms-check"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-onion focus:ring-onion-500 w-4 h-4"
                />
                <label htmlFor="terms-check" className="text-xs text-slate-700 font-medium cursor-pointer">
                  I confirm I am an authorized representative of <span className="font-bold">{merchant.legalBusinessName}</span> and accept Orki's Merchant Terms.
                </label>
              </div>

              <button
                disabled={!termsAccepted}
                onClick={handleTermsSubmit}
                className="w-full mt-4 py-2.5 px-4 bg-onion hover:bg-onion-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition shadow-md"
              >
                Accept and continue
              </button>
            </div>
          )}

          {/* STEP 2: VERIFY BUSINESS (SUMSUB) */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Step 2: Business Verification (Sumsub)</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Pre-filled from XSquare. Documents are reviewed directly by Sumsub.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase">Business Name</span>
                  <span className="font-semibold text-slate-800">{merchant.legalBusinessName}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase">Trade Licence</span>
                  <span className="font-semibold text-slate-800">{merchant.tradeLicenseNumber}</span>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
                <UploadCloud className="w-8 h-8 text-onion-500 mx-auto mb-1" />
                <p className="text-xs font-medium text-slate-700">Company Trade Licence & Articles</p>
                <p className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</p>
              </div>

              {/* Sumsub Simulator Controls */}
              <div className="bg-onion-50 border border-onion-200 p-3 rounded-xl space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-onion-900">
                  <ShieldCheck className="w-4 h-4 text-onion-700" />
                  <span>Sumsub Sandbox Simulation:</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSimulateKyb('green')}
                    className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                  >
                    Pass (GREEN)
                  </button>
                  <button
                    onClick={() => handleSimulateKyb('retry')}
                    className="py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                  >
                    Action Needed
                  </button>
                  <button
                    onClick={() => handleSimulateKyb('red')}
                    className="py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                  >
                    Decline (RED)
                  </button>
                </div>
              </div>

              {kybResult === 'green' && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-500" />
                  Verification approved! Advancing to wallet setup...
                </div>
              )}

              {kybResult === 'retry' && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 mr-1.5 text-amber-600" />
                  Proof of address required: please provide utility bill or bank statement.
                </div>
              )}
            </div>
          )}

          {/* STEP 3: WALLET & PASSKEY (SECURE WINDOW) */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Step 3: Wallet & Passkey</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Passkeys are origin-locked to Orki's secure domain for non-custodial protection.
                </p>
              </div>

              {!isSecureWindowOpen ? (
                <div className="p-5 border border-slate-200 rounded-2xl text-center space-y-3 bg-slate-50/50">
                  <div className="w-12 h-12 rounded-2xl bg-onion-100 text-onion-700 flex items-center justify-center mx-auto">
                    <Key className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">Create Passkey Signer</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                      To safeguard your funds, passkey creation runs in a dedicated Orki window.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsSecureWindowOpen(true)}
                    className="py-2.5 px-5 bg-onion hover:bg-onion-700 text-white text-xs font-bold rounded-xl transition shadow-md"
                  >
                    Continue in a secure window
                  </button>
                </div>
              ) : (
                <div className="p-4 border-2 border-onion-300 rounded-2xl bg-onion-50/50 space-y-3">
                  <div className="flex items-center justify-between border-b border-onion-200 pb-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-onion-900">
                      <Lock className="w-3.5 h-3.5 text-onion-600" />
                      <span>https://auth.orki.io/secure-window</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                      SSL Verified
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <label className="text-slate-700 font-medium block">
                      Security Code sent to {merchant.representativeEmail}:
                    </label>
                    <input
                      type="text"
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center tracking-widest font-mono text-base font-bold text-slate-800"
                    />
                  </div>

                  {!passkeyCreated ? (
                    <button
                      onClick={() => setPasskeyCreated(true)}
                      className="w-full py-2.5 bg-onion hover:bg-onion-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-md"
                    >
                      <Fingerprint className="w-4 h-4" />
                      <span>Create Biometric Passkey (Touch ID / Face ID)</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                        <div className="flex items-center font-bold">
                          <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                          <span>Passkey Bound & Smart Accounts Derived:</span>
                        </div>
                        <p className="font-mono text-[11px] text-slate-600">Base: 0x71C25e36...949A</p>
                        <p className="font-mono text-[11px] text-slate-600">Solana: 4Nd1mBQtr...6P58</p>
                      </div>

                      <button
                        onClick={handleCompleteSetup}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md"
                      >
                        You're set up! Activate USDC Payments
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
