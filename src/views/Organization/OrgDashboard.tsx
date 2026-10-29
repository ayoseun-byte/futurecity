import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Merchant, Paylink, Transaction, Organization } from '../../types'
import {
  type PspDashboardMetrics,
  type PspWebhookEndpoint,
  type PspWebhookDelivery,
  fetchPspWebhooks,
  registerPspWebhook,
  deletePspWebhook,
  fetchPspWebhookDeliveries,
  triggerTestWebhook,
  retryWebhookDelivery,
} from '../../services/pspMerchantService'
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
  Copy,
  Check,
  Webhook,
  Activity,
  RefreshCw,
  Send,
  Eye,
  EyeOff,
  Code2,
  ExternalLink,
  Calendar,
  Fingerprint,
  ShieldAlert,
} from 'lucide-react'

const AVAILABLE_WEBHOOK_EVENTS = [
  { id: 'charge.payment_received', label: 'charge.payment_received', group: 'Charges' },
  { id: 'charge.offramp_processing', label: 'charge.offramp_processing', group: 'Charges' },
  { id: 'charge.paid', label: 'charge.paid', group: 'Charges' },
  { id: 'charge.underpaid', label: 'charge.underpaid', group: 'Charges' },
  { id: 'charge.cancelled', label: 'charge.cancelled', group: 'Charges' },
  { id: 'charge.expired', label: 'charge.expired', group: 'Charges' },
  { id: 'refund.awaiting_customer', label: 'refund.awaiting_customer', group: 'Refunds' },
  { id: 'refund.awaiting_approval', label: 'refund.awaiting_approval', group: 'Refunds' },
  { id: 'refund.processing', label: 'refund.processing', group: 'Refunds' },
  { id: 'refund.completed', label: 'refund.completed', group: 'Refunds' },
  { id: 'refund.failed', label: 'refund.failed', group: 'Refunds' },
  { id: 'offramp.failed', label: 'offramp.failed', group: 'Off-Ramp' },
  { id: 'payable.awaiting_approval', label: 'payable.awaiting_approval', group: 'Payables' },
  { id: 'payable.processing', label: 'payable.processing', group: 'Payables' },
  { id: 'payable.paid', label: 'payable.paid', group: 'Payables' },
  { id: 'payable.failed', label: 'payable.failed', group: 'Payables' },
  { id: 'send.awaiting_approval', label: 'send.awaiting_approval', group: 'Transfers' },
  { id: 'send.processing', label: 'send.processing', group: 'Transfers' },
  { id: 'send.completed', label: 'send.completed', group: 'Transfers' },
  { id: 'deposit.received', label: 'deposit.received', group: 'Transfers' },
  { id: 'merchant.wallets.created', label: 'merchant.wallets.created', group: 'Merchants' },
]

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
  onRefreshDashboard?: () => Promise<void> | void
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
  onRefreshDashboard,
}) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'merchants' | 'webhooks' | 'logs' | 'transactions' | 'config'>('merchants')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false)
  const [feeRequestBusy, setFeeRequestBusy] = useState(false)
  const [feeRequestError, setFeeRequestError] = useState<string | null>(null)
  const [requestedBy, setRequestedBy] = useState('')
  const [feeChangeReason, setFeeChangeReason] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Webhooks state
  const [webhooks, setWebhooks] = useState<PspWebhookEndpoint[]>([])
  const [webhooksLoading, setWebhooksLoading] = useState(false)
  const [deliveries, setDeliveries] = useState<PspWebhookDelivery[]>([])
  const [deliveriesLoading, setDeliveriesLoading] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<PspWebhookDelivery | null>(null)
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({})

  // New webhook registration modal
  const [isRegisterWebhookModalOpen, setIsRegisterWebhookModalOpen] = useState(false)
  const [newWebhookUrl, setNewWebhookUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'charge.payment_received',
    'charge.paid',
    'charge.underpaid',
    'merchant.wallets.created',
    'offramp.failed',
    'payable.awaiting_approval',
    'send.completed',
  ])
  const [registeringWebhook, setRegisteringWebhook] = useState(false)
  const [webhookModalError, setWebhookModalError] = useState<string | null>(null)

  // Test webhook state
  const [testEventBusy, setTestEventBusy] = useState(false)
  const [testEventType, setTestEventType] = useState('charge.payment_received')
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null)
  const [retryingId, setRetryingId] = useState<string | null>(null)

  // Fee Change Form (PSP Markup capped strictly at 1.00% / 100 bps)
  const currentMarkupBps = organization.feeSchedule?.pspMarkupBps ?? 0
  const [feeInputState, setFeeInputState] = useState<{ organizationId: string; value: string | null }>({
    organizationId: organization.id,
    value: null,
  })
  const newMarkupInput =
    feeInputState.organizationId === organization.id && feeInputState.value !== null
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

  // Load webhooks and deliveries
  const loadWebhooks = useCallback(async () => {
    setWebhooksLoading(true)
    try {
      const data = await fetchPspWebhooks()
      setWebhooks(data)
    } catch {
      // Ignored: fallback to empty
    } finally {
      setWebhooksLoading(false)
    }
  }, [])

  const loadDeliveries = useCallback(async () => {
    setDeliveriesLoading(true)
    try {
      const data = await fetchPspWebhookDeliveries()
      setDeliveries(data)
    } catch {
      // Ignored: fallback to empty
    } finally {
      setDeliveriesLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadWebhooks()
    void loadDeliveries()
  }, [loadWebhooks, loadDeliveries])

  const copyText = (val: string, key: string) => {
    void navigator.clipboard.writeText(val)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleRegisterWebhook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWebhookUrl.trim()) return
    setRegisteringWebhook(true)
    setWebhookModalError(null)
    try {
      await registerPspWebhook(newWebhookUrl.trim(), selectedEvents)
      setNewWebhookUrl('')
      setIsRegisterWebhookModalOpen(false)
      await loadWebhooks()
    } catch (err) {
      setWebhookModalError(err instanceof Error ? err.message : 'Failed to register webhook endpoint.')
    } finally {
      setRegisteringWebhook(false)
    }
  }

  const handleDeleteWebhook = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this webhook endpoint? Orki will stop dispatching events to it.')) {
      return
    }
    try {
      await deletePspWebhook(id)
      await loadWebhooks()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete webhook endpoint.')
    }
  }

  const handleTriggerTestWebhook = async () => {
    setTestEventBusy(true)
    setTestSuccessMessage(null)
    try {
      const res = await triggerTestWebhook(testEventType)
      setTestSuccessMessage(res.message || `Test webhook '${testEventType}' dispatched successfully.`)
      await loadDeliveries()
      setTimeout(() => setTestSuccessMessage(null), 4000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Test webhook dispatch failed.')
    } finally {
      setTestEventBusy(false)
    }
  }

  const handleRetryDelivery = async (id: string) => {
    setRetryingId(id)
    try {
      await retryWebhookDelivery(id)
      await loadDeliveries()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to retry delivery.')
    } finally {
      setRetryingId(null)
    }
  }

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

  // Calculations
  const totalVolume = dashboardMetrics?.totalVolumeUsdc ?? 0
  const accruedMarkup = dashboardMetrics?.accruedMarkupUsdc ?? 0
  const activeCount = dashboardMetrics?.activeMerchants ?? 0

  const filteredMerchants = orgMerchants.filter((m) => {
    const matchesSearch =
      m.legalBusinessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.externalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.tradeLicenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || (m.status || '').toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

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
                  Regulated Supervised Entity ({organization.dueDiligence?.regulatorName || 'CBUAE / VARA'})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center">
                  <UserCheck className="w-3 h-3 mr-1" />
                  Unregulated (Cabinet Res. 134/2025 · Full Orki KYB Enforced)
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 font-mono">
              <div className="flex items-center gap-1">
                <span>PSP ID:</span>
                <span className="font-semibold text-slate-800">{organization.id}</span>
                <button
                  type="button"
                  onClick={() => copyText(organization.id, 'pspid')}
                  className="text-slate-400 hover:text-slate-700"
                  title="Copy PSP ID"
                >
                  {copiedKey === 'pspid' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <span>·</span>
              <span>Case Ref: {organization.dueDiligence?.caseReference || 'ORKI-PSP-001'}</span>
              <span>·</span>
              <span>Agreement: {organization.agreementDetails?.version || 'v1.0 (Signed)'}</span>
            </div>
          </div>
        </div>

        {/* Quick Config Actions */}
        <div className="flex items-center space-x-2.5">
          {onRefreshDashboard && (
            <button
              onClick={() => void onRefreshDashboard()}
              disabled={dashboardLoading}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium transition bg-white hover:bg-slate-50 shadow-xs disabled:opacity-50"
              title="Sync live data directly from MySQL database"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-onion-800 ${dashboardLoading ? 'animate-spin' : ''}`} />
              <span>{dashboardLoading ? 'Syncing...' : 'Sync from DB'}</span>
            </button>
          )}
          <button
            onClick={() => setIsFeeModalOpen(true)}
            disabled={!!organization.feeSchedule?.pendingChangeRequest}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium transition bg-white hover:bg-slate-50 shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5 text-onion-800" />
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
          <p className="text-[11px] text-slate-500">In Fee Vault · Real-time atomic split</p>
        </div>

        {/* Metric 3 */}
        <div className="mat-card p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 uppercase tracking-wider text-[11px]">
            <span>Active Merchants</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">
            {dashboardLoading ? 'Loading…' : activeCount} <span className="text-xs text-slate-400 font-normal">/ {dashboardMetrics?.totalMerchants ?? orgMerchants.length} registered</span>
          </p>
          <p className="text-[11px] text-slate-400">Deployed with multi-chain smart contracts</p>
        </div>

        {/* Metric 4 */}
        <div className="mat-card p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 uppercase tracking-wider text-[11px]">
            <span>Fee Schedule</span>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">
            {organization.feeSchedule?.orkiFeeBps === undefined || organization.feeSchedule.pspMarkupBps === undefined
              ? '1.25%'
              : `${((organization.feeSchedule.orkiFeeBps + organization.feeSchedule.pspMarkupBps) / 100).toFixed(2)}%`}
          </p>
          <p className="text-[11px] text-slate-400">
            {organization.feeSchedule?.orkiFeeBps === undefined || organization.feeSchedule.pspMarkupBps === undefined
              ? 'Orki 1.00% + PSP 0.25%'
              : `Orki ${(organization.feeSchedule.orkiFeeBps / 100).toFixed(2)}% + PSP ${(organization.feeSchedule.pspMarkupBps / 100).toFixed(2)}%`}
          </p>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex items-center space-x-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('merchants')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
            activeTab === 'merchants'
              ? 'border-onion-800 text-onion-900 bg-onion-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Merchants Directory ({orgMerchants.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
            activeTab === 'webhooks'
              ? 'border-onion-800 text-onion-900 bg-onion-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Webhook className="w-4 h-4" />
          <span>Webhooks & Endpoints ({webhooks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
            activeTab === 'logs'
              ? 'border-onion-800 text-onion-900 bg-onion-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Webhook Delivery Logs ({deliveries.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
            activeTab === 'transactions'
              ? 'border-onion-800 text-onion-900 bg-onion-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Transactions ({orgTransactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
            activeTab === 'config'
              ? 'border-onion-800 text-onion-900 bg-onion-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>PSP Fee Schedule & Rules</span>
        </button>
      </div>

      {/* TAB 1: MERCHANTS DIRECTORY */}
      {activeTab === 'merchants' && (
        <div className="mat-card overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by name, ID, external ID, license..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-onion-500/20 focus:border-onion-700 transition"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="invited">Setup Pending</option>
                <option value="verifying">Verifying</option>
                <option value="verification_action_required">Action Required</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              {onRefreshDashboard && (
                <button
                  onClick={() => void onRefreshDashboard()}
                  disabled={dashboardLoading}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium flex items-center space-x-1.5 bg-white hover:bg-slate-50 transition disabled:opacity-50"
                  title="Reload merchants directly from database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${dashboardLoading ? 'animate-spin' : ''}`} />
                  <span>{dashboardLoading ? 'Syncing...' : 'Sync DB'}</span>
                </button>
              )}

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
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-5 py-3 text-left">Legal Entity & Identifiers</th>
                  <th className="px-5 py-3 text-left">Registration Date</th>
                  <th className="px-5 py-3 text-left">Signatory Contact</th>
                  <th className="px-5 py-3 text-left">Onboarding & KYB</th>
                  <th className="px-5 py-3 text-left">Multi-Chain Wallets</th>
                  <th className="px-5 py-3 text-left">Settlement Mode</th>
                  <th className="px-5 py-3 text-right">Volume</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredMerchants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                      No merchants found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredMerchants.map((merchant) => {
                    const formattedCreated = merchant.createdAt
                      ? new Date(merchant.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }) + ' ' + new Date(merchant.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '—'

                    const setupUrl = `${window.location.origin}/setup#session=orki_setup_${merchant.id}`

                    return (
                      <tr key={merchant.id} className="hover:bg-slate-50/70 transition">
                        {/* Legal Entity & Identifiers */}
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900 text-[13px]">{merchant.legalBusinessName}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-slate-700 border border-slate-200">
                              <span>ID:</span> {merchant.id}
                              <button
                                type="button"
                                onClick={() => copyText(merchant.id, `mrch_${merchant.id}`)}
                                className="text-slate-400 hover:text-slate-800"
                                title="Copy Merchant ID"
                              >
                                {copiedKey === `mrch_${merchant.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </span>
                            <span className="inline-flex items-center gap-1 rounded bg-onion-50 px-1.5 py-0.5 text-onion-900 border border-onion-200">
                              <span>Ext:</span> {merchant.externalId}
                              <button
                                type="button"
                                onClick={() => copyText(merchant.externalId, `ext_${merchant.id}`)}
                                className="text-onion-400 hover:text-onion-800"
                                title="Copy External ID"
                              >
                                {copiedKey === `ext_${merchant.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            {merchant.tradeLicenseNumber} · {merchant.jurisdiction}
                          </div>
                        </td>

                        {/* Registration Date (createdAt) */}
                        <td className="px-5 py-3.5 font-mono text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formattedCreated}</span>
                          </div>
                        </td>

                        {/* Signatory Contact */}
                        <td className="px-5 py-3.5 text-slate-700">
                          <div className="font-medium text-slate-800">{merchant.representativeName || '—'}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{merchant.representativeEmail || '—'}</div>
                        </td>

                        {/* Onboarding & KYB */}
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col space-y-1">
                            <StatusBadge status={merchant.status} />
                            {merchant.nextStep && (
                              <span className="text-[10px] font-mono text-onion-800 font-semibold">
                                Next: {merchant.nextStep}
                              </span>
                            )}
                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              {merchant.verifiedAt ? (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 border border-emerald-200">
                                  <ShieldCheck className="w-2.5 h-2.5" /> KYB Approved
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 border border-amber-200">
                                  <ShieldAlert className="w-2.5 h-2.5" /> KYB Pending
                                </span>
                              )}
                              {merchant.settlementMode === 'auto_offramp' && (
                                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 border border-blue-200">
                                  Auto-AED
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Multi-Chain Wallets */}
                        <td className="px-5 py-3.5 font-mono text-[11px]">
                          {merchant.baseWalletAddress ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-slate-800">
                                <span className="text-[10px] font-bold text-onion-800 font-sans">Base:</span>
                                <span>{merchant.baseWalletAddress.slice(0, 6)}…{merchant.baseWalletAddress.slice(-4)}</span>
                                <button
                                  type="button"
                                  onClick={() => copyText(merchant.baseWalletAddress!, `base_${merchant.id}`)}
                                  className="text-slate-400 hover:text-slate-800"
                                  title="Copy Base Smart Account"
                                >
                                  {copiedKey === `base_${merchant.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              {merchant.solanaWalletAddress && (
                                <div className="flex items-center gap-1 text-slate-600">
                                  <span className="text-[10px] font-bold text-indigo-700 font-sans">Sol:</span>
                                  <span>{merchant.solanaWalletAddress.slice(0, 4)}…{merchant.solanaWalletAddress.slice(-4)}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyText(merchant.solanaWalletAddress!, `sol_${merchant.id}`)}
                                    className="text-slate-400 hover:text-slate-800"
                                    title="Copy Solana Wallet"
                                  >
                                    {copiedKey === `sol_${merchant.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              )}
                              {merchant.passkeyRegisteredAt && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-sans font-semibold text-emerald-700">
                                  <Fingerprint className="w-2.5 h-2.5" /> Passkey Active
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Wallets not derived</span>
                          )}
                        </td>

                        {/* Settlement Mode */}
                        <td className="px-5 py-3.5">
                          <span className="capitalize text-slate-700 font-medium">
                            {merchant.settlementMode.replace('_', ' ')}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            {merchant.settlementMode === 'auto_offramp' ? 'AED Bank Auto-Payout' : 'Hold USDC in Self-Custody'}
                          </div>
                        </td>

                        {/* Volume */}
                        <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          ${(merchant.volumeUsdc || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          <div className="text-[10px] text-slate-400 font-normal">
                            Bal: ${(merchant.balanceUsdc || 0).toFixed(2)}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => navigate(`/psp/merchants/${merchant.id}`)}
                            className="px-2.5 py-1 rounded text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition"
                          >
                            Inspect
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              copyText(setupUrl, `setup_${merchant.id}`)
                              window.open(setupUrl, '_blank')
                            }}
                            className="px-2.5 py-1 rounded text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition inline-flex items-center gap-1"
                            title="Launch wallet setup URL for merchant"
                          >
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                            <span>Setup</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onSelectMerchantForDashboard(merchant.id)}
                            className="px-2.5 py-1 rounded text-onion-800 hover:text-onion-900 bg-onion-50 border border-onion-200 transition font-medium"
                          >
                            Portal
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: WEBHOOKS & ENDPOINTS */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          {/* Webhook Architecture Info Banner */}
          <div className="mat-card p-5 bg-slate-900 text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-onion-300" />
                <h3 className="text-sm font-bold text-white">PSP Webhook Dispatch Architecture</h3>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                Orki notifies your servers in real-time when customer payments land, off-ramps execute, or wallet ceremonies complete.
                Every request includes an HMAC-SHA256 signature header (<code className="text-onion-300 font-mono">X-Orki-Signature: t=timestamp,v1=signature</code>) verified using your webhook secret.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsRegisterWebhookModalOpen(true)}
              className="mat-btn-primary px-4 py-2 text-xs font-semibold whitespace-nowrap flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Register Webhook Endpoint</span>
            </button>
          </div>

          {/* Test Webhook Card */}
          <div className="mat-card p-5 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Test Webhook Ping</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Send a signed simulated event payload to verify your endpoint response before going live.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={testEventType}
                  onChange={(e) => setTestEventType(e.target.value)}
                  className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-700"
                >
                  <option value="charge.payment_received">charge.payment_received</option>
                  <option value="charge.paid">charge.paid (AED Fiat Settled)</option>
                  <option value="merchant.wallets.created">merchant.wallets.created</option>
                  <option value="ping">ping (Verification Test)</option>
                </select>

                <button
                  type="button"
                  onClick={() => void handleTriggerTestWebhook()}
                  disabled={testEventBusy || webhooks.length === 0}
                  className="px-4 py-1.5 rounded-lg bg-onion-800 text-white text-xs font-medium hover:bg-onion-700 disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {testEventBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{testEventBusy ? 'Dispatching…' : 'Send Test Event'}</span>
                </button>
              </div>
            </div>

            {testSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{testSuccessMessage}</span>
              </div>
            )}
          </div>

          {/* Webhook Endpoints List */}
          <div className="mat-card overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Registered Endpoints</h3>
                <p className="text-xs text-slate-500 mt-0.5">Endpoints actively receiving event deliveries.</p>
              </div>
              <button
                type="button"
                onClick={() => void loadWebhooks()}
                disabled={webhooksLoading}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${webhooksLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {webhooks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {webhooksLoading ? 'Loading configured webhooks…' : 'No webhooks registered yet. Click "Register Webhook Endpoint" above to connect your API.'}
                </div>
              ) : (
                webhooks.map((wh) => {
                  const isRevealed = Boolean(revealedSecrets[wh.id])
                  return (
                    <div key={wh.id} className="p-5 space-y-3 hover:bg-slate-50/50 transition">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          <span className="font-mono text-sm font-bold text-slate-900">{wh.url}</span>
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200 uppercase">
                            {wh.status}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDeleteWebhook(wh.id)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                        >
                          Revoke Endpoint
                        </button>
                      </div>

                      {/* Signing Secret */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-slate-500 font-medium">Signing Secret:</span>
                        <span className="font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-800 border border-slate-200">
                          {isRevealed ? wh.secret || 'whsec_••••••••••••••••••••' : 'whsec_••••••••••••••••••••'}
                        </span>
                        {wh.secret && (
                          <>
                            <button
                              type="button"
                              onClick={() => setRevealedSecrets((prev) => ({ ...prev, [wh.id]: !prev[wh.id] }))}
                              className="text-slate-400 hover:text-slate-700 p-1"
                              title={isRevealed ? 'Hide secret' : 'Show secret'}
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyText(wh.secret!, `sec_${wh.id}`)}
                              className="text-slate-400 hover:text-slate-700 p-1"
                              title="Copy secret"
                            >
                              {copiedKey === `sec_${wh.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        )}
                      </div>

                      {/* Subscribed Events */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Subscribed Events:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {wh.events.map((ev) => (
                            <span key={ev} className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-700 border border-slate-200">
                              {ev}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WEBHOOK DELIVERY LOGS */}
      {activeTab === 'logs' && (
        <div className="mat-card overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Webhook Delivery Stream</h3>
              <p className="text-xs text-slate-500 mt-0.5">Real-time dispatches from Orki's backend event queue with payload inspections.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadDeliveries()}
              disabled={deliveriesLoading}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${deliveriesLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Logs</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-5 py-3 text-left">Event Type</th>
                  <th className="px-5 py-3 text-left">Dispatch Status</th>
                  <th className="px-5 py-3 text-left">Attempts</th>
                  <th className="px-5 py-3 text-left">Dispatched At</th>
                  <th className="px-5 py-3 text-left">Delivery Error / Response</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      {deliveriesLoading ? 'Loading delivery logs…' : 'No webhook deliveries recorded yet. Trigger a test event from the Webhooks tab.'}
                    </td>
                  </tr>
                ) : (
                  deliveries.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3 font-mono font-semibold text-slate-900">
                        {d.eventType}
                        <div className="text-[10px] text-slate-400 font-normal">{d.id}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            d.status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                              : d.status === 'FAILED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-300'
                              : 'bg-amber-50 text-amber-700 border border-amber-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              d.status === 'DELIVERED'
                                ? 'bg-emerald-500'
                                : d.status === 'FAILED'
                                ? 'bg-rose-500'
                                : 'bg-amber-500 animate-pulse'
                            }`}
                          ></span>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-600">{d.attempts}/8</td>
                      <td className="px-5 py-3 font-mono text-slate-600 whitespace-nowrap">
                        {new Date(d.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-slate-600 text-[11px] max-w-xs truncate">
                        {d.lastError || (d.status === 'DELIVERED' ? 'HTTP 200 OK — Verified' : 'Pending')}
                      </td>
                      <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedDelivery(d)}
                          className="px-2.5 py-1 rounded text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition inline-flex items-center gap-1"
                        >
                          <Code2 className="w-3 h-3 text-slate-400" />
                          <span>Payload</span>
                        </button>

                        {d.status !== 'DELIVERED' && (
                          <button
                            type="button"
                            onClick={() => void handleRetryDelivery(d.id)}
                            disabled={retryingId === d.id}
                            className="px-2.5 py-1 rounded text-onion-800 hover:text-onion-900 bg-onion-50 border border-onion-200 transition font-medium inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${retryingId === d.id ? 'animate-spin' : ''}`} />
                            <span>Retry</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RECENT TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="mat-card overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-900">Recent Transactions</h3>
            <p className="mt-1 text-xs text-slate-500">Live completed and pending settlement records from the PSP API.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">Transaction ID</th>
                  <th className="px-5 py-3 text-left">Merchant</th>
                  <th className="px-5 py-3 text-left">Type / Chain</th>
                  <th className="px-5 py-3 text-right">Gross Amount</th>
                  <th className="px-5 py-3 text-right">Fee Split</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orgTransactions.map((transaction) => {
                  const merchantName =
                    orgMerchants.find((m) => m.id === transaction.merchantId)?.legalBusinessName || transaction.merchantId
                  return (
                    <tr key={transaction.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3 font-mono text-slate-700">
                        <div>{transaction.id}</div>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800">{merchantName}</td>
                      <td className="px-5 py-3 capitalize text-slate-600">
                        {transaction.type.replace(/_/g, ' ')} · {transaction.chain}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">
                        ${transaction.grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {transaction.currency}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-[11px] text-slate-600">
                        Orki: ${(transaction.orkiFeeAmount || 0).toFixed(2)} · PSP: ${(transaction.pspMarkupAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 capitalize text-slate-600">
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-slate-500 whitespace-nowrap">
                        {new Date(transaction.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
                {orgTransactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                      {dashboardLoading ? 'Loading transactions…' : 'No transactions recorded yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PSP RATES & CONFIG */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* PSP LOCKED FEE SCHEDULE (30-DAY RATE LOCK & ORKI BOUNDS) */}
          <div className="mat-card p-6 bg-slate-50/70 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-onion-700" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Locked Fee Schedule & Compliance</h3>
              </div>
              <span className="inline-flex items-center text-[11px] font-mono font-semibold text-onion-800 bg-onion-50 border border-onion-200 px-2.5 py-0.5 rounded">
                {!organization.feeSchedule ||
                (organization.feeSchedule.lockedUntil && new Date(organization.feeSchedule.lockedUntil) > new Date())
                  ? 'Rate Lock Active'
                  : 'Rate Change Available'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="text-slate-500 font-medium text-[11px]">Orki Protocol Base Fee</span>
                <p className="text-base font-bold text-slate-900 font-mono">
                  {organization.feeSchedule?.orkiFeeBps !== undefined
                    ? `${(organization.feeSchedule.orkiFeeBps / 100).toFixed(2)}%`
                    : '1.00%'}
                </p>
                <p className="text-[10px] text-slate-400">Standard protocol fee (1.00% base)</p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="text-slate-500 font-medium text-[11px]">PSP Markup</span>
                <p className="text-base font-bold text-onion-800 font-mono">
                  {organization.feeSchedule?.pspMarkupBps !== undefined
                    ? `${(organization.feeSchedule.pspMarkupBps / 100).toFixed(2)}%`
                    : '0.25%'}
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
                    ? new Date(organization.feeSchedule.lockedUntil).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '30-Day Rate Lock Active'}
                </p>
                <p className="text-[10px] text-slate-400">Changes require 30 days’ notice and Orki approval</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER WEBHOOK MODAL */}
      {isRegisterWebhookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <button
              onClick={() => setIsRegisterWebhookModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center space-x-2 text-onion-900 mb-4">
              <Webhook className="w-5 h-5 text-onion-800" />
              <h3 className="text-base font-bold text-slate-900">Register Webhook Endpoint</h3>
            </div>

            <form onSubmit={(e) => void handleRegisterWebhook(e)} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  HTTPS Endpoint URL:
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://api.yourpsp.biz/webhooks/orki"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:border-onion-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">Must be an active HTTPS URL capable of accepting JSON POST requests.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-2">
                  Select Event Subscriptions:
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                  {AVAILABLE_WEBHOOK_EVENTS.map((ev) => {
                    const isChecked = selectedEvents.includes(ev.id)
                    return (
                      <label key={ev.id} className="flex items-center space-x-2 text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEvents((prev) => [...prev, ev.id])
                            } else {
                              setSelectedEvents((prev) => prev.filter((x) => x !== ev.id))
                            }
                          }}
                          className="rounded border-slate-300 text-onion-800 focus:ring-onion-500"
                        />
                        <span className="font-mono text-[11px]">{ev.label}</span>
                        <span className="text-[9px] text-slate-400 bg-slate-200/60 px-1.5 py-0.2 rounded font-sans">
                          {ev.group}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {webhookModalError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-medium text-xs">
                  {webhookModalError}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterWebhookModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registeringWebhook}
                  className="mat-btn-primary px-4 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {registeringWebhook ? 'Registering…' : 'Save Endpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WEBHOOK PAYLOAD INSPECTOR MODAL */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedDelivery(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center space-x-2 mb-3">
              <Code2 className="w-5 h-5 text-onion-800" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Webhook Dispatch Payload</h3>
                <p className="text-xs text-slate-500 font-mono">
                  Event: {selectedDelivery.eventType} · ID: {selectedDelivery.id}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono">
                <div>
                  <span className="text-slate-400">Status: </span>
                  <span className="font-bold text-slate-900">{selectedDelivery.status}</span>
                </div>
                <div>
                  <span className="text-slate-400">Attempts: </span>
                  <span className="text-slate-900">{selectedDelivery.attempts}/8</span>
                </div>
                <div>
                  <span className="text-slate-400">Created: </span>
                  <span className="text-slate-900">{new Date(selectedDelivery.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400">Delivered: </span>
                  <span className="text-slate-900">
                    {selectedDelivery.deliveredAt ? new Date(selectedDelivery.deliveredAt).toLocaleString() : 'Pending'}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between pb-1">
                  <span className="font-semibold text-slate-700">JSON Payload:</span>
                  <button
                    type="button"
                    onClick={() => copyText(JSON.stringify(selectedDelivery.payload, null, 2), 'payload_json')}
                    className="text-xs text-onion-800 hover:underline flex items-center gap-1 font-mono"
                  >
                    {copiedKey === 'payload_json' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>Copy JSON</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed">
                  {JSON.stringify(selectedDelivery.payload || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDelivery(null)}
                className="px-4 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEE MODAL */}
      {isFeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <button
              onClick={() => setIsFeeModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center space-x-2 text-onion-900 mb-4">
              <Sliders className="w-5 h-5 text-onion-800" />
              <h3 className="text-base font-bold text-slate-900">Request Fee-Schedule Change</h3>
            </div>

            <form onSubmit={(e) => void handleFeeSubmit(e)} className="space-y-4 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Current PSP Markup:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {(currentMarkupBps / 100).toFixed(2)}% ({currentMarkupBps} bps)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">PSP Maximum Markup Ceiling:</span>
                  <span className="font-mono font-bold text-emerald-700">1.00% (100 bps ceiling)</span>
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

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">PSP Markup (bps):</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newMarkupInput}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (!isNaN(val) && val > 100) {
                        setNewMarkupInput('100')
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
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start space-x-2">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <span className="font-bold">30-Day Notice and Dual Approval:</span> A fee change is applied only after its notice period ends and a separate Orki approver approves it.
                </p>
              </div>

              {feeRequestSuccess && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-center font-bold">
                  Request recorded. It remains pending until the notice period ends and Orki approves it.
                </div>
              )}
              {feeRequestError && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-800">
                  {feeRequestError}
                </p>
              )}

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
