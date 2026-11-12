/** Rails Lab types: scenario definitions, assertions and run results. */

export type RailsRole = 'admin' | 'psp' | 'merchant'

/** The integration style a scenario exercises. */
export type RailsStyle = 'invoicely' | 'paylink' | 'checkout' | 'headless' | 'ops'

export type RailsAuth = 'admin' | 'psp' | 'merchant' | 'none'

export interface RailsStepAction {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  query?: Record<string, string>
  body?: unknown
  auth?: RailsAuth
}

/** A single expectation checked against a step's response payload. */
export interface RailsAssertion {
  label?: string
  /** Dotted path into the payload, e.g. `data.status` or `onChainRegistration.status`. */
  path: string
  equals?: unknown
  exists?: boolean
  contains?: string
  greaterThan?: number
}

export interface RailsStep {
  id: string
  title: string
  description?: string
  action?: RailsStepAction
  /** A human checkpoint (open the checkout page, pay, paste a hash). */
  manual?: { label: string; href?: string }
  /** chain-service endpoints this step is expected to reach. */
  chainEndpoints?: string[]
  assertions?: RailsAssertion[]
  /** Builds the request body from the payloads of the previous steps. */
  build?: (previous: Record<string, unknown>) => unknown
  /** Inspector capability to read as on-chain evidence after the step. */
  evidence?: { capability: string; query?: Record<string, string> }
}

/** An operator-supplied value a scenario needs (PSP id, wallet, amount, …). */
export interface RailsInput {
  key: string
  label: string
  placeholder?: string
  defaultValue?: string
  required?: boolean
  help?: string
}

export interface RailsScenario {
  id: string
  title: string
  style: RailsStyle
  roles: RailsRole[]
  summary: string
  /** Prerequisites the operator must satisfy before running the scenario. */
  prerequisites?: string[]
  /** Values the operator fills in before the scenario can run. */
  inputs?: RailsInput[]
  steps: RailsStep[]
}

export interface RailsAssertionResult {
  assertion: RailsAssertion
  ok: boolean
  observed: unknown
  message?: string
}

export type RailsStepStatus = 'idle' | 'running' | 'passed' | 'failed' | 'awaiting' | 'skipped'

export interface RailsStepResult {
  stepId: string
  status: RailsStepStatus
  httpStatus?: number
  payload?: unknown
  error?: string
  assertions: RailsAssertionResult[]
  evidence?: { capability: string; payload: unknown; error?: string }
  durationMs?: number
}

export interface RailsRunSummary {
  total: number
  passed: number
  failed: number
  awaiting: number
}
