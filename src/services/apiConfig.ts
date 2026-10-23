export interface ApiConfig {
  baseUrl: string
  adminKey: string
  pspKey: string
  merchantSession: string
}

const STORAGE_KEY = 'orki_api_workbench_config'

const defaults: ApiConfig = {
  baseUrl: (import.meta.env.VITE_PSP_API_URL || '').replace(/\/$/, ''),
  adminKey: '',
  pspKey: '',
  merchantSession: '',
}

export function getApiConfig(): ApiConfig {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults
  } catch {
    return defaults
  }
}

export function saveApiConfig(config: ApiConfig): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...config,
    baseUrl: config.baseUrl.replace(/\/$/, ''),
  }))
}

export async function apiRequest(config: ApiConfig, method: string, path: string, body?: string, auth: 'none' | 'admin' | 'psp' | 'merchant' = 'none') {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body && method !== 'GET') headers['Content-Type'] = 'application/json'
  if (auth === 'admin' && config.adminKey) headers['X-Admin-Key'] = config.adminKey
  if (auth === 'psp' && config.pspKey) headers.Authorization = `Bearer ${config.pspKey}`
  if (auth === 'merchant' && config.merchantSession) headers.Authorization = `Bearer ${config.merchantSession}`
  if (method !== 'GET' && method !== 'HEAD') headers['Idempotency-Key'] = `fc-${crypto.randomUUID()}`
  const response = await fetch(`${config.baseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
    method,
    headers,
    body: body && method !== 'GET' ? body : undefined,
  })
  const raw = await response.text()
  let data: unknown = raw
  try { data = raw ? JSON.parse(raw) : null } catch { /* keep non-JSON response */ }
  return { status: response.status, ok: response.ok, data }
}

export async function requestApi<T>(config: ApiConfig, method: string, path: string, payload?: unknown, auth: 'none' | 'admin' | 'psp' | 'merchant' = 'none'): Promise<T> {
  const body = payload === undefined ? undefined : JSON.stringify(payload)
  const result = await apiRequest(config, method, path, body, auth)
  if (!result.ok) {
    const response = result.data as { message?: string; error?: string } | string | null
    const message = typeof response === 'object' && response
      ? response.message || response.error
      : typeof response === 'string' ? response : undefined
    throw new Error(message || `Request failed (${result.status})`)
  }
  return result.data as T
}
