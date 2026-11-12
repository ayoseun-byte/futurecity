import { getApiConfig, requestApi } from './apiConfig'
import type { ApiConfig } from './apiConfig'

/** A route published by the chain-service itself (`GET /routes`). */
export interface ChainServiceRoute {
  method: string
  path: string
  summary: string
  readOnly: boolean
}

export interface ChainServiceInspection<T = unknown> {
  capability: string
  query: Record<string, unknown>
  data: T
}

/**
 * The chain-service route inventory, straight from the sidecar.
 *
 * The sidecar owns the list (`GET /routes`), and its own test keeps the list
 * in lockstep with the handlers, so the Rails Lab coverage matrix can never
 * drift from the real surface.
 */
export async function fetchChainServiceRoutes(config: ApiConfig = getApiConfig()): Promise<ChainServiceRoute[]> {
  const response = await requestApi<{ data?: { routes?: ChainServiceRoute[] } }>(
    config,
    'GET',
    '/api/v1/admin/chain-service/routes',
    undefined,
    'admin',
  )
  return response?.data?.routes ?? []
}

/**
 * Read a chain-service capability through the audited admin proxy.
 *
 * The sidecar token never reaches the browser: Laravel forwards a whitelisted
 * GET and returns the payload.
 */
export async function inspectChainService<T = unknown>(
  capability: string,
  query: Record<string, string> = {},
  config: ApiConfig = getApiConfig(),
): Promise<ChainServiceInspection<T>> {
  const search = new URLSearchParams(query).toString()
  const path = `/api/v1/admin/chain-service/${capability}${search ? `?${search}` : ''}`
  return requestApi<ChainServiceInspection<T>>(config, 'GET', path, undefined, 'admin')
}

/** Convenience: the deployed program and contract addresses per network. */
export async function fetchDeployments(config: ApiConfig = getApiConfig()): Promise<Record<string, unknown>> {
  const inspection = await inspectChainService<Record<string, unknown>>('deployments', {}, config)
  return inspection.data ?? {}
}

/** Convenience: sidecar liveness. */
export async function fetchChainServiceHealth(config: ApiConfig = getApiConfig()): Promise<Record<string, unknown>> {
  const inspection = await inspectChainService<Record<string, unknown>>('health', {}, config)
  return inspection.data ?? {}
}
