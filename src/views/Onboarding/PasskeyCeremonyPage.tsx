import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Fingerprint,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { AUTH_CONNECTION, WALLET_CONNECTORS, getED25519Key } from '@web3auth/modal'
import {
  useWeb3Auth,
  useWeb3AuthConnect,
  useWeb3AuthDisconnect,
  useWeb3AuthUser,
} from '@web3auth/modal/react'
import { useSolanaWallet } from '@web3auth/modal/react/solana'
import { getEd25519 } from '@toruslabs/metadata-helpers'
import { getBase58Decoder } from '@solana/kit'
import { useConnection, useSignMessage, useWalletClient } from 'wagmi'
import { constants, createKernelAccount } from '@zerodev/sdk'
import { getKernelAddressFromECDSA, signerToEcdsaValidator } from '@zerodev/ecdsa-validator'
import {
  toPasskeyValidator,
  toWebAuthnKey,
  WebAuthnMode,
  PasskeyValidatorContractVersion,
} from '@zerodev/passkey-validator'
import {
  createPublicClient,
  http,
  type Address,
  type WalletClient,
} from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { getApiConfig } from '../../services/apiConfig'

type OnboardingState = {
  merchantId: string
  legalBusinessName?: string
  representativeName?: string | null
  representativeEmail?: string | null
  status: string
  nextStep?: string | null
  baseWalletAddress?: string | null
  solanaWalletAddress?: string | null
  walletSetupChallenge?: string | null
  passkeyRegisteredAt?: string | null
  activatedAt?: string | null
}

type WalletActivationResponse = {
  status: string
  merchantStatus?: string
  nextStep?: string | null
  passkeyId?: string
  activatedAt?: string
  wallets: {
    base: string
    solana?: string | null
    evmSigner?: string
  }
  message?: string
}

type ApiError = { message?: string; error?: string }

const KERNEL_VERSION = constants.KERNEL_V3_1
const ENTRY_POINT = constants.getEntryPoint('0.7')
const SOLANA_UI_TIMEOUT_MS = 8000

function errorMessage(reason: unknown, fallback: string): string {
  if (reason instanceof Error && reason.message) return reason.message
  if (typeof reason === 'string' && reason) return reason
  return fallback
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary)
}

function stripApiSuffix(url: string): string {
  return url.replace(/\/api\/v1\/?$/, '').replace(/\/v1\/?$/, '').replace(/\/$/, '')
}

function resolveApiBaseUrl(): string {
  const configured = getApiConfig().baseUrl
  if (configured) return stripApiSuffix(configured)
  const pspUrl = (import.meta.env.VITE_PSP_API_URL || '')
  if (pspUrl) return stripApiSuffix(pspUrl)
  return stripApiSuffix(import.meta.env.VITE_API_BASE_URL || '')
}

function readSessionFromFragmentOrConfig(): string {
  const fragment = new URLSearchParams(window.location.hash.slice(1))
  const fromHash = fragment.get('session')
  if (fromHash) {
    sessionStorage.setItem('orki_setup_active_session', fromHash)
    return fromHash
  }
  const fromSetupStorage = sessionStorage.getItem('orki_setup_active_session')
  if (fromSetupStorage) return fromSetupStorage

  try {
    const rawUser = localStorage.getItem('orki_auth_user')
    if (rawUser) {
      const parsed = JSON.parse(rawUser)
      if (parsed?.merchantId) {
        const forMerchant = sessionStorage.getItem(`orki_merchant_session:${parsed.merchantId}`)
        if (forMerchant) return forMerchant
      }
    }
  } catch {
    // ignore
  }

  return getApiConfig().merchantSession || ''
}

function resolveBaseChain() {
  const chainIdEnv = Number(import.meta.env.VITE_BASE_CHAIN_ID || 8453)
  return chainIdEnv === 84532 ? baseSepolia : base
}

function resolveZeroDevOrBaseRpcUrl(chainId: number): string {
  const zeroDevRpc = (import.meta.env.VITE_ZERODEV_RPC_URL || '').trim()
  if (zeroDevRpc) return zeroDevRpc

  const zeroDevProjectId = (import.meta.env.VITE_ZERODEV_PROJECT_ID || '').trim()
  if (zeroDevProjectId) {
    return `https://rpc.zerodev.app/api/v3/${zeroDevProjectId}/chain/${chainId}`
  }

  const baseRpc = (import.meta.env.VITE_BASE_RPC_URL || '').trim()
  if (baseRpc) return baseRpc

  return chainId === 84532 ? 'https://sepolia.base.org' : 'https://mainnet.base.org'
}

