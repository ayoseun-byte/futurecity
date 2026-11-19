import React from 'react'
import { CheckoutContextProvider } from '../../checkout/context'
import PaymentFlow from '../../checkout/components/PaymentFlow/PaymentFlow'

/**
 * Unified public buyer checkout page rendered via PaymentFlow
 * (Reown AppKit + EVM & Solana + swaps + widget postMessage).
 */
export const PublicCheckoutPage: React.FC<{ mode?: 'b2b' | 'auto' }> = () => {
  return (
    <div
      className="min-h-screen bg-white text-slate-900 antialiased"
      style={
        {
          '--background': '#ffffff',
          '--foreground': '#171717',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        } as React.CSSProperties
      }
    >
      <CheckoutContextProvider>
        <PaymentFlow />
      </CheckoutContextProvider>
    </div>
  )
}

export default PublicCheckoutPage
