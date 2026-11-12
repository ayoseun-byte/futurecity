import React from 'react'
import { Link } from 'react-router-dom'
import { Activity, Grid3x3, Search } from 'lucide-react'
import { RailsScenarioBoard } from '../../components/rails/RailsScenarioBoard'
import { RailsCoverageMatrix } from '../../components/rails/RailsCoverageMatrix'
import { ChainServiceInspector } from '../../components/rails/ChainServiceInspector'
import { fetchChainServiceRoutes } from '../../services/chainServiceService'
import { railsScenarios } from '../../services/scenarios'
import { Button } from '../../components/ui/Button'

type Tab = 'scenarios' | 'coverage' | 'inspector'

/**
 * The Rails Lab (admin).
 *
 * Three tabs: the runnable scenarios, the coverage matrix against the
 * sidecar's own route inventory, and a direct read-only inspector.
 */
export const RailsLabView: React.FC = () => {
  const [tab, setTab] = React.useState<Tab>('scenarios')
  const [routes, setRoutes] = React.useState<Awaited<ReturnType<typeof fetchChainServiceRoutes>> | null>(null)
  const [loadingRoutes, setLoadingRoutes] = React.useState(false)
  const [routesError, setRoutesError] = React.useState<string | null>(null)

  const loadRoutes = React.useCallback(async () => {
    setLoadingRoutes(true)
    setRoutesError(null)
    try {
      setRoutes(await fetchChainServiceRoutes())
    } catch (cause) {
      setRoutesError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setLoadingRoutes(false)
    }
  }, [])

  React.useEffect(() => {
    if (tab === 'coverage') void loadRoutes()
  }, [tab, loadRoutes])

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'scenarios', label: 'Scenarios', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'coverage', label: 'Coverage', icon: <Grid3x3 className="w-3.5 h-3.5" /> },
    { id: 'inspector', label: 'Inspector', icon: <Search className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Rails Lab</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Run every integration style against the live backend and see what the chain-service actually did.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {tabs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tab === entry.id ? 'bg-onion text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {entry.icon}
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'scenarios' && <RailsScenarioBoard scenarios={railsScenarios} />}

      {tab === 'coverage' && (
        <>
          {routesError && (
            <div className="mat-card border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-center justify-between gap-3">
              <span>{routesError}</span>
              <Button variant="secondary" onClick={() => void loadRoutes()}>
                Retry
              </Button>
            </div>
          )}
          <RailsCoverageMatrix routes={routes} loading={loadingRoutes} />
        </>
      )}

      {tab === 'inspector' && <ChainServiceInspector />}

      <p className="text-[11px] text-slate-500">
        Raw endpoint console remains available in the{' '}
        <Link to="/api-workbench" className="text-onion hover:underline">
          API workbench
        </Link>
        .
      </p>
    </div>
  )
}
