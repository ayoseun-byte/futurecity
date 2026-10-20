import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { KeyRound, Fingerprint, ShieldCheck, CheckCircle2, Lock, Sparkles, Smartphone } from 'lucide-react'
import { updateStoredMerchant, getStoredMerchants } from '../../services/storageService'

export const PasskeyCeremonyPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const merchantId = searchParams.get('merchantId') || ''
  const merchants = getStoredMerchants()
  const merchant = merchants.find((m) => m.id === merchantId)

  const [isCeremonyActive, setIsCeremonyActive] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [createdWallets, setCreatedWallets] = useState<{ base: string; solana: string } | null>(null)

  const handleStartPasskey = async () => {
    setIsCeremonyActive(true)

    // Simulate WebAuthn biometric prompt delay
    setTimeout(() => {
      // Deterministic / realistic mock addresses
      const randomHex = Math.random().toString(16).substring(2, 10)
      const baseAddr = `0x71C25e36F7682245353526E3d2a7620E15${randomHex}`
      const solAddr = `4Nd1mBQtrMJVYVfKf2PJyGChdLkeR428kwBpdWgw6P${randomHex.substring(0, 2)}`
      const passkeyId = `cred_webauthn_${Math.random().toString(36).substring(2, 12)}`

      if (merchantId) {
        updateStoredMerchant(merchantId, {
          merchantWallet: baseAddr,
          baseWalletAddress: baseAddr,
          solanaWalletAddress: solAddr,
          passkeyId: passkeyId,
          passkeyRegisteredAt: new Date().toISOString(),
          status: 'active',
          nextStep: null, // Fully onboarded!
          activatedAt: new Date().toISOString(),
        })
      }

      setCreatedWallets({ base: baseAddr, solana: solAddr })
      setIsCeremonyActive(false)
      setIsSuccess(true)

      // Notify opener window if present
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({ type: 'ORKI_PASSKEY_COMPLETED', merchantId, baseAddr, solAddr }, '*')
        } catch {
          // ignore
        }
      }

      setTimeout(() => {
        window.close()
      }, 2500)
    }, 1800)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      {/* Top Security Bar */}
      <div className="w-full max-w-lg mb-4 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Lock className="w-3.5 h-3.5 text-onion-400" />
          <span className="font-mono text-onion-300">vault.orki.io/onboarding/passkey</span>
        </div>
        <div className="flex items-center space-x-1 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>FIDO2 / WebAuthn Level 3</span>
        </div>
      </div>

      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-onion-500/20 border border-onion-500/30 flex items-center justify-center text-onion-400 font-bold">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Biometric Passkey Ceremony</h2>
              <p className="text-xs text-slate-400">Non-Custodial Merchant Wallet Signer</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-onion-500/20 text-onion-300 border border-onion-500/30 uppercase">
            Web3Auth Core
          </span>
        </div>

        {!isSuccess ? (
          <div className="space-y-6">
            <div className="text-center py-4 space-y-3">
              <div className="relative w-24 h-24 mx-auto rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center">
                <Fingerprint className={`w-12 h-12 text-onion-400 ${isCeremonyActive ? 'animate-pulse' : ''}`} />
                {isCeremonyActive && (
                  <div className="absolute inset-0 rounded-3xl border-2 border-onion-400 animate-ping opacity-30" />
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Create Passkey Signer</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Using your device's Touch ID, Face ID, or Windows Hello. Your private credentials never leave this secure enclave.
                </p>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-800 space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center space-x-2 text-onion-300 font-medium text-[11px] uppercase tracking-wider">
                <Smartphone className="w-3.5 h-3.5" />
                <span>On-Chain Cryptographic Binding</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-700/60">
                <span className="text-slate-400">Merchant Entity:</span>
                <span className="font-medium text-white">{merchant?.legalBusinessName || 'Merchant'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-700/60">
                <span className="text-slate-400">Networks Enabled:</span>
                <span className="text-white font-mono">Base (EVM) · Solana (SVM)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Security Architecture:</span>
                <span className="text-emerald-400 font-semibold">100% Non-Custodial (ZeroDev)</span>
              </div>
            </div>

            <button
              onClick={handleStartPasskey}
              disabled={isCeremonyActive}
              className="w-full py-3.5 px-4 rounded-xl bg-onion-700 hover:bg-onion-600 text-white font-semibold text-sm transition shadow-lg shadow-onion-950/60 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isCeremonyActive ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Prompting Device Biometrics...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Authorize Passkey via Touch ID / Face ID</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="py-6 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center justify-center space-x-2">
                <span>Passkey Created & Verified</span>
                <Sparkles className="w-4 h-4 text-onion-400" />
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                Your non-custodial merchant wallets have been initialized on Base and Solana.
              </p>
            </div>

            {createdWallets && (
              <div className="bg-slate-800/80 rounded-xl p-3 text-left font-mono text-[11px] space-y-1.5 border border-slate-700">
                <div>
                  <span className="text-slate-400">Base Wallet: </span>
                  <span className="text-emerald-300">{createdWallets.base}</span>
                </div>
                <div>
                  <span className="text-slate-400">Solana Wallet: </span>
                  <span className="text-purple-300">{createdWallets.solana}</span>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400 animate-pulse font-medium">
              Closing secure window and returning to dashboard...
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 text-[11px] text-slate-500 text-center">
        Orki Protocol · Web3Auth · FIDO2 Passkey Specification
      </p>
    </div>
  )
}
