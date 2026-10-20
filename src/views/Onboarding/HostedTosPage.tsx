import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ShieldCheck, FileText, CheckCircle2, Lock, ExternalLink, Globe, ArrowRight } from 'lucide-react'
import { getStoredMerchants, updateStoredMerchant } from '../../services/storageService'
import type { TosAcceptance } from '../../types'

export const HostedTosPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const merchants = getStoredMerchants()

  // Match merchant by token or use active merchant
  const merchant = merchants.find(
    (m) =>
      token?.includes(m.id) ||
      token === `token_tos_${m.id.substring(0, 8)}` ||
      m.nextStep === 'TERMS'
  ) || merchants[0]

  const [clientIp, setClientIp] = useState('203.0.113.42')
  const [hasAgreed, setHasAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAccepted, setIsAccepted] = useState(false)

  // Fetch or simulate client IP
  useEffect(() => {
    // Try to fetch public IP, fallback to standard mock IP
    fetch('https://api.ipify.org?format=json')
      .then((r) => r.json())
      .then((data) => {
        if (data?.ip) setClientIp(data.ip)
      })
      .catch(() => {
        setClientIp('203.0.113.42')
      })
  }, [])

  const tosData: TosAcceptance = {
    id: 'ta_' + (merchant ? merchant.id.substring(0, 10) : '981240182'),
    entityName: 'ORKI PROTOCOL LTD',
    status: isAccepted || merchant?.termsAcceptedAt ? 'accepted' : 'pending',
    link: `/tos/${token || 'token_1234567890'}`,
    documentLinks: {
      tos: 'https://legal.orki.network/documents/merchant-terms-of-service.pdf',
      privacyPolicy: 'https://legal.orki.network/documents/privacy-policy.pdf',
    },
    acceptedAt: merchant?.termsAcceptedAt || null,
    token: token || 'token_1234567890',
    ipAddress: clientIp,
  }

  const handleAccept = () => {
    if (!hasAgreed) return
    setIsSubmitting(true)

    setTimeout(() => {
      if (merchant) {
        updateStoredMerchant(merchant.id, {
          termsAcceptedAt: new Date().toISOString(),
          status: 'terms_accepted',
          nextStep: 'SUMSUB',
        })
      }
      setIsSubmitting(false)
      setIsAccepted(true)

      // Notify opener window if opened via popup
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({ type: 'ORKI_TOS_ACCEPTED', merchantId: merchant?.id }, '*')
        } catch {
          // ignore
        }
      }

      setTimeout(() => {
        if (window.opener) {
          window.close()
        } else {
          navigate('/merchant')
        }
      }, 1500)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      {/* Top Protocol Security Header */}
      <div className="w-full max-w-xl mb-4 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-slate-300">app.orki.network{tosData.link}</span>
        </div>
        <div className="flex items-center space-x-1.5 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Due & Orki Compliance Protocol</span>
        </div>
      </div>

      <div className="w-full max-w-xl bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-onion-500/20 border border-onion-500/30 flex items-center justify-center text-onion-400 font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Terms of Service & Privacy Acceptance</h2>
              <p className="text-xs text-slate-400">Option A: Hosted Legal Verification</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
            {tosData.status}
          </span>
        </div>

        {!isAccepted ? (
          <div className="space-y-6 text-xs text-slate-300">
            {/* Entity Identification */}
            <div className="bg-slate-900/70 rounded-2xl p-4 border border-slate-700/80 space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Issuing Legal Entity:</span>
                <span className="font-semibold text-white font-mono">{tosData.entityName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Merchant Entity:</span>
                <span className="font-medium text-white">{merchant?.legalBusinessName || 'Merchant'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Verified Client IP:</span>
                <span className="font-mono text-emerald-400 flex items-center space-x-1">
                  <Globe className="w-3 h-3" />
                  <span>{clientIp}</span>
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">One-Time Token:</span>
                <span className="font-mono text-slate-400 text-[11px] truncate max-w-xs">{tosData.token}</span>
              </div>
            </div>

            {/* Document Links Section (Step 2 - Present the Documents) */}
            <div className="space-y-2.5">
              <h3 className="font-semibold text-white text-xs uppercase tracking-wider text-[11px] text-slate-400">
                Required Legal Documents
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Terms of Service Link */}
                <a
                  href={tosData.documentLinks.tos}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-slate-900/50 hover:bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl transition flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-4 h-4 text-onion-400" />
                    <div>
                      <p className="font-semibold text-white text-xs">Terms of Service</p>
                      <p className="text-[10px] text-slate-400">documentLinks.tos (PDF)</p>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition" />
                </a>

                {/* Privacy Policy Link */}
                <a
                  href={tosData.documentLinks.privacyPolicy}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-slate-900/50 hover:bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl transition flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="font-semibold text-white text-xs">Privacy Policy</p>
                      <p className="text-[10px] text-slate-400">documentLinks.privacyPolicy (PDF)</p>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition" />
                </a>
              </div>
            </div>

            {/* 30-Day Locked Rate Disclosure */}
            <div className="p-3.5 bg-slate-900/40 border border-slate-700/60 rounded-xl space-y-1.5 text-[11px] text-slate-400">
              <div className="flex justify-between text-slate-300">
                <span>Orki Protocol Fee:</span>
                <span className="font-mono font-semibold text-white">1.00% (Cap $25.00 USDC)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>PSP Commission Markup:</span>
                <span className="font-mono font-semibold text-white">{((merchant?.pspFeeBps || 35) / 100).toFixed(2)}% (Max 1.00%)</span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1">
                Neither Orki nor your PSP holds your merchant funds at any time. Settlements partition atomically on-chain.
              </p>
            </div>

            {/* Acceptance Checkbox */}
            <label className="flex items-start space-x-3 cursor-pointer p-3 bg-slate-900/30 rounded-xl border border-slate-800 hover:border-slate-700 transition">
              <input
                type="checkbox"
                checked={hasAgreed}
                onChange={(e) => setHasAgreed(e.target.checked)}
                className="mt-0.5 rounded text-onion-600 focus:ring-onion-500 bg-slate-800 border-slate-700"
              />
              <span className="text-xs text-slate-300 leading-relaxed">
                I confirm that I have reviewed the <span className="text-white font-medium">Terms of Service</span> and{' '}
                <span className="text-white font-medium">Privacy Policy</span> issued by <strong className="text-white">{tosData.entityName}</strong>. I authorize the collection of my client IP ({clientIp}) for regulatory audit.
              </span>
            </label>

            <button
              onClick={handleAccept}
              disabled={!hasAgreed || isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-onion-700 hover:bg-onion-600 text-white font-semibold text-xs transition shadow-lg shadow-onion-950/60 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting TOS Acceptance (POST /v1/tos/{tosData.token})...</span>
                </>
              ) : (
                <>
                  <span>Accept Terms & Complete Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">TOS Accepted Successfully</h3>
              <p className="text-xs text-slate-300 mt-1">
                Status transitioned to <strong>accepted</strong>. Client IP ({clientIp}) recorded on immutable audit ledger.
              </p>
            </div>
            <p className="text-[11px] text-slate-400 animate-pulse font-mono">
              Webhook bp.tos_accepted dispatched. Closing window...
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 text-[11px] text-slate-500 text-center font-mono">
        Orki Legal Gateway · Due Network API Integration Spec 2026
      </p>
    </div>
  )
}
