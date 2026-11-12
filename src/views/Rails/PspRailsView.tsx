import React from 'react'
import { Link } from 'react-router-dom'
import { Activity, FileText, ShoppingBag, Code2, LayoutTemplate } from 'lucide-react'
import { RailsScenarioBoard } from '../../components/rails/RailsScenarioBoard'
import { scenariosForRole } from '../../services/scenarios'
import { Card } from '../../components/ui/Card'

/**
 * The Rails Lab (PSP).
 *
 * A PSP integration sees the invoice/charge, paylink and headless styles plus
 * the on-chain registration flows it owns.
 */
export const PspRailsView: React.FC = () => {
  const scenarios = scenariosForRole('psp')

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-onion" />
          Integration test bench
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Drive the invoice, payment-link and headless API styles end to end and check the on-chain result.
        </p>
      </div>

      <Card
        title="Counterparty consoles"
        subtitle="The integration styles as the platforms that actually use them. Each console calls the real PSP API."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { to: '/psp/console/invoicely', label: 'Invoicely', hint: 'Invoicing platform: raise invoices, buyer pays them.', icon: <FileText className="w-4 h-4 text-amber-600" /> },
            { to: '/psp/console/shoplane', label: 'Shoplane', hint: 'Commerce platform that is also a payment gateway.', icon: <ShoppingBag className="w-4 h-4 text-sky-600" /> },
            { to: '/psp/console/widget', label: 'Corner Shop + widget', hint: 'The merchant embeds the checkout widget.', icon: <LayoutTemplate className="w-4 h-4 text-violet-600" /> },
            { to: '/psp/console/headless', label: 'Corner Shop headless', hint: 'The merchant calls the API directly, no script.', icon: <Code2 className="w-4 h-4 text-emerald-600" /> },
          ].map((entry) => (
            <Link
              key={entry.to}
              to={entry.to}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-onion-300 hover:bg-onion-50/40 transition"
            >
              <span className="mt-0.5">{entry.icon}</span>
              <span>
                <span className="block text-xs font-semibold text-slate-900">{entry.label}</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">{entry.hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </Card>

      <RailsScenarioBoard scenarios={scenarios} />
    </div>
  )
}
