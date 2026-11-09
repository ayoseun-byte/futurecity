import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react'
import { useWeb3Auth, useWeb3AuthConnect } from '@web3auth/modal/react'
import type { Web3Auth } from '@web3auth/modal'
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

/* ── B2B payment contracts (Laravel PublicPaymentController) ─────────── */

interface B2bCustomerField {
  key: string
  label?: string
  required?: boolean
  type?: string
}

interface B2bShow {
  id: string
  type: string
  merchantName?: string
  description?: string | null
  amount: string
  currency: string
  status: string
  salesLimit?: { by: string; max: number; minItemsPerPurchase?: number | null } | null
  sales?: { transactions: number; items: number; remaining?: number | null } | null
  customerFields?: B2bCustomerField[]
  expiresAt?: string | null
  redirectUrl?: string | null
}

interface B2bAsset {
  network: string
  networkName: string
  chainId: number
  token: string
  address: string
  decimals: number
  merchantWallet: string
  splitter: string
  assignedPsp: string
}

interface B2bQuote {
  quoteId: string
  paymentId: string
  network: string
  token: string
  chainId: number
  decimals: number
  quantity: number
  unitAmount: string
  sourceAmount: string
  sourceCurrency: string
  targetAmount: string
  rate?: string
  expiresAt: string
}

interface EvmTx {
  from: string
  to: string
  data: string
  value: string
  chainId: number
}

interface B2bApproval {
  network: string
  chainId: number
  spender: string
  needsApproval: boolean
  currentAllowance?: string | null
  approveTx?: EvmTx | null
}

interface B2bPrepare {
  prepareId: string
  paymentRef: string
  paymentTx: EvmTx
  preflightVerified?: boolean
  amountRaw?: string
}

interface B2bAttempt {
  attemptId: string
  paymentId: string
  status: string
  network: string
  txHash?: string | null
  explorerUrl?: string | null
  confirmedAt?: string | null
  paymentStatus?: string
  redirectUrl?: string | null
}

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>
}

type B2bStage = 'idle' | 'approving' | 'sending' | 'confirming' | 'confirmed' | 'failed'

/** Wallet add-chain parameters for the supported EVM settlement networks. */
const EVM_NETWORK_META: Record<number, {
  chainId: string
  chainName: string
  rpcUrls: string[]
  blockExplorerUrls: string[]
  nativeCurrency: { name: string; symbol: string; decimals: number }
}> = {
  84532: {
    chainId: '0x14a34',
    chainName: 'Base Sepolia',
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org'],
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  },
  8453: {
    chainId: '0x2105',
    chainName: 'Base',
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  },
}

const getInjectedProvider = (): Eip1193 | undefined =>
  typeof window !== 'undefined'
    ? (window as unknown as { ethereum?: Eip1193 }).ethereum
    : undefined

const errorText = (reason: unknown): string => {
  const typed = reason as { code?: number; message?: string; data?: { message?: string } }
  const text = typed?.message || typed?.data?.message || ''
  return text
}

const walletRejectionMessage = (reason: unknown, fallback: string): string => {
  const typed = reason as { code?: number }
  const text = errorText(reason)
  if (typed?.code === 4001 || typed?.code === 4011 || /reject|denied|declined/i.test(text)) {
    return 'The transaction was rejected in your wallet.'
  }
  return text || fallback
}

const formatUnits = (value: string | number, decimals = 2): string =>
  Number(value).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

