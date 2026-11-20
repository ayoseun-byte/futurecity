import React from 'react'
import { Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react'
import { createCharge, resolveLocalCheckoutHref } from '../../../services/pspConsoleService'
import type { ChargeSummary } from '../../../services/pspConsoleService'
import { ErrorBanner } from '../../../components/ui/StateBlocks'
import { DemoPerspectiveShell, LiveQuoteAndStatusCard, useLivePspMerchant } from './DemoConsoleChrome'
import type { ApiExchange } from './DemoConsoleChrome'

const HEADLESS_PRODUCTS = [
  { sku: 'espresso', name: 'Harbour Roast Beans', detail: '250g whole bean, dark chocolate & hazelnut.', price: 1.0 },
  { sku: 'cup', name: 'Stoneware Espresso Cup', detail: 'Wheel-thrown speckled clay, 90ml.', price: 1.5 },
  { sku: 'tote', name: 'Waxed Canvas Tote', detail: 'Heavyweight 18oz cotton with internal pocket.', price: 2.0 },
]

export const CornerShopHeadlessView: React.FC = () => {
  const {
    pspName,
    merchants,
    selectedMerchantId,
    setSelectedMerchantId,
    manualExternalId,
    setManualExternalId,
    merchantExternalId,
    merchantName,
    loading: loadingMerchants,
    reload: reloadMerchants,
  } = useLivePspMerchant()

  const [basket, setBasket] = React.useState<Record<string, number>>({ espresso: 1, cup: 0, tote: 0 })
  const [showTechnicalTrace, setShowTechnicalTrace] = React.useState(false)
  const [result, setResult] = React.useState<ChargeSummary | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [exchanges, setExchanges] = React.useState<ApiExchange[]>([])
  const [copiedClient, setCopiedClient] = React.useState(false)

  const pushExchange = React.useCallback((entry: Omit<ApiExchange, 'id' | 'timestamp'>) => {
    setExchanges((prev) => [
      {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 14),
    ])
  }, [])

  const adjustQty = (sku: string, delta: number) => {
    setBasket((prev) => ({
      ...prev,
      [sku]: Math.max(0, (prev[sku] || 0) + delta),
    }))
  }

  const itemsInBasket = HEADLESS_PRODUCTS.filter((p) => (basket[p.sku] || 0) > 0)
  const totalAmount = itemsInBasket.reduce((sum, p) => sum + (basket[p.sku] || 0) * p.price, 0).toFixed(2)
  const description = itemsInBasket.map((p) => `${basket[p.sku]} × ${p.name}`).join(', ')
  const itemsPayload = Object.fromEntries(itemsInBasket.map((p) => [p.sku, basket[p.sku]]))
  const merchantSlug = merchantName.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'cornershop'

  const clientSnippet = `<button id="pay">Pay $${totalAmount} with crypto</button>
<script>
  pay.onclick = async () => {
    const response = await fetch("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: ${JSON.stringify(itemsPayload)} }),
    });
    const charge = await response.json();
    location.href = charge.checkoutUrl; // straight to Orki
  };
</script>`

  const serverSnippet = `// On ${merchantName}'s server -> calls ${pspName} API:
POST /api/v1/psp/charges
Authorization: Bearer <your PSP key>
{
  "merchantExternalId": "${merchantExternalId || '<merchantExternalId>'}",
  "amount": "${totalAmount}",
  "currency": "USD",
  "description": ${JSON.stringify(description || `${merchantName} order`)},
  "orderMetadata": { "orderId": "CS-ORDER-..." }
}`

  const payHeadless = async () => {
    if (!merchantExternalId) {
      setError('Select a live merchant first.')
      return
    }
    if (Number(totalAmount) <= 0) return

    setBusy(true)
    setError(null)
    const orderId = `CS-${Math.floor(1000 + Math.random() * 9000)}`
    const body = {
      merchantExternalId,
      amount: totalAmount,
      currency: 'USD',
      description: description || `${merchantName} order ${orderId}`,
      orderMetadata: {
        orderId,
        source: 'headless_merchant_button',
        items: itemsPayload,
      },
    }

    try {
      const created = await createCharge(body)
      setResult(created)
      pushExchange({
        title: `Create headless charge (${orderId})`,
        method: 'POST',
        path: '/api/v1/psp/charges',
        status: 201,
        request: body,
        response: created,
      })
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause)
      setError(msg)
      setResult(null)
      pushExchange({
        title: `Create headless charge (${orderId})`,
        method: 'POST',
        path: '/api/v1/psp/charges',
        request: body,
        error: msg,
      })
    } finally {
      setBusy(false)
    }
  }

  const copyClientSnippet = async () => {
    try {
      await navigator.clipboard.writeText(clientSnippet)
      setCopiedClient(true)
      setTimeout(() => setCopiedClient(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <DemoPerspectiveShell
      accentColor="#22313F"
      appName={`${merchantName}'s own checkout`}
      navLabel="Headless Payment"
      merchantName={merchantName}
      pspName={`Powered silently by ${pspName}`}
      ribbon={
        <>
          <strong className="text-white">Headless Payment Demo:</strong> <strong className="text-white">{merchantName}</strong> owns
          100% of its checkout UI and Pay button—<strong className="text-white">{pspName}</strong> processes the payment silently in the background.
        </>
      }
      merchants={merchants}
      selectedMerchantId={selectedMerchantId}
      onSelectMerchant={setSelectedMerchantId}
      manualExternalId={manualExternalId}
      onManualExternalIdChange={setManualExternalId}
      loadingMerchants={loadingMerchants}
      onReloadMerchants={() => void reloadMerchants()}
      exchanges={exchanges}
      showTechnicalTrace={showTechnicalTrace}
      onToggleTechnicalTrace={setShowTechnicalTrace}
      behindDescription="No script tag or widget is loaded here: the merchant server calls POST /api/v1/psp/charges directly."
    >
      {error && <div className="mb-4"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.95fr] gap-6 items-start">
        {/* Left: Simulated Browser Window */}
        <div className="rounded-xl border border-slate-300 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 bg-[#E9ECEF] px-3.5 py-2 border-b border-slate-200">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C5CBD1]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#C5CBD1]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#C5CBD1]" />
            </div>
            <div className="flex-1 rounded-full bg-white px-3 py-1 text-xs font-mono text-slate-600 truncate">
              <span className="text-slate-400">https://</span>
              <strong className="font-normal text-slate-900">{merchantSlug}.example</strong>
            </div>
          </div>

          <div className="bg-[#FBF5F0] p-5 space-y-4">
            <div>
              <h2 className="text-2xl font-bold font-serif text-[#7A3B1D]">{merchantName}</h2>
              <p className="text-xs text-slate-600 mt-0.5 font-serif">
                Custom-branded checkout experience. Complete your order below.
              </p>
            </div>

            <div className="space-y-2">
              {HEADLESS_PRODUCTS.map((product) => (
                <div
                  key={product.sku}
                  className="grid grid-cols-[1fr_auto_auto] gap-3 items-center rounded-lg border border-[#EADBCF] bg-white px-3.5 py-2.5"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900 font-serif">{product.name}</div>
                    <div className="text-[11px] text-slate-500">{product.detail}</div>
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-800">${product.price.toFixed(2)}</div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjustQty(product.sku, -1)}
                      className="w-6 h-6 rounded border border-[#EADBCF] bg-white text-[#7A3B1D] text-xs font-bold hover:bg-[#FBF5F0]"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-xs font-mono font-semibold">{basket[product.sku] || 0}</span>
                    <button
                      type="button"
                      onClick={() => adjustQty(product.sku, 1)}
                      className="w-6 h-6 rounded border border-[#EADBCF] bg-white text-[#7A3B1D] text-xs font-bold hover:bg-[#FBF5F0]"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EADBCF]">
              <div className="text-base font-bold text-slate-900">
                Total <span className="font-mono">${totalAmount}</span>
              </div>

              <button
                type="button"
                disabled={busy || Number(totalAmount) <= 0 || !merchantExternalId}
                onClick={() => void payHeadless()}
                className="rounded-lg bg-[#7A3B1D] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#612d15] disabled:opacity-45 transition"
              >
                {busy ? 'Preparing Payment…' : `Pay $${totalAmount} Now`}
              </button>
            </div>

            {result && result.checkoutUrl && (
              <div className="rounded-lg border border-[#EADBCF] bg-white p-3.5 space-y-1.5 text-xs">
                <div className="font-semibold text-emerald-800">
                  {result.status === 'paid' ? 'Order Confirmed & Paid!' : 'Order ready for payment.'}
                </div>
                <a
                  href={resolveLocalCheckoutHref(result.checkoutUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold text-[#7A3B1D] hover:underline"
                >
                  Continue to payment screen
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right: Business Summary + Live Quote (or Code Snippets when Technical Trace is On) */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Why enterprise merchants choose Headless
            </div>
            <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4">
              <li>Zero third-party scripts or widgets on <strong>{merchantName}</strong>'s website or mobile app.</li>
              <li>Full control over brand, cart UX, and post-payment order receipts.</li>
              <li>{pspName} handles multi-chain routing, live quotes, and settlement behind the scenes.</li>
            </ul>
          </div>

          {result && (
            <LiveQuoteAndStatusCard
              identifier={result.chargeToken}
              amount={result.amount}
              currency={result.currency}
              checkoutUrl={result.checkoutUrl}
              initialStatus={result.status}
              onPaid={(c) => setResult(c)}
            />
          )}

          {showTechnicalTrace && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">What {merchantName} added</h3>
                <button
                  type="button"
                  onClick={() => void copyClientSnippet()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                >
                  {copiedClient ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copiedClient ? 'Copied' : 'Copy snippet'}
                </button>
              </div>
              <pre className="rounded-xl bg-[#16202B] text-[#E5E9ED] p-3.5 text-[11px] font-mono overflow-x-auto leading-relaxed">
                {clientSnippet}
              </pre>
              <pre className="rounded-xl bg-[#16202B] text-[#E5E9ED] p-3.5 text-[11px] font-mono overflow-x-auto leading-relaxed">
                {serverSnippet}
              </pre>
            </section>
          )}
        </aside>
      </div>
    </DemoPerspectiveShell>
  )
}
