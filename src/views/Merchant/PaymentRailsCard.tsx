import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Clock, Globe, Layers, Loader2, RefreshCw, ShieldAlert, XCircle } from 'lucide-react'
import {
  fetchMerchantPreferences,
  updateMerchantPreferences,
  type MerchantTokenSyncResult,
  type MerchantPreferencesResponse,
} from '../../services/pspMerchantService'

/** Chain and token catalogs mirror the backend MerchantPreferencesController whitelists. */
const CHAIN_OPTIONS: Array<{ id: string; label: string; sub: string }> = [
  { id: 'base', label: 'Base', sub: 'EVM' },
  { id: 'solana', label: 'Solana', sub: 'SVM' },
]

const TOKEN_OPTIONS: Array<{ id: string; label: string; dot: string }> = [
  { id: 'usdc', label: 'USDC', dot: 'bg-blue-500' },
  { id: 'usdt', label: 'USDT', dot: 'bg-emerald-500' },
  { id: 'eurc', label: 'EURC', dot: 'bg-purple-500' },
]

function statusBadge(result: MerchantTokenSyncResult): { label: string; className: string; Icon: typeof CheckCircle2 } | null {
  switch (result.status) {
    case 'confirmed':
      return { label: 'Synced on-chain', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', Icon: CheckCircle2 }
    case 'already_synced':
      return { label: 'Already in sync', className: 'bg-slate-50 text-slate-600 border border-slate-200', Icon: CheckCircle2 }
    case 'prepared':
      return { label: 'Prepared (awaiting operator broadcast)', className: 'bg-amber-50 text-amber-700 border border-amber-200', Icon: Clock }
    case 'not_configured':
      return { label: 'No contract address configured', className: 'bg-slate-50 text-slate-500 border border-slate-200', Icon: ShieldAlert }
    case 'failed':
      return { label: 'Sync failed', className: 'bg-red-50 text-red-700 border border-red-200', Icon: XCircle }
    default:
      return null
  }
}

function TokenResultRow({ result }: { result: MerchantTokenSyncResult }) {
  const badge = statusBadge(result)
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-slate-100 last:border-b-0">
      <span className="flex items-center space-x-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${result.allowed ? 'bg-onion' : 'bg-slate-300'}`} />
        <span className="text-slate-500">
          {result.token.toUpperCase()}<span className="text-slate-400"> · {result.allowed ? 'allow' : 'revoke'}</span>
        </span>
        {result.txHash && (
          <a
            href={`https://sepolia.basescan.org/tx/${result.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-onion hover:text-onion-800 underline"
          >
            tx
          </a>
        )}
      </span>
      {badge ? (
        <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.className}`}>
          <badge.Icon className="h-3 w-3" />
          <span>{badge.label}</span>
        </span>
      ) : null}
    </div>
  )
}

/**
 * "Payment Rails & Currencies" card: merchant-level accepted chains/tokens that are persisted to
 * `acceptance_preferences` (inherited by every new payment) and mirrored into the on-chain
 * allow-list via the chain-service B2B endpoints. Self-contained: fetches on mount.
 */
