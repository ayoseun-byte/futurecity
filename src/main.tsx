import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WEB3AUTH_NETWORK } from '@web3auth/modal'
import { Web3AuthProvider, type Web3AuthContextConfig } from '@web3auth/modal/react'
import { SolanaProvider } from '@web3auth/modal/react/solana'
import { WagmiProvider } from '@web3auth/modal/react/wagmi'
import './index.css'
import App from './App.tsx'

const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID
// vite.config.ts fails the build without a client ID; this runtime guard keeps
// other pipelines (e.g. static deployments bypassing Vite) honest too.
if (!clientId) {
  throw new Error('VITE_WEB3AUTH_CLIENT_ID is required — set it in .env (see .env.example).')
}

const baseChainConfig = {
  chainNamespace: 'eip155' as const,
  chainId: '0x14a34', // 84532 Base Sepolia
  rpcTarget: 'https://sepolia.base.org',
  displayName: 'Base Sepolia',
  blockExplorerUrl: 'https://sepolia.basescan.org/',
  ticker: 'ETH',
  tickerName: 'Ethereum',
  logo: 'https://images.toruswallet.io/base.svg',
  decimals: 18,
  isTestnet: true,
}

const solanaChainConfig = {
  chainNamespace: 'solana' as const,
  // Web3Auth v11 Solana chain ID for Devnet.
  chainId: '0x67',
  rpcTarget: import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  displayName: 'Solana Devnet',
  blockExplorerUrl: 'https://explorer.solana.com?cluster=devnet',
  ticker: 'SOL',
  tickerName: 'Solana',
  logo: 'https://images.toruswallet.io/sol.svg',
  decimals: 9,
  isTestnet: true,
}

const web3AuthConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    defaultChainId: baseChainConfig.chainId,
    chains: [baseChainConfig, solanaChainConfig] as unknown as Web3AuthContextConfig['web3AuthOptions']['chains'],
  },
}
const queryClient = new QueryClient()

function Root() {
  const app = <App />

  return (
    <Web3AuthProvider config={web3AuthConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider>
          <SolanaProvider>{app}</SolanaProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </Web3AuthProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
