import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Merchant, Paylink, Transaction, Organization } from '../../types'
import type { PspDashboardMetrics } from '../../services/pspMerchantService'
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
  Lock,
  ShieldCheck,
  UserCheck,
  Sliders,
  X,
} from 'lucide-react'

interface OrgDashboardProps {
  organization: Organization
  merchants: Merchant[]
  paylinks?: Paylink[]
  transactions: Transaction[]
  onAddMerchant: (merchant: Partial<Merchant>) => void
  onBatchCreated: (newMerchants: Merchant[]) => void
  onSelectMerchantForDashboard: (merchantId: string) => void
  onRequestFeeChange?: (orgId: string, newMarkupBps: number, requestedBy: string, reason: string) => Promise<void>
  dashboardMetrics?: PspDashboardMetrics | null
  dashboardLoading?: boolean
  dashboardError?: string | null
}

export const OrgDashboard: React.FC<OrgDashboardProps> = ({
  organization,
  merchants,
  transactions,
  dashboardMetrics,
  dashboardLoading = false,
  dashboardError,
  onAddMerchant,
  onBatchCreated,
  onSelectMerchantForDashboard,
  onRequestFeeChange,
}) => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false)
  const [feeRequestBusy, setFeeRequestBusy] = useState(false)
  const [feeRequestError, setFeeRequestError] = useState<string | null>(null)
  const [requestedBy, setRequestedBy] = useState('')
  const [feeChangeReason, setFeeChangeReason] = useState('')

  // Fee Change Form (PSP Markup capped strictly at 1.00% / 100 bps)
  const currentMarkupBps = organization.feeSchedule?.pspMarkupBps ?? 0
  const [feeInputState, setFeeInputState] = useState<{ organizationId: string; value: string | null }>({
    organizationId: organization.id,
    value: null,
  })
  const newMarkupInput = feeInputState.organizationId === organization.id && feeInputState.value !== null
    ? feeInputState.value
    : currentMarkupBps.toString()
  const setNewMarkupInput = (value: string) => setFeeInputState({ organizationId: organization.id, value })
  const [feeRequestSuccess, setFeeRequestSuccess] = useState(false)

  // Filter merchants scoped to this organization
  const orgMerchants = merchants.filter((m) => m.organizationId === organization.id)

  // Filter transactions scoped to this organization
  const orgTransactions = transactions.filter(
    (t) => t.organizationId === organization.id || orgMerchants.some((m) => m.id === t.merchantId)
  )

  // Calculations
  const totalVolume = dashboardMetrics?.totalVolumeUsdc ?? 0
  const accruedMarkup = dashboardMetrics?.accruedMarkupUsdc ?? 0
  const activeCount = dashboardMetrics?.activeMerchants ?? 0

  const filteredMerchants = orgMerchants.filter((m) => {
    const matchesSearch =
      m.legalBusinessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.externalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.tradeLicenseNumber.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || (m.status || '').toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  const handleFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const bps = parseInt(newMarkupInput, 10)
    if (Number.isNaN(bps) || bps < 0 || bps > 100) return
    setFeeRequestBusy(true)
    setFeeRequestError(null)
    try {
      if (!onRequestFeeChange) throw new Error('Fee-change requests are not available.')
      await onRequestFeeChange(organization.id, bps, requestedBy, feeChangeReason)
      setFeeRequestSuccess(true)
      setTimeout(() => {
        setFeeRequestSuccess(false)
        setIsFeeModalOpen(false)
      }, 2000)
    } catch (reason) {
      setFeeRequestError(reason instanceof Error ? reason.message : 'Fee-change request failed.')
    } finally {
      setFeeRequestBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {dashboardError && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Live PSP data is unavailable: {dashboardError}
        </div>
      )}
      {/* PSP Title & Profile Card */}
      <div className="mat-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-onion-50 text-onion-800 border border-onion-200 flex items-center justify-center font-bold text-xl shadow-xs">
            {organization.name.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {organization.name}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                {organization.categoryType?.toUpperCase() || 'PSP'}
              </span>
              {organization.isRegulatedEntity ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 flex items-center">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Licensed ({organization.dueDiligence?.regulatorName?.split(' ')[0] || 'VARA'})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center">
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
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsFeeModalOpen(true)}
            disabled={!!organization.feeSchedule?.pendingChangeRequest}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium transition bg-white hover:bg-slate-50 shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5 text-onion" />
            <span>{organization.feeSchedule?.pendingChangeRequest ? 'Fee Request Pending' : 'Request Fee Change'}</span>
          </button>

        </div>
      </div>

      {/* Financial Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="mat-card p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 uppercase tracking-wider text-[11px]">
            <span>Gross Merchant Volume</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">
            {dashboardLoading ? 'Loading…' : `$${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          <p className="text-[11px] text-slate-400">Total volume processed by your merchants</p>
        </div>

        {/* Metric 2 */}
        <div className="mat-card p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 uppercase tracking-wider text-[11px]">
            <span>Accrued PSP Markup</span>
            <Coins className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 font-mono tracking-tight tabular-nums">
            {dashboardLoading ? 'Loading…' : `+$${accruedMarkup.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          <p className="text-[11px] text-slate-500">In Fee Vault · 0% share on offramp fees</p>
        </div>

        {/* Metric 3 */}
        <div className="mat-card p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 uppercase tracking-wider text-[11px]">
            <span>Active Merchants</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">
            {dashboardLoading ? 'Loading…' : activeCount} <span className="text-xs text-slate-400 font-normal">/ {dashboardMetrics?.totalMerchants ?? 0} registered</span>
          </p>
          <p className="text-[11px] text-slate-400">Deployed with tri-wallet split contracts</p>
        </div>

        {/* Metric 4 */}
        <div className="mat-card p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 uppercase tracking-wider text-[11px]">
            <span>Fee Schedule</span>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">
            {organization.feeSchedule?.orkiFeeBps === undefined || organization.feeSchedule.pspMarkupBps === undefined ? '—' : ((organization.feeSchedule.orkiFeeBps + organization.feeSchedule.pspMarkupBps) / 100).toFixed(2) + '%'}
          </p>
          <p className="text-[11px] text-slate-400">
            {organization.feeSchedule?.orkiFeeBps === undefined || organization.feeSchedule.pspMarkupBps === undefined ? 'Approved fee schedule unavailable' : `Orki ${(organization.feeSchedule.orkiFeeBps / 100).toFixed(2)}% + PSP ${(organization.feeSchedule.pspMarkupBps / 100).toFixed(2)}%`}
          </p>
        </div>
      </div>

      {/* PSP LOCKED FEE SCHEDULE (30-DAY RATE LOCK & ORKI BOUNDS) */}
      <div className="mat-card p-6 bg-slate-50/70 border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-onion-700" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Locked Fee Schedule</h3>
          </div>
          <span className="inline-flex items-center text-[11px] font-mono font-semibold text-onion-800 bg-onion-50 border border-onion-200 px-2.5 py-0.5 rounded">
            {!organization.feeSchedule || (organization.feeSchedule.lockedUntil && new Date(organization.feeSchedule.lockedUntil) > new Date())
              ? 'Rate Lock Active'
              : 'Rate Change Available'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
            <span className="text-slate-500 font-medium text-[11px]">Orki Protocol Fee</span>
            <p className="text-base font-bold text-slate-900 font-mono">
              {organization.feeSchedule?.orkiFeeBps !== undefined
                ? `${(organization.feeSchedule.orkiFeeBps / 100).toFixed(2)}%`
                : organization.feeSchedule?.paymentRateBps !== undefined
                ? `${(organization.feeSchedule.paymentRateBps / 100).toFixed(2)}%`
                : '1.00%'}
            </p>
            <p className="text-[10px] text-slate-400">Standard protocol fee (1.00% base)</p>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
            <span className="text-slate-500 font-medium text-[11px]">PSP Markup</span>
            <p className="text-base font-bold text-onion-800 font-mono">
              {organization.feeSchedule?.pspMarkupBps !== undefined
                ? `${(organization.feeSchedule.pspMarkupBps / 100).toFixed(2)}%`
                : '0.35%'}
            </p>
            <p className="text-[10px] text-slate-400">Strictly capped at 1.00% ceiling</p>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
            <span className="text-slate-500 font-medium text-[11px]">Off-Ramp Markup</span>
            <p className="text-base font-bold text-emerald-700 font-mono">
              {organization.feeSchedule?.offrampSpreadBps !== undefined
                ? `${(organization.feeSchedule.offrampSpreadBps / 100).toFixed(2)}%`
                : '0.25%'}
            </p>
            <p className="text-[10px] text-slate-400">Institutional off-ramp spread</p>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
            <span className="text-slate-500 font-medium text-[11px]">Rate Lock Window</span>
            <p className="text-xs font-bold text-slate-800 font-mono">
              {organization.feeSchedule?.lockedUntil
                ? new Date(organization.feeSchedule.lockedUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '30-Day Rate Lock Active'}
            </p>
            <p className="text-[10px] text-slate-400">
              {organization.feeSchedule?.pendingChangeRequest
                ? `Requested change effective ${new Date(organization.feeSchedule.pendingChangeRequest.effectiveAt || '').toLocaleDateString()}`
                : 'Changes require 30 days’ notice and Orki approval'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent backend transactions */}
      <div className="mat-card overflow-hidden">
        <div className="border-b border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-900">Recent Transactions</h3>
          <p className="mt-1 text-xs text-slate-500">Live completed and pending records from the PSP API.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Transaction</th>
                <th className="px-5 py-3 text-left">Merchant</th>
                <th className="px-5 py-3 text-left">Type / Chain</th>
                <th className="px-5 py-3 text-right">Gross</th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orgTransactions.slice(0, 10).map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-5 py-3 font-mono text-slate-700">
                    <div>{transaction.id}</div>
                    <div className="mt-0.5 text-[10px] text-slate-400">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {orgMerchants.find((merchant) => merchant.id === transaction.merchantId)?.legalBusinessName || transaction.merchantId}
                  </td>
                  <td className="px-5 py-3 capitalize text-slate-600">
                    {transaction.type.replace(/_/g, ' ')} · {transaction.chain}
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-semibold">
                    ${transaction.grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {transaction.currency}
                  </td>
                  <td className="px-5 py-3 capitalize text-slate-600">{transaction.status}</td>
                </tr>
              ))}
              {orgTransactions.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-7 text-center text-slate-400">
                  {dashboardLoading ? 'Loading transactions…' : 'No backend transactions yet.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Merchants Management Surface */}
      <div className="mat-card overflow-hidden">
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
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-onion-500/20 focus:border-onion-700 transition"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="invited">Setup Pending</option>
              <option value="verifying">Verifying</option>
              <option value="verification_action_required">Action Required</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium flex items-center space-x-1.5 bg-white hover:bg-slate-50 transition"
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
              <span>Bulk CSV (Max 50)</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mat-btn-primary px-3.5 py-1.5 text-xs font-medium flex items-center space-x-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Merchant</span>
            </button>
          </div>
        </div>

        {/* Merchants Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="px-6 py-3 text-left">Legal Entity</th>
                <th className="px-6 py-3 text-left">External ID</th>
                <th className="px-6 py-3 text-left">Status / Next Step</th>
                <th className="px-6 py-3 text-left">Payment Rails</th>
                <th className="px-6 py-3 text-left">Settlement Mode</th>
                <th className="px-6 py-3 text-left">Volume</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredMerchants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No merchants found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredMerchants.map((merchant) => (
                  <tr key={merchant.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-900">{merchant.legalBusinessName}</div>
                      <div className="text-[11px] text-slate-400">
                        {merchant.tradeLicenseNumber} · {merchant.jurisdiction}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-600">
                      {merchant.externalId}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-col space-y-1">
                        <StatusBadge status={merchant.status} />
                        {merchant.nextStep && (
                          <span className="text-[10px] font-mono text-onion-800 font-semibold">
                            Next: {merchant.nextStep}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(merchant.status?.toLowerCase() === 'active') && !!merchant.verifiedAt && !!merchant.activatedAt ? (
                          <span
                            title="Orki multi-chain USDC settlement active"
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                            Orki
                          </span>
                        ) : (
                          <span
                            title="Merchant has not completed Orki USDC onboarding yet"
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200 opacity-60"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-1"></span>
                            Orki (Disabled)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 capitalize">
                      {merchant.settlementMode.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-3.5 font-mono font-medium text-slate-900 tabular-nums">
                      ${(merchant.volumeUsdc || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/psp/merchants/${merchant.id}`)}
                        className="px-2.5 py-1 rounded text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => onSelectMerchantForDashboard(merchant.id)}
                        className="px-2.5 py-1 rounded text-onion-800 hover:text-onion-900 bg-onion-50 border border-onion-200 transition font-medium"
                      >
                        Open Portal
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIGURE FEES MODAL */}
      {isFeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Configure Processing Fees
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Orki Protocol Rules & Strict 1.00% PSP Ceiling
                </p>
              </div>
              <button
                onClick={() => setIsFeeModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFeeSubmit} className="p-6 space-y-4 text-xs">
              {/* Fee Structure Summary Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Orki Protocol Base Fee:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {organization.feeSchedule?.orkiFeeBps === undefined ? 'Not set' : `${(organization.feeSchedule.orkiFeeBps / 100).toFixed(2)}% (${organization.feeSchedule.orkiFeeBps} bps)`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">PSP Maximum Markup Ceiling:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    1.00% (100 bps ceiling)
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200/80 pt-2 font-semibold">
                  <span className="text-slate-800">Max Combined Processing Fee:</span>
                  <span className="font-mono text-slate-900">
                    {organization.feeSchedule?.combinedCapBps === undefined ? 'Not set' : `${(organization.feeSchedule.combinedCapBps / 100).toFixed(2)}% (${organization.feeSchedule.combinedCapBps} bps)`}
                  </span>
                </div>
              </div>

              <label className="block text-xs font-semibold text-slate-800">
                Requesting finance contact
                <input
                  type="email"
                  required
                  maxLength={255}
                  value={requestedBy}
                  onChange={(event) => setRequestedBy(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal"
                  placeholder="finance@psp.example"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-800">
                Business reason
                <textarea
                  required
                  minLength={10}
                  maxLength={2000}
                  value={feeChangeReason}
                  onChange={(event) => setFeeChangeReason(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal"
                  rows={3}
                />
              </label>

              {/* Input for PSP Markup */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  PSP Markup (bps):
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newMarkupInput}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (!isNaN(val) && val > 100) {
                        setNewMarkupInput('100') // Clamped to 100 bps ceiling
                      } else {
                        setNewMarkupInput(e.target.value)
                      }
                    }}
                    className="w-32 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                  <span className="text-xs text-slate-500">
                    = {(parseInt(newMarkupInput || '0', 10) / 100).toFixed(2)}% Markup
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Orki enforces a hard cap: PSP cannot add beyond 1.00% (100 bps) over Orki's base fee.
                </p>
              </div>

              {/* 30-Day Lock Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start space-x-2">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <span className="font-bold">30-Day Notice and Dual Approval:</span> A fee change is applied only after its notice period ends and a separate Orki approver approves it. A new 30-day rate lock starts on approval.
                </p>
              </div>

              {/* Offramp Policy */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                <p className="font-bold text-slate-800 text-[11px]">Off-Ramp Rule:</p>
                <p className="text-[11px] mt-0.5">
                  PSPs cannot add an offramp fee. This dashboard does not initiate a bank payout; payout provider execution must be separately configured.
                </p>
              </div>

              {feeRequestSuccess && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-center font-bold">
                  Request recorded. It remains pending until the notice period ends and Orki approves it.
                </div>
              )}
              {feeRequestError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-800">{feeRequestError}</p>}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFeeModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={feeRequestBusy || !!organization.feeSchedule?.pendingChangeRequest}
                  className="mat-btn-primary px-4 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {feeRequestBusy ? 'Submitting…' : 'Submit Fee-Change Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Modals for Add & Bulk */}
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
    </div>
  )
}
