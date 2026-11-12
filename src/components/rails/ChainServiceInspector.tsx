import React from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { inspectChainService } from '../../services/chainServiceService'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Field, TextInput } from '../ui/Field'
import { JsonBlock } from '../ui/JsonBlock'
import { ErrorBanner, Spinner } from '../ui/StateBlocks'

interface Capability {
  id: string
  label: string
  query: { key: string; label: string; placeholder?: string; defaultValue?: string }[]
}

/** The read-only capabilities the admin proxy exposes. */
const capabilities: Capability[] = [
  { id: 'health', label: 'Liveness', query: [] },
  { id: 'routes', label: 'Route inventory', query: [] },
  { id: 'deployments', label: 'Deployed contracts and programs', query: [] },
  { id: 'contract-config', label: 'Splitter configuration (Base)', query: [{ key: 'network', label: 'Network', defaultValue: 'base' }] },
  { id: 'evm-psp', label: 'On-chain PSP (Base)', query: [{ key: 'address', label: 'PSP wallet', placeholder: '0x…' }, { key: 'network', label: 'Network', defaultValue: 'base' }] },
  { id: 'evm-merchant', label: 'On-chain merchant (Base)', query: [{ key: 'address', label: 'Merchant wallet', placeholder: '0x…' }, { key: 'network', label: 'Network', defaultValue: 'base' }] },
  { id: 'solana-config', label: 'B2B Solana program config', query: [] },
  { id: 'solana-psp', label: 'On-chain PSP (Solana)', query: [{ key: 'address', label: 'PSP wallet', placeholder: 'base58…' }] },
  { id: 'solana-merchant', label: 'On-chain merchant (Solana)', query: [{ key: 'owner', label: 'Owner wallet', placeholder: 'base58…' }, { key: 'merchant_name', label: 'Merchant name' }] },
  { id: 'solana-pdas', label: 'Derived Solana addresses', query: [{ key: 'owner', label: 'Owner wallet', placeholder: 'base58…' }, { key: 'merchant_name', label: 'Merchant name' }, { key: 'psp_wallet', label: 'PSP wallet', placeholder: 'base58…' }, { key: 'payment_id', label: 'Payment id', placeholder: 'optional' }, { key: 'mint', label: 'Mint', placeholder: 'optional' }] },
  { id: 'tx-status', label: 'Transaction status', query: [{ key: 'tx_hash', label: 'Transaction hash', placeholder: '0x…' }, { key: 'network', label: 'Network', defaultValue: 'base' }] },
  { id: 'balances', label: 'Balances', query: [{ key: 'address', label: 'Address', placeholder: '0x…' }, { key: 'chain', label: 'Chain', defaultValue: 'base' }] },
  { id: 'prices', label: 'Prices', query: [{ key: 'symbols', label: 'Symbols (comma separated)', defaultValue: 'USDC' }] },
]

/**
 * A direct window onto the sidecar.
 *
 * Requests travel through the audited admin proxy, so the chain-service token
 * never reaches the browser.
 */
export const ChainServiceInspector: React.FC = () => {
  const [capability, setCapability] = React.useState(capabilities[0].id)
  const [values, setValues] = React.useState<Record<string, string>>({})
  const [payload, setPayload] = React.useState<unknown>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const active = capabilities.find((entry) => entry.id === capability) ?? capabilities[0]

  const run = async () => {
    setLoading(true)
    setError(null)
    try {
      const query: Record<string, string> = {}
      for (const field of active.query) {
        const value = values[field.key] ?? field.defaultValue ?? ''
        if (value.trim()) query[field.key] = value.trim()
      }
      const inspection = await inspectChainService(active.id, query)
      setPayload(inspection)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title="Chain-service inspector"
      subtitle="Read-only. Every request is proxied by the backend, which keeps the sidecar token server-side and writes an audit entry."
      actions={
        <Button variant="primary" loading={loading} icon={<Search className="w-3.5 h-3.5" />} onClick={() => void run()}>
          Send
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <Field label="Capability">
          <select
            value={capability}
            onChange={(event) => setCapability(event.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none bg-white"
          >
            {capabilities.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </Field>

        {active.query.map((field) => (
          <Field key={field.key} label={field.label}>
            <TextInput
              value={values[field.key] ?? field.defaultValue ?? ''}
              placeholder={field.placeholder}
              onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
            />
          </Field>
        ))}
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} className="mb-3" />}

      {loading ? (
        <Spinner label="Calling the chain-service…" />
      ) : payload ? (
        <JsonBlock label="chain-service response" value={payload} collapsed={false} />
      ) : (
        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Pick a capability and send a request.
        </p>
      )}
    </Card>
  )
}
