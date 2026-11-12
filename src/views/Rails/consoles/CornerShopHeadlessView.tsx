import React from 'react'
import { Code2, Send } from 'lucide-react'
import { createCharge } from '../../../services/pspConsoleService'
import type { ChargeSummary } from '../../../services/pspConsoleService'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Field, TextInput } from '../../../components/ui/Field'
import { JsonBlock } from '../../../components/ui/JsonBlock'
import { ErrorBanner } from '../../../components/ui/StateBlocks'

/**
 * Corner Shop, headless — the direct-API integration style.
 *
 * The merchant's own website with its own button and no PSP script: it calls
 * the Orki API straight from the browser and renders whatever comes back.
 */
export const CornerShopHeadlessView: React.FC = () => {
  const [form, setForm] = React.useState({ merchantExternalId: '', amount: '55', currency: 'USDC' })
  const [result, setResult] = React.useState<ChargeSummary | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const request = {
    method: 'POST',
    url: '/api/v1/psp/charges',
    headers: {
      Authorization: 'Bearer <your PSP key>',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'generated per request',
    },
    body: {
      merchantExternalId: form.merchantExternalId || '<merchant external id>',
      amount: form.amount,
      currency: form.currency,
    },
  }

  const pay = async () => {
    setBusy(true)
    setError(null)
    try {
      setResult(
        await createCharge({
          merchantExternalId: form.merchantExternalId,
          amount: form.amount,
          currency: form.currency,
        }),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setResult(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Code2 className="w-5 h-5 text-emerald-600" />
          Corner Shop — headless
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          The merchant's own site with its own button: no PSP script, just a direct API call.
        </p>
      </header>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Pay with Corner Shop">
          <div className="space-y-3">
            <Field label="Merchant external id">
              <TextInput
                value={form.merchantExternalId}
                placeholder="DEMO-STORE-1"
                onChange={(event) => setForm((current) => ({ ...current, merchantExternalId: event.target.value }))}
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
            <Button variant="primary" loading={busy} icon={<Send className="w-3.5 h-3.5" />} onClick={() => void pay()}>
              Pay now
            </Button>
          </div>

          {result && (
            <div className="mt-4 space-y-2">
              <p className="text-[11px] text-emerald-700">
                Charge <span className="font-mono">{result.chargeToken}</span> created ({result.status}).
              </p>
              {result.checkoutUrl && (
                <a
                  href={result.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-onion hover:underline"
                >
                  Open the checkout →
                </a>
              )}
              <JsonBlock label="response" value={result} />
            </div>
          )}
        </Card>

        <Card title="The request your site makes">
          <JsonBlock label="POST /api/v1/psp/charges" value={request} collapsed={false} />
          <p className="text-[11px] text-slate-500 mt-3">
            No script tag, no iframe: the button on the merchant's page calls the Orki API directly and renders the
            checkout link it gets back.
          </p>
        </Card>
      </div>
    </div>
  )
}
