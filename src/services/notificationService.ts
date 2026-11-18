import { getApiConfig, requestApi } from './apiConfig'

export type NotificationCategory = 'all' | 'merchant' | 'payment' | 'onchain' | 'offramp' | 'fee' | 'psp'
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error'

export interface PspNotificationItem {
  id: string
  organizationId: string
  merchantId: string | null
  merchantName: string | null
  merchantExternalId: string | null
  sourceEventId: string | null
  eventType: string
  category: Exclude<NotificationCategory, 'all'>
  severity: NotificationSeverity
  title: string
  message: string | null
  payload: Record<string, unknown>
  read: boolean
  readAt: string | null
  createdAt: string
}

export interface PspNotificationPageMeta {
  currentPage: number
  lastPage: number
  perPage: number
  total: number
}

export interface PspNotificationListResponse {
  data: PspNotificationItem[]
  unreadCount: number
  meta: PspNotificationPageMeta
}

export interface PspNotificationQuery {
  page?: number
  perPage?: number
  merchantId?: string
  eventType?: string
  category?: NotificationCategory
  unreadOnly?: boolean
  from?: string
  to?: string
  search?: string
}

export function buildNotificationQueryString(query: PspNotificationQuery = {}): string {
  const params = new URLSearchParams()

  if (query.page && query.page > 0) params.set('page', String(query.page))
  if (query.perPage && query.perPage > 0) params.set('perPage', String(query.perPage))
  if (query.merchantId && query.merchantId.trim()) params.set('merchantId', query.merchantId.trim())
  if (query.eventType && query.eventType.trim() && query.eventType !== 'all') {
    params.set('eventType', query.eventType.trim())
  }
  if (query.category && query.category !== 'all') params.set('category', query.category)
  if (query.unreadOnly) params.set('unreadOnly', '1')
  if (query.from && query.from.trim()) params.set('from', query.from.trim())
  if (query.to && query.to.trim()) params.set('to', query.to.trim())
  if (query.search && query.search.trim()) params.set('search', query.search.trim())

  const encoded = params.toString()
  return encoded ? `?${encoded}` : ''
}

export function normalizeNotificationListResponse(raw: unknown): PspNotificationListResponse {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const metaObj = (obj.meta && typeof obj.meta === 'object' ? obj.meta : {}) as Record<string, unknown>
  const data = Array.isArray(obj.data) ? (obj.data as PspNotificationItem[]) : []

  return {
    data,
    unreadCount: Number(obj.unreadCount ?? 0),
    meta: {
      currentPage: Number(metaObj.currentPage ?? obj.current_page ?? 1),
      lastPage: Number(metaObj.lastPage ?? obj.last_page ?? 1),
      perPage: Number(metaObj.perPage ?? obj.per_page ?? 25),
      total: Number(metaObj.total ?? obj.total ?? data.length),
    },
  }
}

export async function fetchPspNotifications(query: PspNotificationQuery = {}): Promise<PspNotificationListResponse> {
  const config = getApiConfig()
  const qs = buildNotificationQueryString(query)
  const raw = await requestApi<unknown>(config, 'GET', `/api/v1/psp/notifications${qs}`, undefined, 'psp')
  return normalizeNotificationListResponse(raw)
}

export async function fetchMerchantNotifications(
  merchantId: string,
  query: Omit<PspNotificationQuery, 'merchantId'> = {}
): Promise<PspNotificationListResponse> {
  const config = getApiConfig()
  const qs = buildNotificationQueryString(query)
  const raw = await requestApi<unknown>(
    config,
    'GET',
    `/api/v1/psp/merchants/${encodeURIComponent(merchantId)}/notifications${qs}`,
    undefined,
    'psp'
  )
  return normalizeNotificationListResponse(raw)
}

export async function markNotificationRead(notificationId: string): Promise<{ id: string; read: boolean }> {
  const config = getApiConfig()
  return requestApi<{ id: string; read: boolean }>(
    config,
    'POST',
    `/api/v1/psp/notifications/${encodeURIComponent(notificationId)}/read`,
    {},
    'psp'
  )
}

export async function markAllNotificationsRead(merchantId?: string): Promise<{ updated: number }> {
  const config = getApiConfig()
  const path = merchantId
    ? `/api/v1/psp/merchants/${encodeURIComponent(merchantId)}/notifications/read-all`
    : '/api/v1/psp/notifications/read-all'

  return requestApi<{ updated: number }>(config, 'POST', path, {}, 'psp')
}
