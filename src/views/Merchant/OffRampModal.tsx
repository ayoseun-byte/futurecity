import React, { useState, useEffect } from 'react'
import { X, ArrowDownRight, Clock, CheckCircle2, Lock } from 'lucide-react'

interface OffRampModalProps {
  isOpen: boolean
  onClose: () => void
  onCompleteConversion: (sourceAmount: number, netAed: number) => void
}

export const OffRampModal: React.FC<OffRampModalProps> = ({
  isOpen,
  onClose,
  onCompleteConversion,
}) => {
  const [amountUsdc, setAmountUsdc] = useState('2500')
  const [secondsRemaining, setSecondsRemaining] = useState(120)
  const [isConverting, setIsConverting] = useState(false)
  const [conversionSuccess, setConversionSuccess] = useState(false)

  // 2-Minute Rate Lock Countdown (Darshan Part 6)
  useEffect(() => {
    if (!isOpen) return
    setSecondsRemaining(120)
    setConversionSuccess(false)

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          return 120 // Reset 2-min quote
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen])

  if (!isOpen) return null

  const parsedAmount = parseFloat(amountUsdc) || 0
  const rate = 3.6725
  const grossAed = parsedAmount * rate
  const bridgeFeeAed = Math.min(Math.max(grossAed * 0.002, 10), 150)
  const netAed = grossAed - bridgeFeeAed

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const rem = sec % 60
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`
  }

  const handleExecuteOffRamp = () => {
    setIsConverting(true)
    setTimeout(() => {
      setIsConverting(false)
      setConversionSuccess(true)
      onCompleteConversion(parsedAmount, netAed)
      setTimeout(() => {
        onClose()
      }, 1500)
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-onion-200 overflow-hidden">
        {/* Header */}
        <div className="bg-onion p-5 text-white flex items-center justify-between border-b border-onion-700">
          <div className="flex items-center space-x-2">
            <ArrowDownRight className="w-5 h-5 text-onion-200" />
            <h2 className="font-bold text-base">Convert USDC to AED (Bridge Rail)</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-onion-700/60 transition text-onion-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* Rate Lock Timer Banner */}
          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
            <div className="flex items-center space-x-1.5 font-bold">
              <Clock className="w-4 h-4 text-amber-600 animate-spin" />
              <span>Institutional Rate Locked:</span>
            </div>
            <div className="font-mono font-black text-sm text-amber-700">
              {formatTimer(secondsRemaining)}
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Amount to Convert (USDC)</label>
            <div className="relative">
              <input
                type="number"
                min="10"
                value={amountUsdc}
                onChange={(e) => setAmountUsdc(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:ring-2 focus:ring-onion-500 focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 font-bold text-slate-400">USDC</span>
            </div>
          </div>

          {/* Fee & Exchange Rate Breakdown */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex justify-between text-slate-500">
              <span>Exchange Rate</span>
              <span className="font-semibold text-slate-800">1 USDC = 3.6725 AED</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Gross Converted</span>
              <span className="font-mono text-slate-700">AED {grossAed.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Bridge Liquidity Fee (0.2%)</span>
              <span className="font-mono text-slate-700">- AED {bridgeFeeAed.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
              <span>Net Payout to Bank</span>
              <span className="text-onion font-extrabold font-mono">AED {netAed.toFixed(2)}</span>
            </div>
          </div>

          {/* Beneficiary Target */}
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-[11px] text-indigo-900 space-y-1">
            <span className="font-bold block">Verified UAE Destination Account:</span>
            <p className="font-mono">Emirates NBD · IBAN: AE0702600012345678901</p>
            <p className="text-indigo-700 font-medium">Settlement ETA: Instant (under AED 50k)</p>
          </div>

          {conversionSuccess ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center space-x-2 text-emerald-800 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Conversion Dispatched to UAE Bank!</span>
            </div>
          ) : (
            <button
              disabled={isConverting || parsedAmount <= 0}
              onClick={handleExecuteOffRamp}
              className="w-full py-3 bg-onion hover:bg-onion-700 text-white font-bold rounded-xl text-sm transition shadow-md flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>{isConverting ? 'Signing with Passkey...' : 'Approve with Passkey & Liquidate'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
