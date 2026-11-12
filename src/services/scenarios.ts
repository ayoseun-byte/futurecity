import type { RailsScenario } from '../types/rails'

/**
 * The Rails Lab scenarios.
 *
 * One scenario per integration style plus the on-chain operations flows. Each
 * step names the backend endpoint it calls and the chain-service endpoints it
 * is expected to reach, which is what feeds the coverage matrix.
 */
export const railsScenarios: RailsScenario[] = [
  {
    id: 'invoicely-charge',
    title: 'Invoicely style — invoice a merchant through the PSP charge API',
    style: 'invoicely',
    roles: ['admin', 'psp'],
    summary:
      'The invoicing-platform shape: a PSP raises a charge (optionally with invoice metadata) for one of its merchants, the buyer pays the hosted checkout, and the settlement settles atomically on chain.',
    prerequisites: [
      'An approved PSP with an API credential loaded in this tab.',
      'A fee wallet on file so the PSP can be registered on chain.',
    ],
    inputs: [
      { key: 'pspId', label: 'PSP id', placeholder: 'psp_orkidemo', defaultValue: '', required: true },
      { key: 'feeWallet', label: 'PSP fee wallet (EVM)', placeholder: '0x…', defaultValue: '' },
      { key: 'merchantExternalId', label: 'Merchant external id', placeholder: 'DEMO-STORE-1', defaultValue: '', required: true },
      { key: 'amount', label: 'Amount', defaultValue: '120.50', required: true },
      { key: 'currency', label: 'Currency', defaultValue: 'USDC' },
    ],
    steps: [
      {
        id: 'psp-fee-wallet',
        title: 'Register the PSP on chain by setting its fee wallet',
        description:
          'Saving the fee wallet triggers the on-chain PSP registration. The chain-service prepares the transaction; the backend reports the prepared state.',
        action: {
          method: 'PATCH',
          path: '/api/v1/admin/psps/{pspId}',
          auth: 'admin',
          body: { feeWallet: '{feeWallet}' },
        },
        chainEndpoints: ['POST /b2b/psp/register'],
        assertions: [
          { label: 'on-chain registration attempted', path: 'onChainRegistration.status', exists: true },
          { label: 'registered on chain', path: 'onChainRegistration.status', equals: 'confirmed' },
        ],
      },
      {
        id: 'psp-onchain-status',
        title: 'Read the on-chain PSP record',
        action: {
          method: 'GET',
          path: '/api/v1/admin/psps/{pspId}/onchain',
          query: { network: 'base', wallet: '{feeWallet}' },
          auth: 'admin',
        },
        chainEndpoints: ['GET /b2b/evm/psp'],
        assertions: [
          { label: 'PSP is registered', path: 'registered', exists: true },
          { label: 'current fee bps', path: 'currentFeeBps', greaterThan: 0 },
        ],
      },
      {
        id: 'create-charge',
        title: 'Raise an invoice-backed charge',
        description: 'The invoicing shape: the charge carries invoice metadata so the PSP can reconcile it later.',
        action: {
          method: 'POST',
          path: '/api/v1/psp/charges',
          auth: 'psp',
          body: {
            merchantExternalId: '{merchantExternalId}',
            amount: '{amount}',
            currency: '{currency}',
            invoice: { number: 'INV-1001', issuedAt: '2026-01-01', dueAt: '2026-02-01' },
          },
        },
        assertions: [
          { label: 'charge token issued', path: 'chargeToken', exists: true },
          { label: 'charge status', path: 'status', exists: true },
          { label: 'checkout url built', path: 'checkoutUrl', exists: true },
        ],
      },
      {
        id: 'read-charge',
        title: 'Read the charge back',
        action: {
          method: 'GET',
          path: '/api/v1/psp/charges/{create-charge.chargeToken}',
          auth: 'psp',
        },
        assertions: [
          { label: 'same charge token', path: 'chargeToken', equals: '{create-charge.chargeToken}' },
          { label: 'invoice retained', path: 'invoice.number', equals: 'INV-1001' },
        ],
      },
      {
        id: 'buyer-pays',
        title: 'Buyer pays the invoice',
        description: 'Open the hosted checkout in the buyer tab and pay with a wallet.',
        manual: { label: 'Open the hosted checkout and pay' },
      },
      {
        id: 'charge-transactions',
        title: 'List the charge transactions',
        action: {
          method: 'GET',
          path: '/api/v1/psp/charges/{create-charge.chargeToken}/transactions',
          auth: 'psp',
        },
        assertions: [{ label: 'transactions listed', path: 'data', exists: true }],
      },
      {
        id: 'webhook-deliveries',
        title: 'Check the PSP webhooks delivered',
        action: { method: 'GET', path: '/api/v1/psp/webhooks/deliveries', auth: 'psp' },
        assertions: [{ label: 'deliveries recorded', path: 'data', exists: true }],
      },
      {
        id: 'onchain-receipt',
        title: 'Read the settlement from the chain-service',
        action: {
          method: 'GET',
          path: '/api/v1/admin/chain-service/tx-status',
          query: { tx_hash: '{create-charge.txHash}', network: 'base' },
          auth: 'admin',
        },
        chainEndpoints: ['GET /tx-status'],
        assertions: [{ label: 'chain-service answered', path: 'data', exists: true }],
      },
    ],
  },

  {
    id: 'paylink-hosted',
    title: 'Paylink style — payment link and hosted checkout',
    style: 'paylink',
    roles: ['merchant'],
    summary:
      'The merchant issues a payment link, shares it, and the buyer pays it through the hosted checkout page.',
    prerequisites: ['An active merchant with a merchant session key loaded in this tab.'],
    inputs: [
      { key: 'title', label: 'Paylink title', defaultValue: 'Rails Lab paylink' },
      { key: 'amount', label: 'Amount', defaultValue: '25' },
      { key: 'currency', label: 'Currency', defaultValue: 'USDC' },
      { key: 'chains', label: 'Allowed chains (comma separated)', defaultValue: 'BASE,SOLANA' },
    ],
    steps: [
      {
        id: 'create-paylink',
        title: 'Create the payment link',
        action: {
          method: 'POST',
          path: '/api/v1/merchant/paylinks',
          auth: 'merchant',
          body: {
            title: '{title}',
            amountType: 'fixed',
            amount: '{amount}',
            currency: '{currency}',
            allowedChains: '{chains}',
          },
        },
        assertions: [
          { label: 'paylink id', path: 'id', exists: true },
          { label: 'paylink slug', path: 'slug', exists: true },
          { label: 'checkout url', path: 'checkoutUrl', exists: true },
        ],
      },
      {
        id: 'read-paylink',
        title: 'Read the paylink through the public checkout API',
        action: {
          method: 'GET',
          path: '/api/v1/checkout/paylinks/{create-paylink.slug}',
          auth: 'none',
        },
        assertions: [
          { label: 'paylink visible to buyers', path: 'amount', exists: true },
          { label: 'currency', path: 'currency', exists: true },
        ],
      },
      {
        id: 'buyer-pays-link',
        title: 'Buyer pays the payment link',
        manual: { label: 'Open the checkout URL and pay' },
      },
      {
        id: 'merchant-transactions',
        title: 'List the merchant transactions',
        action: { method: 'GET', path: '/api/v1/merchant/transactions', auth: 'merchant' },
        assertions: [{ label: 'transactions listed', path: 'data', exists: true }],
      },
      {
        id: 'solana-pdas',
        title: 'Derive the Solana program addresses for the paylink rail',
        action: {
          method: 'GET',
          path: '/api/v1/admin/chain-service/solana-pdas',
          query: { owner: '{owner}', merchant_name: '{merchantName}' },
          auth: 'admin',
        },
        chainEndpoints: ['GET /b2b/solana/pdas'],
        assertions: [{ label: 'PDAs derived', path: 'data.globalState', exists: true }],
      },
    ],
  },

  {
    id: 'checkout-hosted',
    title: 'Checkout style — hosted checkout session and settlement',
    style: 'checkout',
    roles: ['merchant'],
    summary:
      'The hosted-checkout shape: a session is opened against a paylink, the deposit is simulated locally, and the session settles.',
    prerequisites: [
      'An active merchant with a merchant session key loaded in this tab.',
      'A local or testnet backend so the deposit can be simulated.',
    ],
    inputs: [
      { key: 'title', label: 'Paylink title', defaultValue: 'Rails Lab checkout' },
      { key: 'amount', label: 'Amount', defaultValue: '40' },
      { key: 'currency', label: 'Currency', defaultValue: 'USDC' },
      { key: 'chain', label: 'Chain', defaultValue: 'base' },
    ],
    steps: [
      {
        id: 'create-paylink',
        title: 'Create the paylink to check out against',
        action: {
          method: 'POST',
          path: '/api/v1/merchant/paylinks',
          auth: 'merchant',
          body: {
            title: '{title}',
            amountType: 'fixed',
            amount: '{amount}',
            currency: '{currency}',
            allowedChains: ['BASE', 'SOLANA'],
          },
        },
        assertions: [{ label: 'paylink id', path: 'id', exists: true }],
      },
      {
        id: 'open-session',
        title: 'Open a checkout session',
        action: {
          method: 'POST',
          path: '/api/v1/checkout/sessions',
          auth: 'none',
          body: {
            paylinkId: '{create-paylink.id}',
            amount: '{amount}',
            chain: '{chain}',
            currency: '{currency}',
          },
        },
        assertions: [{ label: 'session created', path: 'id', exists: true }],
      },
      {
        id: 'simulate-deposit',
        title: 'Simulate the buyer deposit',
        description: 'Only available in explicitly enabled local or test environments.',
        action: {
          method: 'POST',
          path: '/api/v1/checkout/sessions/{open-session.id}/simulate-deposit',
          auth: 'none',
        },
        assertions: [{ label: 'deposit accepted', path: 'status', exists: true }],
      },
      {
        id: 'session-status',
        title: 'Poll the session status',
        action: {
          method: 'GET',
          path: '/api/v1/checkout/sessions/{open-session.id}/status',
          auth: 'none',
        },
        assertions: [{ label: 'session status', path: 'status', exists: true }],
      },
      {
        id: 'deployments',
        title: 'Read the deployed contracts and programs',
        action: { method: 'GET', path: '/api/v1/admin/chain-service/deployments', auth: 'admin' },
        chainEndpoints: ['GET /b2b/deployments'],
        assertions: [{ label: 'deployments listed', path: 'data', exists: true }],
      },
    ],
  },

  {
    id: 'headless-charges',
    title: 'Headless API style — server-to-server charges and links',
    style: 'headless',
    roles: ['psp'],
    summary:
      'The headless shape: no hosted page, the PSP integration calls the API directly, creates links and charges, and receives webhooks.',
    prerequisites: ['A PSP API credential loaded in this tab.'],
    inputs: [
      { key: 'merchantExternalId', label: 'Merchant external id', placeholder: 'DEMO-STORE-1', required: true },
      { key: 'amount', label: 'Amount', defaultValue: '75' },
      { key: 'currency', label: 'Currency', defaultValue: 'USDC' },
    ],
    steps: [
      {
        id: 'create-link',
        title: 'Create a payment link through the headless API',
        action: {
          method: 'POST',
          path: '/api/v1/psp/payment-links',
          auth: 'psp',
          body: {
            merchantExternalId: '{merchantExternalId}',
            amount: '{amount}',
            currency: '{currency}',
          },
        },
        assertions: [
          { label: 'payment link id', path: 'paymentLinkId', exists: true },
          { label: 'link status', path: 'status', exists: true },
        ],
      },
      {
        id: 'read-link',
        title: 'Read the payment link back',
        action: {
          method: 'GET',
          path: '/api/v1/psp/payment-links/{create-link.paymentLinkId}',
          auth: 'psp',
        },
        assertions: [{ label: 'link status', path: 'status', exists: true }],
      },
      {
        id: 'create-charge',
        title: 'Create a charge against the link',
        action: {
          method: 'POST',
          path: '/api/v1/psp/charges',
          auth: 'psp',
          body: {
            paymentLinkId: '{create-link.paymentLinkId}',
            merchantExternalId: '{merchantExternalId}',
            amount: '{amount}',
            currency: '{currency}',
          },
        },
        assertions: [
          { label: 'charge token', path: 'chargeToken', exists: true },
          { label: 'charge bound to the link', path: 'paymentLinkId', exists: true },
        ],
      },
      {
        id: 'test-webhook',
        title: 'Trigger a test webhook',
        action: {
          method: 'POST',
          path: '/api/v1/psp/webhooks/test',
          auth: 'psp',
          body: { eventType: 'charge.paid' },
        },
        assertions: [{ label: 'webhook accepted', path: 'status', exists: true }],
      },
      {
        id: 'webhook-deliveries',
        title: 'Read the webhook deliveries',
        action: { method: 'GET', path: '/api/v1/psp/webhooks/deliveries', auth: 'psp' },
        assertions: [{ label: 'deliveries listed', path: 'data', exists: true }],
      },
    ],
  },

  {
    id: 'ops-psp-registration',
    title: 'On-chain ops — PSP registration on Base and Solana',
    style: 'ops',
    roles: ['admin'],
    summary:
      'Registering the PSP on both rails, then reading the on-chain record back from the sidecar.',
    prerequisites: ['A PSP with a fee wallet (EVM) and/or a Solana fee wallet on file.'],
    inputs: [
      { key: 'pspId', label: 'PSP id', placeholder: 'psp_orkidemo', required: true },
      { key: 'wallet', label: 'PSP wallet', placeholder: '0x…', required: true },
    ],
    steps: [
      {
        id: 'register-base',
        title: 'Register the PSP on Base',
        action: {
          method: 'POST',
          path: '/api/v1/admin/psps/{pspId}/onchain/register',
          auth: 'admin',
          body: { network: 'base', pspWallet: '{wallet}' },
        },
        chainEndpoints: ['POST /b2b/psp/register'],
        assertions: [{ label: 'registration status', path: 'status', exists: true }],
      },
      {
        id: 'register-solana',
        title: 'Register the PSP on Solana',
        action: {
          method: 'POST',
          path: '/api/v1/admin/psps/{pspId}/onchain/register',
          auth: 'admin',
          body: { network: 'solana', pspWallet: '{wallet}' },
        },
        chainEndpoints: ['POST /b2b/psp/register'],
        assertions: [{ label: 'registration status', path: 'status', exists: true }],
      },
      {
        id: 'read-onchain',
        title: 'Read the on-chain PSP record',
        action: {
          method: 'GET',
          path: '/api/v1/admin/chain-service/evm-psp',
          query: { address: '{wallet}', network: 'base' },
          auth: 'admin',
        },
        chainEndpoints: ['GET /b2b/evm/psp'],
        assertions: [{ label: 'on-chain record', path: 'data', exists: true }],
      },
      {
        id: 'contract-config',
        title: 'Read the splitter contract configuration',
        action: {
          method: 'GET',
          path: '/api/v1/admin/chain-service/contract-config',
          query: { network: 'base' },
          auth: 'admin',
        },
        chainEndpoints: ['GET /b2b/evm/config'],
        assertions: [{ label: 'contract config', path: 'data', exists: true }],
      },
    ],
  },

  {
    id: 'ops-allow-list',
    title: 'On-chain ops — merchant token allow-list sync',
    style: 'ops',
    roles: ['merchant'],
    summary:
      'The payment rails a merchant accepts, mirrored onto the on-chain allow-list on Base and Solana.',
    prerequisites: ['An active merchant with a registered wallet.'],
    steps: [
      {
        id: 'read-preferences',
        title: 'Read the current payment rails',
        action: { method: 'GET', path: '/api/v1/merchant/preferences', auth: 'merchant' },
        assertions: [{ label: 'preferences', path: 'acceptedChains', exists: true }],
      },
      {
        id: 'sync-preferences',
        title: 'Save the rails and sync them on chain',
        action: {
          method: 'PATCH',
          path: '/api/v1/merchant/preferences',
          auth: 'merchant',
          body: {
            acceptedChains: ['BASE', 'SOLANA'],
            acceptedTokens: ['USDC'],
            solanaMerchantName: 'Rails Lab',
          },
        },
        chainEndpoints: ['POST /b2b/evm/set-allowed-token', 'POST /b2b/solana/set-allowed-token'],
        assertions: [
          { label: 'EVM sync result', path: 'sync.base', exists: true },
          { label: 'Solana sync result', path: 'sync.solana', exists: true },
        ],
      },
      {
        id: 'balances',
        title: 'Read the merchant balances',
        action: { method: 'GET', path: '/api/v1/merchant/balances', auth: 'merchant' },
        assertions: [{ label: 'balances', path: 'usdcBase', exists: true }],
      },
    ],
  },

  {
    id: 'ops-circuit-breaker',
    title: 'On-chain ops — pause and resume the splitter',
    style: 'ops',
    roles: ['admin'],
    summary: 'The emergency stop for the Base splitter contract, and the resume that follows.',
    inputs: [{ key: 'network', label: 'Network', defaultValue: 'base' }],
    steps: [
      {
        id: 'pause',
        title: 'Pause the splitter',
        action: {
          method: 'POST',
          path: '/api/v1/admin/contracts/circuit-breaker',
          auth: 'admin',
          body: { network: '{network}', paused: true },
        },
        chainEndpoints: ['POST /b2b/admin/circuit-breaker'],
        assertions: [{ label: 'paused', path: 'paused', exists: true }],
      },
      {
        id: 'resume',
        title: 'Resume the splitter',
        action: {
          method: 'POST',
          path: '/api/v1/admin/contracts/circuit-breaker',
          auth: 'admin',
          body: { network: '{network}', paused: false },
        },
        chainEndpoints: ['POST /b2b/admin/circuit-breaker'],
        assertions: [{ label: 'resumed', path: 'paused', exists: true }],
      },
    ],
  },

  {
    id: 'ops-fee-update',
    title: 'On-chain ops — approved fee change reaches the splitter',
    style: 'ops',
    roles: ['admin'],
    summary:
      'A dual-control fee change: the approved markup is written to the database and prepared on chain.',
    prerequisites: [
      'Two distinct admin users: one preparer and one approver.',
      'The fee approver key loaded in this tab.',
    ],
    inputs: [
      { key: 'markupBps', label: 'Requested markup (bps)', defaultValue: '90' },
      { key: 'preparedBy', label: 'Prepared by (admin email)', required: true },
      { key: 'approvedBy', label: 'Approved by (admin email)', required: true },
      { key: 'reason', label: 'Reason', defaultValue: 'Rails Lab volume pricing' },
    ],
    steps: [
      {
        id: 'request',
        title: 'Raise the fee change request',
        action: {
          method: 'POST',
          path: '/api/v1/admin/fee-change-requests',
          auth: 'psp',
          body: {
            requestedMarkupBps: '{markupBps}',
            requestedBy: '{preparedBy}',
            reason: '{reason}',
          },
        },
        assertions: [{ label: 'request id', path: 'id', exists: true }],
      },
      {
        id: 'approve',
        title: 'Approve it under dual control',
        description: 'The approval also pushes the new markup to the Base splitter contract.',
        action: {
          method: 'POST',
          path: '/api/v1/admin/fee-change-requests/{request.id}/approve',
          auth: 'admin',
          body: { preparedBy: '{preparedBy}', approvedBy: '{approvedBy}' },
        },
        chainEndpoints: ['POST /b2b/psp/update-fee'],
        assertions: [
          { label: 'approval status', path: 'status', equals: 'APPROVED' },
          { label: 'on-chain fee update attempted', path: 'onChainFeeUpdate.status', exists: true },
        ],
      },
    ],
  },

  {
    id: 'ops-merchant-transfer',
    title: 'On-chain ops — merchant treasury transfer',
    style: 'ops',
    roles: ['merchant'],
    summary: 'Preparing and broadcasting a non-custodial transfer out of the merchant wallet.',
    prerequisites: ['An active merchant with a funded ledger balance.'],
    inputs: [
      { key: 'network', label: 'Network', defaultValue: 'base' },
      { key: 'to', label: 'Destination address', required: true },
      { key: 'amount', label: 'Amount', defaultValue: '1' },
      { key: 'currency', label: 'Currency', defaultValue: 'USDC' },
    ],
    steps: [
      {
        id: 'prepare',
        title: 'Prepare the transfer',
        action: {
          method: 'POST',
          path: '/api/v1/merchant/transfers/prepare',
          auth: 'merchant',
          body: { network: '{network}', to: '{to}', amount: '{amount}', currency: '{currency}' },
        },
        chainEndpoints: ['POST /transfer/prepare'],
        assertions: [{ label: 'prepare id', path: 'prepareId', exists: true }],
      },
      {
        id: 'sign',
        title: 'Sign the prepared transaction in the wallet',
        manual: { label: 'Sign the prepared transaction' },
      },
      {
        id: 'broadcast',
        title: 'Broadcast the signed transaction',
        action: {
          method: 'POST',
          path: '/api/v1/merchant/transfers/broadcast',
          auth: 'merchant',
          body: { prepareId: '{prepare.prepareId}', network: '{network}', signedTransaction: '{signedTransaction}' },
        },
        chainEndpoints: ['POST /transfer/broadcast'],
        assertions: [{ label: 'broadcast result', path: 'txHash', exists: true }],
      },
    ],
  },
]

export const railsScenariosById = new Map(railsScenarios.map((scenario) => [scenario.id, scenario]))

export function scenariosForRole(role: 'admin' | 'psp' | 'merchant'): RailsScenario[] {
  return railsScenarios.filter((scenario) => scenario.roles.includes(role))
}
