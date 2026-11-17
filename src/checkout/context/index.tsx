import { solanaWeb3JsAdapter, projectId, networks, wagmiAdapter } from '@/config'
import { createAppKit } from '@reown/appkit/react'
import { type ReactNode, useEffect, useState } from 'react'
import { WagmiProvider, type Config } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const checkoutQueryClient = new QueryClient()

let appKitInitialized = false

export function ensureCheckoutAppKit() {
  if (appKitInitialized) return
  appKitInitialized = true

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://orki.money'

  createAppKit({
    adapters: [solanaWeb3JsAdapter, wagmiAdapter],
    projectId,
    networks,
    metadata: {
      name: 'Orki Money',
      description: 'Multi-Chain Stablecoin Checkout',
      url: origin,
      icons: [`${origin}/vite.svg`],
    },
    themeMode: 'light',
    features: {
      analytics: false,
    },
    themeVariables: {
      '--w3m-accent': '#000000',
    },
  })
}

export function CheckoutContextProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(appKitInitialized)

  useEffect(() => {
    ensureCheckoutAppKit()
    setReady(true)
  }, [])

  if (!ready) {
    return null
  }

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
      <QueryClientProvider client={checkoutQueryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default CheckoutContextProvider
