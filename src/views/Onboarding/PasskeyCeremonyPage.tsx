import React, { useEffect, useState } from 'react'
import { Check, Fingerprint, LoaderCircle, LockKeyhole, Wallet } from 'lucide-react'
import { useWeb3AuthConnect } from '@web3auth/modal/react'
import { useSolanaWallet } from '@web3auth/modal/react/solana'
import { useConnection } from 'wagmi'

type OnboardingState = {
  merchantId: string
  legalBusinessName?: string
  status: string
  nextStep?: string | null
}

type ApiError = { message?: string; error?: string }

const apiBaseUrl = (import.meta.env.VITE_PSP_API_URL || '').replace(/\/$/, '')

function readSessionFromFragment(): string {
  const fragment = new URLSearchParams(window.location.hash.slice(1))
  return fragment.get('session') || ''
}

async function apiRequest<T>(path: string, session: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/api/v1/merchant${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${session}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ApiError
    throw new Error(error.message || error.error || `Request failed (${response.status})`)
  }

  return response.json() as Promise<T>
}

function SetupShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:py-16">
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-9">
        <div className="mb-8 flex items-center gap-3 border-b border-slate-800 pb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-onion-500/30 bg-onion-500/10 text-onion-300">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Orki merchant setup</p>
            <p className="text-xs text-slate-400">Secure wallet setup after KYB approval</p>
          </div>
        </div>
        {children}
      </section>
      <p className="mx-auto mt-5 max-w-xl text-center text-xs text-slate-500">
        Your onboarding session is private. Do not share this setup link.
      </p>
    </main>
  )
}

export const PasskeyCeremonyPage: React.FC = () => {
  const [session] = useState(readSessionFromFragment)
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null)
  const [savedWallets, setSavedWallets] = useState<{ base: string; solana: string } | null>(null)
  const [loadingState, setLoadingState] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID

  useEffect(() => {
    if (session && window.location.hash) window.history.replaceState(null, '', '/setup')
  }, [session])

  useEffect(() => {
    if (!session || !apiBaseUrl) {
      setLoadingState(false)
      return
    }

    let cancelled = false
    apiRequest<OnboardingState>('/onboarding', session)
      .then((state) => {
        if (!cancelled) setOnboarding(state)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load onboarding.')
      })
      .finally(() => {
        if (!cancelled) setLoadingState(false)
      })

    return () => { cancelled = true }
  }, [session])

  if (!session) {
    return <SetupShell><MessagePanel title="Setup link required" message="Open the setup URL returned when your PSP created this merchant onboarding session." /></SetupShell>
  }
  if (!apiBaseUrl) {
    return <SetupShell><MessagePanel title="Setup is not configured" message="The FutureCity app needs its PSP backend URL configured before it can continue." /></SetupShell>
  }
  if (!clientId) {
    return <SetupShell><MessagePanel title="Wallet setup is not configured" message="This deployment is missing its Web3Auth client ID. Contact your PSP to continue." /></SetupShell>
  }
  if (loadingState) {
    return <SetupShell><div className="flex items-center gap-3 py-8 text-sm text-slate-300"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading your onboarding session…</div></SetupShell>
  }
  if (error || !onboarding) {
    return <SetupShell><MessagePanel title="We could not verify this setup link" message={error || 'The onboarding session could not be loaded.'} /></SetupShell>
  }
  if (onboarding.status !== 'verified') {
    return <SetupShell><MessagePanel title="KYB approval is still pending" message="Wallet setup becomes available after the backend confirms your Sumsub KYB result." /></SetupShell>
  }

  return (
    <SetupShell>
      <WalletSetup
        merchantName={onboarding.legalBusinessName || 'Your business'}
        savedWallets={savedWallets}
        saving={saving}
        error={error}
        onSave={async (base, solana) => {
          setSaving(true)
          setError(null)
          try {
            const result = await apiRequest<{ wallets: { base: string; solana: string } }>('/wallets', session, {
              method: 'POST',
              body: JSON.stringify({ baseWalletAddress: base, solanaWalletAddress: solana }),
            })
            setSavedWallets(result.wallets)
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Wallet addresses could not be saved.')
          } finally {
            setSaving(false)
          }
        }}
      />
    </SetupShell>
  )
}

function WalletSetup({
  merchantName,
  savedWallets,
  saving,
  error,
  onSave,
}: {
  merchantName: string
  savedWallets: { base: string; solana: string } | null
  saving: boolean
  error: string | null
  onSave: (base: string, solana: string) => Promise<void>
}) {
  const { connect, loading: connecting, isConnected } = useWeb3AuthConnect()
  const { address: baseAddress } = useConnection()
  const { accounts } = useSolanaWallet()
  const solanaAddress = accounts?.[0]
  const canSave = isConnected && Boolean(baseAddress && solanaAddress)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-onion-300">Business</p>
        <h1 className="mt-1 text-xl font-bold text-white">Set up wallets for {merchantName}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Connect using Web3Auth to create your EVM and Solana embedded wallet accounts. Addresses are saved to this merchant's onboarding record.</p>
      </div>

      {!isConnected ? (
        <button type="button" onClick={() => void connect()} disabled={connecting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-onion-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-onion-600 disabled:opacity-60">
          {connecting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
          {connecting ? 'Connecting securely…' : 'Connect and create wallets'}
        </button>
      ) : (
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <AddressRow label="EVM wallet" value={baseAddress || 'No EVM address returned'} />
          <AddressRow label="Solana wallet" value={solanaAddress || 'No Solana address returned'} />
        </div>
      )}

      {error && <p role="alert" className="rounded-xl border border-rose-900/70 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>}

      {savedWallets ? (
        <div className="rounded-xl border border-emerald-900/70 bg-emerald-950/30 p-4 text-sm text-emerald-200">
          <div className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4" /> Wallet addresses saved</div>
          <p className="mt-2 text-xs leading-5 text-emerald-100/80">Your merchant remains pending until passkey enrolment is verified. This page does not mark the merchant active.</p>
        </div>
      ) : (
        <button type="button" onClick={() => baseAddress && solanaAddress && void onSave(baseAddress, solanaAddress)} disabled={!canSave || saving} className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
          {saving ? 'Saving wallet addresses…' : 'Save wallet addresses'}
        </button>
      )}

      <div className="border-t border-slate-800 pt-5">
        <div className="flex items-start gap-3">
          <Fingerprint className="mt-0.5 h-5 w-5 shrink-0 text-onion-300" />
          <div>
            <h2 className="text-sm font-semibold text-white">Add a passkey to your Web3Auth account</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">Passkey and device recovery factors are required by the Web3Auth setup configured for this app. Merchant activation remains pending until Orki's backend can verify and record that passkey enrolment.</p>
          </div>
        </div>
      </div>
      <p className="text-[11px] leading-5 text-slate-500">This onboarding session expires automatically. Keep the wallet account you use for your merchant operations secure.</p>
    </div>
  )
}

function AddressRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-all font-mono text-xs text-slate-200">{value}</p>
    </div>
  )
}

function MessagePanel({ title, message }: { title: string; message: string }) {
  return <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-4"><h1 className="font-semibold text-amber-100">{title}</h1><p className="mt-2 text-sm leading-6 text-amber-100/75">{message}</p></div>
}
