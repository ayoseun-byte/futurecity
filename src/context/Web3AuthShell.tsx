import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WEB3AUTH_NETWORK } from '@web3auth/modal'
import { Web3AuthProvider, type Web3AuthContextConfig } from '@web3auth/modal/react'
import { SolanaProvider } from '@web3auth/modal/react/solana'
import { WagmiProvider } from '@web3auth/modal/react/wagmi'

const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID
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
    chains: [
      baseChainConfig,
      solanaChainConfig,
    ] as unknown as Web3AuthContextConfig['web3AuthOptions']['chains'],
  },
}

const queryClient = new QueryClient()

export const Web3AuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Web3AuthProvider config={web3AuthConfig}>
    <QueryClientProvider client={queryClient}>
      <WagmiProvider>
        <SolanaProvider>{children}</SolanaProvider>
      </WagmiProvider>
    </QueryClientProvider>
  </Web3AuthProvider>
)