async function deriveZeroDevKernelSmartAccount(
  walletClient: WalletClient,
  eoaAddress: Address,
): Promise<Address> {
  const chain = resolveBaseChain()
  const rpcUrl = resolveZeroDevOrBaseRpcUrl(chain.id)
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  })

  try {
    const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
      signer: walletClient as any,
      entryPoint: ENTRY_POINT,
      kernelVersion: KERNEL_VERSION,
    })

    const kernelAccount = await createKernelAccount(publicClient, {
      plugins: {
        sudo: ecdsaValidator,
      },
      entryPoint: ENTRY_POINT,
      kernelVersion: KERNEL_VERSION,
      index: 0n,
    })

    return kernelAccount.address
  } catch {
    const initCodeHash = constants.KernelVersionToAddressesMap[KERNEL_VERSION].initCodeHash
    if (!initCodeHash) {
      throw new Error('Unable to resolve ZeroDev Kernel v3.1 initCodeHash.')
    }
    return getKernelAddressFromECDSA({
      entryPoint: ENTRY_POINT,
      kernelVersion: KERNEL_VERSION,
      eoaAddress,
      index: 0n,
      initCodeHash,
    })
  }
}

async function createZeroDevPasskeyAccount({
  passkeyName,
  projectId,
}: {
  passkeyName: string
  projectId: string
}): Promise<Address> {
  const chain = resolveBaseChain()
  const rpcUrl = resolveZeroDevOrBaseRpcUrl(chain.id)
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  })

  const webAuthnKey = await toWebAuthnKey({
    passkeyName,
    passkeyServerUrl: `https://passkeys.zerodev.app/api/v3/${projectId}`,
    mode: WebAuthnMode.Register,
    passkeyServerHeaders: {},
  })

  const passkeyValidator = await toPasskeyValidator(publicClient, {
    webAuthnKey,
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
    validatorContractVersion: PasskeyValidatorContractVersion.V0_0_3_PATCHED,
  })

  const kernelAccount = await createKernelAccount(publicClient, {
    plugins: {
      sudo: passkeyValidator,
    },
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
    index: 0n,
  })

  return kernelAccount.address
}

async function apiRequest<T>(apiBaseUrl: string, path: string, session: string, init?: RequestInit): Promise<T> {
  const cleanBaseUrl = stripApiSuffix(apiBaseUrl)
  const method = (init?.method || 'GET').toUpperCase()
  const targetUrl = `${cleanBaseUrl}/api/v1/merchant${path.startsWith('/') ? path : `/${path}`}`

  const response = await fetch(targetUrl, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${session}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' && method !== 'HEAD' ? { 'Idempotency-Key': `setup-${crypto.randomUUID()}` } : {}),
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
        <div className="mb-8 flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-onion-500/30 bg-onion-500/10 text-onion-300">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Orki Non-Custodial Wallet & Passkey Setup</p>
              <p className="text-xs text-slate-400">Web3Auth MPC + ZeroDev Kernel v3.1 Smart Account (Base & Solana)</p>
            </div>
          </div>
          <Link
            to="/merchant"
            className="text-xs font-medium text-slate-400 transition hover:text-white"
          >
            Dashboard
          </Link>
        </div>
        {children}
      </section>
      <p className="mx-auto mt-5 max-w-xl text-center text-xs text-slate-500">
        Your onboarding session is private. Wallets are derived client-side using your merchant email and passkey MFA.
      </p>
    </main>
  )
}

