import React, { useState, useEffect } from 'react'
import { ArrowDownRight, ShieldCheck, ShieldAlert, X, ExternalLink, Loader2, ArrowRight } from 'lucide-react'
import { getApiConfig, requestApi } from '../../services/apiConfig'

interface OffRampModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface DueStatusResponse {
  merchantId: string
  settlementMode: string
  dueKybStatus: string
  offrampEligible: boolean
  verifiedAt?: string | null
}

export const OffRampModal: React.FC<OffRampModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [dueStatus, setDueStatus] = useState<DueStatusResponse | null>(null)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'USDC' | 'USDT'>('USDC')
  const [quote, setQuote] = useState<{ targetAmount?: string; exchangeRate?: string; fee?: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let active = true
    setLoadingStatus(true)
    requestApi<DueStatusResponse>(getApiConfig(), 'GET', '/api/v1/merchant/settlement/due', undefined, 'merchant')
      .then((res) => {
        if (!active) return
        setDueStatus(res)
      })
      .catch(() => {
        if (!active) return
        setDueStatus({
          merchantId: '',
          settlementMode: 'hold_as_received',
          dueKybStatus: 'not_started',
          offrampEligible: false,
        })
      })
      .finally(() => {
        if (active) setLoadingStatus(false)
      })
    return () => { active = false }
  }, [isOpen])

  if (!isOpen) return null

  const handleStartDueSession = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await requestApi<{ verificationUrl: string }>(
        getApiConfig(),
        'POST',
        '/api/v1/merchant/settlement/due-session',
        undefined,
        'merchant'
      )
      if (res.verificationUrl) {
        window.open(res.verificationUrl, '_blank')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not launch Due verification session.')
    } finally {
      setBusy(false)
    }
  }

  const handleGetQuote = async () => {
    if (!amount || Number(amount) <= 0) return
    setBusy(true)
    setError(null)
    try {
      const res = await requestApi<{ targetAmount: string; exchangeRate: string; fee?: string }>(
        getApiConfig(),
        'POST',
        '/api/v1/merchant/conversions/quote',
        {
          sourceCurrency: currency,
          targetCurrency: 'AED',
          sourceAmount: Number(amount),
        },
        'merchant'
      )
      setQuote(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve off-ramp quote.')
    } finally {
      setBusy(false)
    }
  }

  const handleExecuteOfframp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) return
    setBusy(true)
    setError(null)
    try {
      await requestApi(
        getApiConfig(),
        'POST',
        '/api/v1/merchant/conversions',
        {
          sourceCurrency: currency,
          targetCurrency: 'AED',
          sourceAmount: Number(amount),
        },
        'merchant'
      )
      setSuccess(true)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Off-ramp dispatch failed.')
    } finally {
      setBusy(false)
    }
  }

  const isEligible = dueStatus?.offrampEligible || dueStatus?.dueKybStatus === 'approved'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-onion-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-onion-700 bg-onion p-5 text-white">
          <div className="flex items-center space-x-2">
            <ArrowDownRight className="h-5 w-5 text-onion-200" />
            <h2 className="text-base font-bold">Institutional Due Off-Ramp (AED)</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-onion-200 transition hover:bg-onion-700/60 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6 text-xs">
          {loadingStatus ? (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span>Verifying Due settlement compliance…</span>
            </div>
          ) : !isEligible ? (
            <div className="space-y-4">
              <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <ShieldAlert className="mb-2 h-5 w-5 text-amber-700" />
                <p className="font-bold">Layer 2 Fiat Off-Ramp Verification Required</p>
                <p className="mt-1 leading-relaxed">
                  Off-ramping to UAE AED bank accounts is processed through Due institutional rails. Please complete recipient verification.
                </p>
                <div className="mt-2 text-[11px] font-mono text-amber-800">
                  Status: {dueStatus?.dueKybStatus || 'not_started'}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-medium">
                  {error}
                </div>
              )}

              <button
                type="button"
                disabled={busy}
                onClick={handleStartDueSession}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-onion px-4 py-3 text-xs font-bold text-white hover:bg-onion-700 transition shadow-md"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                <span>Start Due Verification Session</span>
              </button>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                <p className="flex items-center gap-2 font-bold text-sm">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  Off-ramp initiated successfully!
                </p>
                <p className="mt-2 text-xs">
                  Your funds are queued for payout directly to your verified UAE AED bank account via Due.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-onion px-4 py-2.5 text-xs font-bold text-white hover:bg-onion-700 transition"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleExecuteOfframp} className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-bold">Verified for Due institutional off-ramp</span>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Source Amount</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="250.00"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setQuote(null) }}
                    className="col-span-2 px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:ring-2 focus:ring-onion-500 focus:outline-none"
                  />
                  <select
                    value={currency}
                    onChange={(e) => { setCurrency(e.target.value as 'USDC' | 'USDT'); setQuote(null) }}
                    className="px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-onion-500 focus:outline-none"
                  >
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>
              </div>

              {quote ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-700">
                  <div className="flex justify-between font-mono">
                    <span>Target Payout:</span>
                    <span className="font-bold text-slate-900">{quote.targetAmount} AED</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>Pegged Rate:</span>
                    <span>1 USD = {quote.exchangeRate} AED</span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGetQuote}
                  disabled={busy || !amount}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition"
                >
                  Get AED Quote
                </button>
              )}

              <button
                type="submit"
                disabled={busy || !amount}
                className="w-full flex items-center justify-center gap-2 py-3 bg-onion hover:bg-onion-700 text-white font-bold rounded-xl text-xs transition shadow-md disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Confirm & Execute Off-Ramp</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

