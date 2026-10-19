import React, { useState } from 'react'
import type { Merchant, Paylink, Transaction } from '../../types'
import { StatusBadge } from '../../components/StatusBadge'
import { AddMerchantModal } from './AddMerchantModal'
import { BulkMerchantUploadModal } from './BulkMerchantUploadModal'
import { MerchantInspectorModal } from './MerchantInspectorModal'
import {
  TrendingUp,
  Users,
  Coins,
  ArrowRightLeft,
  Plus,
  UploadCloud,
  Search,
  Eye,
  Lock,
  CheckCircle2,
} from 'lucide-react'

interface OrgDashboardProps {
  merchants: Merchant[]
  paylinks: Paylink[]
  transactions: Transaction[]
  onAddMerchant: (merchant: Partial<Merchant>) => void
  onBatchCreated: (newMerchants: Merchant[]) => void
  onToggleMerchantStatus: (merchantId: string, newStatus: 'active' | 'disabled') => void
  onSelectMerchantForDashboard: (merchantId: string) => void
}

export const OrgDashboard: React.FC<OrgDashboardProps> = ({
  merchants,
  paylinks,
  transactions,
  onAddMerchant,
  onBatchCreated,
  onToggleMerchantStatus,
  onSelectMerchantForDashboard,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null)

  // Calculations
  const totalVolume = transactions.reduce((acc, t) => acc + t.grossAmount, 0) + 48500
  const accruedMarkup = transactions.reduce((acc, t) => acc + t.pspMarkupAmount, 0) + 121.25
  const activeCount = merchants.filter((m) => m.status === 'active').length

  const filteredMerchants = merchants.filter((m) => {
    const matchesSearch =
      m.legalBusinessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.externalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.tradeLicenseNumber.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || m.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* PSP Top Profile & Fee Schedule Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-onion text-white flex items-center justify-center font-black text-2xl shadow-md">
            X
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-extrabold text-slate-900">XSquare Payments LLC</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Approved PSP
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              PSP ID: <code className="text-slate-800 font-semibold font-mono">psp_xsquare01</code> · Regulated: UAE Commercial Licence #CN-192841
            </p>
          </div>
        </div>

        {/* 30-Day Locked Fee Schedule Card */}
        <div className="bg-onion-50 border border-onion-200 rounded-xl p-3.5 text-xs text-onion-950 flex items-center space-x-4">
          <div className="w-9 h-9 rounded-lg bg-onion text-white flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 font-bold">
              <span>Agreed Fee Schedule:</span>
              <span className="text-onion font-extrabold">1.25% Combined</span>
            </div>
            <p className="text-[11px] text-onion-800 mt-0.5">
              Orki Base (1.00%) + XSquare Markup (0.25% / 25 bps) · Cap: 3.00%
            </p>
            <p className="text-[10px] text-onion-600 font-semibold mt-0.5">
              🔒 Locked for 30 days (18 days remaining until next review cycle)
            </p>
          </div>
        </div>
      </div>

      {/* Global Portfolio Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Portfolio Volume</span>
            <TrendingUp className="w-4 h-4 text-onion" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            ${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">+14.2% from last week</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Accrued PSP Markup</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            ${accruedMarkup.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">25 bps earned on stablecoin volume</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Active Merchants</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{activeCount} / {merchants.length}</p>
          <span className="text-[11px] text-indigo-600 font-semibold mt-1 block">Live accepting USDC</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>AED Bank Settled</span>
            <ArrowRightLeft className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">AED 84,120.00</p>
          <span className="text-[11px] text-amber-700 font-semibold mt-1 block">Off-ramped to UAE banks</span>
        </div>
      </div>

      {/* Merchants Management Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search merchants, external ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none text-slate-700 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="verifying">Verifying</option>
              <option value="verification_action_required">Action Required</option>
              <option value="invited">Invited</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          <div className="flex items-center space-x-2.5 w-full md:w-auto justify-end">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
            >
              <UploadCloud className="w-4 h-4 text-slate-600" />
              <span>Bulk Ingest (CSV)</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-onion hover:bg-onion-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Single Merchant</span>
            </button>
          </div>
        </div>

        {/* Merchants Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-5">Merchant / External ID</th>
                <th className="py-3 px-5">Licence & Jurisdiction</th>
                <th className="py-3 px-5">Representative</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Settlement Preference</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMerchants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                    No merchants match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredMerchants.map((merchant) => (
                  <tr key={merchant.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-slate-900 text-sm">{merchant.legalBusinessName}</p>
                      <span className="font-mono text-[11px] text-slate-400">{merchant.externalId}</span>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-800">{merchant.tradeLicenseNumber}</p>
                      <span className="text-[11px] text-slate-500">{merchant.jurisdiction}</span>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-medium text-slate-800">{merchant.representativeName}</p>
                      <span className="text-[11px] text-slate-400">{merchant.representativeEmail}</span>
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={merchant.status} />
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800">
                        {merchant.settlementMode === 'auto_offramp' ? 'Auto Off-Ramp (AED)' : 'Hold Stablecoins'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-2">
                      <button
                        onClick={() => setSelectedMerchant(merchant)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-onion-50 text-onion-800 hover:bg-onion-100 font-bold text-xs transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-onion-700" />
                        <span>Inspect</span>
                      </button>

                      <button
                        onClick={() => onSelectMerchantForDashboard(merchant.id)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs transition"
                      >
                        <span>Switch To View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AddMerchantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddMerchant={onAddMerchant}
      />

      <BulkMerchantUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onBatchCreated={onBatchCreated}
      />

      <MerchantInspectorModal
        merchant={selectedMerchant}
        paylinks={paylinks}
        transactions={transactions}
        isOpen={selectedMerchant !== null}
        onClose={() => setSelectedMerchant(null)}
        onToggleStatus={onToggleMerchantStatus}
      />
    </div>
  )
}
