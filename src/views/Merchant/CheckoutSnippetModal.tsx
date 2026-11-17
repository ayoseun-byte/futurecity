import React, { useState } from 'react'
import { Check, Code2, Copy, X } from 'lucide-react'
import type { Paylink } from '../../types'

interface CheckoutSnippetModalProps {
  paylink: Paylink | null
  onClose: () => void
}

type Framework = 'vanilla' | 'react' | 'iframe'
type SnippetMode = 'simple' | 'advanced'
type BrandLabel = 'pay' | 'buy' | 'checkout'

const BRAND_TEXT: Record<BrandLabel, string> = {
  pay: 'Pay with Orki',
  buy: 'Buy with Orki',
  checkout: 'Checkout with Orki',
}

export const CheckoutSnippetModal: React.FC<CheckoutSnippetModalProps> = ({ paylink, onClose }) => {
  const [framework, setFramework] = useState<Framework>('vanilla')
  const [mode, setMode] = useState<SnippetMode>('simple')
  const [primaryColor, setPrimaryColor] = useState('#7c3aed')
  const [textColor, setTextColor] = useState('#ffffff')
  const [brandLabel, setBrandLabel] = useState<BrandLabel>('pay')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  if (!paylink) return null

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://portal-orki.netlify.app'
  const paylinkId = paylink.id
  const amount = paylink.amount !== undefined ? String(paylink.amount) : 'custom'

  const resolveHostedPath = (): string => {
    const raw = paylink.checkoutUrl || `/checkout/${paylink.slug}`
    try {
      const parsed = new URL(raw, origin)
      return `${origin}${parsed.pathname}${parsed.search}`
    } catch {
      return `${origin}/checkout/${paylink.slug}`
    }
  }

  const buildCode = (): string => {
    if (framework === 'iframe') {
      return `<iframe
  src="${resolveHostedPath()}"
  title="${paylink.title}"
  width="100%"
  height="640"
  frameborder="0"
  allow="clipboard-read; clipboard-write"
></iframe>`
    }

    if (framework === 'vanilla') {
      if (mode === 'simple') {
        return `<div id="orkiCheckoutContainer"></div>

<script src="${origin}/orki-widget.js"></script>
<script>
  document.addEventListener("DOMContentLoaded", () => {
    window.OrkiWidget.mount("#orkiCheckoutContainer", {
      paylinkId: "${paylinkId}",
      label: "${brandLabel}",
      embedded: true,
      style: {
        background: "${primaryColor}",
        textColor: "${textColor}"
      }
    });
  });
</script>`
      }

      return `<div id="orkiCheckoutContainer"></div>

<script src="${origin}/orki-widget.js"></script>
<script>
  document.addEventListener("DOMContentLoaded", () => {
    window.OrkiWidget.mount("#orkiCheckoutContainer", {
      paylinkId: "${paylinkId}",
      amount: "${amount}",
      label: "${brandLabel}",
      embedded: true,
      redirectUrl: "${origin}/store?paid=1",
      style: {
        background: "${primaryColor}",
        textColor: "${textColor}",
        size: "md",
        radius: "10px"
      },
      onSuccess: (payload) => console.log("Payment settled:", payload),
      onError: (err) => console.error("Payment failed:", err),
      onClose: () => console.log("Checkout modal closed")
    });
  });
</script>`
    }

    if (mode === 'simple') {
      return `import { CheckoutWidget } from "@orki/checkout-widget";

export default function PaymentButton() {
  return (
    <CheckoutWidget
      paylinkId="${paylinkId}"
      amount="${amount}"
      primaryColor="${primaryColor}"
      buttonTextColor="${textColor}"
      buttonText="${BRAND_TEXT[brandLabel]}"
    />
  );
}`
    }

    return `import { CheckoutWidget } from "@orki/checkout-widget";

const checkoutConfig = {
  paylinkId: "${paylinkId}",
  amount: "${amount}",
  redirectUrl: "${origin}/store?paid=1",
  metadata: {
    orderId: "ORD-1045",
    paylinkSlug: "${paylink.slug}"
  },
  primaryColor: "${primaryColor}",
  buttonTextColor: "${textColor}",
  buttonText: "${BRAND_TEXT[brandLabel]}",
  onSuccess: (event) => console.log("Payment successful:", event),
  onError: (err) => console.error("Payment error:", err),
  onClose: () => console.log("Checkout modal dismissed")
};

export default function PaymentButton() {
  return <CheckoutWidget {...checkoutConfig} />;
}`
  }

  const code = buildCode()

  const copy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <Code2 className="w-5 h-5 text-onion-300" />
            <div>
              <h2 className="font-bold text-base">Integrate Checkout Widget Snippet</h2>
              <p className="text-[11px] text-slate-400">
                {paylink.title} · {paylink.amountType === 'fixed' ? `${paylink.amount} ${paylink.currency}` : 'Open Amount'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* Paylink ID + Hosted URL Quick Copy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase text-slate-500">Paylink ID</div>
                <div className="font-mono text-xs font-semibold text-slate-900 truncate">{paylinkId}</div>
              </div>
              <button
                type="button"
                onClick={() => copy(paylinkId, 'id')}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold flex items-center space-x-1 shrink-0"
              >
                {copiedKey === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedKey === 'id' ? 'Copied' : 'Copy ID'}</span>
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase text-slate-500">Checkout URL</div>
                <div className="font-mono text-xs text-slate-700 truncate">{resolveHostedPath()}</div>
              </div>
              <button
                type="button"
                onClick={() => copy(resolveHostedPath(), 'url')}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold flex items-center space-x-1 shrink-0"
              >
                {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedKey === 'url' ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
          </div>

          {/* Controls: Framework, Mode, Styling */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              {(['vanilla', 'react', 'iframe'] as Framework[]).map((fw) => (
                <button
                  key={fw}
                  type="button"
                  onClick={() => setFramework(fw)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                    framework === fw
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {fw === 'vanilla' ? 'Vanilla JS' : fw === 'react' ? 'React' : 'Iframe'}
                </button>
              ))}
            </div>

            {framework !== 'iframe' && (
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                {(['simple', 'advanced'] as SnippetMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                      mode === m
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {framework !== 'iframe' && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-700">Button Color</span>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border border-slate-300"
                  />
                </label>
                <label className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-700">Text</span>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border border-slate-300"
                  />
                </label>
                <label className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-700">Label</span>
                  <select
                    value={brandLabel}
                    onChange={(e) => setBrandLabel(e.target.value as BrandLabel)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                  >
                    <option value="pay">Pay with Orki</option>
                    <option value="buy">Buy with Orki</option>
                    <option value="checkout">Checkout with Orki</option>
                  </select>
                </label>
              </div>

              {/* Live Button Preview */}
              <button
                type="button"
                style={{ backgroundColor: primaryColor, color: textColor }}
                className="px-4 py-2 rounded-lg text-xs font-bold shadow-xs"
              >
                {BRAND_TEXT[brandLabel]}
              </button>
            </div>
          )}

          {/* Code Block */}
          <div className="relative rounded-xl bg-slate-900 text-slate-100 border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950/60">
              <span className="text-[11px] font-mono text-slate-400">
                {framework === 'vanilla' ? 'index.html' : framework === 'react' ? 'PaymentButton.tsx' : 'embed.html'}
              </span>
              <button
                type="button"
                onClick={() => copy(code, 'code')}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition"
              >
                {copiedKey === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'code' ? 'Snippet Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            <pre className="p-4 text-[11px] font-mono overflow-x-auto leading-relaxed max-h-72">
              <code>{code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
