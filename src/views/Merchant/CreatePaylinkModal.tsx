import React, { useState } from 'react'
import { X, Link2 } from 'lucide-react'
import type { Paylink, SettlementMode } from '../../types'

interface CreatePaylinkModalProps {
  isOpen: boolean
  onClose: () => void
  onPaylinkCreated: (paylink: Paylink) => void
  merchantDefaultSettlement: SettlementMode
}

export const CreatePaylinkModal: React.FC<CreatePaylinkModalProps> = ({
  isOpen,
  onClose,
  onPaylinkCreated,
  merchantDefaultSettlement,
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amountType, setAmountType] = useState<'fixed' | 'open'>('fixed')
  const [amount, setAmount] = useState('250')
  const [settlementMode, setSettlementMode] = useState<SettlementMode>(merchantDefaultSettlement)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(7)
    const newPaylink: Paylink = {
      id: 'plink_' + Math.random().toString(36).substring(7),
      slug: slug,
      title: title,
      description: description || undefined,
      amountType: amountType,
      amount: amountType === 'fixed' ? parseFloat(amount) : undefined,
      currency: 'USDC',
      settlementMode: settlementMode,
      allowedChains: ['base', 'solana'],
      status: 'active',
      checkoutUrl: `${window.location.origin}/checkout/${slug}`,
      createdAt: new Date().toISOString(),
    }

    onPaylinkCreated(newPaylink)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-onion-200 overflow-hidden">
        {/* Header */}
        <div className="bg-onion p-5 text-white flex items-center justify-between border-b border-onion-700">
          <div className="flex items-center space-x-2">
            <Link2 className="w-5 h-5 text-onion-200" />
            <h2 className="font-bold text-base">Generate Payment Link</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-onion-700/60 transition text-onion-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Paylink Title / Item Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Q4 Consulting Retainer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="Brief customer-facing payment instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Amount Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAmountType('fixed')}
                className={`py-2 px-3 rounded-xl border font-bold text-xs transition ${
                  amountType === 'fixed'
                    ? 'border-onion bg-onion-50 text-onion-900 ring-2 ring-onion-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Fixed Amount
              </button>
              <button
                type="button"
                onClick={() => setAmountType('open')}
                className={`py-2 px-3 rounded-xl border font-bold text-xs transition ${
                  amountType === 'open'
                    ? 'border-onion bg-onion-50 text-onion-900 ring-2 ring-onion-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Open (Buyer Decides)
              </button>
            </div>
          </div>

          {amountType === 'fixed' && (
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Amount (USDC)</label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:ring-2 focus:ring-onion-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Settlement Preference for this Link</label>
            <select
              value={settlementMode}
              onChange={(e) => setSettlementMode(e.target.value as SettlementMode)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
            >
              <option value="hold_as_received">Hold Stablecoins in Self-Custody</option>
              <option value="auto_offramp">Auto Off-Ramp to UAE AED Bank Account</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-onion hover:bg-onion-700 text-white font-bold rounded-xl text-xs transition shadow-md"
          >
            Create Payment Link
          </button>
        </form>
      </div>
    </div>
  )
}
