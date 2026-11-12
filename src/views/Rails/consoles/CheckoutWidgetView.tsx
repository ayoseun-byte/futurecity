import React from 'react'
import { Copy, Code2 } from 'lucide-react'
import { listPaymentLinks } from '../../../services/pspConsoleService'
import type { PaymentLinkSummary } from '../../../services/pspConsoleService'
import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { JsonBlock } from '../../../components/ui/JsonBlock'
import { EmptyState, ErrorBanner, Spinner } from '../../../components/ui/StateBlocks'

/**
 * Corner Shop with the checkout widget — the embedded-checkout style.
 *
 * The merchant's site embeds the PSP's checkout; the widget is a live preview
 * of the hosted checkout page for a chosen payment link.
 */
export const CheckoutWidgetView: React.FC = () => {
  const [links, setLinks] = React.useState<PaymentLinkSummary[]>([])
  const [selected, setSelected] = React.useState<string>('')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    let active = true
    listPaymentLinks()
      .then((page) => {
        if (!active) return
        const usable = (page.data ?? []).filter((link) => Boolean(link.checkoutUrl))
        setLinks(usable)
        setSelected((current) => current || usable[0]?.checkoutUrl || '')
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const snippet = `<div id="orki-checkout" data-payment-link="${selected || '<payment link id>'}"></div>
<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/checkout/embed.js" async></script>`

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Code2 className="w-5 h-5 text-violet-600" />
          Corner Shop — checkout widget
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          The embedded-checkout style: the merchant's site drops in the PSP's checkout and the buyer pays in place.
        </p>
      </header>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card
          title="Embed snippet"
          actions={
            <button
              type="button"
              onClick={copySnippet}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          }
        >
          <JsonBlock label="HTML" value={snippet} collapsed={false} />
          <p className="text-[11px] text-slate-500 mt-3">
            The widget renders the hosted checkout for the payment link. Choose a live link below to preview it.
          </p>
        </Card>

        <Card title="Live preview" padded={false}>
          {loading ? (
            <div className="p-5">
              <Spinner label="Loading payment links…" />
            </div>
          ) : links.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No payment link to preview"
                hint="Issue one from the Shoplane console first."
              />
            </div>
          ) : (
            <div className="space-y-3 p-5">
              <div className="flex flex-wrap gap-1.5">
                {links.map((link) => (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => setSelected(link.checkoutUrl ?? '')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-mono border ${
                      selected === link.checkoutUrl
                        ? 'bg-onion text-white border-onion'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {link.id}
                  </button>
                ))}
              </div>

              {links
                .filter((link) => link.checkoutUrl === selected)
                .map((link) => (
                  <div key={link.id} className="flex items-center gap-2">
                    <Badge tone="neutral">{link.currency}</Badge>
                    <span className="text-xs font-mono tabular-nums">{link.amount ?? 'dynamic'}</span>
                  </div>
                ))}

              {selected && (
                <iframe
                  title="Orki checkout preview"
                  src={selected}
                  className="w-full h-[420px] rounded-xl border border-slate-200 bg-white"
                />
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
