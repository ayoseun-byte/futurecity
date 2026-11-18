import { describe, expect, it } from 'vitest'
import {
  buildNotificationQueryString,
  normalizeNotificationListResponse,
} from './notificationService'

describe('notificationService', () => {
  it('builds query strings for pagination and filters while omitting defaults', () => {
    expect(buildNotificationQueryString()).toBe('')

    expect(
      buildNotificationQueryString({
        page: 2,
        perPage: 15,
        merchantId: 'mrch_123',
        category: 'payment',
        eventType: 'charge.paid',
        unreadOnly: true,
        search: 'Coffee',
      })
    ).toBe('?page=2&perPage=15&merchantId=mrch_123&eventType=charge.paid&category=payment&unreadOnly=1&search=Coffee')

    expect(
      buildNotificationQueryString({
        page: 1,
        category: 'all',
        eventType: 'all',
        unreadOnly: false,
        search: '   ',
      })
    ).toBe('?page=1')
  })

  it('normalizes both meta-wrapped and Laravel top-level pagination payloads', () => {
    const normalized = normalizeNotificationListResponse({
      data: [
        {
          id: 'notif_1',
          organizationId: 'psp_1',
          merchantId: 'mrch_1',
          merchantName: 'Alpha',
          merchantExternalId: 'ext_alpha',
          sourceEventId: 'evt_1',
          eventType: 'charge.paid',
          category: 'payment',
          severity: 'success',
          title: 'Charge paid',
          message: 'Alpha · 100 USDC',
          payload: { amount: '100' },
          read: false,
          readAt: null,
          createdAt: '2026-11-18T12:00:00Z',
        },
      ],
      unreadCount: 3,
      current_page: 2,
      last_page: 5,
      per_page: 10,
      total: 42,
    })

    expect(normalized.unreadCount).toBe(3)
    expect(normalized.data).toHaveLength(1)
    expect(normalized.data[0].eventType).toBe('charge.paid')
    expect(normalized.meta).toEqual({
      currentPage: 2,
      lastPage: 5,
      perPage: 10,
      total: 42,
    })
  })
})