export const PasskeyCeremonyPage: React.FC = () => {
  const [session] = useState(readSessionFromFragmentOrConfig)
  const [apiBaseUrl] = useState(resolveApiBaseUrl)
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null)
  const [activationResult, setActivationResult] = useState<WalletActivationResponse | null>(null)
  const [loadingState, setLoadingState] = useState(() => Boolean(session && apiBaseUrl))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID

  // Preserve session fragment so browser reloads stay bound to the exact merchant session
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1))
    const fromHash = fragment.get('session')
    if (fromHash) {
      sessionStorage.setItem('orki_setup_active_session', fromHash)
    }
  }, [session])

  useEffect(() => {
    if (!session || !apiBaseUrl) {
      return
    }

    let cancelled = false
    apiRequest<OnboardingState>(apiBaseUrl, '/onboarding', session)
      .then((state) => {
        if (!cancelled) {
          setOnboarding(state)
          if (state.status?.toLowerCase() === 'active' && state.baseWalletAddress) {
            setActivationResult({
              status: 'active',
              merchantStatus: 'active',
              nextStep: null,
              activatedAt: state.activatedAt || undefined,
              wallets: {
                base: state.baseWalletAddress,
                solana: state.solanaWalletAddress || undefined,
              },
            })
          }
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(errorMessage(reason, 'Unable to load onboarding.'))
      })
      .finally(() => {
        if (!cancelled) setLoadingState(false)
      })

    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, session])

  if (!session) {
    return (
      <SetupShell>
        <MessagePanel
          title="Setup link required"
          message="Open the setup URL returned when your PSP created this merchant onboarding session, or launch Wallet Setup from your Merchant Dashboard."
        />
      </SetupShell>
    )
  }
  if (!apiBaseUrl) {
    return (
      <SetupShell>
        <MessagePanel
          title="Setup is not configured"
          message="The FutureCity app needs its PSP backend URL configured before it can continue."
        />
      </SetupShell>
    )
  }
  if (!clientId) {
    return (
      <SetupShell>
        <MessagePanel
          title="Wallet setup is not configured"
          message="This deployment is missing its Web3Auth client ID (VITE_WEB3AUTH_CLIENT_ID). Contact your PSP to continue."
        />
      </SetupShell>
    )
  }
  if (loadingState) {
    return (
      <SetupShell>
        <div className="flex items-center gap-3 py-8 text-sm text-slate-300">
          <LoaderCircle className="h-5 w-5 animate-spin" /> Loading your onboarding session…
        </div>
      </SetupShell>
    )
  }
  if (!onboarding) {
    return (
      <SetupShell>
        <MessagePanel
          title="We could not verify this setup link"
          message={error || 'The onboarding session could not be loaded.'}
        />
      </SetupShell>
    )
  }
  const onboardingStatusLower = (onboarding.status || '').toLowerCase()
  if (onboardingStatusLower !== 'verified' && onboardingStatusLower !== 'active') {
    return (
      <SetupShell>
        <MessagePanel
          title="KYB approval is still pending"
          message={`Wallet and passkey setup becomes available after Sumsub KYB verification is approved (current status: ${onboarding.status}).`}
        />
      </SetupShell>
    )
  }

  return (
    <SetupShell>
      <WalletSetup
        onboarding={onboarding}
        activationResult={activationResult}
        saving={saving}
        error={error}
        onClearError={() => setError(null)}
        onActivate={async ({
          baseSmartAccountAddress,
          solanaWalletAddress,
          solanaSignature,
          evmSignerAddress,
          merchantEmail,
          challenge,
          signature,
        }) => {
          setSaving(true)
          setError(null)
          try {
            const result = await apiRequest<WalletActivationResponse>(
              apiBaseUrl,
              '/passkey/register',
              session,
              {
                method: 'POST',
                body: JSON.stringify({
                  baseWalletAddress: baseSmartAccountAddress,
                  solanaWalletAddress,
                  solanaSignature, // base64 ed25519 signature over `challenge`
                  evmSignerAddress,
                  merchantEmail,
                  challenge,
                  signature,
                  kernelVersion: KERNEL_VERSION,
                }),
              },
            )
            setActivationResult(result)
            setOnboarding((prev) =>
              prev
                ? {
                    ...prev,
                    status: 'active',
                    nextStep: null,
                    baseWalletAddress: result.wallets.base,
                    solanaWalletAddress: result.wallets.solana ?? prev.solanaWalletAddress,
                    activatedAt: result.activatedAt || new Date().toISOString(),
                  }
                : prev,
            )
          } catch (reason) {
            setError(errorMessage(reason, 'Wallet activation could not be completed.'))
          } finally {
            setSaving(false)
          }
        }}
      />
    </SetupShell>
  )
}

