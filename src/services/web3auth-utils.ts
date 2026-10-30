import { Buffer } from 'buffer'
import { AUTH_CONNECTION, WALLET_CONNECTORS, getED25519Key } from '@web3auth/modal'
import type { Web3Auth } from '@web3auth/modal'
import type { useWeb3AuthConnect } from '@web3auth/modal/react'
import { Keypair } from '@solana/web3.js'
import {
  // Ethereum
  mainnet,
  sepolia,
  holesky,
  // Polygon
  polygon,
  polygonAmoy,
  // Optimism / OP
  optimism,
  optimismSepolia,
  // Base
  base,
  baseSepolia,
  // Arbitrum One
  arbitrum,
  arbitrumSepolia,
  arbitrumNova,
  // Avalanche
  avalanche,
  avalancheFuji,
  // BNB Smart Chain
  bsc,
  bscTestnet,
  // Monad
  monad,
  monadTestnet,
  // Linea
  linea,
  lineaSepolia,
  // Celo
  celo,
  celoSepolia,
  celoAlfajores,
  type Chain,
} from 'viem/chains'
import * as allChains from 'viem/chains'

// Vite env vars (must be prefixed with VITE_)
const AUTH_CONNECTION_ID =
  import.meta.env.VITE_WEB3AUTH_AUTH_CONNECTION_ID || 'orki-custom-jwt'
const USER_ID_FIELD = import.meta.env.VITE_WEB3AUTH_USER_ID_FIELD || 'sub'

export const supportedChains: readonly Chain[] = [
  mainnet,
  sepolia,
  holesky,
  polygon,
  polygonAmoy,
  optimism,
  optimismSepolia,
  base,
  baseSepolia,
  arbitrum,
  arbitrumSepolia,
  arbitrumNova,
  avalanche,
  avalancheFuji,
  bsc,
  bscTestnet,
  monad,
  monadTestnet,
  linea,
  lineaSepolia,
  celo,
  celoSepolia,
  celoAlfajores,
]

export function getJwtClaim(token: string, claim: string): string {
  try {
    const payload = token.split('.')[1]
    if (!payload) return ''
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const decoded = JSON.parse(atob(padded)) as Record<string, unknown>
    const value = decoded[claim]
    return typeof value === 'string' ? value : ''
  } catch {
    return ''
  }
}

export const getViemChain = (decimalChainId: number): Chain => {
  const chain = supportedChains.find((c) => c.id === decimalChainId)
  if (chain) return chain

  const dynamicChain = Object.values(allChains).find(
    (c) =>
      typeof c === 'object' &&
      c !== null &&
      'id' in c &&
      (c as Chain).id === decimalChainId,
  ) as Chain | undefined
  if (dynamicChain) return dynamicChain

  console.warn(`Chain ID ${decimalChainId} not found, defaulting to baseSepolia.`)
  return baseSepolia
}

type ConnectTo = ReturnType<typeof useWeb3AuthConnect>['connectTo']

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Ensures Web3Auth is connected.
 *
 * - Without `getWalletJwt` (default for the Vite merchant app): waits for the
 *   connection to settle and returns once connected. It never logs out or
 *   replaces a session the user created through email passwordless / modal login.
 * - With `getWalletJwt`: reproduces the custom-JWT flow from the Next.js app
 *   (verifies the connected user matches the JWT claim, reconnects if not).
 */
