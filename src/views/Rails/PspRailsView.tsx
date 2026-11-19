import React from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, Code2, FileText, LayoutTemplate, ShoppingBag } from 'lucide-react'
import { RailsScenarioBoard } from '../../components/rails/RailsScenarioBoard'
import { scenariosForRole } from '../../services/scenarios'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../context/AuthContext'

/**
 * The Rails Lab (PSP).
 *
 * Mirrors the Blade demo's four counterparty perspectives while connected
 * to the logged-in PSP and its live merchants.
 */
export const PspRailsView: React.FC = () => {
  const scenarios = scenariosForRole('psp')
  const { user } = useAuth()
  const pspName = user?.name || 'Your PSP'

  const counterpartyScenarios = [
    {
      to: '/psp/console/shoplane',
      kicker: 'Hosted payment page',
      title: 'Storefront on Shoplane',
      icon: <ShoppingBag className="w-4 h-4 text-[#7A3B1D]" />,
      steps: [
        `Your live merchant's store is hosted by Shoplane (${pspName}). At checkout, the shopper goes to Shoplane's payment page.`,
        "The shopper picks Pay with Orki. Only then does Shoplane's server create an Orki charge and send the shopper to Orki's page.",
        'A limited-edition print sells from a reusable payment link until stock runs out.',
      ],
      api: 'POST /api/v1/psp/charges\nwhen the shopper picks Pay with Orki',
      cta: 'Open the Shoplane store',
    },
    {
      to: '/psp/console/widget',
      kicker: "Plugin or the PSP's script",
      title: "Merchant's website, with checkout widget",
      icon: <LayoutTemplate className="w-4 h-4 text-[#22313F]" />,
      steps: [
        `Your merchant runs its own site and embeds ${pspName}'s checkout widget, as a shop adds a PSP plugin.`,
        "On Pay, the merchant's server prices the cart and your PSP creates the charge; the widget never sets the amount.",
        'Checkout opens in a new tab, popup, or modal and reports callbacks back to the page.',
      ],
      api: 'POST /api/v1/psp/charges\nfrom your PSP backend, triggered by createCharge({ idempotencyKey })',
      cta: "Open merchant's site (widget)",
    },
    {
      to: '/psp/console/headless',
      kicker: "Headless: the merchant's own form",
      title: "Merchant's website, with its own button",
      icon: <Code2 className="w-4 h-4 text-emerald-700" />,
      steps: [
        `The merchant builds its own Pay button. Nothing from ${pspName} or Orki's script is on the page.`,
        `On Pay, the merchant's server asks ${pspName}'s API for a charge and sends the shopper straight to Orki's page.`,
        'After paying, Orki returns the shopper to the merchant order page.',
      ],
      api: `POST /api/v1/psp/charges\nfrom ${pspName}'s API, called by the merchant's server`,
      cta: "Open merchant's site (headless)",
    },
    {
      to: '/psp/console/invoicely',
      kicker: 'Invoices and payment links',
      title: 'Invoicely',
      icon: <FileText className="w-4 h-4 text-[#0F5C5A]" />,
      steps: [
        'Your live merchant creates an invoice in Invoicely and ticks which tokens & networks it accepts.',
        "Invoicely turns it into a charge. The link opens Invoicely's payment page, with Pay with Orki as one option.",
        "The client picks Pay with Orki, pays on Orki's hosted page, and returns to Invoicely's page.",
      ],
      api: 'POST /api/v1/psp/charges\ninvoice: { ... }, expiresInMinutes, acceptedTokens, acceptedChains',
      cta: 'Open Invoicely',
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-onion" />
          Orki behind a PSP
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Interactive counterparty consoles connected to <span className="font-semibold text-slate-700">{pspName}</span> and your live merchants.
        </p>
      </div>

      <Card
        title="Counterparty perspectives"
        subtitle="Step into the shoes of the shopper, merchant, or platform. Every action calls your live PSP API."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {counterpartyScenarios.map((item) => (
            <article
              key={item.to}
              className="rounded-xl border border-slate-200 bg-[#FAF9F6] p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {item.kicker}
                </span>
                {item.icon}
              </div>

              <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>

              <ol className="list-decimal pl-4 space-y-1.5 text-xs text-slate-600 leading-relaxed">
                {item.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>

              <pre className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-mono text-slate-800 whitespace-pre-wrap">
                {item.api}
              </pre>

              <div className="mt-auto pt-1">
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
