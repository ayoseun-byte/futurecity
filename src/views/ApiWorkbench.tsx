import { useMemo, useState } from 'react'
import { ArrowLeft, Play, Shield, Trash2, Copy, Check, Eye, EyeOff, ExternalLink, Key } from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiRequest, getApiConfig, saveApiConfig, type ApiConfig } from '../services/apiConfig'
import { getStoredMerchants } from '../services/storageService'

type Auth = 'none' | 'admin' | 'psp' | 'merchant'
type Endpoint = { group: string; method: string; path: string; auth: Auth; body?: string; note?: string }

const endpoints: Endpoint[] = [
  { group: 'Public', method: 'GET', path: '/api/v1/public/chains', auth: 'none' },
  { group: 'Public', method: 'GET', path: '/api/v1/public/tokens', auth: 'none' },
  { group: 'Public', method: 'GET', path: '/api/v1/tos/{token}', auth: 'none' },
  { group: 'Public', method: 'POST', path: '/api/v1/tos/{token}', auth: 'none', body: '{}', note: 'Use the single-use terms token returned by GET /merchant/terms.' },
  { group: 'Public', method: 'GET', path: '/api/v1/admin/secrets/claim/{token}', auth: 'none', note: 'Single-use credential claim: a successful request permanently burns the token.' },
  { group: 'Admin', method: 'GET', path: '/api/v1/admin/psps', auth: 'admin' },
  { group: 'Admin', method: 'GET', path: '/api/v1/admin/fee-change-requests', auth: 'admin' },
  { group: 'Admin', method: 'POST', path: '/api/v1/admin/fee-change-requests/{requestId}/approve', auth: 'admin', body: JSON.stringify({ approvedBy: 'approver@orki.example' }, null, 2), note: 'Requires the separate fee approver credential, the end of the notice period, and an approver distinct from the requester.' },
  { group: 'Admin', method: 'POST', path: '/api/v1/admin/fee-change-requests/{requestId}/reject', auth: 'admin', body: JSON.stringify({ rejectedBy: 'approver@orki.example', reason: 'Compliance review requires changes.' }, null, 2), note: 'Requires the separate fee approver credential and an approver distinct from the requester.' },
  { group: 'Admin', method: 'POST', path: '/api/v1/admin/psps', auth: 'admin', body: JSON.stringify({ pspName: 'Example PSP', category: 'FINANCE', categoryType: 'psp', contacts: [{ name: 'Technical Contact', email: 'tech@example.com', role: 'technical' }] }, null, 2) },
  { group: 'Admin', method: 'GET', path: '/api/v1/admin/psps/{pspId}', auth: 'admin' },
  { group: 'Admin', method: 'POST', path: '/api/v1/admin/psps/{pspId}/approve', auth: 'admin', body: JSON.stringify({ agreement: { signedAt: '2026-10-23T00:00:00Z', version: '1' }, kyb: { caseReference: 'CASE-001', riskRating: 'MEDIUM', nextReviewDue: '2027-10-23' }, pspRegulatoryStatus: { isRegulatedEntity: true, regulator: 'VARA', licenseReference: 'VARA-2026-091' }, feeSchedule: { paymentRateBps: 100, pspMarkupBps: 35, combinedCapBps: 200, lockedUntil: '2026-11-23' }, goLiveChecklist: { signedAt: '2026-10-23T00:00:00Z', signedBy: 'Reviewer', webhookSignaturesVerified: true, idempotencyHandled: true, passkeyIntegrationVerified: true, sandboxTransactionsPassed: true, reconciliationJobTested: true, settlementModeConfigured: true, errorHandlingVerified: true, rateLimitsRespected: true, tlsAndIpWhitelistingConfirmed: true }, preparedBy: 'preparer', approvedBy: 'approver' }, null, 2), note: 'Approval payload includes required due diligence and go-live attestations; confirm their truth before submitting.' },
  { group: 'Admin', method: 'POST', path: '/api/v1/admin/psps/{pspId}/reissue-keys', auth: 'admin', body: JSON.stringify({ environment: 'sandbox', reason: 'Technical contact rotated credentials.' }, null, 2), note: 'Revokes active credentials for this environment and issues a fresh 24-hour single-use claim URL.' },
  { group: 'PSP', method: 'GET', path: '/api/v1/psp/metrics', auth: 'psp' },
  { group: 'PSP', method: 'GET', path: '/api/v1/psp/profile', auth: 'psp' },
  { group: 'PSP', method: 'GET', path: '/api/v1/psp/transactions', auth: 'psp' },
  { group: 'PSP', method: 'GET', path: '/api/v1/psp/fee-change-requests', auth: 'psp' },
  { group: 'PSP', method: 'POST', path: '/api/v1/psp/fee-change-requests', auth: 'psp', body: JSON.stringify({ requestedMarkupBps: 40, requestedBy: 'finance@psp.example', reason: 'Documented commercial fee schedule revision.' }, null, 2), note: 'The new rate requires a 30-day notice and approval by a separate Orki approver.' },
  { group: 'PSP', method: 'GET', path: '/api/v1/psp/merchants', auth: 'psp' },
  { group: 'PSP', method: 'POST', path: '/api/v1/psp/merchants', auth: 'psp', body: JSON.stringify({ merchantExternalId: 'merchant-001', legalBusinessName: 'Example Trading Ltd', tradeLicenseNumber: 'LIC-001', jurisdiction: 'NG', representativeName: 'Ada Example', representativeEmail: 'ada@example.com', consent: { consentRecordedAt: '2026-10-23T00:00:00Z', consentMethod: 'dashboard', consentNoticeVersion: '1' }, settlementPreferences: { mode: 'hold_as_received' } }, null, 2) },
  { group: 'PSP', method: 'POST', path: '/api/v1/psp/merchants/batch', auth: 'psp', body: JSON.stringify({ merchants: [{ merchantExternalId: 'merchant-001', legalBusinessName: 'Example Trading Ltd', tradeLicenseNumber: 'LIC-001', jurisdiction: 'NG', consent: { consentRecordedAt: '2026-10-23T00:00:00Z', consentMethod: 'dashboard', consentNoticeVersion: '1' } }] }, null, 2) },
  { group: 'PSP', method: 'POST', path: '/api/v1/psp/merchant-onboarding-sessions', auth: 'psp', body: JSON.stringify({ merchantExternalId: 'merchant-001', legalBusinessName: 'Example Trading Ltd', tradeLicenseNumber: 'LIC-001', jurisdiction: 'NG', representativeName: 'Ada Example', representativeEmail: 'ada@example.com', returnUrl: 'http://localhost:5173/merchant', ttlMinutes: 60 }, null, 2), note: 'Creates a backend merchant record on first onboarding start (pending consent) and returns its merchant session secret and setup URL.' },
  { group: 'PSP', method: 'GET', path: '/api/v1/psp/merchants/{id}', auth: 'psp' },
  { group: 'PSP', method: 'GET', path: '/api/v1/psp/merchants/{id}/overview', auth: 'psp' },
  { group: 'PSP', method: 'PATCH', path: '/api/v1/psp/merchants/{id}/status', auth: 'psp', body: '{\n  "status": "disabled"\n}', note: 'Only active → disabled or eligible disabled → active transitions are allowed.' },
  { group: 'PSP', method: 'POST', path: '/api/v1/psp/merchants/{id}/onboarding-sessions', auth: 'psp', body: '{\n  "returnUrl": "http://localhost:5173/setup",\n  "ttlMinutes": 30\n}' },
  ...[
    ['GET', '/api/v1/merchant/onboarding', undefined], ['POST', '/api/v1/merchant/accept-usdc', '{}'], ['GET', '/api/v1/merchant/notice', undefined],
    ['POST', '/api/v1/merchant/notice/acknowledge', JSON.stringify({ isAuthorisedSignatory: true, signatoryName: 'Ada Example', signatoryEmail: 'ada@example.com', signatoryTitle: 'Director' }, null, 2)],
    ['POST', '/api/v1/merchant/kyb-information', JSON.stringify({ companyInfo: { companyName: 'Example Trading Ltd', registrationNumber: 'RC-001', country: 'NGA', incorporatedOn: '2020-01-01', type: 'Private company', legalAddress: 'Example address' } }, null, 2)],
    ['GET', '/api/v1/merchant/terms', undefined], ['POST', '/api/v1/merchant/sumsub/token', '{}'], ['GET', '/api/v1/merchant/kyc/start', undefined],
    ['POST', '/api/v1/merchant/sumsub/complete', '{}'], ['POST', '/api/v1/merchant/wallets', JSON.stringify({ baseWalletAddress: '0x0000000000000000000000000000000000000000', solanaWalletAddress: '11111111111111111111111111111111' }, null, 2)],
    ['POST', '/api/v1/merchant/passkey/register', '{}'], ['GET', '/api/v1/merchant/metrics', undefined], ['GET', '/api/v1/merchant/balances', undefined],
    ['PATCH', '/api/v1/merchant/settlement-mode', '{\n  "mode": "hold_as_received"\n}'], ['GET', '/api/v1/merchant/paylinks', undefined],
    ['POST', '/api/v1/merchant/paylinks', JSON.stringify({ title: 'Test payment', description: 'API workbench sample', amountType: 'fixed', amount: '10.00', currency: 'USDC', settlementMode: 'hold_as_received', allowedChains: ['base', 'solana'] }, null, 2)], ['GET', '/api/v1/merchant/paylinks/{id}', undefined],
    ['GET', '/api/v1/merchant/transfers', undefined], ['POST', '/api/v1/merchant/transfers', JSON.stringify({ destinationAddress: '0x0000000000000000000000000000000000000000', chain: 'base', currency: 'USDC', amount: '10.00', passkeySignature: 'workbench-test-only' }, null, 2)], ['POST', '/api/v1/merchant/conversions/quote', '{\n  "amount": "10.00",\n  "sourceCurrency": "USDC",\n  "targetCurrency": "AED"\n}'],
    ['GET', '/api/v1/merchant/conversions', undefined], ['POST', '/api/v1/merchant/conversions', '{}'], ['GET', '/api/v1/merchant/transactions', undefined],
  ].map(([method, path, body]) => ({ group: 'Merchant', method: method as string, path: path as string, auth: 'merchant' as Auth, body: body as string | undefined })),
  { group: 'Checkout', method: 'GET', path: '/api/v1/checkout/paylinks/{idOrSlug}', auth: 'none' },
  { group: 'Checkout', method: 'POST', path: '/api/v1/checkout/sessions', auth: 'none', body: '{\n  "paylinkId": "replace-with-paylink-id",\n  "amount": "10.00",\n  "chain": "base",\n  "currency": "USDC"\n}', note: 'Checkout session creation requires an active merchant and wallet for the selected chain.' },
  { group: 'Checkout', method: 'GET', path: '/api/v1/checkout/sessions/{id}/status', auth: 'none' },
  { group: 'Checkout', method: 'POST', path: '/api/v1/checkout/sessions/{id}/simulate-deposit', auth: 'none', body: '{}' },
  { group: 'Webhook', method: 'POST', path: '/api/v1/webhooks/sumsub', auth: 'none', body: '{}', note: 'Provider callback; requires a valid Sumsub signature. Do not call as a normal UI operation.' },
] as Endpoint[]

