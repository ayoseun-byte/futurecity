import React from 'react'
import { Copy, Code2 } from 'lucide-react'
import { listCharges, listPaymentLinks } from '../../../services/pspConsoleService'
import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { JsonBlock } from '../../../components/ui/JsonBlock'
import { EmptyState, ErrorBanner, Spinner } from '../../../components/ui/StateBlocks'

interface EmbedTarget {
  id: string
  kind: 'charge' | 'payment_link'
  currency: string
  amount?: string | null
  localPath: string
}

function toLocalCheckoutPath(urlOrId: string, kind: 'charge' | 'payment_link'): string {
  if (urlOrId.startsWith('http://') || urlOrId.startsWith('https://')) {
    try {
      const parsed = new URL(urlOrId)
      return parsed.pathname + parsed.search
    } catch {
      // fall through
    }
  }
  return kind === 'charge' ? `/charge/${urlOrId}` : `/pay/${urlOrId}`
}

/**
 * Corner Shop with the checkout widget — embedded iframe & button script styles.
 *
 * The merchant's site embeds the live unified checkout in an iframe (or loads `/orki-widget.js`)
 * for either a single-use charge (`chg_...`) or a reusable payment link (`pay_...`).
 */
export const CheckoutWidgetView: React.FC = () => {
  const [targets, setTargets] = React.useState<EmbedTarget[]>([])
  const [selectedId, setSelectedId] = React.useState<string>('')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState<'iframe' | 'script' | null>(null)
  const [widgetEvents, setWidgetEvents] = React.useState<Array<{ time: string; type: string }>>([])

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data.type === 'string' && event.data.type.startsWith('ORKI_')) {
        setWidgetEvents((prev) => [
          { time: new Date().toLocaleTimeString(), type: `${event.data.type} (${event.data.event || ''})` },
          ...prev.slice(0, 9),
        ])
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  React.useEffect(() => {
    let active = true
    Promise.all([
      listCharges().catch(() => ({ data: [] })),
      listPaymentLinks().catch(() => ({ data: [] })),
    ])
      .then(([chargesPage, linksPage]) => {
        if (!active) return
        const chargeItems: EmbedTarget[] = (chargesPage.data ?? [])
          .filter((c) => Boolean(c.chargeToken))
          .map((c) => ({
            id: c.chargeToken,
            kind: 'charge',
            currency: c.currency,
            amount: c.amount,
            localPath: toLocalCheckoutPath(c.checkoutUrl || c.chargeToken, 'charge'),
          }))
        const linkItems: EmbedTarget[] = (linksPage.data ?? [])
          .filter((l) => Boolean(l.checkoutUrl))
          .map((l) => ({
            id: l.id,
            kind: 'payment_link',
            currency: l.currency,
            amount: l.amount,
            localPath: toLocalCheckoutPath(l.checkoutUrl || l.id, 'payment_link'),
          }))
        const merged = [...chargeItems, ...linkItems]
        setTargets(merged)
        setSelectedId((current) => current || merged[0]?.id || '')
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

  const activeTarget = targets.find((t) => t.id === selectedId) ?? targets[0]
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const embedSrc = activeTarget ? `${origin}${activeTarget.localPath}` : '<hosted checkout URL>'

  const iframeSnippet = `<iframe
  src="${embedSrc}"
  title="Secure Orki checkout"
  width="100%"
  height="640"
  frameborder="0"
  allow="clipboard-read; clipboard-write"
></iframe>`

  const scriptSnippet = `<div id="orki-pay-button"></div>
<script src="${origin}/orki-widget.js"></script>
<script>
  OrkiWidget.mount('#orki-pay-button', {
    ${activeTarget?.kind === 'charge' ? `chargeToken: '${activeTarget.id}'` : `paylinkId: '${activeTarget?.id || 'pay_...'}'`},
    embedded: true,
    label: 'pay',
    onSuccess: (payload) => console.log('Paid:', payload),
    onError: (err) => console.error('Failed:', err),
  });
</script>`

  const copyText = (text: string, which: 'iframe' | 'script') => {
    navigator.clipboard.writeText(text)
    setCopied(which)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Code2 className="w-5 h-5 text-violet-600" />
          Corner Shop — Embedded Checkout &amp; Pay Button Script
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Embed the live unified checkout in an iframe or mount the Pay with Orki button script for any charge or payment link.
        </p>
      </header>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <Card
            title="Iframe embed snippet"
            actions={
              <button
                type="button"
                onClick={() => copyText(iframeSnippet, 'iframe')}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied === 'iframe' ? 'Copied' : 'Copy'}
              </button>
            }
          >
            <JsonBlock label="HTML" value={iframeSnippet} collapsed={false} />
          </Card>

          <Card
            title="Script tag snippet (/orki-widget.js)"
            actions={
              <button
                type="button"
                onClick={() => copyText(scriptSnippet, 'script')}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied === 'script' ? 'Copied' : 'Copy'}
              </button>
            }
          >
            <JsonBlock label="HTML + JS" value={scriptSnippet} collapsed={false} />
          </Card>

          {widgetEvents.length > 0 && (
            <Card title="Live postMessage events from iframe">
              <div className="space-y-1 text-[11px] font-mono">
                {widgetEvents.map((ev, idx) => (
                  <div key={idx} className="text-emerald-700">
                    [{ev.time}] {ev.type}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <Card title="Live preview" padded={false}>
          {loading ? (
            <div className="p-5">
              <Spinner label="Loading charges & payment links…" />
            </div>
          ) : targets.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No charge or payment link to preview"
                hint="Issue one from Shoplane, Invoicely, or Headless console first."
              />
            </div>
          ) : (
            <div className="space-y-3 p-5">
              <div className="flex flex-wrap gap-1.5">
                {targets.map((target) => (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => setSelectedId(target.id)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-mono border ${
                      activeTarget?.id === target.id
                        ? 'bg-onion text-white border-onion'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {target.id}
                  </button>
                ))}
              </div>

              {activeTarget && (
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{activeTarget.kind === 'charge' ? 'Charge' : 'Link'}</Badge>
                  <Badge tone="neutral">{activeTarget.currency}</Badge>
                  <span className="text-xs font-mono tabular-nums">{activeTarget.amount ?? 'dynamic'}</span>
                </div>
              )}

              {activeTarget && (
                <iframe
                  title="Orki checkout preview"
                  src={activeTarget.localPath}
                  className="w-full h-[520px] rounded-xl border border-slate-200 bg-white"
                />
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
