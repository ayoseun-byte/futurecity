import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock, Copy, ShieldCheck, X } from 'lucide-react'
import { getApiConfig, requestApi } from '../../services/apiConfig'

interface CheckoutPaylink {
  id: string
  slug: string
  title: string
  description?: string | null
  amountType: 'fixed' | 'open'
  amount: string | number | null
  currency: 'USDC' | 'USDT'
  allowedChains: string[]
  settlementMode: 'hold_as_received' | 'auto_offramp'
  merchantName: string
  status: string
}

interface CheckoutSession {
  sessionId: string
  amount: string
  currency: string
  chain: string
  depositAddress: string
  status: 'pending' | 'settled' | 'expired'
  expiresAt: string
}

interface CheckoutSessionStatus {
  status: string
  tx_hash?: string | null
  expires_at?: string | null
}

export const CustomerCheckoutView: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>()
  const [paylink, setPaylink] = useState<CheckoutPaylink | null>(null)
  const [selectedChain, setSelectedChain] = useState<'base' | 'solana'>('base')
  const [openAmount, setOpenAmount] = useState('')
  const [session, setSession] = useState<CheckoutSession | null>(null)
  const [sessionStatus, setSessionStatus] = useState<'pending' | 'settled' | 'expired'>('pending')
  const [txHash, setTxHash] = useState('')
  const [loadedSlug, setLoadedSlug] = useState('')
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    requestApi<CheckoutPaylink>(getApiConfig(), 'GET', `/api/v1/checkout/paylinks/${encodeURIComponent(slug)}`)
      .then((result) => {
        if (!active) return
        setPaylink(result)
        setError(null)
        setSession(null)
        if (result.allowedChains?.length) {
          setSelectedChain(result.allowedChains.includes('base') ? 'base' : 'solana')
        }
      })
      .catch((reason) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'This payment link could not be loaded.')
          setPaylink(null)
        }
      })
      .finally(() => { if (active) setLoadedSlug(slug) })
    return () => { active = false }
  }, [slug])

  useEffect(() => {
    if (!session) return
    let active = true
    const countdown = window.setInterval(() => setSecondsRemaining((remaining) => Math.max(0, remaining - 1)), 1000)
    const refreshStatus = async () => {
      try {
        const status = await requestApi<CheckoutSessionStatus>(
          getApiConfig(),
          'GET',
          `/api/v1/checkout/sessions/${encodeURIComponent(session.sessionId)}/status`
        )
        if (!active) return
        if (status.status === 'settled') {
          setSessionStatus('settled')
          setTxHash(status.tx_hash || '')
        } else if (status.status === 'expired') {
          setSessionStatus('expired')
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not refresh checkout status.')
      }
    }
    void refreshStatus()
    const timer = window.setInterval(() => { void refreshStatus() }, 5000)
    return () => { active = false; window.clearInterval(timer); window.clearInterval(countdown) }
  }, [session])

  const amount = Number(paylink?.amountType === 'fixed' ? paylink.amount : openAmount)
  const currency = paylink?.currency || 'USDC'
  const allowedChains = paylink?.allowedChains || []
  const createSession = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!paylink || !Number.isFinite(amount) || amount <= 0) return
    setBusy(true)
    setError(null)
    try {
      const result = await requestApi<CheckoutSession>(getApiConfig(), 'POST', '/api/v1/checkout/sessions', {
        paylinkId: paylink.id,
        amount,
        chain: selectedChain,
        currency,
      })
      setSession(result)
      setSecondsRemaining(Math.max(0, Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000)))
      setSessionStatus('pending')
      setTxHash('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create payment instructions.')
    } finally {
      setBusy(false)
    }
  }

  const copyAddress = async () => {
    if (!session?.depositAddress) return
    try {
      await navigator.clipboard.writeText(session.depositAddress)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy the deposit address. Select and copy it manually.')
    }
  }

  const timerLabel = `${Math.floor(secondsRemaining / 60).toString().padStart(2, '0')}:${(secondsRemaining % 60).toString().padStart(2, '0')}`

  const loading = loadedSlug !== slug
  if (loading) return <div className="mx-auto max-w-xl py-12 text-center text-sm text-slate-500">Loading payment link…</div>
  if (error && !paylink) return <div role="alert" className="mx-auto max-w-xl py-12 text-center text-sm text-red-700">{error}</div>
  if (!paylink || paylink.status !== 'active') return <div className="mx-auto max-w-xl py-12 text-center text-sm text-slate-500">This payment link is unavailable.</div>

  return (
    <div className="mx-auto max-w-xl py-6">
      <div className="overflow-hidden rounded-3xl border border-onion-200 bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-onion-700 bg-onion p-6 text-white">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-onion-200">Orki Checkout</span>
            <h1 className="mt-1 text-xl font-extrabold">{paylink.title}</h1>
            <p className="mt-1 text-xs text-onion-200">{paylink.merchantName}</p>
          </div>
          <div className="text-right">
            <span className="block text-2xl font-black">
              {paylink.amountType === 'fixed' ? `${Number(paylink.amount).toFixed(2)} ${paylink.currency}` : 'Open amount'}
            </span>
          </div>
        </header>

        <form onSubmit={(event) => void createSession(event)} className="space-y-5 p-6 text-xs">
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{error}</p>}
          {paylink.description && <p className="text-slate-600">{paylink.description}</p>}

          {paylink.amountType === 'open' && (
            <label className="block font-bold text-slate-700">
              Payment amount ({currency})
              <input
                type="number"
                min="1"
                step="0.01"
                required
                value={openAmount}
                onChange={(event) => setOpenAmount(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-base"
              />
            </label>
          )}

          <div>
            <p className="mb-2 font-bold text-slate-700">Select payment network</p>
            <div className="grid grid-cols-2 gap-3">
              {(['base', 'solana'] as const).filter((chain) => allowedChains.includes(chain)).map((chain) => (
                <button
                  key={chain}
                  type="button"
                  disabled={Boolean(session)}
                  onClick={() => setSelectedChain(chain)}
                  aria-pressed={selectedChain === chain}
                  className={`rounded-xl border p-3 text-left font-bold ${selectedChain === chain ? 'border-onion bg-onion-50 text-onion-950' : 'border-slate-200 text-slate-600'}`}
                >
                  {chain === 'base' ? `Base · ${currency}` : `Solana · ${currency}`}
                </button>
              ))}
            </div>
          </div>

          {session ? (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between font-semibold text-slate-700">
                <span className="flex items-center gap-2"><Clock className="h-4 w-4" />Payment session expires in</span>
                <span className="font-mono">{timerLabel}</span>
              </div>
              <div>
                <p className="mb-1 font-bold text-slate-700">Send exactly {Number(session.amount).toFixed(2)} {session.currency} on {session.chain}</p>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
                  <code className="min-w-0 flex-1 break-all text-[11px]">{session.depositAddress}</code>
                  <button type="button" onClick={() => void copyAddress()} aria-label="Copy deposit address" className="rounded p-1 text-onion hover:bg-onion-50">
                    {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              {sessionStatus === 'settled' ? (
                <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                  <p className="flex items-center gap-2 font-bold"><ShieldCheck size={16} />Payment confirmed by backend monitoring.</p>
                  <p className="mt-1 break-all font-mono">{txHash || 'Transaction hash unavailable'}</p>
                </div>
              ) : sessionStatus === 'expired' || secondsRemaining === 0 ? (
                <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">This session expired. Create a new session to get fresh payment instructions.</p>
              ) : (
                <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-800">Waiting for the backend to detect and confirm the deposit. Do not close this page until the payment status updates.</p>
              )}
              <button type="button" onClick={() => { setSession(null); setSessionStatus('pending') }} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
                <X size={14} />Create a new session
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={busy || allowedChains.length === 0 || paylink.settlementMode === 'auto_offramp'}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-onion px-4 py-3.5 text-sm font-extrabold text-white hover:bg-onion-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>{busy ? 'Creating payment session…' : 'Get deposit instructions'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {paylink.settlementMode === 'auto_offramp' && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">Automatic fiat payout is not configured for this merchant, so checkout is unavailable.</p>
          )}
        </form>
      </div>
    </div>
  )
}