const truncateAddress = (address: string): string =>
  address.length <= 12 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`

export const CustomerCheckoutView: React.FC = () => {
  const { slug = '', paymentId = '' } = useParams<{ slug?: string; paymentId?: string }>()
  const targetIdentifier = paymentId || slug
  const isB2bPayment = targetIdentifier.startsWith('pay_') || Boolean(paymentId)
  const config = getApiConfig()

  /* Web3Auth fallback when no browser wallet extension is injected. */
  const { web3Auth, isConnected } = useWeb3Auth() as unknown as {
    web3Auth: Web3Auth | null
    isConnected?: boolean
  }
  const { connect: connectWeb3Auth } = useWeb3AuthConnect()

  /* ── Legacy hosted-checkout state (unchanged flow) ── */
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

  /* ── B2B state ── */
  const [b2bShow, setB2bShow] = useState<B2bShow | null>(null)
  const [assets, setAssets] = useState<B2bAsset[]>([])
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [selectedToken, setSelectedToken] = useState<string | null>(null)
  const [quote, setQuote] = useState<B2bQuote | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [customerData, setCustomerData] = useState<Record<string, string>>({})
  const [walletProvider, setWalletProvider] = useState<Eip1193 | null>(null)
  const [walletKind, setWalletKind] = useState<'injected' | 'web3auth' | null>(null)
  const [walletAddress, setWalletAddress] = useState('')
  const [stage, setStage] = useState<B2bStage>('idle')
  const [stageMessage, setStageMessage] = useState('')
  const [attempt, setAttempt] = useState<B2bAttempt | null>(null)
  const [gatewayRefreshing, setGatewayRefreshing] = useState(false)

  const busyRef = useRef(false)
  const setExecutingBusy = (value: boolean) => {
    busyRef.current = value
    setBusy(value)
  }

  const customerFields = isB2bPayment ? b2bShow?.customerFields ?? [] : []

  const selectedAsset = useMemo(
    () => assets.find((a) => a.network === selectedNetwork && a.token === selectedToken) ?? null,
    [assets, selectedNetwork, selectedToken],
  )

  const networks = useMemo(() => {
    const seen: Array<{ network: string; networkName: string; chainId: number }> = []
    for (const asset of assets) {
      if (!seen.some((s) => s.network === asset.network)) {
        seen.push({ network: asset.network, networkName: asset.networkName, chainId: asset.chainId })
      }
    }
    return seen
  }, [assets])

  const tokensForNetwork = useMemo(
    () => (selectedNetwork ? assets.filter((a) => a.network === selectedNetwork).map((a) => a.token) : []),
    [assets, selectedNetwork],
  )

  /** Non-payable states rendered as full-page gates. */
  const b2bGate = useMemo(() => {
    if (!isB2bPayment || !b2bShow) return null
    const status = (b2bShow.status || '').toLowerCase()
    const expired = b2bShow.expiresAt ? new Date(b2bShow.expiresAt).getTime() <= Date.now() : false
    if (status === 'canceled') return { title: 'Payment canceled', message: 'This payment was canceled or suspended by the payment provider. Checkout has been disabled.' }
    if (status === 'inactive') return { title: 'Payment paused', message: 'This payment is currently paused by the payment provider. Checkout has been disabled.' }
    if (status === 'sold_out' || b2bShow.sales?.remaining === 0) return { title: 'Payment sold out', message: 'This payment has reached its sales limit and is no longer accepting purchases.' }
    if (status === 'expired' || (status === 'pending' && expired)) return { title: 'Payment expired', message: 'This payment link has expired. Please request a fresh payment link from the merchant.' }
    if (status === 'paid') return { title: 'Payment complete', message: 'This payment has already been paid and settled.' }
    if (status === 'processing') return { title: 'Payment in progress', message: 'A payment for this link is currently being processed. If it was made from this device, it will confirm shortly.' }
    return null
  }, [isB2bPayment, b2bShow])

  const b2bTerminal = isB2bPayment && (stage === 'confirmed' || stage === 'failed')

  /* ── Loaders ── */

  useEffect(() => {
    let active = true
    if (!targetIdentifier) return

    if (isB2bPayment) {
      setGatewayRefreshing(true)
      Promise.all([
        requestApi<B2bShow>(config, 'GET', `/api/v1/pay/${encodeURIComponent(targetIdentifier)}`),
        requestApi<{ assets: B2bAsset[]; swapsAvailable?: boolean }>(config, 'GET', `/api/v1/pay/${encodeURIComponent(targetIdentifier)}/assets`).catch(() => null),
      ])
        .then(([show, assetsResult]) => {
          if (!active) return
          setB2bShow(show)
          setError(null)
          const available = assetsResult?.assets ?? []
          setAssets(available)
          const preferredNetwork = available[0]?.network ?? null
          setSelectedNetwork(preferredNetwork)
          const preferredToken =
            available.find((a) => a.network === preferredNetwork && a.token === show.currency?.toLowerCase())?.token
            ?? available.find((a) => a.network === preferredNetwork)?.token
            ?? null
          setSelectedToken(preferredToken)
          const minItems = show.salesLimit?.by === 'items' ? show.salesLimit.minItemsPerPurchase ?? 1 : 1
          setQuantity(Math.max(1, minItems))
        })
        .catch((reason) => {
          if (active) {
            setError(reason instanceof Error ? reason.message : 'This payment could not be loaded.')
            setB2bShow(null)
          }
        })
        .finally(() => {
          if (active) {
            setGatewayRefreshing(false)
            setLoadedSlug(targetIdentifier)
          }
        })
    } else {
      requestApi<CheckoutPaylink>(config, 'GET', `/api/v1/checkout/paylinks/${encodeURIComponent(targetIdentifier)}`)
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
        .finally(() => { if (active) setLoadedSlug(targetIdentifier) })
    }

    return () => { active = false }
  }, [targetIdentifier, isB2bPayment])

  /* ── Legacy session polling (unchanged flow) ── */

  useEffect(() => {
    if (isB2bPayment || !session) return
    let active = true
    const countdown = window.setInterval(() => setSecondsRemaining((remaining) => Math.max(0, remaining - 1)), 1000)
    const refreshStatus = async () => {
      try {
        const status = await requestApi<CheckoutSessionStatus>(
          config,
          'GET',
          `/api/v1/checkout/sessions/${encodeURIComponent(session.sessionId)}/status`
        )
        if (!active) return
        const normalizedStatus = (status.status || '').toLowerCase()
        if (normalizedStatus === 'settled') {
          setSessionStatus('settled')
          setTxHash(status.tx_hash || '')
        } else if (normalizedStatus === 'expired') {
          setSessionStatus('expired')
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not refresh checkout status.')
      }
    }
    void refreshStatus()
    const timer = window.setInterval(() => { void refreshStatus() }, 5000)
    return () => { active = false; window.clearInterval(timer); window.clearInterval(countdown) }
  }, [session, isB2bPayment])

  /* ── B2B: keep the payment context fresh while the buyer waits ── */

  useEffect(() => {
    if (!isB2bPayment || b2bGate || !b2bShow) return
    if (['confirmed', 'failed'].includes(stage)) return
    let active = true
    const poll = async () => {
      try {
        const show = await requestApi<B2bShow>(config, 'GET', `/api/v1/pay/${encodeURIComponent(targetIdentifier)}`)
        if (!active) return
        setB2bShow(show)
      } catch {
        /* transient — the next tick retries */
      }
    }
    const timer = window.setInterval(() => { void poll() }, 10000)
    return () => { active = false; window.clearInterval(timer) }
  }, [isB2bPayment, b2bGate, b2bShow, stage])

  /* ── B2B: quote countdown ── */

  useEffect(() => {
    if (!isB2bPayment || !quote) return
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(quote.expiresAt).getTime() - Date.now()) / 1000))
      setSecondsRemaining(remaining)
    }
    tick()
    const countdown = window.setInterval(tick, 1000)
    return () => { window.clearInterval(countdown) }
  }, [isB2bPayment, quote])

  const requestQuote = async (options?: { silent?: boolean }): Promise<B2bQuote | null> => {
    const asset = selectedAsset
    const show = b2bShow
    if (!asset || !show || b2bGate) return null
    if (!options?.silent) {
      setBusy(true)
      setError(null)
    }
    try {
      const result = await requestApi<B2bQuote>(
        config,
        'POST',
        `/api/v1/pay/${encodeURIComponent(show.id)}/quote`,
        {
          network: asset.network,
          token: asset.token,
          quantity: Math.max(1, quantity),
        },
      )
      setQuote(result)
      setError(null)
      return result
    } catch (reason) {
      setQuote(null)
      if (!options?.silent) {
        setError(reason instanceof Error ? reason.message : 'Could not create a payment quote.')
      }
      return null
    } finally {
      if (!options?.silent) setBusy(false)
    }
  }

  /* Auto-quote whenever the selection changes (and recover after a reset). */
  useEffect(() => {
    if (!isB2bPayment || b2bGate || stage !== 'idle' || !selectedAsset || gatewayRefreshing) return
    void requestQuote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isB2bPayment, selectedAsset?.network, selectedAsset?.token, quantity, stage])

  /* ── Wallet connection ── */

  const waitForWeb3AuthProvider = async (): Promise<Eip1193> => {
    const deadline = Date.now() + 12000
    let provider = (web3Auth?.provider ?? null) as Eip1193 | null
    while (!provider) {
      if (Date.now() > deadline) throw new Error('Wallet provider could not be initialised. Please retry.')
      await new Promise((resolve) => setTimeout(resolve, 250))
      provider = (web3Auth?.provider ?? null) as Eip1193 | null
    }
    return provider
  }

  const connectWallet = async () => {
    if (busyRef.current) return
    setBusy(true)
    setError(null)
    try {
      const injected = getInjectedProvider()
      if (injected) {
        const accounts = await injected.request({ method: 'eth_requestAccounts' }) as string[]
        if (!Array.isArray(accounts) || !accounts.length) throw new Error('No wallet account was authorized.')
        setWalletProvider(injected)
        setWalletKind('injected')
        setWalletAddress((accounts[0] || '').toLowerCase())
        return
      }
      if (!web3Auth) throw new Error('No EVM wallet available in this browser.')
      if (!(isConnected ?? (web3Auth.status as string) === 'connected')) {
        await connectWeb3Auth()
      }
      const provider = await waitForWeb3AuthProvider()
      const accounts = await provider.request({ method: 'eth_requestAccounts', params: [] }) as string[]
      if (!Array.isArray(accounts) || !accounts.length) throw new Error('No wallet account was authorized.')
      setWalletProvider(provider)
      setWalletKind('web3auth')
      setWalletAddress((accounts[0] || '').toLowerCase())
    } catch (reason) {
      setError(walletRejectionMessage(reason, 'Wallet connection failed. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  const ensureEvmChain = async (assetChainId: number) => {
    if (!walletProvider) throw new Error('Connect a wallet first.')
    const wanted = `0x${assetChainId.toString(16)}`
    try {
      const current = await walletProvider.request({ method: 'eth_chainId' }) as string
      if (typeof current === 'string' && current.toLowerCase() === wanted.toLowerCase()) return
    } catch {
      /* wallets without eth_chainId surface the error at send time */
    }
    try {
      await walletProvider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: wanted }] })
    } catch (reason) {
      const typed = reason as { code?: number }
      const text = errorText(reason)
      if (typed?.code === 4902 || typed?.code === -32603 || /unrecognized|not been added|switched to a network/i.test(text)) {
        const meta = EVM_NETWORK_META[assetChainId]
        if (!meta) throw new Error(`Please switch your wallet to chain ${assetChainId} and retry.`)
        await walletProvider.request({ method: 'wallet_addEthereumChain', params: [meta] })
      } else {
        throw reason
      }
    }
  }

  const sendTransaction = async (transaction: EvmTx): Promise<string> => {
    if (!walletProvider) throw new Error('Connect a wallet first.')
    await ensureEvmChain(transaction.chainId)
    const params = [{
      from: walletAddress,
      to: transaction.to,
      data: transaction.data,
      value: transaction.value,
    }]
    try {
      const hash = await walletProvider.request({ method: 'eth_sendTransaction', params }) as string
      if (typeof hash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
        throw new Error('The wallet returned an invalid transaction hash.')
      }
      return hash.toLowerCase()
    } catch (reason) {
      throw new Error(walletRejectionMessage(reason, 'The transaction could not be sent from your wallet.'))
    }
  }

  /* ── B2B payment execution: approve → prepare → send → submit ── */

  const buildSelection = (activeQuote: B2bQuote): Record<string, unknown> | null => {
    const asset = selectedAsset
    if (!asset) return null
    const payload: Record<string, unknown> = {
      network: asset.network,
      token: asset.token,
      payerAddress: walletAddress,
      quoteId: activeQuote.quoteId,
      quantity: Math.max(1, quantity),
    }
    if (customerFields.length) payload.customerData = customerData
    return payload
  }

  const confirmCustomerFields = (): string | null => {
    for (const field of customerFields) {
      const value = (customerData[field.key] ?? '').trim()
      if (field.required && !value) return `Please complete the "${field.label || field.key}" field.`
      if (value && field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return `Please provide a valid email for "${field.label || field.key}".`
      }
    }
    return null
  }

  const executePayment = async () => {
    if (!quote || !walletProvider || !walletAddress) return
    setExecutingBusy(true)
    setError(null)
    setStageMessage('')
    try {
      const validationError = confirmCustomerFields()
      if (validationError) throw new Error(validationError)

      let activeQuote = quote

      /** The backend caches quotes briefly; refresh once automatically when stale. */
      const withFreshQuote = async <T,>(operation: (payload: Record<string, unknown>) => Promise<T>): Promise<T> => {
        const payload = buildSelection(activeQuote)
        if (!payload) throw new Error('Select a payment asset first.')
        try {
          return await operation(payload)
        } catch (reason) {
          const message = reason instanceof Error ? reason.message : ''
          if (!/quote/i.test(message)) throw reason
          const refreshed = await requestQuote({ silent: true })
          if (!refreshed) throw reason
          activeQuote = refreshed
          const retryPayload = buildSelection(activeQuote)
          if (!retryPayload) throw reason
          return await operation(retryPayload)
        }
      }

      /* 1. Token allowance / approval (skipped for native ETH). */
      setStage('approving')
      setStageMessage('Checking the token allowance…')
      const approval = await withFreshQuote((payload) =>
        requestApi<B2bApproval>(config, 'POST', `/api/v1/pay/${encodeURIComponent(targetIdentifier)}/approve`, payload))
      if (approval.needsApproval && approval.approveTx) {
        setStageMessage('Confirm the token approval transaction in your wallet…')
        await sendTransaction(approval.approveTx)
        setStageMessage('Approval sent — preparing the payment…')
      }

      /* 2. Prepare the splitter payment calldata (server validated + persisted attempt). */
      setStageMessage('Preparing the payment…')
      const prepare = await withFreshQuote((payload) =>
        requestApi<B2bPrepare>(config, 'POST', `/api/v1/pay/${encodeURIComponent(targetIdentifier)}/pay`, payload))

      /* 3. Dispatch processSplitPayment from the buyer's wallet. */
      setStage('sending')
      setStageMessage('Confirm the payment transaction in your wallet…')
      const paymentHash = await sendTransaction(prepare.paymentTx)

      /* 4. Submit the hash — never proof of settlement; queues verification. */
      setStageMessage('Submitting the transaction for verification…')
      const submitted = await requestApi<B2bAttempt>(
        config,
        'POST',
        `/api/v1/pay/${encodeURIComponent(targetIdentifier)}/submit`,
        { prepareId: prepare.prepareId, txHash: paymentHash },
      )
      setAttempt(submitted)
      setStage('confirming')
      setStageMessage('Confirming settlement on-chain. Please keep this page open…')
    } catch (reason) {
      setStage('idle')
      setStageMessage('')
      setError(reason instanceof Error ? reason.message : 'The payment could not be completed.')
    } finally {
      setExecutingBusy(false)
    }
  }

  /* ── B2B: poll the submitted attempt until the settlement is verified ── */

  useEffect(() => {
    if (stage !== 'confirming' || !attempt) return
    let active = true
    const poll = async () => {
      try {
        const result = await requestApi<B2bAttempt>(
          config,
          'GET',
          `/api/v1/pay/${encodeURIComponent(targetIdentifier)}/attempts/${encodeURIComponent(attempt.attemptId)}/status`,
        )
        if (!active) return
        if (result.status === 'confirmed' || result.paymentStatus === 'paid') {
          setAttempt(result)
          setStage('confirmed')
          setStageMessage('')
          setQuote(null)
        } else if (result.status === 'failed') {
          setAttempt(result)
          setStage('failed')
          setStageMessage('The transaction could not be verified as this payment. You can generate a new quote and retry.')
        } else if ((result.paymentStatus || '').toLowerCase() === 'canceled') {
          setStage('failed')
          setStageMessage('This payment was canceled while the transaction was being verified.')
        } else {
          setAttempt(result)
        }
      } catch {
        /* transient — the next tick retries */
      }
    }
    void poll()
    const timer = window.setInterval(() => { void poll() }, 4000)
    return () => { active = false; window.clearInterval(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, attempt?.attemptId])

  const resetPayment = async () => {
    setAttempt(null)
    setStage('idle')
    setStageMessage('')
    setError(null)
    setQuote(null)
    await requestQuote()
  }

  const timerLabel = `${Math.floor(secondsRemaining / 60).toString().padStart(2, '0')}:${(secondsRemaining % 60).toString().padStart(2, '0')}`

  /* ── Render ── */

  const loading = loadedSlug !== targetIdentifier
  if (loading) return <div className="mx-auto max-w-xl py-12 text-center text-sm text-slate-500">Loading checkout…</div>
  if (error && !paylink && !b2bShow) return <div role="alert" className="mx-auto max-w-xl py-12 text-center text-sm text-red-700">{error}</div>
  if (!isB2bPayment && (!paylink || paylink.status !== 'active')) {
    return <div className="mx-auto max-w-xl py-12 text-center text-sm text-slate-500">This payment link is unavailable.</div>
  }

  /* ── B2B gate screens (paused / canceled / expired / sold out / processing) ── */
  if (isB2bPayment && b2bShow && b2bGate) {
    const isCompletedGate = b2bShow.status.toLowerCase() === 'processing'
    return (
      <div className="mx-auto max-w-xl py-6">
        <div className="overflow-hidden rounded-3xl border border-onion-200 bg-white shadow-xl">
          <header className={`flex items-center justify-between border-b p-6 text-white ${isCompletedGate ? 'border-onion-700 bg-onion' : 'bg-rose-700'}`}>
            <div className="flex items-center gap-3">
              {isCompletedGate ? <Clock className="h-6 w-6" /> : <Ban className="h-6 w-6" />}
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-white/70">Orki Checkout</span>
                <h1 className="mt-1 text-lg font-extrabold">{b2bGate.title}</h1>
              </div>
            </div>
          </header>
          <div className="space-y-4 p-6">
            <div role="status" className={`rounded-xl border p-4 ${isCompletedGate ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>
              <p className="font-bold">{b2bGate.message}</p>
              {b2bShow.description && <p className="mt-2 text-xs opacity-80">{b2bShow.description}</p>}
            </div>
            <p className="flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck size={14} /> Checkout is protected by the Orki non-custodial splitter contract on Base.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isB2bPayment && !b2bShow) {
    return <div className="mx-auto max-w-xl py-12 text-center text-sm text-slate-500">{error || 'This payment could not be found.'}</div>
  }

  /* ── B2B receipt (confirmed) ── */
  if (isB2bPayment && b2bTerminal && b2bShow) {
    const confirmed = stage === 'confirmed'
    return (
      <div className="mx-auto max-w-xl py-6">
        <div className="overflow-hidden rounded-3xl border border-onion-200 bg-white shadow-xl">
          <header className="flex items-center justify-between border-b border-onion-700 bg-onion p-6 text-white">
            <div className="flex items-center gap-3">
              {confirmed ? <ShieldCheck className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-onion-200">Orki Checkout</span>
                <h1 className="mt-1 text-xl font-extrabold">{confirmed ? 'Payment confirmed' : 'Payment needs attention'}</h1>
                <p className="mt-1 text-xs text-onion-200">{b2bShow.merchantName || 'Merchant'}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="block text-2xl font-black">{formatUnits(b2bShow.amount)} {b2bShow.currency.toUpperCase()}</span>
            </div>
          </header>
          <div className="space-y-4 p-6">
            <div role="status" className={`rounded-xl border p-4 ${confirmed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
              <p className="font-bold">{confirmed ? 'Settlement verified on-chain and split atomically.' : stageMessage || 'The payment could not be verified.'}</p>
            </div>
            {attempt?.txHash && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Transaction</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all font-mono text-[11px] text-slate-700">{attempt.txHash}</code>
                  {attempt.explorerUrl && (
                    <a href={attempt.explorerUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900">
                      Explorer <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            )}
            {confirmed && b2bShow.redirectUrl && (
              <a
                href={b2bShow.redirectUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-onion px-4 py-3 text-sm font-extrabold text-white hover:bg-onion-700"
              >
                Continue <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {!confirmed && (
              <button
                type="button"
                onClick={() => { void resetPayment() }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" /> Start a new payment
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ── Legacy hosted-checkout view ── */
  if (!isB2bPayment) {
    const amount = Number(paylink?.amountType === 'fixed' ? paylink.amount : openAmount)
    const currency = paylink?.currency || 'USDC'
    const allowedChains = paylink?.allowedChains || []
    const createSession = async (event: React.FormEvent) => {
      event.preventDefault()
      if (!paylink || !Number.isFinite(amount) || amount <= 0) return
      setBusy(true)
      setError(null)
      try {
        const result = await requestApi<CheckoutSession>(config, 'POST', '/api/v1/checkout/sessions', {
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

    return (
      <div className="mx-auto max-w-xl py-6">
        <div className="overflow-hidden rounded-3xl border border-onion-200 bg-white shadow-xl">
          <header className="flex items-center justify-between border-b border-onion-700 bg-onion p-6 text-white">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-onion-200">Orki Checkout</span>
              <h1 className="mt-1 text-xl font-extrabold">{paylink?.title}</h1>
              <p className="mt-1 text-xs text-onion-200">{paylink?.merchantName}</p>
            </div>
            <div className="text-right">
              <span className="block text-2xl font-black">
                {paylink?.amountType === 'fixed' ? `${Number(paylink.amount).toFixed(2)} ${paylink.currency}` : 'Open amount'}
              </span>
            </div>
          </header>

          <form onSubmit={(event) => void createSession(event)} className="space-y-5 p-6 text-xs">
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{error}</p>}
            {paylink?.description && <p className="text-slate-600">{paylink.description}</p>}

            {paylink?.amountType === 'open' && (
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
                disabled={busy || allowedChains.length === 0 || paylink?.settlementMode === 'auto_offramp'}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-onion px-4 py-3.5 text-sm font-extrabold text-white hover:bg-onion-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>{busy ? 'Creating payment session…' : 'Get deposit instructions'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {paylink?.settlementMode === 'auto_offramp' && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">Automatic fiat payout is not configured for this merchant, so checkout is unavailable.</p>
            )}
          </form>
        </div>
      </div>
    )
  }

  /* ── B2B live checkout ── */
  const show = b2bShow
  const isReusable = show?.type === 'reusable'
  const executing = stage === 'approving' || stage === 'sending' || stage === 'confirming'
  const selectionComplete = Boolean(selectedAsset)

  return (
    <div className="mx-auto max-w-xl py-6">
      <div className="overflow-hidden rounded-3xl border border-onion-200 bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-onion-700 bg-onion p-6 text-white">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-onion-200">Orki Checkout</span>
            <h1 className="mt-1 text-xl font-extrabold">{show?.description || `Payment ${show?.id}`}</h1>
            <p className="mt-1 text-xs text-onion-200">{show?.merchantName || 'Merchant'}</p>
          </div>
          <div className="text-right">
            <span className="block text-2xl font-black">{formatUnits(show?.amount ?? '0')} {(show?.currency || '').toUpperCase()}</span>
          </div>
        </header>

        <form onSubmit={(event) => { event.preventDefault(); if (stage === 'idle') { void executePayment() } }} className="space-y-5 p-6 text-xs">
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{error}</p>}

          {isReusable && (show?.salesLimit?.by) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-600">
              <p className="font-bold text-slate-700">
                {show?.salesLimit.by === 'items' ? 'Item-based payment' : 'Transaction-based payment'}:
                {show?.salesLimit.max ? ` limit ${show?.salesLimit.max} ${show?.salesLimit.by === 'items' ? 'items' : 'purchases'}` : ' unlimited'}
                {show?.sales?.remaining != null && ` · ${show?.sales.remaining} remaining`}
              </p>
            </div>
          )}

          {/* Customer data fields configured on the payment */}
          {customerFields.length > 0 && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-bold text-slate-700">Your details</p>
              {customerFields.map((field) => (
                <label key={field.key} className="block">
                  <span className="text-[11px] font-semibold text-slate-600">{field.label || field.key}{field.required ? ' *' : ''}</span>
                  <input
                    type={field.type === 'email' ? 'email' : 'text'}
                    required={Boolean(field.required)}
                    value={customerData[field.key] ?? ''}
                    disabled={executing}
                    onChange={(event) => setCustomerData((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </label>
              ))}
            </div>
          )}

          {/* Quantity for reusable item-limited payments */}
          {isReusable && show?.salesLimit?.by === 'items' && (
            <label className="block font-bold text-slate-700">
              Quantity
              <input
                type="number"
                min={Math.max(1, show.salesLimit.minItemsPerPurchase ?? 1)}
                max={show.sales?.remaining ?? undefined}
                value={quantity}
                disabled={executing}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  if (Number.isFinite(value) && value >= 1) setQuantity(Math.floor(value))
                }}
                className="mt-1 w-32 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </label>
          )}

          {/* Network + token selection from the merchant's on-chain allowlist */}
          <div>
            <p className="mb-2 font-bold text-slate-700">Payment method</p>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(1, networks.length)}, minmax(0, 1fr))` }}>
              {networks.map((network) => {
                const disabled = executing
                return (
                  <button
                    key={network.network}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (executing) return
                      setSelectedNetwork(network.network)
                      const token = assets.find((a) => a.network === network.network && a.token === show?.currency?.toLowerCase())?.token
                        ?? assets.find((a) => a.network === network.network)?.token
                        ?? null
                      setSelectedToken(token)
                    }}
                    aria-pressed={selectedNetwork === network.network}
                    className={`rounded-xl border p-3 text-left font-bold ${selectedNetwork === network.network ? 'border-onion bg-onion-50 text-onion-950' : 'border-slate-200 text-slate-600'}`}
                  >
                    {network.networkName}
                  </button>
                )
              })}
              {networks.length === 0 && !gatewayRefreshing && (
                <div className="col-span-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  The merchant has no payment-compatible networks configured for this payment yet.
                </div>
              )}
            </div>
            {tokensForNetwork.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tokensForNetwork.map((token) => (
                  <button
                    key={token}
                    type="button"
                    disabled={executing}
                    onClick={() => { if (!executing) setSelectedToken(token) }}
                    aria-pressed={selectedToken === token}
                    className={`rounded-lg border px-3 py-1.5 font-bold uppercase ${selectedToken === token ? 'border-onion bg-onion-50 text-onion-950' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    {token}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live quote summary */}
          {quote && selectedAsset && (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between font-semibold text-slate-700">
                <span className="flex items-center gap-2"><Clock className="h-4 w-4" />Quote expires in</span>
                <span className={`font-mono ${secondsRemaining <= 10 ? 'text-rose-600' : ''}`}>{timerLabel}</span>
              </div>
              <p className="text-slate-700">
                You will pay <strong>{formatUnits(quote.targetAmount, Math.min(quote.decimals, 6))} {quote.token.toUpperCase()}</strong> on <strong>{selectedAsset.networkName}</strong>
                {` for ${formatUnits(quote.sourceAmount)} ${quote.sourceCurrency.toUpperCase()}`}
                {quantity > 1 ? ` (${quantity} items)` : ''}.
              </p>
              {quote.rate && Number(quote.rate) > 0 && quote.sourceCurrency !== quote.token && (
                <p className="text-[11px] text-slate-500">Exchange rate: 1 {quote.sourceCurrency.toUpperCase()} ≈ {Number(quote.rate).toFixed(6)} {quote.token.toUpperCase()}. Includes the protocol and PSP fees absorbed into this gross amount.</p>
              )}
            </div>
          )}

          {/* Wallet */}
          {walletAddress ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-slate-700">
                <Wallet size={15} />
                <span className="font-mono text-[11px] font-bold">{truncateAddress(walletAddress)}</span>
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">{walletKind}</span>
              </div>
              <button
                type="button"
                disabled={executing}
                onClick={() => { setWalletProvider(null); setWalletAddress(''); setWalletKind(null) }}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-50"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { void connectWallet() }}
              disabled={!selectionComplete}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wallet className="h-4 w-4" /> {walletKind === 'web3auth' ? 'Opening wallet login…' : 'Connect wallet'}
            </button>
          )}

          {/* Stage banner */}
          {executing && (
            <div role="status" className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-900">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{stageMessage || 'Processing…'}</span>
            </div>
          )}

          {/* Primary CTA */}
          {quote && walletAddress && stage === 'idle' && selectedAsset && (
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-onion px-4 py-3.5 text-sm font-extrabold text-white hover:bg-onion-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>{busy ? 'Submitting…' : `Pay ${formatUnits(quote.targetAmount, Math.min(quote.decimals, 6))} ${quote.token.toUpperCase()}`}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {(stage === 'failed') && (
            <button
              type="button"
              onClick={() => { void resetPayment() }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" /> Retry with a fresh quote
            </button>
          )}

          <p className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck size={14} /> Funds move directly from your wallet through the non-custodial splitter contract: merchant net, PSP markup and Orki protocol fees settle atomically in the same transaction.
          </p>
        </form>
      </div>
    </div>
  )
}
