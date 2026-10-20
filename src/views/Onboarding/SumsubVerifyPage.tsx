import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShieldCheck, CheckCircle2, FileText, Camera, Building2, AlertCircle } from 'lucide-react'
import { updateStoredMerchant, getStoredMerchants } from '../../services/storageService'

export const SumsubVerifyPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const merchantId = searchParams.get('merchantId') || ''
  const merchants = getStoredMerchants()
  const merchant = merchants.find((m) => m.id === merchantId)

  const [step, setStep] = useState<'review' | 'upload' | 'selfie' | 'verifying' | 'success'>('review')
  const [isVerifying, setIsVerifying] = useState(false)

  const handleFinish = () => {
    setIsVerifying(true)
    setStep('verifying')

    setTimeout(() => {
      if (merchantId) {
        updateStoredMerchant(merchantId, {
          sumsubCompletedAt: new Date().toISOString(),
          nextStep: 'PASSKEY',
        })
      }
      setIsVerifying(false)
      setStep('success')

      // Notify opener window if present
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({ type: 'ORKI_SUMSUB_COMPLETED', merchantId }, '*')
        } catch {
          // ignore cross-origin error if any
        }
      }

      setTimeout(() => {
        window.close()
      }, 1800)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
      {/* Top Security Bar */}
      <div className="w-full max-w-lg mb-4 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono">sumsub.com/idensic/orki-kyb-v2</span>
        </div>
        <div className="flex items-center space-x-1 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>256-Bit SSL Encrypted</span>
        </div>
      </div>

      <div className="w-full max-w-lg bg-slate-800/90 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Sumsub Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Sumsub Business Verification</h2>
              <p className="text-xs text-slate-400">Institutional KYB & Corporate Identity Check</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
            Live Gateway
          </span>
        </div>

        {step === 'review' && (
          <div className="space-y-5">
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/70 space-y-2 text-xs">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center space-x-1.5 mb-2">
                <Building2 className="w-3.5 h-3.5 text-onion-400" />
                <span>Pre-filled Corporate Details</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Legal Entity:</span>
                <span className="font-medium text-slate-200">{merchant?.legalBusinessName || 'Falcon Luxury Goods LLC'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Trade License:</span>
                <span className="font-mono text-slate-200">{merchant?.tradeLicenseNumber || 'TL-2024-88912'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Jurisdiction:</span>
                <span className="text-slate-200">{merchant?.jurisdiction || 'Dubai DED / DMCC'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Authorized Rep:</span>
                <span className="text-slate-200">{merchant?.representativeName || 'Representative Signatory'}</span>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Please confirm that your Commercial Register / Trade License matches the official public registry records before proceeding.
              </span>
            </div>

            <button
              onClick={() => setStep('upload')}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition shadow-lg shadow-emerald-900/40 flex items-center justify-center space-x-2"
            >
              <span>Confirm & Proceed to Document Check</span>
            </button>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-5">
            <div className="text-xs text-slate-300 space-y-1">
              <h3 className="font-semibold text-white">Upload Corporate License Document</h3>
              <p className="text-slate-400">Upload PDF or high-resolution image of your Trade License / Articles.</p>
            </div>

            <div className="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center hover:border-emerald-500 transition cursor-pointer bg-slate-900/40">
              <FileText className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-200">
                {merchant?.tradeLicenseNumber || 'trade_license_doc'}.pdf
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Verified against Dubai Commercial Registry</p>
              <span className="inline-block mt-3 px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Document Validated
              </span>
            </div>

            <button
              onClick={() => setStep('selfie')}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition shadow-lg shadow-emerald-900/40 flex items-center justify-center space-x-2"
            >
              <Camera className="w-4 h-4" />
              <span>Proceed to Liveness Check</span>
            </button>
          </div>
        )}

        {step === 'selfie' && (
          <div className="space-y-5 text-center">
            <div className="w-28 h-28 rounded-full border-4 border-emerald-500/40 mx-auto flex items-center justify-center bg-slate-900 relative overflow-hidden">
              <Camera className="w-10 h-10 text-emerald-400" />
              <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">Biometric Liveness Verification</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Authorized representative face scan to ensure sanctions and PEP compliance.
              </p>
            </div>

            <button
              onClick={handleFinish}
              disabled={isVerifying}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition shadow-lg shadow-emerald-900/40 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete Verification</span>
            </button>
          </div>
        )}

        {step === 'verifying' && (
          <div className="py-10 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-200">Evaluating Sanctions & Registry Data...</p>
            <p className="text-xs text-slate-400 font-mono">Status: Processing Automated Decision (GREEN)</p>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Verification Completed Successfully</h3>
              <p className="text-xs text-slate-300 mt-1">
                Sumsub Approved. Status GREEN. Closing window and returning to dashboard...
              </p>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-[11px] text-slate-500 text-center">
        Powered by Sumsub Identification Services & Orki Compliance Protocol
      </p>
    </div>
  )
}
