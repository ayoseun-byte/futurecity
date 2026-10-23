import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Merchant, Paylink, Transaction } from '../../types'
import { StatusBadge } from '../../components/StatusBadge'
import {
  ArrowLeft,
  Building,
  Wallet,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Coins,
  ArrowRightLeft,
  FileText,
} from 'lucide-react'

interface MerchantDetailPageProps {
  merchants: Merchant[]
  paylinks: Paylink[]
  transactions: Transaction[]
  onToggleStatus: (merchantId: string, newStatus: 'active' | 'disabled') => void
}

export const MerchantDetailPage: React.FC<MerchantDetailPageProps> = ({
  merchants,
  paylinks,
  transactions,
  onToggleStatus,
}) => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const merchant = merchants.find((m) => m.id === id) || merchants[0]

  if (!merchant) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Merchant Not Found</h2>
        <button
          onClick={() => navigate('/org')}
          className="px-4 py-2 bg-onion text-white rounded-xl text-sm font-semibold"
        >
          Return to Merchants
        </button>
      </div>
    )
  }

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const merchantPaylinks = paylinks.filter(
    (p) => p.status === 'active' || p.status === 'disabled'
  )
  const canToggleStatus = merchant.status === 'active' || (
    merchant.status === 'disabled' && !!merchant.verifiedAt && !!merchant.activatedAt
  )

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/org')}
            className="p-2.5 rounded-xl border border-slate-200 hover:border-onion-300 hover:bg-onion-50 text-slate-600 hover:text-onion transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {merchant.legalBusinessName}
              </h1>
              <StatusBadge status={merchant.status} />
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              ID: {merchant.id} · Ref: {merchant.externalId}
            </p>

            {/* Payment Rails */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                Rails:
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#635BFF]/10 text-[#635BFF] border border-[#635BFF]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#635BFF] mr-1"></span>
                Stripe
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#7D00FF]/10 text-[#7D00FF] border border-[#7D00FF]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7D00FF] mr-1"></span>
                MoonPay
              </span>
              {merchant.status === 'active' && !!merchant.verifiedAt && !!merchant.activatedAt ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                  Orki (Active)
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200 opacity-60">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-1"></span>
                  Orki (Disabled)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() =>
              onToggleStatus(
                merchant.id,
                merchant.status === 'active' ? 'disabled' : 'active'
              )
            }
            disabled={!canToggleStatus}
            title={canToggleStatus ? undefined : 'Merchant must complete Orki onboarding before activation.'}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${
              merchant.status === 'active'
                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>
              {merchant.status === 'active' ? 'Disable Merchant' : 'Re-activate Merchant'}
            </span>
          </button>
        </div>
      </div>

      {/* Grid: Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Balance Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Float Balance</span>
            <Coins className="w-4 h-4 text-onion" />
          </div>
          <div>
            <span className="text-3xl font-black text-slate-900">
              ${(merchant.volumeUsdc || 25480.0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-semibold text-slate-400 ml-1.5">USDC</span>
          </div>
          <p className="text-xs text-slate-500 flex items-center space-x-1">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Settlement: <strong>{merchant.settlementMode.replace('_', ' ')}</strong></span>
          </p>
        </div>

        {/* Business KYC Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Corporate Identity</span>
            <Building className="w-4 h-4 text-onion" />
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">License:</span>
              <span className="font-mono font-bold text-slate-800">{merchant.tradeLicenseNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Jurisdiction:</span>
              <span className="font-semibold text-slate-800">{merchant.jurisdiction}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Sumsub KYB:</span>
              <span className="font-bold text-emerald-600">Passed (Verified)</span>
            </div>
          </div>
        </div>

        {/* Non-Custodial Wallets */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Non-Custodial Accounts</span>
            <Wallet className="w-4 h-4 text-onion" />
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Base EVM Smart Account</span>
              <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-200 font-mono text-[11px] mt-0.5">
                <span className="truncate">{merchant.baseWalletAddress || '0x71C...4982'}</span>
                <button onClick={() => handleCopy(merchant.baseWalletAddress || '0x71C...4982', 'base')} className="p-1 text-slate-400 hover:text-slate-600">
                  {copiedField === 'base' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Solana SVM Account</span>
              <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-200 font-mono text-[11px] mt-0.5">
                <span className="truncate">{merchant.solanaWalletAddress || '7xKX...9qY1'}</span>
                <button onClick={() => handleCopy(merchant.solanaWalletAddress || '7xKX...9qY1', 'sol')} className="p-1 text-slate-400 hover:text-slate-600">
                  {copiedField === 'sol' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs / Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Paylinks */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <FileText className="w-4 h-4 text-onion" />
              <span>Active Checkout Paylinks</span>
            </h3>
            <span className="text-xs text-slate-400">{merchantPaylinks.length} total</span>
          </div>

          <div className="space-y-3">
            {merchantPaylinks.map((plk) => (
              <div key={plk.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-xs">{plk.title}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">${(plk.amount ?? 0).toLocaleString()} USDC · {plk.slug}</p>
                </div>
                <a
                  href={`/checkout/${plk.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:border-onion-400 hover:text-onion flex items-center space-x-1 transition-colors"
                >
                  <span>Checkout</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions Ledger */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <ArrowRightLeft className="w-4 h-4 text-onion" />
              <span>Recent Financial Operations</span>
            </h3>
            <span className="text-xs text-slate-400">On-Chain Real-Time</span>
          </div>

          <div className="space-y-3">
            {transactions.slice(0, 4).map((tx) => (
              <div key={tx.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-xs capitalize">{tx.type} via {tx.chain}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{tx.txHash}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 text-xs">+${tx.grossAmount.toLocaleString()} USDC</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">{tx.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