function WalletSetup({
  onboarding,
  activationResult,
  saving,
  error,
  onClearError,
  onActivate,
}: {
  onboarding: OnboardingState
  activationResult: WalletActivationResponse | null
  saving: boolean
  error: string | null
  onClearError: () => void
  onActivate: (params: {
    baseSmartAccountAddress: string
    solanaWalletAddress?: string
    solanaSignature?: string
    evmSignerAddress: string
    merchantEmail?: string
    challenge: string
    signature: string
  }) => Promise<void>
}) {
  const { web3Auth } = useWeb3Auth()
  const { connect, connectTo, loading: connecting, isConnected } = useWeb3AuthConnect()
  const { disconnect, loading: disconnecting } = useWeb3AuthDisconnect()
  const { userInfo, getUserInfo } = useWeb3AuthUser()
  const { address: evmSignerAddress } = useConnection()
  const { data: walletClient } = useWalletClient()
  const { accounts: solanaAccounts, solanaWallet } = useSolanaWallet()
  const { signMessageAsync } = useSignMessage()

  const registeredEmail = (onboarding.representativeEmail || '').trim()
  const [emailInput, setEmailInput] = useState(registeredEmail)
  const [zeroDevSmartAccount, setZeroDevSmartAccount] = useState<string | null>(
    onboarding.baseWalletAddress || null,
  )
  const [derivingZeroDev, setDerivingZeroDev] = useState(false)
  const [enrollingPasskey, setEnrollingPasskey] = useState(false)
  const [signing, setSigning] = useState(false)
  const [passkeyEnrolled, setPasskeyEnrolled] = useState(Boolean(onboarding.passkeyRegisteredAt))
  const [nativeSolanaKey, setNativeSolanaKey] = useState<{
    address: string
    privateKeyBytes: Uint8Array
  } | null>(null)
  const [walletStdAddresses, setWalletStdAddresses] = useState<string[]>([])
  const [solanaTimedOut, setSolanaTimedOut] = useState(false)
  const [zeroDevError, setZeroDevError] = useState<string | null>(null)
  const [activationError, setActivationError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const zeroDevProjectId = (import.meta.env.VITE_ZERODEV_PROJECT_ID || '').trim()
  const connectedEmail = (userInfo?.email || '').trim()

  // Prefer the live Web3Auth Solana account; then standard:connect accounts; only fall back to the locally derived key.
  const hookSolanaAddress = solanaAccounts?.[0] || walletStdAddresses[0] || undefined
  const solanaAddress = hookSolanaAddress || nativeSolanaKey?.address || undefined
  const solanaFromFallback = !hookSolanaAddress && Boolean(nativeSolanaKey?.address)

  const passkeyDisplayName = () =>
    (registeredEmail || connectedEmail || onboarding.legalBusinessName || 'Orki Merchant Passkey').trim()

  const handleEnrollZeroDevPasskey = async () => {
    if (!zeroDevProjectId) {
      setZeroDevError(
        'VITE_ZERODEV_PROJECT_ID is not configured in your environment. Using deterministic smart account derivation instead.',
      )
      return
    }
    setEnrollingPasskey(true)
    setZeroDevError(null)
    try {
      const smartAccountAddress = await createZeroDevPasskeyAccount({
        passkeyName: passkeyDisplayName(),
        projectId: zeroDevProjectId,
      })
      setZeroDevSmartAccount(smartAccountAddress)
      setPasskeyEnrolled(true)
    } catch (reason: unknown) {
      setZeroDevError(errorMessage(reason, 'Failed to register biometric passkey with ZeroDev.'))
    } finally {
      setEnrollingPasskey(false)
    }
  }

  // The hook can return null accounts while the wallet object already exists
  // (_accounts: null). Calling the wallet-standard connect feature loads them.
  useEffect(() => {
    if (!isConnected || !solanaWallet || solanaAccounts?.[0]) return

    let cancelled = false
    const loadAccounts = async () => {
      try {
        const w = solanaWallet as any
        const res = await w.features?.['standard:connect']?.connect()
        const raw = res?.accounts ?? w.accounts ?? []
        const addrs: string[] = raw
          .map((a: any) => (typeof a === 'string' ? a : a?.address))
          .filter(Boolean)
        console.log('[wallet-setup] solana wallet-standard accounts:', addrs)
        if (!cancelled) setWalletStdAddresses(addrs)
      } catch (e) {
        console.warn('[wallet-setup] solana standard:connect failed:', e)
      }
    }
    void loadAccounts()

    return () => {
      cancelled = true
    }
  }, [isConnected, solanaWallet, solanaAccounts])

  // Fallback Solana derivation. Each provider method is tried independently so one
  // unsupported method no longer aborts the other.
  useEffect(() => {
    if (!isConnected || !web3Auth?.provider) {
      setNativeSolanaKey(null)
      setWalletStdAddresses([])
      return
    }

    let active = true

    const deriveNativeSolana = async () => {
      const provider = web3Auth.provider
      if (!provider) return

      const tryRequest = async (method: string): Promise<string | null> => {
        try {
          return ((await provider.request({ method })) as string) || null
        } catch (e) {
          console.warn(`provider.request(${method}) failed:`, e)
          return null
        }
      }

      try {
        const rawKey =
          (await tryRequest('solanaPrivateKey')) ??
          (await tryRequest('solana_privateKey')) ??
          (await tryRequest('private_key'))
        if (!rawKey) {
          console.warn('No private key method succeeded for Solana derivation')
          return
        }

        const cleanHex = rawKey.replace(/^0x/, '').padStart(64, '0').slice(0, 64)
        const { sk, pk } = getED25519Key(cleanHex)
        const address = getBase58Decoder().decode(pk)

        if (active && address) {
          setNativeSolanaKey({
            address,
            privateKeyBytes: sk.slice(0, 32),
          })
        }
      } catch (err) {
        console.warn('Native Solana derivation via Web3Auth failed:', err)
      }
    }

    void deriveNativeSolana()

    return () => {
      active = false
    }
  }, [isConnected, web3Auth?.provider])

  // Stop showing "Deriving…" forever if neither source produces an address.
  useEffect(() => {
    if (!isConnected || solanaAddress) {
      setSolanaTimedOut(false)
      return
    }
    const t = window.setTimeout(() => setSolanaTimedOut(true), SOLANA_UI_TIMEOUT_MS)
    return () => window.clearTimeout(t)
  }, [isConnected, solanaAddress])

  // Diagnostics: compare the hook account with the fallback derivation.
  useEffect(() => {
    if (!isConnected) return
    console.log('[wallet-setup] solana accounts:', solanaAccounts, 'wallet:', solanaWallet, 'fallback:', nativeSolanaKey?.address)
    if (hookSolanaAddress && nativeSolanaKey?.address && hookSolanaAddress !== nativeSolanaKey.address) {
      console.warn(
        '[wallet-setup] Solana address mismatch: hook account differs from fallback derivation. Using the hook account; consider removing the fallback.',
      )
    }
  }, [isConnected, solanaAccounts, solanaWallet, nativeSolanaKey, hookSolanaAddress])

  useEffect(() => {
    if (isConnected && !userInfo) {
      void getUserInfo().catch(() => {})
    }
  }, [isConnected, userInfo, getUserInfo])

  useEffect(() => {
    if (!isConnected || !walletClient || !evmSignerAddress) {
      return
    }

    let cancelled = false

    const runDerivation = async () => {
      setDerivingZeroDev(true)
      setZeroDevError(null)
      try {
        const smartAccountAddress = await deriveZeroDevKernelSmartAccount(
          walletClient,
          evmSignerAddress as Address,
        )
        if (!cancelled) {
          setZeroDevSmartAccount(smartAccountAddress)
        }
      } catch (reason: unknown) {
        if (!cancelled) {
          setZeroDevError(errorMessage(reason, 'Failed to derive ZeroDev Kernel Smart Account on Base.'))
        }
      } finally {
        if (!cancelled) {
          setDerivingZeroDev(false)
        }
      }
    }

    void runDerivation()

    return () => {
      cancelled = true
    }
  }, [isConnected, walletClient, evmSignerAddress])

  const emailMismatch =
    Boolean(registeredEmail) &&
    Boolean(connectedEmail) &&
    registeredEmail.toLowerCase() !== connectedEmail.toLowerCase()

  const handleConnectWithEmail = async () => {
    onClearError()
    const targetEmail = (registeredEmail || emailInput).trim()
    if (!targetEmail) {
      await connect()
      return
    }
    await connectTo(WALLET_CONNECTORS.AUTH, {
      authConnection: AUTH_CONNECTION.EMAIL_PASSWORDLESS,
      extraLoginOptions: {
        login_hint: targetEmail,
      },
    })
  }

  const signSolanaChallenge = async (challenge: string): Promise<string> => {
    const msgBytes = new TextEncoder().encode(challenge)
    let sig: unknown

    // 1) Preferred: Web3Auth's Solana wallet (matches hook account[0]).
    if (solanaWallet && typeof (solanaWallet as any)?.signMessage === 'function') {
      sig = await (solanaWallet as any).signMessage(msgBytes)
    } else if (solanaWallet && (solanaWallet as any)?.features?.['solana:signMessage']) {
      const feature = (solanaWallet as any).features['solana:signMessage']
      const account =
        solanaWallet.accounts?.find((a: any) => a.address === solanaAddress) ||
        solanaWallet.accounts?.[0]
      if (account) {
        const [output] = await feature.signMessage({ account, message: msgBytes })
        sig = output.signature
      }
    }

    // 2) Fallback key — ONLY when the displayed address actually came from that key,
    //    otherwise we'd sign with a key that doesn't own the submitted address.
    if (!sig && solanaFromFallback && nativeSolanaKey?.privateKeyBytes) {
      sig = getEd25519().sign(msgBytes, nativeSolanaKey.privateKeyBytes)
    }

    if (!sig) {
      throw new Error('Solana wallet is not ready to sign. Please wait a moment and retry.')
    }

    // If a string is returned, confirm its encoding (base58 vs base64) matches your backend.
    return typeof sig === 'string' ? sig : toBase64(sig as Uint8Array)
  }

  const handleSignAndActivate = async () => {
    setActivationError(null)
    setZeroDevError(null)
    onClearError()

    try {
      const activeSmartAccount = zeroDevSmartAccount || onboarding.baseWalletAddress || ''

      if (!evmSignerAddress) {
        throw new Error('No EVM signer is connected. Use "Switch account" and sign in again.')
      }
      if (!activeSmartAccount) {
        throw new Error('Base Smart Account has not been derived yet. Please ensure Web3Auth is connected.')
      }

      let activeBaseAccount = activeSmartAccount
      if (zeroDevProjectId && !passkeyEnrolled) {
        setEnrollingPasskey(true)
        try {
          activeBaseAccount = await createZeroDevPasskeyAccount({
            passkeyName: passkeyDisplayName(),
            projectId: zeroDevProjectId,
          })
          setZeroDevSmartAccount(activeBaseAccount)
          setPasskeyEnrolled(true)
        } finally {
          setEnrollingPasskey(false)
        }
      }

      const challenge =
        onboarding.walletSetupChallenge || `orki_wallet_setup:${onboarding.merchantId}`

      // EVM signature (no synthetic fallback: a failure must surface, not be faked).
      setSigning(true)
      let signature: string
      let solanaSignature: string | undefined
      try {
        signature = await signMessageAsync({ message: challenge })
        if (!signature || !signature.startsWith('0x') || signature.length !== 132) {
          throw new Error('Received an invalid EVM signature from the wallet. Please retry.')
        }
        if (solanaAddress) {
          solanaSignature = await signSolanaChallenge(challenge)
        }
      } finally {
        setSigning(false)
      }

      await onActivate({
        baseSmartAccountAddress: activeBaseAccount,
        solanaWalletAddress: solanaAddress,
        solanaSignature,
        evmSignerAddress,
        merchantEmail: connectedEmail || registeredEmail || undefined,
        challenge,
        signature,
      })
    } catch (reason) {
      console.error('[wallet-setup] activation failed', reason)
      setActivationError(errorMessage(reason, 'Signing or passkey step failed.'))
    }
  }

  const copyText = (value: string, key: string) => {
    void navigator.clipboard.writeText(value)
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(null), 2000)
  }

  const canActivate =
    isConnected &&
    Boolean(zeroDevSmartAccount || onboarding.baseWalletAddress) &&
    Boolean(evmSignerAddress) &&
    !derivingZeroDev &&
    !emailMismatch

  const busy = saving || signing || enrollingPasskey
  const visibleError = activationError || error

  const solanaRowValue =
    solanaAddress ||
    (!isConnected
      ? 'Not derived'
      : solanaTimedOut
        ? 'Solana wallet unavailable. Check the Solana chain config and RPC (see console).'
        : 'Deriving Solana wallet from Web3Auth…')

  const recoveryVaultUrl = zeroDevSmartAccount
    ? `https://orki-organisation.github.io/orki-evm-emergency-recovery/?account=${zeroDevSmartAccount}`
    : null

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-onion-300">
          Merchant Self-Custody Ceremony
        </p>
        <h1 className="mt-1 text-xl font-bold text-white">
          Set up wallets for {onboarding.legalBusinessName || 'Your business'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Authenticate with your merchant email to derive your non-custodial{' '}
          <strong className="font-semibold text-slate-200">ZeroDev ERC-4337 Smart Account on Base</strong>{' '}
          and <strong className="font-semibold text-slate-200">Solana Embedded Wallet</strong>, secured by
          mandatory WebAuthn Passkey MFA.
        </p>
      </div>

      {/* Merchant Email Ownership Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-onion-300" />
          <div className="flex-1 text-xs">
            <p className="font-semibold text-slate-200">Merchant Email Identity</p>
            {registeredEmail ? (
              <p className="mt-1 text-slate-400">
                Your wallet will be bound to{' '}
                <span className="font-mono font-semibold text-white">{registeredEmail}</span> so your
                business retains full sovereign ownership and portable recovery outside Orki.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                <label htmlFor="merchant-setup-email" className="block text-slate-400">
                  Enter your authorised merchant email to initialize Web3Auth:
                </label>
                <input
                  id="merchant-setup-email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="signatory@company.com"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-onion-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {!isConnected ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void handleConnectWithEmail()}
            disabled={connecting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-onion-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-onion-600 disabled:opacity-60"
          >
            {connecting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Fingerprint className="h-4 w-4" />
            )}
            {connecting
              ? 'Authenticating with Web3Auth…'
              : registeredEmail
                ? `Continue with ${registeredEmail} + Passkey`
                : 'Connect with Email & Passkey'}
          </button>

          <button
            type="button"
            onClick={() => {
              onClearError()
              void connect()
            }}
            disabled={connecting}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white disabled:opacity-50"
          >
            <Wallet className="h-3.5 w-3.5" />
            <span>Open Web3Auth Modal (Google / Apple with your merchant email)</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Connected Identity & MFA Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-slate-300">
                Connected as{' '}
                <strong className="font-mono text-white">
                  {connectedEmail || registeredEmail || 'Authenticated Merchant'}
                </strong>
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  passkeyEnrolled
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                    : 'bg-indigo-950 text-indigo-300 border border-indigo-800/60'
                }`}
              >
                {passkeyEnrolled ? 'Hardware Passkey Active' : 'Signer Authenticated'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void disconnect()}
              disabled={disconnecting}
              className="inline-flex items-center gap-1 text-xs text-slate-400 transition hover:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Switch account</span>
            </button>
          </div>

          {emailMismatch && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-amber-800/80 bg-amber-950/40 p-3.5 text-xs text-amber-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div className="space-y-1">
                <p className="font-semibold">Email mismatch detected</p>
                <p className="text-amber-200/80">
                  You signed in with <span className="font-mono">{connectedEmail}</span>, but this
                  merchant onboarding record belongs to{' '}
                  <span className="font-mono">{registeredEmail}</span>. Please switch accounts and
                  sign in with <span className="font-mono">{registeredEmail}</span>.
                </p>
              </div>
            </div>
          )}

          {/* Derived Multi-Chain Wallet Addresses */}
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <AddressRow
              label="Base Smart Account (ZeroDev Kernel v3.1 · ERC-4337)"
              badge="Primary EVM Settlement"
              value={
                derivingZeroDev
                  ? 'Deriving ZeroDev Kernel v3.1 Smart Account on Base…'
                  : zeroDevSmartAccount || 'Unable to derive Base Smart Account'
              }
              loading={derivingZeroDev}
              onCopy={zeroDevSmartAccount ? () => copyText(zeroDevSmartAccount, 'base') : undefined}
              copied={copiedKey === 'base'}
            />

            <div className="border-t border-slate-800/80 pt-3">
              <AddressRow
                label="Solana Embedded Wallet (Web3Auth Ed25519)"
                badge={solanaAddress ? 'Primary Solana Settlement' : 'Optional / Multi-Chain'}
                value={solanaRowValue}
                loading={!solanaAddress && !solanaTimedOut}
                onCopy={solanaAddress ? () => copyText(solanaAddress, 'solana') : undefined}
                copied={copiedKey === 'solana'}
              />
            </div>

            <div className="border-t border-slate-800/80 pt-3">
              <AddressRow
                label="Web3Auth Passkey Root Signer (EVM EOA)"
                badge="Kernel ECDSA Validator"
                value={evmSignerAddress || 'No EVM signer returned'}
                onCopy={evmSignerAddress ? () => copyText(evmSignerAddress, 'eoa') : undefined}
                copied={copiedKey === 'eoa'}
              />
            </div>
          </div>

          {zeroDevError && (
            <p
              role="alert"
              className="rounded-xl border border-rose-900/70 bg-rose-950/40 p-3 text-xs text-rose-200"
            >
              {zeroDevError}
            </p>
          )}
        </div>
      )}

      {visibleError && (
        <p
          role="alert"
          className="rounded-xl border border-rose-900/70 bg-rose-950/40 p-3 text-sm text-rose-200"
        >
          {visibleError}
        </p>
      )}

      {activationResult ? (
        <div className="space-y-4 rounded-2xl border border-emerald-800/70 bg-emerald-950/30 p-5 text-sm text-emerald-100">
          <div className="flex items-center gap-2 font-semibold text-emerald-300">
            <Check className="h-5 w-5" />
            <span>Merchant Wallets & Passkey Verified — Account Active</span>
          </div>
          <p className="text-xs leading-5 text-emerald-100/80">
            Your ZeroDev Base Smart Account {solanaAddress ? 'and Solana wallet are' : 'is'} now bound to your merchant profile
            and ready for atomic split settlements. Your PSP has been notified via signed webhook
            that your Orki rail is active.
          </p>

          {recoveryVaultUrl && (
            <div className="rounded-xl border border-emerald-800/50 bg-slate-950/60 p-3 text-xs">
              <p className="font-semibold text-emerald-200">Sovereign Recovery Vault Link</p>
              <p className="mt-1 text-slate-400">
                Save this link outside Orki. Because your Base wallet is a ZeroDev on-chain smart
                account, you always retain sovereign recovery access:
              </p>
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-slate-900 px-2.5 py-1.5 font-mono text-[11px] text-slate-200">
                <span className="truncate">{recoveryVaultUrl}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => copyText(recoveryVaultUrl, 'recovery')}
                    className="rounded px-1.5 py-0.5 text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    {copiedKey === 'recovery' ? 'Copied' : 'Copy'}
                  </button>
                  <a
                    href={recoveryVaultUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-onion-300 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="pt-1">
            <Link
              to="/merchant"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              <span>Return to Merchant Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        isConnected && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => void handleSignAndActivate()}
              disabled={!canActivate || busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-onion-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-onion-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Fingerprint className="h-4 w-4" />
              )}
              <span>
                {enrollingPasskey
                  ? 'Registering passkey…'
                  : signing
                    ? 'Waiting for signature…'
                    : saving
                      ? 'Verifying signature & activating merchant…'
                      : 'Sign Attestation & Activate Merchant Wallets'}
              </span>
            </button>
            {!canActivate && !busy && (
              <p className="text-center text-[11px] text-slate-500">
                {emailMismatch
                  ? 'Sign in with the registered merchant email to continue.'
                  : derivingZeroDev
                    ? 'Deriving your Base smart account…'
                    : !evmSignerAddress
                      ? 'Waiting for an EVM signer from Web3Auth…'
                      : !zeroDevSmartAccount
                        ? 'Base smart account not available yet.'
                        : null}
              </p>
            )}
          </div>
        )
      )}

      {/* ZeroDev Biometric Passkey Enrollment Section */}
      <div className="border-t border-slate-800 pt-5">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Fingerprint className="mt-0.5 h-5 w-5 shrink-0 text-onion-300" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                ZeroDev Native Hardware Passkey (Base ERC-4337)
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Register a biometric passkey (Face ID, Touch ID, or Windows Hello) to serve as the
                sudo validator for your Base smart contract wallet, powered by ZeroDev Kernel v3.1.
              </p>
            </div>
          </div>
          {isConnected && (
            <button
              type="button"
              onClick={() => void handleEnrollZeroDevPasskey()}
              disabled={enrollingPasskey || passkeyEnrolled}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                passkeyEnrolled
                  ? 'border border-emerald-800/80 bg-emerald-950/40 text-emerald-300 cursor-default'
                  : 'bg-onion-700 text-white hover:bg-onion-600 disabled:opacity-50'
              }`}
            >
              {enrollingPasskey ? (
                <span className="flex items-center gap-1.5">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Registering passkey…
                </span>
              ) : passkeyEnrolled ? (
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> Hardware Passkey Enrolled
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Fingerprint className="h-3.5 w-3.5" /> Enroll Hardware Passkey
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <p className="text-[11px] leading-5 text-slate-500">
        This onboarding session expires automatically. Keep your merchant email and passkey device
        secure.
      </p>
    </div>
  )
}

function AddressRow({
  label,
  badge,
  value,
  loading,
  onCopy,
  copied,
}: {
  label: string
  badge?: string
  value: string
  loading?: boolean
  onCopy?: () => void
  copied?: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        {badge && (
          <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-onion-300 border border-slate-800">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 break-all font-mono text-xs text-slate-100">
          {loading && <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin text-onion-300" />}
          <span>{value}</span>
        </p>
        {onCopy && !loading && (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-[10px] font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        )}
      </div>
    </div>
  )
}

function MessagePanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-4">
      <h1 className="font-semibold text-amber-100">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-amber-100/75">{message}</p>
    </div>
  )
}