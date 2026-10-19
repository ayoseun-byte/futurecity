import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import type { Paylink, Transaction } from '../../types'
import { QrCode, Clock, ShieldCheck, CheckCircle2, ArrowRight, Copy, Check, Zap } from 'lucide-react'

interface CustomerCheckoutViewProps {
  activePaylink?: Paylink | null
  allPaylinks?: Paylink[]
  onPaymentSettled: (newTransaction: Transaction) => void
}

export const CustomerCheckoutView: React.FC<CustomerCheckoutViewProps> = ({
  activePaylink: propActivePaylink,
  allPaylinks = [],
  onPaymentSettled,
}) => {
  const { slug } = useParams<{ slug: string }>()
  const activePaylink =
    propActivePaylink ||
    allPaylinks.find((p) => p.slug === slug) ||
    allPaylinks[0] ||
    null

  const [selectedChain, setSelectedChain] = useState<'base' | 'solana'>('base')
  const [secondsRemaining, setSecondsRemaining] = useState(900) // 15-minute lock
  const [isCopied, setIsCopied] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'detected' | 'settled'>('pending')
  const [txHash, setTxHash] = useState('')

  useEffect(() => {
    setSecondsRemaining(900)
    setPaymentStatus('pending')
    setTxHash('')

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [activePaylink])

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const rem = sec % 60
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`
  }

  // Derive deposit address based on settlement mode
  const isAutoOfframp = activePaylink?.settlementMode === 'auto_offramp'
  const depositAddress = isAutoOfframp
    ? (selectedChain === 'base' ? '0xBridgeLiq7719284910293810293810293810' : 'BridgeLiq7719284910293810293810293810')
    : (selectedChain === 'base' ? '0x71C25e36F7682245353526E3d2a7620E15dB949A' : '4Nd1mBQtrMJVYVfKf2PJyGChdLkeR428kwBpdWgw6P58')

  const copyAddress = () => {
    navigator.clipboard.writeText(depositAddress)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleSimulatePayment = () => {
    const generatedTx = selectedChain === 'base'
      ? '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
      : Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('') + 'sol'

    setTxHash(generatedTx)
    setPaymentStatus('detected')

    setTimeout(() => {
      setPaymentStatus('settled')

      const gross = activePaylink?.amount || 250.0
      const orkiFee = gross * 0.01 // 100 bps
      const pspMarkup = gross * 0.0025 // 25 bps
      const net = gross - orkiFee - pspMarkup

      const newTx: Transaction = {
        id: 'tx_' + Math.random().toString(36).substring(7),
        merchantId: 'mrch_9f2a1c',
        type: isAutoOfframp ? 'auto_offramp_payout' : 'payment_collection',
        grossAmount: gross,
        currency: 'USDC',
        orkiFeeBps: 100,
        orkiFeeAmount: orkiFee,
        pspMarkupBps: 25,
        pspMarkupAmount: pspMarkup,
        netAmount: net,
        chain: selectedChain,
        txHash: generatedTx,
        payerAddress: '0xBuyer...84a2',
        status: 'completed',
        createdAt: new Date().toISOString(),
      }

      onPaymentSettled(newTx)
    }, 1500)
  }

  return (
    <div className="max-w-xl mx-auto py-6">
      <div className="bg-white rounded-3xl shadow-xl border border-onion-200 overflow-hidden">
        {/* Top Header */}
        <div className="bg-onion p-6 text-white flex items-center justify-between border-b border-onion-700">
          <div>
            <span className="text-xs text-onion-200 font-semibold uppercase tracking-wider block">
              Orki Dynamic Checkout
            </span>
            <h1 className="text-xl font-extrabold text-white mt-0.5">
              {activePaylink?.title || 'Annual Enterprise SaaS License'}
            </h1>
            <p className="text-xs text-onion-200 mt-1">Merchant: Acme General Trading LLC</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-white block">
              ${activePaylink?.amount || 250.0}
            </span>
            <span className="text-[11px] font-semibold text-onion-200">USDC / USDT</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* 15-Minute Locked Quote Timer */}
          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-semibold">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>Session Locked Rate:</span>
            </div>
            <div className="font-mono font-black text-sm text-amber-800">
              {formatTimer(secondsRemaining)}
            </div>
          </div>

          {/* Network Selection */}
          <div>
            <label className="font-bold text-slate-700 block mb-2">Select Payment Rail</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedChain('base')}
                className={`p-3.5 rounded-2xl border text-left transition flex items-center space-x-3 ${
                  selectedChain === 'base'
                    ? 'border-onion bg-onion-50 text-onion-950 ring-2 ring-onion-500 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-xs">
                  B
                </div>
                <div>
                  <p className="font-bold">Base Network</p>
                  <p className="text-[10px] text-slate-500">USDC · Instant</p>
                </div>
              </button>

              <button
                onClick={() => setSelectedChain('solana')}
                className={`p-3.5 rounded-2xl border text-left transition flex items-center space-x-3 ${
                  selectedChain === 'solana'
                    ? 'border-onion bg-onion-50 text-onion-950 ring-2 ring-onion-500 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center text-xs">
                  S
                </div>
                <div>
                  <p className="font-bold">Solana Network</p>
                  <p className="text-[10px] text-slate-500">USDT · Low Gas</p>
                </div>
              </button>
            </div>
          </div>

          {/* QR Code & Deposit Address */}
          <div className="p-5 border-2 border-slate-100 rounded-2xl bg-slate-50/75 text-center space-y-3">
            <div className="w-44 h-44 bg-white rounded-2xl p-2 mx-auto shadow-inner border border-slate-200 flex items-center justify-center">
              <QrCode className="w-36 h-36 text-onion" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Send exactly ${activePaylink?.amount || 250.0} USDC to:
              </span>
              <div className="flex items-center justify-center space-x-2 bg-white border border-slate-200 rounded-xl p-2.5 max-w-sm mx-auto">
                <span className="font-mono text-xs font-semibold text-slate-800 truncate">
                  {depositAddress}
                </span>
                <button onClick={copyAddress} className="text-onion hover:text-onion-800 p-1">
                  {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isAutoOfframp ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-amber-700" />
                Bridge Liquidation Address (Auto AED Settlement)
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                Non-Custodial Direct Merchant Smart Account
              </span>
            )}
          </div>

          {/* Payment Status State Banner */}
          {paymentStatus === 'settled' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-emerald-800 font-extrabold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Payment Confirmed & Settled On-Chain!</span>
              </div>
              <p className="font-mono text-[11px] text-slate-600 break-all">Tx Hash: {txHash}</p>
              <p className="text-[11px] text-emerald-700 font-semibold">
                Orki Fee (1.00%) & XSquare Markup (0.25%) deducted on-chain. Net credited to merchant.
              </p>
            </div>
          )}

          {paymentStatus === 'detected' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center space-x-2 text-blue-800 font-bold">
              <Zap className="w-4 h-4 text-blue-600 animate-spin" />
              <span>Deposit detected on-chain! Awaiting 2 block confirmations...</span>
            </div>
          )}

          {/* Interactive Simulator Trigger */}
          {paymentStatus === 'pending' && (
            <button
              onClick={handleSimulatePayment}
              className="w-full py-3.5 bg-onion hover:bg-onion-700 text-white font-extrabold rounded-2xl text-sm transition shadow-lg flex items-center justify-center space-x-2"
            >
              <span>Simulate Buyer Wallet Payment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