export default function PaymentRailsCard({ disabled = false }: { disabled?: boolean }) {
  const [acceptedChains, setAcceptedChains] = useState<string[]>([])
  const [acceptedTokens, setAcceptedTokens] = useState<string[]>([])
  const [savedChains, setSavedChains] = useState<string[]>([])
  const [savedTokens, setSavedTokens] = useState<string[]>([])
  const [supportedTokens, setSupportedTokens] = useState<string[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [results, setResults] = useState<{
    base?: { status: string; tokens?: MerchantTokenSyncResult[] }
    solana?: { status: string; tokens?: MerchantTokenSyncResult[] }
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const prefs = await fetchMerchantPreferences()
      const chains = prefs.acceptedChains ?? []
      const tokens = prefs.acceptedTokens ?? []
      setAcceptedChains(chains)
      setAcceptedTokens(tokens)
      setSavedChains(chains)
      setSavedTokens(tokens)
      setSupportedTokens(prefs.onChain?.base?.supportedTokens ?? null)
      setResults(null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load payment preferences')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const dirty =
    JSON.stringify([...acceptedChains].sort()) !== JSON.stringify([...savedChains].sort()) ||
    JSON.stringify([...acceptedTokens].sort()) !== JSON.stringify([...savedTokens].sort())

  const toggleChain = (chain: string) => {
    setAcceptedChains((current) => {
      if (current.includes(chain)) {
        // Keep at least one rail active.
        if (current.length === 1) return current
        return current.filter((item) => item !== chain)
      }
      return [...current, chain]
    })
  }

  const toggleToken = (token: string) => {
    setAcceptedTokens((current) => {
      if (current.includes(token)) {
        if (current.length === 1) return current
        return current.filter((item) => item !== token)
      }
      return [...current, token]
    })
  }

  const save = async () => {
    setSaving(true)
    setErrorMessage(null)
    try {
      const response = await updateMerchantPreferences(acceptedChains, acceptedTokens)
      setSavedChains(response.acceptedChains ?? acceptedChains)
      setSavedTokens(response.acceptedTokens ?? acceptedTokens)
      setAcceptedChains(response.acceptedChains ?? acceptedChains)
      setAcceptedTokens(response.acceptedTokens ?? acceptedTokens)
      setResults(response.onChain ?? null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update payment preferences')
    } finally {
      setSaving(false)
    }
  }

  const renderResults = (chain: 'base' | 'solana') => {
    const group = results?.[chain]
    if (!group || !group.tokens || group.tokens.length === 0) return null
    return (
      <div className="mt-2 text-[11px]">
        <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wide">
          {chain === 'base' ? 'EVM splitter allow-list' : 'SVM program allow-list'} · {group.status}
        </p>
        <div>
          {group.tokens.map((result) => (
            <TokenResultRow key={`${chain}-${result.token}-${result.allowed}`} result={result} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mat-card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-onion-700" />
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Payment Rails &amp; Currencies</h3>
        </div>
        <div className="flex items-center space-x-2">
          {supportedTokens && (
            <span className="text-[11px] text-slate-500">
              On-chain allows:{' '}
              {supportedTokens.length === 0 ? (
                <span className="text-slate-400">none</span>
              ) : (
                <span className="font-mono">{supportedTokens.length}</span>
              )}
            </span>
          )}
          <button
            type="button"
            onClick={() => void load()}
            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
            aria-label="Reload preferences"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 mt-1">
        Applies to new payment links. Toggling tokens also updates the on-chain allow-list that
        hosted checkout validates against.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : loadError ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {loadError}
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <p className="text-[10px] uppercase font-semibold text-slate-500 flex items-center space-x-1.5 mb-2">
                <Globe className="w-3 h-3" />
                <span>Chains</span>
              </p>
              <div className="space-y-1.5">
                {CHAIN_OPTIONS.map((option) => {
                  const active = acceptedChains.includes(option.id)
                  const locked = active && acceptedChains.length === 1
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleChain(option.id)}
                      disabled={disabled || saving || locked}
                      title={locked ? 'At least one chain must stay enabled' : undefined}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition disabled:opacity-50 ${
                        active
                          ? 'bg-onion-50 border-onion-200 text-onion-800'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <span>{option.label}<span className="ml-1 text-slate-400">({option.sub})</span></span>
                      <span
                        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                          active ? 'bg-onion' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-transform ${
                            active ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <p className="text-[10px] uppercase font-semibold text-slate-500 mb-2">Stablecoins</p>
              <div className="space-y-1.5">
                {TOKEN_OPTIONS.map((option) => {
                  const active = acceptedTokens.includes(option.id)
                  const locked = active && acceptedTokens.length === 1
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleToken(option.id)}
                      disabled={disabled || saving || locked}
                      title={locked ? 'At least one currency must stay enabled' : undefined}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition disabled:opacity-50 ${
                        active
                          ? 'bg-onion-50 border-onion-200 text-onion-800'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <span className="flex items-center space-x-1.5">
                        <span className={`w-2 h-2 rounded-full ${option.dot}`} />
                        <span>{option.label}</span>
                      </span>
                      <span
                        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                          active ? 'bg-onion' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-transform ${
                            active ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {results && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              {renderResults('base')}
              {renderResults('solana')}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            {errorMessage ? (
              <p className="text-xs text-red-600">{errorMessage}</p>
            ) : (
              <p className="text-[11px] text-slate-400">
                {dirty ? 'Unsaved changes' : 'Preferences up to date'}
              </p>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={disabled || saving || !dirty}
              className="mat-btn-primary text-xs font-medium px-4 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              <span>{saving ? 'Syncing…' : 'Save & Sync On-Chain'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
