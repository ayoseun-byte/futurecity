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
const isMainnet = import.meta.env.VITE_WEB3AUTH_NETWORK === 'sapphire_mainnet'
const isSepolia = import.meta.env.VITE_BASE_CHAIN_ID === '84532'

const baseChainConfig = {
  chainNamespace: 'eip155' as const,
  chainId: isSepolia || !isMainnet ? '0x14a34' : '0x2105', // 84532 (Base Sepolia) or 8453 (Base)
  rpcTarget: isSepolia || !isMainnet ? 'https://sepolia.base.org' : 'https://mainnet.base.org',
  displayName: isSepolia || !isMainnet ? 'Base Sepolia' : 'Base',
  blockExplorerUrl: isSepolia || !isMainnet ? 'https://sepolia.basescan.org/' : 'https://basescan.org/',
  ticker: 'ETH',
  tickerName: 'Ethereum',
  logo: 'https://images.toruswallet.io/base.svg',
  decimals: 18,
  isTestnet: isSepolia || !isMainnet,
}

const solanaChainConfig = {
  chainNamespace: 'solana' as const,
  chainId: isMainnet ? '0x1' : '0x67', // 0x1 Mainnet or 0x67 Devnet
  rpcTarget: isMainnet ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com',
  displayName: isMainnet ? 'Solana' : 'Solana Devnet',
  blockExplorerUrl: isMainnet
    ? 'https://explorer.solana.com'
    : 'https://explorer.solana.com?cluster=devnet',
  ticker: 'SOL',
  tickerName: 'Solana',
  logo: 'https://images.toruswallet.io/sol.svg',
  decimals: 9,
  isTestnet: !isMainnet,
}

const web3AuthConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId: clientId || '',
    web3AuthNetwork: isMainnet
      ? WEB3AUTH_NETWORK.SAPPHIRE_MAINNET
      : WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    defaultChainId: baseChainConfig.chainId,
    chains: [baseChainConfig, solanaChainConfig] as unknown as Web3AuthContextConfig['web3AuthOptions']['chains'],
  },
}
const queryClient = new QueryClient()

function Root() {
  const app = <App />
  if (!clientId) return app

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
