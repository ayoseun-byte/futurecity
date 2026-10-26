export interface ApiConfig {
  baseUrl: string
  adminKey: string
  feeApproverKey: string
  pspKey: string
  merchantSession: string
}

const STORAGE_KEY = 'orki_api_workbench_config'

const defaults: ApiConfig = {
  baseUrl: (import.meta.env.VITE_PSP_API_URL || '').replace(/\/$/, ''),
  adminKey: '',
  feeApproverKey: '',
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

export function resolveMerchantSession(config?: Partial<ApiConfig>): string {
  // 1. Direct from provided config if it's a valid session token
  if (config?.merchantSession && config.merchantSession.startsWith('onb_sec_')) {
    return config.merchantSession
  }

  // 2. From saved API config in sessionStorage
  const saved = getApiConfig()
  if (saved.merchantSession && saved.merchantSession.startsWith('onb_sec_')) {
    return saved.merchantSession
  }

  // 3. From global active merchant session key
  const active = sessionStorage.getItem('orki_active_merchant_session')
  if (active && active.startsWith('onb_sec_')) {
    return active
  }

  // 4. Scan any cached merchant session keys in sessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key && (key.startsWith('orki_merchant_session:') || key.startsWith('orki_merchant_session'))) {
      const val = sessionStorage.getItem(key)
      if (val && val.startsWith('onb_sec_')) {
        return val
      }
    }
  }

  return ''
}

export async function apiRequest(config: ApiConfig, method: string, path: string, body?: string, auth: 'none' | 'admin' | 'psp' | 'merchant' = 'none') {
  if (!config.baseUrl.trim()) {
    throw new Error('Set the PSP API base URL in the Backend API workbench before making requests.')
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const isMerchantOnboardingRoute =
    cleanPath.includes('/merchant/') &&
    !cleanPath.includes('/conversions/quote') &&
    !(cleanPath === '/api/v1/merchant/conversions' && method === 'POST')

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body && method !== 'GET') headers['Content-Type'] = 'application/json'
  if (auth === 'admin' && config.adminKey) headers['X-Admin-Key'] = config.adminKey
  if (cleanPath.includes('/fee-change-requests/') && config.feeApproverKey) headers['X-Fee-Approver-Key'] = config.feeApproverKey

  // Handle Merchant vs PSP Authentication
  if (auth === 'merchant' || isMerchantOnboardingRoute) {
    const sessionSecret = resolveMerchantSession(config)
    if (!sessionSecret) {
      throw new Error(
        'Merchant onboarding session secret is missing. This route requires a merchant session Bearer token (starts with onb_sec_...). ' +
        'Please execute POST /api/v1/psp/merchant-onboarding-sessions first to issue an onboarding session secret.'
      )
    }
    headers.Authorization = `Bearer ${sessionSecret}`
  } else if (auth === 'psp' && config.pspKey) {
    headers.Authorization = `Bearer ${config.pspKey}`
  }

  if (method !== 'GET' && method !== 'HEAD') headers['Idempotency-Key'] = `fc-${crypto.randomUUID()}`

  const controller = new AbortController()
  const timeoutMs = 20000
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(`${config.baseUrl}${cleanPath}`, {
      method,
      headers,
      body: body && method !== 'GET' ? body : undefined,
      signal: controller.signal,
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s (${method} ${cleanPath}). Please verify backend connectivity.`)
    }
    throw err
  } finally {
    window.clearTimeout(timeoutId)
  }

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
    let message = typeof response === 'object' && response
      ? response.message || response.error
      : typeof response === 'string' ? response : undefined

    // Clarify misleading backend message if an expired/unrecognized onb_sec_ token was sent
    if (response && typeof response === 'object' && response.error === 'merchant_session_required') {
      const sentToken = resolveMerchantSession(config)
      if (sentToken && sentToken.startsWith('onb_sec_')) {
        message = `The merchant session key (${sentToken.slice(0, 16)}...) has expired on the backend (sessions have a 30–120 minute TTL). Please generate a fresh onboarding session via POST /api/v1/psp/merchant-onboarding-sessions.`
      }
    }

    throw new Error(message || `Request failed (${result.status})`)
  }
  return result.data as T
}
