import React, { useCallback, useEffect, useState } from 'react'
import {
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
} from 'lucide-react'
import type { Merchant } from '../types'
import {
  type NotificationCategory,
  type PspNotificationItem,
  type PspNotificationPageMeta,
  fetchMerchantNotifications,
  fetchPspNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService'

interface PspNotificationsPanelProps {
  /** When set, fetches notifications strictly for this merchant via `/merchants/{id}/notifications`. */
  merchantId?: string
  /** Optional merchant list used for merchant dropdown filtering in PSP-wide mode. */
  merchants?: Merchant[]
  onUnreadCountChange?: (count: number) => void
  onSelectMerchant?: (merchantId: string) => void
}

const CATEGORIES: { value: NotificationCategory; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'merchant', label: 'Merchants' },
  { value: 'payment', label: 'Payments & Charges' },
  { value: 'onchain', label: 'On-Chain' },
  { value: 'offramp', label: 'Off-Ramp' },
  { value: 'fee', label: 'Fee Schedule' },
  { value: 'psp', label: 'PSP' },
]

const SEVERITY_BADGE: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  error: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-slate-100 text-slate-700 border-slate-200',
}

export const PspNotificationsPanel: React.FC<PspNotificationsPanelProps> = ({
  merchantId,
  merchants = [],
  onUnreadCountChange,
  onSelectMerchant,
}) => {
  const [items, setItems] = useState<PspNotificationItem[]>([])
  const [meta, setMeta] = useState<PspNotificationPageMeta>({ currentPage: 1, lastPage: 1, perPage: 15, total: 0 })
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [category, setCategory] = useState<NotificationCategory>('all')
  const [selectedMerchantFilter, setSelectedMerchantFilter] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = merchantId
        ? await fetchMerchantNotifications(merchantId, {
            page,
            perPage,
            category,
            unreadOnly,
            search: appliedSearch,
          })
        : await fetchPspNotifications({
            page,
            perPage,
            category,
            merchantId: selectedMerchantFilter || undefined,
            unreadOnly,
            search: appliedSearch,
          })

      setItems(response.data)
      setMeta(response.meta)
      setUnreadCount(response.unreadCount)
      onUnreadCountChange?.(response.unreadCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notification history.')
    } finally {
      setLoading(false)
    }
  }, [merchantId, page, perPage, category, selectedMerchantFilter, unreadOnly, appliedSearch, onUnreadCountChange])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  const handleMarkRead = async (item: PspNotificationItem) => {
    if (item.read) return
    setMarkingId(item.id)
    try {
      await markNotificationRead(item.id)
      const nextUnread = Math.max(0, unreadCount - 1)
      setUnreadCount(nextUnread)
      onUnreadCountChange?.(nextUnread)
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, read: true, readAt: new Date().toISOString() } : row
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read.')
    } finally {
      setMarkingId(null)
    }
  }

  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    try {
      await markAllNotificationsRead(merchantId || selectedMerchantFilter || undefined)
      await loadNotifications()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notifications as read.')
    } finally {
      setMarkingAll(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setAppliedSearch(searchInput.trim())
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-onion-700" />
            <h3 className="text-sm font-bold text-slate-900">
              {merchantId ? 'Merchant Notification History' : 'PSP Notification History'}
            </h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-onion-100 text-onion-900 border border-onion-200">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Paginated history of onboarding, KYB, charge/payment, fee, and settlement events—even when webhooks are not configured.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={markingAll || unreadCount === 0}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>{markingAll ? 'Marking…' : 'Mark All Read'}</span>
          </button>
          <button
            type="button"
            onClick={() => void loadNotifications()}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-onion text-white hover:bg-onion-900 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3 flex flex-wrap items-center gap-2.5">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search event, title, message, or merchant…"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-onion/20"
          />
        </form>

        <select
          value={category}
          onChange={(e) => {
            setPage(1)
            setCategory(e.target.value as NotificationCategory)
          }}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        {!merchantId && merchants.length > 0 && (
          <select
            value={selectedMerchantFilter}
            onChange={(e) => {
              setPage(1)
              setSelectedMerchantFilter(e.target.value)
            }}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 max-w-[200px]"
          >
            <option value="">All Merchants</option>
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.legalBusinessName || m.externalId || m.id}
              </option>
            ))}
          </select>
        )}

        <label className="inline-flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer select-none px-2">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => {
              setPage(1)
              setUnreadOnly(e.target.checked)
            }}
            className="rounded border-slate-300 text-onion focus:ring-onion"
          />
          <span>Unread only</span>
        </label>

        <select
          value={perPage}
          onChange={(e) => {
            setPage(1)
            setPerPage(Number(e.target.value))
          }}
          className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
          aria-label="Rows per page"
        >
          <option value={10}>10 / page</option>
          <option value={15}>15 / page</option>
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
        </select>
      </div>

      {error && (
        <div className="px-5 py-3 bg-rose-50 border-b border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* List */}
      <div className="divide-y divide-slate-100">
        {items.map((item) => {
          const isExpanded = expandedId === item.id
          const badgeStyle = SEVERITY_BADGE[item.severity] || SEVERITY_BADGE.info

          return (
            <div
              key={item.id}
              className={`px-5 py-3.5 transition ${item.read ? 'bg-white' : 'bg-onion-50/30'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {!item.read && <span className="w-2 h-2 rounded-full bg-onion-700 shrink-0" />}
                    <span className="text-xs font-bold text-slate-900">{item.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${badgeStyle}`}>
                      {item.eventType}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase">
                      {item.category}
                    </span>
                    {!merchantId && (item.merchantName || item.merchantExternalId || item.merchantId) && (
                      <button
                        type="button"
                        onClick={() => item.merchantId && onSelectMerchant?.(item.merchantId)}
                        className="text-[11px] font-semibold text-onion-800 hover:underline"
                      >
                        {item.merchantName || item.merchantExternalId || item.merchantId}
                      </button>
                    )}
                  </div>

                  {item.message && (
                    <p className="text-xs text-slate-600">{item.message}</p>
                  )}

                  <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="inline-flex items-center space-x-0.5 text-slate-500 hover:text-slate-800 font-medium"
                    >
                      <span>{isExpanded ? 'Hide payload' : 'View payload'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="shrink-0 flex items-center space-x-2">
                  {!item.read ? (
                    <button
                      type="button"
                      disabled={markingId === item.id}
                      onClick={() => void handleMarkRead(item)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />
                      <span>{markingId === item.id ? 'Saving…' : 'Mark read'}</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400">Read</span>
                  )}
                </div>
              </div>

              {isExpanded && (
                <pre className="mt-3 p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-64">
                  {JSON.stringify(item.payload, null, 2)}
                </pre>
              )}
            </div>
          )
        })}

        {!loading && items.length === 0 && (
          <div className="px-5 py-10 text-center text-xs text-slate-400">
            No notifications match your current filters.
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="border-t border-slate-200 px-5 py-3 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
        <span>
          Page <strong className="text-slate-900">{meta.currentPage}</strong> of{' '}
          <strong className="text-slate-900">{meta.lastPage}</strong> ({meta.total} total)
        </span>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            disabled={loading || meta.currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <button
            type="button"
            disabled={loading || meta.currentPage >= meta.lastPage}
            onClick={() => setPage((p) => Math.min(meta.lastPage, p + 1))}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
