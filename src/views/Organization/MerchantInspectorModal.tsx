import React from 'react'
import type { Merchant, Paylink, Transaction } from '../../types'
import { StatusBadge } from '../../components/StatusBadge'
import { X, Wallet, ShieldAlert, ArrowUpRight, Copy, Check, ExternalLink } from 'lucide-react'

interface MerchantInspectorModalProps {
  merchant: Merchant | null
  paylinks: Paylink[]
  transactions: Transaction[]
  isOpen: boolean
  onClose: () => void
  onToggleStatus: (merchantId: string, newStatus: 'active' | 'disabled') => void
}

export const MerchantInspectorModal: React.FC<MerchantInspectorModalProps> = ({
  merchant,
  paylinks,
  transactions,
  isOpen,
  onClose,
  onToggleStatus,
}) => {
  const [copiedField, setCopiedField] = React.useState<string | null>(null)

  if (!isOpen || !merchant) return null

  const merchantPaylinks = paylinks.filter((p) => (p.status || '').toLowerCase() === 'active')
  const merchantTransactions = transactions.filter((t) => t.merchantId === merchant.id)

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const isMerchantActive = (merchant.status || '').toLowerCase() === 'active'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-onion-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-onion p-6 text-white flex items-center justify-between border-b border-onion-700">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-white text-onion flex items-center justify-center font-black text-xl shadow-md">
              {merchant.legalBusinessName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-xl leading-tight">{merchant.legalBusinessName}</h2>
                <StatusBadge status={merchant.status} />
              </div>
              <p className="text-xs text-onion-200 mt-1">
                External ID: <span className="font-mono text-white">{merchant.externalId}</span> · Licence: {merchant.tradeLicenseNumber} · {merchant.jurisdiction}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-onion-700/60 transition text-onion-200 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Top Controls: Balance & Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-500 font-medium">USDC Balance (Base)</span>
              <p className="text-xl font-black text-slate-900 mt-1">12,450.00 <span className="text-xs text-slate-400 font-semibold">USDC</span></p>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Self-Custodial</span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-500 font-medium">USDT Balance (Solana)</span>
              <p className="text-xl font-black text-slate-900 mt-1">4,200.00 <span className="text-xs text-slate-400 font-semibold">USDT</span></p>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Self-Custodial</span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-500 font-medium">Settled to Bank (AED)</span>
              <p className="text-xl font-black text-slate-900 mt-1">84,120.00 <span className="text-xs text-slate-400 font-semibold">AED</span></p>
              <span className="text-[10px] text-indigo-600 font-semibold mt-1 block">Emirates NBD</span>
            </div>

            <div className="p-4 bg-onion-50 border border-onion-200 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-xs text-onion-900 font-bold">Admin Status Switch</span>
                <p className="text-[11px] text-onion-700 mt-0.5">Control merchant payment acceptance</p>
              </div>
              <button
                onClick={() => onToggleStatus(merchant.id, isMerchantActive ? 'disabled' : 'active')}
                className={`mt-2 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  isMerchantActive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{isMerchantActive ? 'Disable Merchant' : 'Re-enable Merchant'}</span>
              </button>
            </div>
          </div>

          {/* Wallets & Passkey Info */}
          <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
              <Wallet className="w-4 h-4 text-onion-700" />
              <span>Merchant Non-Custodial Wallets</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">EVM Smart Account</span>
                  <p className="font-mono font-medium text-slate-800 text-xs mt-0.5">
                    {merchant.baseWalletAddress || 'Pending verification'}
                  </p>
                </div>
                {merchant.baseWalletAddress && (
                  <button
                    onClick={() => copyToClipboard(merchant.baseWalletAddress!, 'base')}
                    className="p-1.5 text-slate-400 hover:text-onion-700"
                  >
                    {copiedField === 'base' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Solana Wallet (SVM)</span>
                  <p className="font-mono font-medium text-slate-800 text-xs mt-0.5">
                    {merchant.solanaWalletAddress || 'Pending verification'}
                  </p>
                </div>
                {merchant.solanaWalletAddress && (
                  <button
                    onClick={() => copyToClipboard(merchant.solanaWalletAddress!, 'solana')}
                    className="p-1.5 text-slate-400 hover:text-onion-700"
                  >
                    {copiedField === 'solana' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Active Paylinks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                Active Paylinks & Checkout IDs ({merchantPaylinks.length})
              </h3>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {merchantPaylinks.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">No active paylinks created yet.</div>
              ) : (
                merchantPaylinks.map((pl) => (
                  <div key={pl.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{pl.title}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        ID: {pl.id} · Settlement: <span className="font-semibold text-onion-800">{pl.settlementMode}</span>
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-black text-slate-900">
                        {pl.amountType === 'fixed' ? `${pl.amount} ${pl.currency}` : 'Open Amount'}
                      </span>
                      <a
                        href={pl.checkoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-onion-700 hover:bg-onion-50 rounded-lg transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Merchant Payments */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900">Recent Customer Payments Feed</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
              {merchantTransactions.length === 0 ? (
                <div className="p-4 text-center text-slate-500">No payment transactions recorded yet.</div>
              ) : (
                merchantTransactions.map((tx) => (
                  <div key={tx.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{tx.type.replace('_', ' ').toUpperCase()}</p>
                        <p className="text-[11px] text-slate-400 font-mono">Tx: {tx.txHash.substring(0, 14)}... · Payer: {tx.payerAddress}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">+{tx.grossAmount} {tx.currency}</p>
                      <p className="text-[11px] text-onion-700 font-medium">PSP Markup (25 bps): +{tx.pspMarkupAmount} USDC</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
