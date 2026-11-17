import React from 'react'
import { useParams } from 'react-router-dom'
import { CheckoutContextProvider } from '../../checkout/context'
import PaymentFlow from '../../checkout/components/PaymentFlow/PaymentFlow'
import { Web3AuthShell } from '../../context/Web3AuthShell'
import { CustomerCheckoutView } from './CustomerCheckoutView'

/**
 * Unified public buyer checkout page:
 * - B2B charges (`chg_...`), payment links (`pay_...`), `/pay/:paymentId`, and `/charge/:paymentId`
 *   render the ported Merchant_Public_Payment_Frontend PaymentFlow (Reown AppKit + EVM & Solana + swaps + widget postMessage).
 * - Legacy paylink slugs (e.g., `/checkout/falcon-vip-concierge`) fall back to CustomerCheckoutView inside Web3AuthShell.
 */
export const PublicCheckoutPage: React.FC<{ mode?: 'b2b' | 'auto' }> = ({ mode = 'auto' }) => {
  const params = useParams<{ paymentId?: string; slug?: string }>()
  const identifier = params.paymentId || params.slug || ''

  const useB2bFlow =
    mode === 'b2b' || identifier.startsWith('pay_') || identifier.startsWith('chg_')

  if (!useB2bFlow) {
    return (
      <Web3AuthShell>
        <CustomerCheckoutView />
      </Web3AuthShell>
    )
  }

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
