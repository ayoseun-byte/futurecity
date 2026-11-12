import React from 'react'
import { Check } from 'lucide-react'
import type { ChainServiceRoute } from '../../services/chainServiceService'
import { railsScenarios } from '../../services/scenarios'
import type { RailsScenario } from '../../types/rails'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { EmptyState, Spinner } from '../ui/StateBlocks'

interface CoverageMatrixProps {
  routes: ChainServiceRoute[] | null
  loading: boolean
  scenarios?: RailsScenario[]
}

/**
 * Which scenario reaches which chain-service endpoint.
 *
 * The rows come from the sidecar's own `GET /routes` inventory, so the matrix
 * cannot silently fall behind the real surface: any endpoint no scenario
 * touches shows up as a gap.
 */
export const RailsCoverageMatrix: React.FC<CoverageMatrixProps> = ({ routes, loading, scenarios }) => {
  const [filter, setFilter] = React.useState('')

  if (loading) return <Spinner label="Reading the chain-service route inventory…" />

  if (!routes || routes.length === 0) {
    return (
      <EmptyState
        title="The chain-service route inventory is unavailable"
        hint="Load the admin key in this tab so the Rails Lab can ask the backend for the sidecar's own route list."
      />
    )
  }

  const activeScenarios = scenarios ?? railsScenarios
  const normalizedFilter = filter.trim().toLowerCase()

  const covered = new Map<string, RailsScenario[]>()
  for (const scenario of activeScenarios) {
    for (const step of scenario.steps) {
      for (const endpoint of step.chainEndpoints ?? []) {
        const list = covered.get(endpoint) ?? []
        if (!list.includes(scenario)) list.push(scenario)
        covered.set(endpoint, list)
      }
    }
  }

  const visible = routes.filter((route) => {
    if (!normalizedFilter) return true
    return (
      route.path.toLowerCase().includes(normalizedFilter) ||
      route.method.toLowerCase().includes(normalizedFilter) ||
      route.summary.toLowerCase().includes(normalizedFilter)
    )
  })

  const gaps = routes.filter((route) => !covered.has(`${route.method} ${route.path}`))

  return (
    <Card
      title="Chain-service coverage"
      subtitle={`${routes.length} endpoints published by the sidecar · ${covered.size} reached by a scenario · ${gaps.length} gap${
        gaps.length === 1 ? '' : 's'
      }`}
    >
      <input
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter endpoints…"
        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none mb-3"
      />

      {gaps.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {gaps.map((route) => (
            <Badge key={`${route.method} ${route.path}`} tone="warning">
              {route.method} {route.path}
            </Badge>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 text-left text-[10px] uppercase tracking-wide font-semibold text-slate-500">
                Endpoint
              </th>
              <th className="py-2.5 px-3 text-left text-[10px] uppercase tracking-wide font-semibold text-slate-500">
                What it does
              </th>
              {activeScenarios.map((scenario) => (
                <th
                  key={scenario.id}
                  className="py-2.5 px-2 text-left text-[10px] uppercase tracking-wide font-semibold text-slate-500"
                >
                  {scenario.style}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((route) => {
              const key = `${route.method} ${route.path}`
              const scenariosForRoute = covered.get(key) ?? []

              return (
                <tr key={key} className="hover:bg-slate-50">
                  <td className="py-2 px-3 align-top">
                    <span className="font-mono text-[11px] text-slate-800 whitespace-nowrap">{key}</span>
                    {!route.readOnly && (
                      <Badge tone="warning" className="ml-2">
                        write
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 px-3 align-top text-[11px] text-slate-600">{route.summary}</td>
                  {activeScenarios.map((scenario) => {
                    const hit = scenariosForRoute.some((entry) => entry.id === scenario.id)
                    return (
                      <td key={scenario.id} className="py-2 px-2 align-top">
                        {hit ? (
                          <span title={`Reached by ${scenario.title}`} className="text-emerald-600">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