export const ensureWeb3AuthConnection = async (
  web3Auth: Web3Auth | null,
  connectTo: ConnectTo,
  getWalletJwt?: () => Promise<string>,
) => {
  if (!web3Auth) throw new Error('Web3Auth is not initialised')

  const waitForConnecting = async (timeoutMs: number) => {
    const deadline = Date.now() + timeoutMs
    while (web3Auth.status === 'connecting') {
      if (Date.now() > deadline) return false
      await sleep(200)
    }
    return true
  }

  // Simple mode: wait until connected
  if (!getWalletJwt) {
    const deadline = Date.now() + 10000
    // v10+/v11 can report "authorized" (connected + authorized) instead of "connected"
    while ((web3Auth.status as string) !== 'connected' && (web3Auth.status as string) !== 'authorized') {
      if (Date.now() > deadline) {
        throw new Error(`Web3Auth is not connected (status: ${web3Auth.status})`)
      }
      await sleep(250)
    }
    return
  }

  // Custom JWT mode
  const walletJwt = await getWalletJwt()
  if (!walletJwt) throw new Error('Failed to retrieve auth token')

  const userId = getJwtClaim(walletJwt, USER_ID_FIELD)
  if (!userId) throw new Error('Wallet JWT missing user claim')

  // 1. Wait out an in-flight connection; force logout if it is stuck
  if (web3Auth.status === 'connecting') {
    const recovered = await waitForConnecting(8000)
    if (!recovered) {
      try {
        await web3Auth.logout()
      } catch {
        // ignore
      }
    }
  }

  // 2. If connected, verify the user matches
  if (web3Auth.status === 'connected') {
    try {
      const userInfo = await web3Auth.getUserInfo()
      if ((userInfo as unknown as { verifierId?: string })?.verifierId === userId) {
        return
      }
    } catch {
      // verification failed
    }

    try {
      await web3Auth.logout()
    } catch {
      // ignore
    }

    const deadline = Date.now() + 5000
    while (
      (web3Auth.status as string) !== 'ready' &&
      (web3Auth.status as string) !== 'not_ready'
    ) {
      if (Date.now() > deadline) break
      await sleep(200)
    }
  }

  // 3. Prevent overlapping connect calls
  if (web3Auth.status === 'connecting') {
    const recovered = await waitForConnecting(5000)
    if (recovered && (web3Auth.status as string) === 'connected') return
  }

  // 4. Connect
  if (web3Auth.status === 'ready' || web3Auth.status === 'not_ready') {
    await connectTo(WALLET_CONNECTORS.AUTH, {
      authConnection: AUTH_CONNECTION.CUSTOM,
      authConnectionId: AUTH_CONNECTION_ID,
      idToken: walletJwt,
      loginHint: userId,
      extraLoginOptions: { userIdField: USER_ID_FIELD },
    })
  } else if ((web3Auth.status as string) === 'connected') {
    return
  } else {
    throw new Error(`Cannot connect: Web3Auth is in an invalid state (${web3Auth.status})`)
  }
}

// The provider is populated slightly after status flips to "connected", so poll for it.
type Web3AuthProvider = NonNullable<Web3Auth['provider']>

const resolveProvider = (web3Auth: Web3Auth, hookProvider?: Web3AuthProvider | null) =>
  hookProvider ||
  web3Auth.provider ||
  ((web3Auth as unknown as { connectedConnector?: { provider?: Web3AuthProvider } })
    .connectedConnector?.provider ??
    null)

const waitForProvider = async (
  web3Auth: Web3Auth,
  hookProvider?: Web3AuthProvider | null,
  timeoutMs = 10000,
) => {
  const deadline = Date.now() + timeoutMs
  let provider = resolveProvider(web3Auth, hookProvider)
  while (!provider) {
    if (Date.now() > deadline) {
      throw new Error(`Web3Auth provider missing (status: ${web3Auth.status})`)
    }
    await sleep(250)
    provider = resolveProvider(web3Auth, hookProvider)
  }
  return provider
}

export const getSolanaKeypairFromWeb3Auth = async (
  web3Auth: Web3Auth | null,
  hookProvider?: Web3AuthProvider | null,
) => {
  if (!web3Auth) throw new Error('Web3Auth is not initialised')

  const provider = await waitForProvider(web3Auth, hookProvider)

  const appKeyHex = (await provider.request({ method: 'private_key' })) as string
  if (!appKeyHex) throw new Error('Could not extract core private key from Web3Auth')

  const appKeyBuffer = Buffer.from(appKeyHex.padStart(64, '0'), 'hex')
  const ed25519Key = getED25519Key(appKeyBuffer)
  return Keypair.fromSecretKey(ed25519Key.sk)
}