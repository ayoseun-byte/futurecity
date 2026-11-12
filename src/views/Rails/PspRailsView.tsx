import React from 'react'
import { Activity } from 'lucide-react'
import { RailsScenarioBoard } from '../../components/rails/RailsScenarioBoard'
import { scenariosForRole } from '../../services/scenarios'

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

      <RailsScenarioBoard scenarios={scenarios} />
    </div>
  )
}
