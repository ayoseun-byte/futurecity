import React from 'react'
import { Play, SkipForward, RotateCcw, ExternalLink } from 'lucide-react'
import { getApiConfig, requestApi } from '../../services/apiConfig'
import { collectContext, evaluateAssertions, expandTemplate, expandValue } from '../../services/scenarioRunner'
import { inspectChainService } from '../../services/chainServiceService'
import type { RailsScenario, RailsStep, RailsStepResult } from '../../types/rails'
import { Button } from '../ui/Button'
import { Badge, ResultBadge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Field, TextInput } from '../ui/Field'
import { JsonBlock } from '../ui/JsonBlock'
import { ErrorBanner } from '../ui/StateBlocks'

interface ScenarioBoardProps {
  scenarios: RailsScenario[]
}

type ScenarioState = {
  inputs: Record<string, string>
  results: RailsStepResult[]
}

export const RailsScenarioBoard: React.FC<ScenarioBoardProps> = ({ scenarios }) => {
  const [state, setState] = React.useState<Record<string, ScenarioState>>({})
  const [error, setError] = React.useState<string | null>(null)
  const [running, setRunning] = React.useState<string | null>(null)

  const scenarioState = (scenario: RailsScenario): ScenarioState =>
    state[scenario.id] ?? { inputs: {}, results: [] }

  const setInput = (scenario: RailsScenario, key: string, value: string) => {
    setState((current) => ({
      ...current,
      [scenario.id]: {
        ...scenarioState(scenario),
        inputs: { ...scenarioState(scenario).inputs, [key]: value },
      },
    }))
  }

  const setResult = (scenario: RailsScenario, result: RailsStepResult) => {
    setState((current) => {
      const existing = scenarioState(scenario)
      const results = existing.results.filter((entry) => entry.stepId !== result.stepId)
      return {
        ...current,
        [scenario.id]: { ...existing, results: [...results, result] },
      }
    })
  }

  const runStep = async (scenario: RailsScenario, step: RailsStep) => {
    if (!step.action) return
    const started = Date.now()
    setRunning(`${scenario.id}:${step.id}`)
    setError(null)

    const existing = scenarioState(scenario)
    const context: Record<string, unknown> = {
      ...existing.inputs,
      ...collectContext(existing.results),
    }

    const action = step.action
    const path = expandTemplate(action.path, context)
    const query = action.query
      ? Object.fromEntries(
          Object.entries(action.query).map(([key, value]) => [key, expandTemplate(value, context)]),
        )
      : undefined
    const search = query ? `?${new URLSearchParams(query).toString()}` : ''
    const body = step.build
      ? step.build(context)
      : action.body !== undefined
        ? expandValue(action.body, context)
        : undefined

    try {
      const payload = await requestApi<unknown>(
        getApiConfig(),
        action.method,
        `${path}${search}`,
        body,
        action.auth ?? 'none',
      )

      let evidence: RailsStepResult['evidence']
      if (step.evidence) {
        try {
          const inspection = await inspectChainService(
            step.evidence.capability,
            step.evidence.query
              ? Object.fromEntries(
                  Object.entries(step.evidence.query).map(([key, value]) => [
                    key,
                    expandTemplate(value, { ...context, ...(payload as object) }),
                  ]),
                )
              : {},
          )
          evidence = { capability: step.evidence.capability, payload: inspection.data }
        } catch (cause) {
          evidence = {
            capability: step.evidence.capability,
            payload: null,
            error: cause instanceof Error ? cause.message : String(cause),
          }
        }
      }

      setResult(scenario, {
        stepId: step.id,
        status: 'passed',
        payload,
        assertions: evaluateAssertions(step.assertions, payload),
        evidence,
        durationMs: Date.now() - started,
      })
    } catch (cause) {
      setResult(scenario, {
        stepId: step.id,
        status: 'failed',
        error: cause instanceof Error ? cause.message : String(cause),
        assertions: [],
        durationMs: Date.now() - started,
      })
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setRunning(null)
    }
  }

  const markManualDone = (scenario: RailsScenario, step: RailsStep) => {
    setResult(scenario, {
      stepId: step.id,
      status: 'passed',
      payload: { note: 'Confirmed by the operator.' },
      assertions: [],
    })
  }

  const resetScenario = (scenario: RailsScenario) => {
    setState((current) => ({ ...current, [scenario.id]: { inputs: scenarioState(scenario).inputs, results: [] } }))
  }

  const runScenario = async (scenario: RailsScenario) => {
    for (const step of scenario.steps) {
      if (step.manual) continue
      // eslint-disable-next-line no-await-in-loop
      await runStep(scenario, step)
    }
  }

  if (scenarios.length === 0) {
    return <p className="text-xs text-slate-500">No scenarios are available for this role yet.</p>
  }

  return (
    <div className="space-y-5">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {scenarios.map((scenario) => {
        const current = scenarioState(scenario)
        const resultFor = (stepId: string) => current.results.find((entry) => entry.stepId === stepId)

        return (
          <Card
            key={scenario.id}
            title={scenario.title}
            subtitle={scenario.summary}
            actions={
              <>
                <Button variant="ghost" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={() => resetScenario(scenario)}>
                  Reset
                </Button>
                <Button variant="primary" icon={<Play className="w-3.5 h-3.5" />} onClick={() => void runScenario(scenario)}>
                  Run steps
                </Button>
              </>
            }
          >
            {scenario.prerequisites && scenario.prerequisites.length > 0 && (
              <ul className="mb-4 space-y-1">
                {scenario.prerequisites.map((prerequisite) => (
                  <li key={prerequisite} className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/70 rounded-lg px-3 py-1.5">
                    {prerequisite}
                  </li>
                ))}
              </ul>
            )}

            {scenario.inputs && scenario.inputs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {scenario.inputs.map((input) => (
                  <Field key={input.key} label={input.label} hint={input.help} required={input.required}>
                    <TextInput
                      value={current.inputs[input.key] ?? input.defaultValue ?? ''}
                      placeholder={input.placeholder}
                      onChange={(event) => setInput(scenario, input.key, event.target.value)}
                    />
                  </Field>
                ))}
              </div>
            )}

            <ol className="space-y-2">
              {scenario.steps.map((step, index) => {
                const result = resultFor(step.id)
                const status = result?.status === 'skipped' ? 'idle' : (result?.status ?? 'idle')

                return (
                  <li key={step.id} className="rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">{index + 1}.</span>
                          {step.title}
                        </p>
                        {step.description && (
                          <p className="text-[11px] text-slate-500 mt-1">{step.description}</p>
                        )}
                        {step.action && (
                          <p className="text-[10.5px] font-mono text-slate-500 mt-1.5 break-all">
                            {step.action.method} {step.action.path}
                            {step.action.auth && step.action.auth !== 'none' && (
                              <span className="ml-2 text-[10px] text-slate-400">[{step.action.auth} auth]</span>
                            )}
                          </p>
                        )}
                        {step.chainEndpoints && step.chainEndpoints.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {step.chainEndpoints.map((endpoint) => (
                              <Badge key={endpoint} tone="info">
                                chain-service {endpoint}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <ResultBadge tone={status} />
                        {step.manual ? (
                          <Button
                            icon={<SkipForward className="w-3.5 h-3.5" />}
                            onClick={() => markManualDone(scenario, step)}
                          >
                            Confirm
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            loading={running === `${scenario.id}:${step.id}`}
                            icon={<Play className="w-3.5 h-3.5" />}
                            onClick={() => void runStep(scenario, step)}
                          >
                            Run
                          </Button>
                        )}
                        {step.manual?.href && (
                          <a
                            href={step.manual.href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-onion hover:underline"
                            aria-label="Open"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {result && (
                      <div className="px-4 pb-3 space-y-2 border-t border-slate-100 pt-3">
                        {result.error && (
                          <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5">
                            {result.error}
                          </p>
                        )}

                        {result.assertions.length > 0 && (
                          <ul className="space-y-1">
                            {result.assertions.map((entry, assertionIndex) => (
                              <li
                                key={`${step.id}-${assertionIndex}`}
                                className={`text-[11px] flex items-start gap-2 px-3 py-1.5 rounded-lg border ${
                                  entry.ok
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-rose-50 border-rose-200 text-rose-800'
                                }`}
                              >
                                <ResultBadge tone={entry.ok ? 'passed' : 'failed'} />
                                <span className="font-mono break-all">{entry.message ?? 'ok'}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {result.evidence && (
                          <JsonBlock
                            label={`on-chain evidence — ${result.evidence.capability}`}
                            value={result.evidence.error ? result.evidence.error : result.evidence.payload}
                          />
                        )}

                        {result.payload !== undefined && <JsonBlock label="response" value={result.payload} />}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          </Card>
        )
      })}
    </div>
  )
}
