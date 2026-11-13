import React from 'react'
import { ExternalLink, ShoppingBag, Store } from 'lucide-react'
import {
  createCharge,
  fetchMarkupSettings,
  fetchMerchantSettings,
  listCharges,
} from '../../../services/pspConsoleService'
import type { ChargeSummary, MerchantSettings, MarkupSettings } from '../../../services/pspConsoleService'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { Field, TextInput } from '../../../components/ui/Field'
import { JsonBlock } from '../../../components/ui/JsonBlock'
import { EmptyState, ErrorBanner, Spinner } from '../../../components/ui/StateBlocks'
import { getApiConfig, requestApi } from '../../../services/apiConfig'

/**
 * Shoplane console — the commerce-platform integration style.
 *
 * Stands in for a commerce platform that is also a payment gateway: it creates
 * durable per-order charges and administers its merchant's settings.
 */
export const ShoplaneConsoleView: React.FC = () => {
  const [orders, setOrders] = React.useState<ChargeSummary[]>([])
  const [markup, setMarkup] = React.useState<MarkupSettings | null>(null)
  const [merchant, setMerchant] = React.useState<MerchantSettings | null>(null)
  const [created, setCreated] = React.useState<ChargeSummary | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [form, setForm] = React.useState({
    merchantExternalId: '',
    orderId: 'ORD-1001',
    amount: '80',
    currency: 'USDC',
    description: '',
  })

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filters = form.merchantExternalId ? { merchantExternalId: form.merchantExternalId } : {}
      const [page, markupSettings] = await Promise.all([
        listCharges(filters),
        fetchMarkupSettings(),
      ])
      setOrders(page.data ?? [])
      setMarkup(markupSettings)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setLoading(false)
    }
  }, [form.merchantExternalId])

  React.useEffect(() => {
    void load()
  }, [load])

  const createOrder = async () => {
    setBusy(true)
    setError(null)
    try {
      const charge = await createCharge({
        merchantExternalId: form.merchantExternalId,
        amount: form.amount,
        currency: form.currency,
        description: form.description || undefined,
        orderMetadata: { orderId: form.orderId },
      })
      setCreated(charge)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  const loadMerchant = async () => {
    if (!form.merchantExternalId.trim()) {
      setError('Enter the merchant external ID first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const page = await requestApi<{ data: Array<{ id: string; external_id?: string; externalId?: string }> }>(
        getApiConfig(),
        'GET',
        `/api/v1/psp/merchants?search=${encodeURIComponent(form.merchantExternalId.trim())}`,
        undefined,
        'psp',
      )
      const record = page.data.find((item) =>
        (item.external_id ?? item.externalId) === form.merchantExternalId.trim()
      )
      if (!record) throw new Error('No merchant with that external ID exists under this PSP.')
      setMerchant(await fetchMerchantSettings(record.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-sky-600" />
            Shoplane
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Commerce platform that is also a payment gateway — creates order charges and administers merchant settings.
          </p>
        </div>
        <div className="w-64">
          <Field label="Merchant external id">
            <TextInput
              value={form.merchantExternalId}
              placeholder="Enter a merchant external ID"
              onChange={(event) => setForm((current) => ({ ...current, merchantExternalId: event.target.value }))}
            />
          </Field>
        </div>
      </header>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Create an order payment">
          <div className="space-y-3">
            <Field label="Order ID">
              <TextInput
                value={form.orderId}
                onChange={(event) => setForm((current) => ({ ...current, orderId: event.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount">
                <TextInput
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                />
              </Field>
              <Field label="Currency">
                <TextInput
                  value={form.currency}
                  onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}
                />
              </Field>
            </div>
            <Field label="Description" hint="Optional order description.">
              <TextInput
                value={form.description}
                placeholder="Order 1001"
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </Field>
            <Button variant="primary" loading={busy} onClick={() => void createOrder()} className="w-full justify-center">
              Create order charge
            </Button>
            <Button variant="secondary" loading={busy} onClick={() => void loadMerchant()} className="w-full justify-center">
              <Store className="w-3.5 h-3.5 mr-1.5" />
              Load merchant settings
            </Button>
          </div>

          {created && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-900 space-y-1">
              <p className="font-semibold">Order {String(created.orderMetadata?.orderId ?? form.orderId)} created</p>
              <p className="font-mono break-all">{created.chargeToken}</p>
              {created.checkoutUrl && (
                <a href={created.checkoutUrl} target="_blank" rel="noreferrer" className="text-emerald-800 underline">
                  Open customer checkout
                </a>
              )}
            </div>
          )}

          {markup && (
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-1">Your markup</p>
              <JsonBlock label="GET /api/v1/psp/settings/markup" value={markup} />
            </div>
          )}

          {merchant && (
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-1">Merchant settings</p>
              <JsonBlock label="GET /api/v1/psp/merchants/{id}" value={merchant} />
            </div>
          )}
        </Card>

        <Card title="Orders" className="lg:col-span-2" padded={false}>
          {loading ? (
            <div className="p-5">
              <Spinner label="Loading orders…" />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No orders yet" hint="Create an order payment with the form on the left." />
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 text-left text-[10px] uppercase tracking-wide font-semibold text-slate-500">
                    Order
                  </th>
                  <th className="py-2.5 px-4 text-left text-[10px] uppercase tracking-wide font-semibold text-slate-500">
                    Amount
                  </th>
                  <th className="py-2.5 px-4 text-left text-[10px] uppercase tracking-wide font-semibold text-slate-500">
                    Status
                  </th>
                  <th className="py-2.5 px-4 text-left text-[10px] uppercase tracking-wide font-semibold text-slate-500">
                    Checkout
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.chargeToken} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4">
                      <p className="text-xs font-semibold text-slate-900">
                        {String(order.orderMetadata?.orderId ?? order.description ?? order.chargeToken)}
                      </p>
                      <p className="font-mono text-[10px] text-slate-500 break-all">{order.chargeToken}</p>
                    </td>
                    <td className="py-2.5 px-4 text-xs font-mono tabular-nums text-slate-800">
                      {order.amount} {order.currency}
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge tone={order.status === 'paid' ? 'success' : 'neutral'}>{order.status}</Badge>
                    </td>
                    <td className="py-2.5 px-4">
                      {order.checkoutUrl ? (
                        <a
                          href={order.checkoutUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-onion hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400">Unavailable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  )
}
