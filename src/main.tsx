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
const web3AuthConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId: clientId || '',
    web3AuthNetwork: isMainnet
      ? WEB3AUTH_NETWORK.SAPPHIRE_MAINNET
      : WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
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
