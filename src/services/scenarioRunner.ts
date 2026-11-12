import type { RailsAssertion, RailsAssertionResult, RailsRunSummary, RailsStepResult } from '../types/rails'

/**
 * Expand `{key}` and `{stepId.field}` placeholders in a path or query value.
 *
 * The context holds the scenario inputs plus every previous step payload, so a
 * step can reference an earlier result (for example the charge token).
 */
export function expandTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{([^{}]+)\}/g, (match, key: string) => {
    const value = getAtPath(context, key.trim())
    if (value === undefined || value === null) return match
    return typeof value === 'string' ? value : String(value)
  })
}

/** Recursively expand `{placeholder}` strings inside a request body. */
export function expandValue<T>(value: T, context: Record<string, unknown>): T {
  if (typeof value === 'string') return expandTemplate(value, context) as unknown as T
  if (Array.isArray(value)) return value.map((entry) => expandValue(entry, context)) as unknown as T
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      output[key] = expandValue(entry, context)
    }
    return output as unknown as T
  }
  return value
}

/** The payload of every step that ran, keyed by step id. */
export function collectContext(results: RailsStepResult[]): Record<string, unknown> {
  const context: Record<string, unknown> = {}
  for (const result of results) {
    if (result.payload !== undefined) context[result.stepId] = result.payload
  }
  return context
}

/**
 * Read a dotted path out of a payload.
 *
 * `data.status` walks plain objects and arrays; a numeric segment indexes an
 * array (`data.items.0.id`).
 */
export function getAtPath(payload: unknown, path: string): unknown {
  if (!path) return payload
  let current: unknown = payload

  for (const segment of path.split('.')) {
    if (current === null || current === undefined) return undefined
    if (Array.isArray(current)) {
      const index = Number(segment)
      current = Number.isInteger(index) ? current[index] : undefined
      continue
    }
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[segment]
  }

  return current
}

function isAbsent(value: unknown): boolean {
  return value === undefined || value === null || value === ''
}

/** Evaluate one expectation against a payload. */
export function evaluateAssertion(assertion: RailsAssertion, payload: unknown): RailsAssertionResult {
  const observed = getAtPath(payload, assertion.path)
  const label = assertion.label ?? assertion.path

  if (assertion.exists !== undefined) {
    const present = !isAbsent(observed)
    return {
      assertion,
      observed,
      ok: present === assertion.exists,
      message: present === assertion.exists
        ? undefined
        : `${label}: expected the field to ${assertion.exists ? 'be present' : 'be absent'}`,
    }
  }

  if (assertion.equals !== undefined) {
    const ok = JSON.stringify(observed) === JSON.stringify(assertion.equals)
    return {
      assertion,
      observed,
      ok,
      message: ok ? undefined : `${label}: expected ${JSON.stringify(assertion.equals)}, saw ${JSON.stringify(observed)}`,
    }
  }

  if (assertion.contains !== undefined) {
    const text = typeof observed === 'string' ? observed : JSON.stringify(observed ?? '')
    const ok = text.toLowerCase().includes(assertion.contains.toLowerCase())
    return {
      assertion,
      observed,
      ok,
      message: ok ? undefined : `${label}: expected to contain "${assertion.contains}", saw ${text}`,
    }
  }

  if (assertion.greaterThan !== undefined) {
    const numeric = typeof observed === 'number' ? observed : Number(observed)
    const ok = Number.isFinite(numeric) && numeric > assertion.greaterThan
    return {
      assertion,
      observed,
      ok,
      message: ok ? undefined : `${label}: expected greater than ${assertion.greaterThan}, saw ${String(observed)}`,
    }
  }

  return { assertion, observed, ok: true }
}

/** Evaluate every expectation of a step. */
export function evaluateAssertions(assertions: RailsAssertion[] | undefined, payload: unknown): RailsAssertionResult[] {
  if (!assertions || assertions.length === 0) return []
  return assertions.map((assertion) => evaluateAssertion(assertion, payload))
}

/** Whether a step passed: no failed assertions and no transport error. */
export function stepPassed(result: RailsStepResult): boolean {
  if (result.status === 'failed') return false
  return result.assertions.every((entry) => entry.ok)
}

/** Roll a set of step results up into a headline summary. */
export function summarizeSteps(results: RailsStepResult[]): RailsRunSummary {
  const summary: RailsRunSummary = { total: results.length, passed: 0, failed: 0, awaiting: 0 }

  for (const result of results) {
    if (result.status === 'awaiting' || result.status === 'idle') {
      summary.awaiting += 1
      continue
    }
    if (result.status === 'passed' && stepPassed(result)) summary.passed += 1
    else summary.failed += 1
  }

  return summary
}

/** The chain-service endpoints a scenario is expected to reach. */
export function scenarioChainEndpoints(chainEndpoints: string[] | undefined): string[] {
  return chainEndpoints ?? []
}
