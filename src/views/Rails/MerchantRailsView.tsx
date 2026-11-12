import React from 'react'
import { Activity } from 'lucide-react'
import { RailsScenarioBoard } from '../../components/rails/RailsScenarioBoard'
import { scenariosForRole } from '../../services/scenarios'

/**
 * The Rails Lab (merchant).
 *
 * A merchant sees the payment-link and hosted-checkout styles plus the
 * on-chain allow-list and transfer flows it owns.
 */
export const MerchantRailsView: React.FC = () => {
  const scenarios = scenariosForRole('merchant')

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-onion" />
          Payment rails test bench
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Issue a payment link, take a checkout payment, sync the on-chain allow-list and move funds.
        </p>
      </div>

      <RailsScenarioBoard scenarios={scenarios} />
    </div>
  )
}