export function ApiWorkbench() {
  const [config, setConfig] = useState<ApiConfig>(getApiConfig)
  const [selected, setSelected] = useState(0)
  const [path, setPath] = useState(endpoints[0].path)
  const [body, setBody] = useState(endpoints[0].body || '')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ status: number; ok: boolean; data: unknown } | null>(null)
  const [sessionSecret, setSessionSecret] = useState<string>(() => config.merchantSession || '')
  const [sessionUrl, setSessionUrl] = useState<string>('')
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string>('')
  const [error, setError] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showAdminKey, setShowAdminKey] = useState(false)
  const [showPspKey, setShowPspKey] = useState(false)
  const [showConfigSecret, setShowConfigSecret] = useState(false)
  const [showSessionSecret, setShowSessionSecret] = useState(false)

  const selectedEndpoint = endpoints[selected]
  const groups = useMemo(() => [...new Set(endpoints.map((item) => item.group))], [])
  const knownMerchants = useMemo(() => getStoredMerchants(), [])

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const choose = (index: number) => {
    setSelected(index)
    setPath(endpoints[index].path)
    setBody(endpoints[index].body || '')
    setResult(null)
    setError('')
  }

  const update = (next: ApiConfig) => {
    setConfig(next)
    saveApiConfig(next)
    if (next.merchantSession && !sessionSecret) {
      setSessionSecret(next.merchantSession)
    }
  }

  const run = async () => {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      if (body.trim() && !['GET', 'HEAD'].includes(selectedEndpoint.method)) JSON.parse(body)
      const response = await apiRequest(config, selectedEndpoint.method, path, body, selectedEndpoint.auth)
      setResult(response)
      if (response.ok && response.data && typeof response.data === 'object') {
        const sessionResult = response.data as { clientSecret?: string; setupUrl?: string | null; expiresAt?: string }
        if (sessionResult.clientSecret) {
          update({ ...config, merchantSession: sessionResult.clientSecret })
          setSessionSecret(sessionResult.clientSecret)
        }
        if (sessionResult.setupUrl) {
          setSessionUrl(sessionResult.setupUrl)
        }
        if (sessionResult.expiresAt) {
          setSessionExpiresAt(sessionResult.expiresAt)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <Link to="/login" className="text-xs text-slate-500 flex items-center gap-1">
              <ArrowLeft size={14} /> Back to sign in
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">Backend API workbench</h1>
            <p className="text-sm text-slate-500">
              Exercise the routes implemented by PSP Backend. Credentials are kept in this browser tab only.
            </p>
          </div>
          <Shield className="text-slate-400" />
        </header>

        <section className="mat-card p-4 grid gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">
            API base URL
            <input
              value={config.baseUrl}
              onChange={(e) => update({ ...config, baseUrl: e.target.value })}
              className="mt-1 w-full rounded-lg border p-2 font-normal"
              placeholder="http://localhost:8000"
            />
          </label>

          <label className="text-xs font-semibold text-slate-700">
            Admin API key
            <div className="relative mt-1">
              <input
                type={showAdminKey ? 'text' : 'password'}
                value={config.adminKey}
                onChange={(e) => update({ ...config, adminKey: e.target.value })}
                className="w-full rounded-lg border p-2 font-mono text-xs pr-16"
                autoComplete="off"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                <button
                  type="button"
                  onClick={() => setShowAdminKey(!showAdminKey)}
                  className="p-1 hover:text-slate-600"
                  title={showAdminKey ? 'Hide key' : 'Show key'}
                >
                  {showAdminKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                {config.adminKey && (
                  <button
                    type="button"
                    onClick={() => handleCopy(config.adminKey, 'adminKey')}
                    className="p-1 hover:text-slate-600"
                    title="Copy key"
                  >
                    {copiedField === 'adminKey' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                )}
              </div>
            </div>
          </label>

          <label className="text-xs font-semibold text-slate-700">
            Separate fee approver key
            <input
              type="password"
              value={config.feeApproverKey}
              onChange={(e) => update({ ...config, feeApproverKey: e.target.value })}
              className="mt-1 w-full rounded-lg border p-2 font-normal"
              autoComplete="off"
            />
          </label>

          <label className="text-xs font-semibold text-slate-700">
            PSP API key
            <div className="relative mt-1">
              <input
                type={showPspKey ? 'text' : 'password'}
                value={config.pspKey}
                onChange={(e) => update({ ...config, pspKey: e.target.value })}
                className="w-full rounded-lg border p-2 font-mono text-xs pr-16"
                placeholder="orki_live_... or orki_test_..."
                autoComplete="off"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                <button
                  type="button"
                  onClick={() => setShowPspKey(!showPspKey)}
                  className="p-1 hover:text-slate-600"
                  title={showPspKey ? 'Hide key' : 'Show key'}
                >
                  {showPspKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                {config.pspKey && (
                  <button
                    type="button"
                    onClick={() => handleCopy(config.pspKey, 'pspKey')}
                    className="p-1 hover:text-slate-600"
                    title="Copy key"
                  >
                    {copiedField === 'pspKey' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                )}
              </div>
            </div>
          </label>

          <label className="text-xs font-semibold text-slate-700 md:col-span-2">
            Merchant onboarding session secret
            <div className="relative mt-1">
              <input
                type={showConfigSecret ? 'text' : 'password'}
                value={config.merchantSession}
                onChange={(e) => {
                  update({ ...config, merchantSession: e.target.value })
                  setSessionSecret(e.target.value)
                }}
                className="w-full rounded-lg border p-2 font-mono text-xs pr-16"
                placeholder="onb_sec_..."
                autoComplete="off"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                <button
                  type="button"
                  onClick={() => setShowConfigSecret(!showConfigSecret)}
                  className="p-1 hover:text-slate-600"
                  title={showConfigSecret ? 'Hide secret' : 'Show secret'}
                >
                  {showConfigSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                {config.merchantSession && (
                  <button
                    type="button"
                    onClick={() => handleCopy(config.merchantSession, 'configSession')}
                    className="p-1 hover:text-slate-600"
                    title="Copy secret key"
                  >
                    {copiedField === 'configSession' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                )}
              </div>
            </div>
          </label>

          <div className="md:col-span-2 text-[11px] text-slate-500">
            Admin requests send <code>X-Admin-Key</code>; PSP and merchant requests send Bearer credentials. Mutating calls include a fresh Idempotency-Key.
          </div>
        </section>

        <div className="grid lg:grid-cols-[270px_1fr] gap-4">
          <nav className="mat-card p-3 max-h-[70vh] overflow-auto">
            {groups.map((group) => (
              <div key={group} className="mb-3">
                <h2 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-2 py-1">{group}</h2>
                {endpoints.map((ep, i) =>
                  ep.group === group ? (
                    <button
                      key={`${ep.method}-${ep.path}`}
                      onClick={() => choose(i)}
                      className={`w-full text-left px-2 py-2 rounded-md text-xs flex gap-2 ${
                        selected === i ? 'bg-slate-100 font-semibold text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="w-12 text-slate-500 font-mono text-[11px]">{ep.method}</span>
                      <span className="truncate">{ep.path.replace('/api/v1/', '')}</span>
                    </button>
                  ) : null
                )}
              </div>
            ))}
          </nav>

          <section className="mat-card p-5 space-y-4">
            <div>
              <div className="text-xs text-slate-500">
                {selectedEndpoint.auth === 'none' ? 'Public route' : `Authentication: ${selectedEndpoint.auth}`}
              </div>
              <h2 className="font-mono text-sm font-bold mt-1">
                {selectedEndpoint.method} {path}
              </h2>

              {selectedEndpoint.group === 'Merchant' && (
                <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-1">
                  <p className="font-semibold">Merchant Session Invariant:</p>
                  <p>
                    Merchant onboarding routes must be authenticated with an onboarding session client secret (starts with{' '}
                    <code className="font-mono bg-blue-100/70 px-1 py-0.5 rounded">onb_sec_</code>), not a PSP administrative key.
                    Calling <code>POST /api/v1/psp/merchant-onboarding-sessions</code> or <code>POST /api/v1/psp/merchants/{'{id}'}/onboarding-sessions</code>{' '}
                    automatically populates this credential.
                  </p>
                </div>
              )}

              {config.merchantSession &&
                (config.merchantSession.startsWith('orki_live_') || config.merchantSession.startsWith('orki_test_')) && (
                  <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs space-y-1">
                    <p className="font-semibold">⚠️ PSP Key Detected in Merchant Session Secret:</p>
                    <p>
                      You have entered a PSP administrative key in the merchant session secret box. The backend will return{' '}
                      <code className="font-mono font-bold">merchant_session_required</code>. Use an onboarding session secret (
                      <code className="font-mono">onb_sec_...</code>) returned from{' '}
                      <code className="font-mono">POST /api/v1/psp/merchant-onboarding-sessions</code>.
                    </p>
                  </div>
                )}

              {selectedEndpoint.note && (
                <p className="mt-2 text-xs text-amber-800 bg-amber-50 rounded-lg p-3">{selectedEndpoint.note}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Request path</label>
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="mt-1 w-full rounded-lg border p-2 font-mono text-xs font-normal"
              />
              {path.includes('{id}') && knownMerchants.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs">
                  <span className="text-slate-500 text-[11px] font-semibold">Quick fill merchant ID:</span>
                  {knownMerchants.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPath((prev) => prev.replace('{id}', m.id))}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-mono text-[11px] transition shadow-2xs"
                      title={`Insert ID for ${m.legalBusinessName}`}
                    >
                      {m.legalBusinessName} ({m.id})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedEndpoint.method !== 'GET' && (
              <label className="block text-xs font-semibold text-slate-700">
                JSON body
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  className="mt-1 w-full rounded-lg border p-3 font-mono text-xs font-normal"
                  spellCheck={false}
                />
              </label>
            )}

            <button
              onClick={run}
              disabled={busy}
              className="mat-btn-primary px-4 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Play size={15} />
              {busy ? 'Sending…' : 'Send request'}
            </button>

            {error && (
              <pre className="whitespace-pre-wrap rounded-lg bg-red-50 text-red-800 p-3 text-xs">{error}</pre>
            )}

            {/* ISSUED MERCHANT CREDENTIALS & ONBOARDING KEYS CARD */}
            {(sessionSecret || sessionUrl) && (
              <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/80 space-y-3 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <Key className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-bold text-xs text-emerald-950 uppercase tracking-wider">
                      Issued Merchant Onboarding Credentials
                    </h3>
                  </div>
                  {sessionExpiresAt && (
                    <span className="text-[11px] font-medium text-emerald-800">
                      Expires: {new Date(sessionExpiresAt).toLocaleTimeString()} ({new Date(sessionExpiresAt).toLocaleDateString()})
                    </span>
                  )}
                </div>

                <p className="text-xs text-emerald-900 leading-relaxed">
                  Use this <strong>Session Client Secret</strong> (Bearer token) for merchant calls, or share the{' '}
                  <strong>Setup URL</strong> with the merchant to launch their onboarding.
                </p>

                {sessionSecret && (
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-950 block mb-1">
                      Merchant Session Secret Key (clientSecret)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showSessionSecret ? 'text' : 'password'}
                          readOnly
                          value={sessionSecret}
                          className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 select-all pr-10 shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSessionSecret(!showSessionSecret)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          title={showSessionSecret ? 'Hide secret key' : 'Show secret key'}
                        >
                          {showSessionSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(sessionSecret, 'secret')}
                        className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0 shadow-xs"
                      >
                        {copiedField === 'secret' ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedField === 'secret' ? 'Copied Key!' : 'Copy Key'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {sessionUrl && (
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-950 block mb-1">
                      Hosted Setup URL (setupUrl)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={sessionUrl}
                        className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-mono text-slate-800 select-all shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy(sessionUrl, 'url')}
                        className="px-3.5 py-2 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-100/60 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                      >
                        {copiedField === 'url' ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedField === 'url' ? 'Copied Link!' : 'Copy Link'}</span>
                      </button>
                      <a
                        href={sessionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0 shadow-xs"
                      >
                        <ExternalLink size={14} />
                        <span>Open Setup</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {result && (
              <div className="space-y-2">
                <div className={`text-sm font-semibold ${result.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                  HTTP {result.status} · {result.ok ? 'Success' : 'Request failed'}
                </div>
                <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 text-slate-100 p-4 text-xs font-mono">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}

            <button
              onClick={() => {
                update({ ...config, adminKey: '', feeApproverKey: '', pspKey: '', merchantSession: '' })
                setSessionSecret('')
                setSessionUrl('')
                setResult(null)
              }}
              className="text-xs text-slate-400 flex items-center gap-1 hover:text-slate-600 transition"
            >
              <Trash2 size={12} /> Clear credentials from this tab
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
