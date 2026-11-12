import { describe, expect, test } from 'vitest'
import {
  collectContext,
  evaluateAssertion,
  evaluateAssertions,
  expandTemplate,
  expandValue,
  getAtPath,
  summarizeSteps,
} from './scenarioRunner'
import type { RailsStepResult } from '../types/rails'

describe('getAtPath', () => {
  const payload = {
    data: {
      status: 'confirmed',
      items: [{ id: 'a' }, { id: 'b' }],
      nested: { deep: { value: 42 } },
    },
  }

  test('reads plain object paths', () => {
    expect(getAtPath(payload, 'data.status')).toBe('confirmed')
    expect(getAtPath(payload, 'data.nested.deep.value')).toBe(42)
  })

  test('indexes arrays by numeric segment', () => {
    expect(getAtPath(payload, 'data.items.1.id')).toBe('b')
  })

  test('returns undefined for missing paths', () => {
    expect(getAtPath(payload, 'data.missing')).toBeUndefined()
    expect(getAtPath(payload, 'data.items.9.id')).toBeUndefined()
    expect(getAtPath(null, 'data.status')).toBeUndefined()
  })
})

describe('evaluateAssertion', () => {
  const payload = { onChainRegistration: { status: 'confirmed', txHash: '0xabc' }, count: 3, note: 'prepared' }

  test('checks existence', () => {
    expect(evaluateAssertion({ path: 'onChainRegistration.txHash', exists: true }, payload).ok).toBe(true)
    expect(evaluateAssertion({ path: 'onChainRegistration.missing', exists: false }, payload).ok).toBe(true)
    expect(evaluateAssertion({ path: 'onChainRegistration.missing', exists: true }, payload).ok).toBe(false)
  })

  test('checks exact values', () => {
    expect(evaluateAssertion({ path: 'onChainRegistration.status', equals: 'confirmed' }, payload).ok).toBe(true)
    expect(evaluateAssertion({ path: 'onChainRegistration.status', equals: 'pending' }, payload).ok).toBe(false)
  })

  test('checks substrings case-insensitively', () => {
    expect(evaluateAssertion({ path: 'note', contains: 'PREP' }, payload).ok).toBe(true)
  })

  test('checks numeric comparisons', () => {
    expect(evaluateAssertion({ path: 'count', greaterThan: 2 }, payload).ok).toBe(true)
    expect(evaluateAssertion({ path: 'count', greaterThan: 5 }, payload).ok).toBe(false)
  })

  test('explains a failure', () => {
    const result = evaluateAssertion({ label: 'status', path: 'onChainRegistration.status', equals: 'pending' }, payload)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('status')
  })

  test('evaluates a set of assertions', () => {
    const results = evaluateAssertions(
      [
        { path: 'onChainRegistration.status', equals: 'confirmed' },
        { path: 'onChainRegistration.txHash', exists: true },
      ],
      payload,
    )
    expect(results.every((entry) => entry.ok)).toBe(true)
  })
})

describe('template expansion', () => {
  test('expands inputs and previous step payloads', () => {
    const context = {
      pspId: 'psp_orkidemo',
      'create-charge': { chargeToken: 'chg_123', txHash: '0xdead' },
    }

    expect(expandTemplate('/api/v1/admin/psps/{pspId}', context)).toBe('/api/v1/admin/psps/psp_orkidemo')
    expect(expandTemplate('{create-charge.chargeToken}', context)).toBe('chg_123')
  })

  test('leaves unknown placeholders untouched', () => {
    expect(expandTemplate('{missing.key}', {})).toBe('{missing.key}')
  })

  test('expands nested request bodies', () => {
    const body = {
      merchantExternalId: '{merchantId}',
      invoice: { number: '{invoiceNumber}', items: [{ total: '{amount}' }] },
    }

    expect(expandValue(body, { merchantId: 'DEMO-1', invoiceNumber: 'INV-9', amount: '10' })).toEqual({
      merchantExternalId: 'DEMO-1',
      invoice: { number: 'INV-9', items: [{ total: '10' }] },
    })
  })

  test('collects the payloads of the steps that ran', () => {
    const results: RailsStepResult[] = [
      { stepId: 'a', status: 'passed', payload: { id: 1 }, assertions: [] },
      { stepId: 'b', status: 'failed', payload: { id: 2 }, assertions: [] },
      { stepId: 'c', status: 'idle', assertions: [] },
    ]

    expect(collectContext(results)).toEqual({ a: { id: 1 }, b: { id: 2 } })
  })
})

describe('summarizeSteps', () => {
  test('counts passed, failed and awaited steps', () => {
    const results: RailsStepResult[] = [
      { stepId: 'a', status: 'passed', assertions: [{ assertion: { path: 'x' }, ok: true, observed: 1 }] },
      { stepId: 'b', status: 'failed', assertions: [] },
      { stepId: 'c', status: 'awaiting', assertions: [] },
      { stepId: 'd', status: 'idle', assertions: [] },
    ]

    expect(summarizeSteps(results)).toEqual({ total: 4, passed: 1, failed: 1, awaiting: 2 })
  })

  test('a failed assertion fails the step', () => {
    const results: RailsStepResult[] = [
      { stepId: 'a', status: 'passed', assertions: [{ assertion: { path: 'x' }, ok: false, observed: 1 }] },
    ]

    expect(summarizeSteps(results).failed).toBe(1)
  })
})
