import React, { useState } from 'react'
import { X, Send, Lock, CheckCircle2 } from 'lucide-react'

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
  onCompleteTransfer: (amount: number, chain: string, dest: string) => void
}

export const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, onCompleteTransfer }) => {
  const [destinationAddress, setDestinationAddress] = useState('')
  const [chain, setChain] = useState<'base' | 'solana'>('base')
  const [amount, setAmount] = useState('500')
  const [isSending, setIsSending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  if (!isOpen) return null

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!destinationAddress || !amount) return

    setIsSending(true)
    setTimeout(() => {
      setIsSending(false)
      setIsSuccess(true)
      onCompleteTransfer(parseFloat(amount), chain, destinationAddress)
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
            <Send className="w-5 h-5 text-onion-200" />
            <h2 className="font-bold text-base">Transfer Crypto to External Wallet</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-onion-700/60 transition text-onion-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSend} className="p-6 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Blockchain Network</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChain('base')}
                className={`py-2 px-3 rounded-xl border font-bold text-xs transition ${
                  chain === 'base'
                    ? 'border-onion bg-onion-50 text-onion-900 ring-2 ring-onion-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Base (USDC)
              </button>
              <button
                type="button"
                onClick={() => setChain('solana')}
                className={`py-2 px-3 rounded-xl border font-bold text-xs transition ${
                  chain === 'solana'
                    ? 'border-onion bg-onion-50 text-onion-900 ring-2 ring-onion-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Solana (USDT)
              </button>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Destination External Address</label>
            <input
              type="text"
              required
              placeholder={chain === 'base' ? '0x...' : 'Base58 Solana address...'}
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Amount</label>
            <div className="relative">
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:ring-2 focus:ring-onion-500 focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 font-bold text-slate-400">
                {chain === 'base' ? 'USDC' : 'USDT'}
              </span>
            </div>
          </div>

          {isSuccess ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center space-x-2 text-emerald-800 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Transfer Signed & Confirmed On-Chain!</span>
            </div>
          ) : (
            <button
              disabled={isSending}
              type="submit"
              className="w-full py-3 bg-onion hover:bg-onion-700 text-white font-bold rounded-xl text-sm transition shadow-md flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>{isSending ? 'Signing with Passkey...' : 'Sign with Passkey & Send'}</span>
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
