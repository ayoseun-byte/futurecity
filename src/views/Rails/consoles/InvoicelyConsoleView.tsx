import React from 'react'
import { ExternalLink, FileText, Plus } from 'lucide-react'
import {
  cancelCharge,
  createCharge,
  listCharges,
} from '../../../services/pspConsoleService'
import type { ChargeSummary } from '../../../services/pspConsoleService'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { Field, TextInput } from '../../../components/ui/Field'
import { EmptyState, ErrorBanner, Spinner } from '../../../components/ui/StateBlocks'

/**
 * Invoicely console — the invoicing-platform integration style.
 *
 * Stands in for an invoicing platform that raises an invoice through the PSP
 * API and waits for the buyer to pay it on the hosted checkout.
 */
export const InvoicelyConsoleView: React.FC = () => {
  const [charges, setCharges] = React.useState<ChargeSummary[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [merchantExternalId, setMerchantExternalId] = React.useState('')
  const [form, setForm] = React.useState({
    amount: '120.00',
    currency: 'USDC',
    invoiceNumber: 'INV-1001',
    dueAt: '',
  })
  const [created, setCreated] = React.useState<ChargeSummary | null>(null)
  const [busy, setBusy] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const page = await listCharges(merchantExternalId ? { merchantExternalId } : {})
      setCharges(page.data ?? [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setLoading(false)
    }
  }, [merchantExternalId])

  React.useEffect(() => {
    void load()
  }, [load])

  const raiseInvoice = async () => {
    setBusy(true)
    setError(null)
    try {
      const charge = await createCharge({
        merchantExternalId,
        amount: form.amount,
        currency: form.currency,
        invoice: {
          number: form.invoiceNumber,
          issuedAt: new Date().toISOString().slice(0, 10),
          dueAt: form.dueAt || null,
        },
      })
      setCreated(charge)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  const cancel = async (chargeToken: string) => {
    setBusy(true)
    setError(null)
    try {
      await cancelCharge(chargeToken)
      await load()
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
            <FileText className="w-5 h-5 text-amber-600" />
            Invoicely
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Invoicing platform integration — raises invoices through the PSP API and waits for the buyer to pay.
          </p>
        </div>
        <div className="w-64">
          <Field label="Merchant external id">
            <TextInput
              value={merchantExternalId}
              placeholder="DEMO-STORE-1"
              onChange={(event) => setMerchantExternalId(event.target.value)}
            />
          </Field>
        </div>
      </header>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Raise an invoice" className="lg:col-span-1">
          <div className="space-y-3">
            <Field label="Invoice number">
              <TextInput
                value={form.invoiceNumber}
                onChange={(event) => setForm((current) => ({ ...current, invoiceNumber: event.target.value }))}
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
            <Field label="Due date" hint="Optional, shown on the invoice.">
              <TextInput
                type="date"
                value={form.dueAt}
                onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))}
              />
            </Field>
            <Button
              variant="primary"
              loading={busy}
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => void raiseInvoice()}
              className="w-full justify-center"
            >
              Raise invoice
            </Button>
          </div>

          {created && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-900 space-y-1">
              <p className="font-semibold">Invoice {created.invoice?.number ?? created.chargeToken} raised</p>
              <p className="font-mono break-all">{created.chargeToken}</p>
              {created.checkoutUrl && (
                <a
                  href={created.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-800 underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open the buyer checkout
                </a>
              )}
            </div>
          )}
        </Card>

        <Card title="Invoices" className="lg:col-span-2" padded={false}>
          {loading ? (
            <div className="p-5">
              <Spinner label="Loading invoices…" />
            </div>
          ) : charges.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No invoices yet"
                hint="Raise one with the form, or load a PSP credential that already has charges."
              />
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 text-left text-[10px] uppercase tracking-wide font-semibold text-slate-500">
                    Invoice
                  </th>
                  <th className="py-2.5 px-4 text-left text-[10px] uppercase tracking-wide font-semibold text-slate-500">
                    Amount
                  </th>
                  <th className="py-2.5 px-4 text-left text-[10px] uppercase tracking-wide font-semibold text-slate-500">
                    Status
                  </th>
                  <th className="py-2.5 px-4 text-left text-[10px] uppercase tracking-wide font-semibold text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {charges.map((charge) => (
                  <tr key={charge.chargeToken} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4">
                      <p className="text-xs font-semibold text-slate-900">{charge.invoice?.number ?? '—'}</p>
                      <p className="font-mono text-[10px] text-slate-500 break-all">{charge.chargeToken}</p>
                    </td>
                    <td className="py-2.5 px-4 text-xs font-mono tabular-nums text-slate-800">
                      {charge.amount} {charge.currency}
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge tone={charge.status === 'paid' ? 'success' : 'neutral'}>{charge.status}</Badge>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        {charge.checkoutUrl && (
                          <a
                            href={charge.checkoutUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-onion hover:underline"
                          >
                            Checkout
                          </a>
                        )}
                        {charge.status !== 'paid' && charge.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => void cancel(charge.chargeToken)}
                            className="text-[11px] text-rose-600 hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
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
