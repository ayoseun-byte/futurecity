import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Merchant, Paylink, Transaction, Organization } from '../../types'
import { StatusBadge } from '../../components/StatusBadge'
import { AddMerchantModal } from './AddMerchantModal'
import { BulkMerchantUploadModal } from './BulkMerchantUploadModal'
import {
  TrendingUp,
  Users,
  Coins,
  Plus,
  UploadCloud,
  Search,
  Eye,
  Lock,
  ShieldCheck,
  UserCheck,
  Send,
  Sliders,
  AlertCircle,
  X,
} from 'lucide-react'

interface OrgDashboardProps {
  organization: Organization
  merchants: Merchant[]
  paylinks?: Paylink[]
  transactions: Transaction[]
  onAddMerchant: (merchant: Partial<Merchant>) => void
  onBatchCreated: (newMerchants: Merchant[]) => void
  onToggleMerchantStatus?: (merchantId: string, newStatus: 'active' | 'disabled') => void
  onSelectMerchantForDashboard: (merchantId: string) => void
  onUpdateFeeSchedule?: (orgId: string, newMarkupBps: number) => void
}

export const OrgDashboard: React.FC<OrgDashboardProps> = ({
  organization,
  merchants,
  transactions,
  onAddMerchant,
  onBatchCreated,
  onSelectMerchantForDashboard,
  onUpdateFeeSchedule,
}) => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false)
  const [isWebhookTestSent, setIsWebhookTestSent] = useState(false)

  // Fee Change Form
  const currentMarkupBps = organization.feeSchedule?.pspMarkupBps ?? 35
  const [newMarkupInput, setNewMarkupInput] = useState(currentMarkupBps.toString())
  const [feeRequestSuccess, setFeeRequestSuccess] = useState(false)

  // Filter merchants scoped to this organization
  const orgMerchants = merchants.filter((m) => m.organizationId === organization.id)

  // Filter transactions scoped to this organization
  const orgTransactions = transactions.filter(
    (t) => t.organizationId === organization.id || orgMerchants.some((m) => m.id === t.merchantId)
  )

  // Calculations
  const totalVolume = orgTransactions.reduce((acc, t) => acc + t.grossAmount, 0) + (organization.volumeUsdc || 0)
  const accruedMarkup = orgTransactions.reduce((acc, t) => acc + t.pspMarkupAmount, 0) + (totalVolume * (currentMarkupBps / 10000))
  const activeCount = orgMerchants.filter((m) => m.status === 'active').length

  const filteredMerchants = orgMerchants.filter((m) => {
    const matchesSearch =
      m.legalBusinessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.externalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.tradeLicenseNumber.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || m.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleFeeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const bps = parseInt(newMarkupInput, 10)
    if (!isNaN(bps) && bps >= 0 && bps <= 200) {
      if (onUpdateFeeSchedule) {
        onUpdateFeeSchedule(organization.id, bps)
      }
      setFeeRequestSuccess(true)
      setTimeout(() => {
        setFeeRequestSuccess(false)
        setIsFeeModalOpen(false)
      }, 1500)
    }
  }

  const handleTestWebhook = () => {
    setIsWebhookTestSent(true)
    setTimeout(() => setIsWebhookTestSent(false), 3000)
  }

  return (
    <div className="space-y-8">
      {/* PSP Organization Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-onion to-onion-700 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-onion/20 border border-onion-300/30">
            {organization.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {organization.name}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  organization.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {organization.status}
              </span>
              {organization.isRegulatedEntity ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Licensed ({organization.dueDiligence?.regulatorName || 'VARA'})
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center">
                  <UserCheck className="w-3 h-3 mr-1" />
                  Unlicensed (UBO Vetted)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono mt-1">
              PSP ID: {organization.id} · Case Ref: {organization.dueDiligence?.caseReference}
            </p>
          </div>
        </div>

        {/* Quick Config Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsFeeModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-onion text-slate-700 hover:text-onion text-xs font-bold transition bg-slate-50 hover:bg-onion-50/50 shadow-sm"
          >
            <Sliders className="w-4 h-4 text-onion" />
            <span>Configure Markup Fee</span>
          </button>

          <button
            onClick={handleTestWebhook}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
          >
            <Send className="w-4 h-4" />
            <span>{isWebhookTestSent ? 'HMAC Ping Sent! ✓' : 'Test Webhook'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Gross Volume</span>
            <TrendingUp className="w-4 h-4 text-onion" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            ${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400">Total processed by all your merchants</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>PSP Markup Revenue</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">
            +${accruedMarkup.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-600">Stablecoins only (0% share of AED fees)</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Active Merchants</span>
            <Users className="w-4 h-4 text-onion" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {activeCount} <span className="text-xs text-slate-400 font-normal">/ {orgMerchants.length} total</span>
          </p>
          <p className="text-[11px] text-slate-400">Onboarded & accepting payments</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Agreed Fee Schedule</span>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {((100 + currentMarkupBps) / 100).toFixed(2)}%
          </p>
          <p className="text-[11px] text-slate-400">
            Orki 1.00% + Markup {(currentMarkupBps / 100).toFixed(2)}% (Cap 3.00%)
          </p>
        </div>
      </div>

      {/* Merchants Management Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
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
              <option value="terms_accepted">Terms Accepted</option>
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
                    No merchants match the selected filters under {organization.name}.
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
                        onClick={() => navigate(`/org/merchants/${merchant.id}`)}
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

      {/* ─────────────────────────────────────────────────────────────
          CONFIGURE FEE SCHEDULE MODAL
         ───────────────────────────────────────────────────────────── */}
      {isFeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 border border-onion-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-onion" />
                <span>Configure Fee Schedule ({organization.name})</span>
              </h3>
              <button onClick={() => setIsFeeModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Orki Fixed Payment Fee:</span>
                <span className="font-bold text-slate-900">1.00% (100 bps)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Current PSP Markup:</span>
                <span className="font-bold text-onion">{(currentMarkupBps / 100).toFixed(2)}% ({currentMarkupBps} bps)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Combined Fee Cap:</span>
                <span className="font-bold text-slate-900">3.00% (300 bps)</span>
              </div>
            </div>

            <form onSubmit={handleFeeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Requested PSP Markup (in Basis Points)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={newMarkupInput}
                    onChange={(e) => setNewMarkupInput(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 font-mono font-bold"
                  />
                  <span className="font-bold text-slate-500 text-xs">bps</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Preview: Total fee will be {((100 + (parseInt(newMarkupInput, 10) || 0)) / 100).toFixed(2)}% on all stablecoin transactions.
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>30-Day Lock Rule:</strong> Changes take effect for future transactions only and require dual-review in Orki operations.
                </span>
              </div>

              {feeRequestSuccess && (
                <div className="p-2.5 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-center">
                  Fee schedule updated successfully!
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFeeModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-onion text-white font-bold rounded-xl hover:bg-onion-700 shadow-md"
                >
                  Save Fee Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Merchant Modal */}
      <AddMerchantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddMerchant={onAddMerchant}
      />

      {/* Bulk Upload Modal */}
      <BulkMerchantUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onBatchCreated={onBatchCreated}
      />
    </div>
  )
}
