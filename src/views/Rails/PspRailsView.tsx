import React from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, Code2, FileText, LayoutTemplate, Link2, Plug } from 'lucide-react'
import { RailsScenarioBoard } from '../../components/rails/RailsScenarioBoard'
import { scenariosForRole } from '../../services/scenarios'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../context/AuthContext'

/**
 * Executive Showcase & Rails Lab (PSP).
 *
 * Presents all 5 real-world merchant payment collection models connected
 * to the logged-in PSP and its live merchants.
 */
export const PspRailsView: React.FC = () => {
  const scenarios = scenariosForRole('psp')
  const { user } = useAuth()
  const pspName = user?.name || 'Your PSP'

  const useCases = [
    {
      number: '01',
      to: '/psp/console/shoplane',
      kicker: 'Checkout Paylink & Hosted Store',
      title: 'Pay with Checkout Paylink',
      pitch: 'No website required — share a reusable link for drops, tickets, or hosted store checkouts.',
      icon: <Link2 className="w-4 h-4 text-[#7A3B1D]" />,
      steps: [
        `A merchant under ${pspName} sells items or a limited-stock drop using a shareable payment link.`,
        'The customer opens the link, chooses Base or Solana and their preferred token (USDC, USDT, EURC), and sees a live quote.',
        'Once paid, stock and settlement status update automatically.',
      ],
      cta: 'Launch Paylink Demo',
    },
    {
      number: '02',
      to: '/psp/console/widget',
      kicker: 'Drop-In Embedded Widget',
      title: 'Pay with Embedded Widget',
      pitch: "Keep shoppers on the merchant's own website with a drop-in Orki payment modal.",
      icon: <LayoutTemplate className="w-4 h-4 text-[#22313F]" />,
      steps: [
        `The merchant adds ${pspName}'s checkout widget to their site in minutes.`,
        'When the shopper clicks Pay, checkout opens right inside the page (or in a popup/tab) with live multi-chain quotes.',
        'The merchant storefront updates to Confirmed as soon as payment settles.',
      ],
      cta: 'Launch Widget Demo',
    },
    {
      number: '03',
      to: '/psp/console/invoicely',
      kicker: 'B2B & Client Billing',
      title: 'Pay with Invoice',
      pitch: 'Send branded invoices with due dates, link expiry, and per-invoice token/network rules.',
      icon: <FileText className="w-4 h-4 text-[#0F5C5A]" />,
      steps: [
        'A business creates an invoice and chooses which tokens and networks the client may use.',
        'The client opens the branded invoice page, compares Card vs. Pay with Orki, and previews the live quote.',
        'After payment on-chain, the invoice flips to Paid automatically.',
      ],
      cta: 'Launch Invoice Demo',
    },
    {
      number: '04',
      to: '/psp/console/headless',
      kicker: 'Custom Branded Checkout',
      title: 'Pay with Headless Payment',
      pitch: 'Enterprise merchants keep 100% control of their own UI while your PSP powers settlement silently.',
      icon: <Code2 className="w-4 h-4 text-emerald-700" />,
      steps: [
        'The merchant builds its own checkout button and order experience with zero third-party branding.',
        `Clicking Pay asks ${pspName} for a live charge and multi-chain quote behind the scenes.`,
        'The shopper pays and lands back on the merchant’s own order confirmation.',
      ],
      cta: 'Launch Headless Demo',
    },
    {
      number: '05',
      to: '/psp/console/plugin',
      kicker: 'Shopify / WooCommerce Style',
      title: 'Pay with Plugin',
      pitch: 'Zero-code store plugin: merchants enable Orki in settings and accept crypto alongside cards.',
      icon: <Plug className="w-4 h-4 text-indigo-600" />,
      steps: [
        `The merchant installs ${pspName}'s store plugin and toggles "Enable Pay with Orki" on.`,
        'Shoppers see Pay with Orki at checkout with the merchant’s active chains and tokens.',
        'Webhooks mark the store order Paid automatically once confirmed on-chain.',
      ],
      cta: 'Launch Plugin Demo',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-onion" />
          {pspName} — Live Merchant Payment Showcase
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Interactive real-world demos connected to <span className="font-semibold text-slate-800">{pspName}</span> and your live merchants.
          Each demo supports multi-chain &amp; multi-token quotes and live settlement tracking.
        </p>
      </div>

      <Card
        title="5 Ways Merchants Collect Payments"
        subtitle="Pick any scenario to walk through the customer and merchant experience live."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {useCases.map((item) => (
            <article
              key={item.to}
              className="rounded-xl border border-slate-200 bg-[#FAF9F6] p-4 flex flex-col gap-3 hover:border-slate-300 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-slate-700">{item.number}</span>
                  {item.kicker}
                </span>
                {item.icon}
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                <p className="text-xs text-slate-700 font-medium mt-1 leading-snug">{item.pitch}</p>
              </div>

              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600 leading-relaxed">
                {item.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>

              <div className="mt-auto pt-2">
                <Link
                  to={item.to}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
                >
                  {item.cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Card>

      <RailsScenarioBoard scenarios={scenarios} />
    </div>
  )
}
