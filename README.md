# Orki — Prototype UI

React front end for the Orki stablecoin settlement platform: the **Orki HQ admin
console**, the **PSP portal** and the **merchant portal**, plus the public
hosted surfaces (checkout, payment links, hosted ToS, passkey setup).

## Portals

| Route | Audience | What it does |
|---|---|---|
| `/admin` | Protocol admin | PSP registry and KYB dossier, cross-tenant merchants, fee governance, audit log, admin users, splitter circuit breaker |
| `/admin/rails` | Protocol admin | **Rails Lab** — run every integration style against the live backend and see the chain-service result |
| `/psp` | PSP / org | Sub-merchants, webhooks and deliveries, B2B payments, markup settings, fee-change requests |
| `/psp/rails` | PSP / org | Integration test bench: invoice, payment-link and headless API styles |
| `/merchant` | Merchant | Onboarding stepper, analytics, balances, paylinks, transactions, transfers, off-ramp, payment rails |
| `/merchant/rails` | Merchant | Payment-rails test bench: paylink, hosted checkout, on-chain allow-list sync, treasury transfers |
| `/checkout/:slug`, `/pay/:paymentId` | Public | Hosted checkout and the dynamic B2B payment flow |
| `/setup`, `/tos/:token`, `/legal/*` | Public | Wallet + passkey ceremony, hosted terms acceptance, legal documents |
| `/api-workbench` | Internal | Raw endpoint console with credential handling |

## Rails Lab

The chain-service sidecar is headless JSON, so the Rails Lab is where its
behaviour becomes visible:

- **Scenarios** — one per integration style (invoicely, paylink, checkout,
  headless) plus the on-chain operations flows (PSP registration on Base and
  Solana, merchant allow-list sync, circuit breaker, fee update, treasury
  transfer). Each step calls a real backend endpoint, asserts on the response,
  and can pull on-chain evidence through the admin proxy.
- **Coverage** — a matrix of every chain-service endpoint against the
  scenarios that reach it. The rows come from the sidecar's own `GET /routes`
  inventory, so an endpoint no scenario covers shows up as a gap.
- **Inspector** — read-only access to the sidecar for ad-hoc checks.

The chain-service token never reaches the browser: the backend proxies a
whitelisted set of capabilities under `GET /api/v1/admin/chain-service/{capability}`
and writes an audit entry for each inspection.

## Requirements

- Node 20+ and npm
- The Orki backend (`PSP-Backend`) with its `chain-service` running — the
  Rails Lab talks to the backend, which talks to the sidecar

## Environment

| Variable | Purpose |
|---|---|
| `VITE_WEB3AUTH_CLIENT_ID` | **Required.** The build fails without it, and the app refuses to boot without it |
| `VITE_PSP_API_URL` / `VITE_API_BASE_URL` | Backend base URL (default `http://localhost:8000`) |
| `VITE_WEB3AUTH_NETWORK` | `sapphire_devnet` (default) or `sapphire_mainnet` |
| `VITE_BASE_CHAIN_ID`, `VITE_BASE_RPC_URL` | Base network configuration |
| `VITE_SOLANA_RPC_URL`, `VITE_SOLANA_MAINNET_RPC_URL` | Solana RPC configuration |
| `VITE_ZERODEV_PROJECT_ID`, `VITE_ZERODEV_RPC_URL` | ZeroDev Kernel passkey smart accounts |
| `VITE_ADMIN_KEY`, `VITE_FEE_APPROVER_KEY`, `VITE_PSP_KEY` | Credentials used by the admin and PSP surfaces |

## Commands

```bash
npm run dev      # vite dev server
npm run build    # tsc -b && vite build
npm run lint     # oxlint
npm test         # vitest run (scenario runner unit tests)
npm run preview  # serve the production build
```

## Conventions

- Routes live in `src/App.tsx`; role-gated routes use `ProtectedRoute` with the
  matching layout shell (`PspLayout`, `MerchantLayout`, `AdminLayout`).
- API calls go through `src/services/apiConfig.ts` (`requestApi`), which
  attaches the right credential per surface and an idempotency key to writes.
- Reusable pieces live in `src/components/ui` (buttons, cards, badges, fields,
  JSON blocks) and `src/components/rails` (scenario board, coverage matrix,
  chain-service inspector).
- Styling is Tailwind v4 with the tokens in `src/index.css` (`.mat-card`,
  `.mat-btn-primary`, onion brand palette). Figures use `tabular-nums`,
  addresses and hashes use `font-mono`.
