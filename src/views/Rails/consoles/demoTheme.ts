import React from 'react'
import {
  FileText,
  Globe,
  LayoutTemplate,
  Link2,
  Plug,
  ShoppingBag,
} from 'lucide-react'

export type DemoUseCaseKey = 'hosted' | 'paylink' | 'invoice' | 'headless' | 'plugin' | 'widget'

export interface DemoUseCaseMeta {
  key: DemoUseCaseKey
  number: string
  title: string
  kicker: string
  tagline: string
  description: string
  route: string
  gradient: string
  bgSoft: string
  accent: string
  borderAccent: string
  ringAccent: string
  badgeBg: string
  badgeText: string
  icon: React.ReactNode
  chips: Array<{ label: string; value: string }>
  whenToUse: string
  merchantEffort: string
  shopperExperience: string
}

export const DEMO_USE_CASES: Record<DemoUseCaseKey, DemoUseCaseMeta> = {
  hosted: {
    key: 'hosted',
    number: '01',
    title: 'Hosted Payment Page',
    kicker: 'PSP-Hosted Checkout',
    tagline: 'The PSP hosts the entire payment page — shoppers redirect to pay and return when done.',
    description: 'Corner Shop runs on Shoplane. At checkout, shoppers reach Shoplane’s hosted payment page, select Pay with Orki, and settle seamlessly.',
    route: '/psp/console/hosted',
    gradient: 'from-indigo-600 via-indigo-700 to-purple-900',
    bgSoft: 'bg-indigo-50/70',
    accent: '#6366F1',
    borderAccent: 'border-indigo-200',
    ringAccent: 'focus:ring-indigo-500',
    badgeBg: 'bg-indigo-100 text-indigo-900',
    badgeText: 'text-indigo-700',
    icon: React.createElement(ShoppingBag, { className: 'w-5 h-5 text-indigo-400' }),
    chips: [
      { label: 'Merchant Effort', value: 'Zero Code' },
      { label: 'Shopper Redirect', value: 'Yes (Hosted URL)' },
      { label: 'Best For', value: 'E-commerce Platforms' },
    ],
    whenToUse: 'When your platform hosts merchant storefronts and wants to offer crypto checkout with zero integration work for the shop owner.',
    merchantEffort: 'None — the PSP provides the hosted payment page out of the box.',
    shopperExperience: 'Shopper reviews their basket, picks "Pay with Orki", pays on the hosted screen, and is redirected back to the store receipt.',
  },
  paylink: {
    key: 'paylink',
    number: '02',
    title: 'Checkout Paylink',
    kicker: 'Reusable Link & QR Drop',
    tagline: 'No website required — sell products, event tickets, or services via WhatsApp, Instagram, or QR code.',
    description: 'Harbour at dawn signed print drop (limited to 5 items). One reusable link sells the whole edition and automatically closes when sold out.',
    route: '/psp/console/paylink',
    gradient: 'from-rose-500 via-pink-600 to-rose-700',
    bgSoft: 'bg-rose-50/70',
    accent: '#F43F5E',
    borderAccent: 'border-rose-200',
    ringAccent: 'focus:ring-rose-500',
    badgeBg: 'bg-rose-100 text-rose-900',
    badgeText: 'text-rose-700',
    icon: React.createElement(Link2, { className: 'w-5 h-5 text-rose-300' }),
    chips: [
      { label: 'Merchant Effort', value: 'Create Link in 1 Click' },
      { label: 'Channel', value: 'Chat, Social, QR' },
      { label: 'Best For', value: 'Creators & Drops' },
    ],
    whenToUse: 'When a merchant wants to collect payments directly on mobile messaging, social posts, or in-person table QR displays without a website.',
    merchantEffort: 'Create link or drop in dashboard, specify price or inventory, and share the URL or QR.',
    shopperExperience: 'Taps link on phone, sees real-time quote in USDC or native crypto, signs with wallet, and gets instant confirmation.',
  },
  invoice: {
    key: 'invoice',
    number: '03',
    title: 'B2B Invoice Payment',
    kicker: 'Client Billing with Guardrails',
    tagline: 'Send branded invoices with strict due dates, link expiry, and per-invoice accepted tokens.',
    description: 'Northwind Studio bills Acme GmbH for design services. The merchant restricts payment to USDC on Base with an enforceable expiration date.',
    route: '/psp/console/invoicely',
    gradient: 'from-emerald-600 via-teal-700 to-cyan-900',
    bgSoft: 'bg-emerald-50/70',
    accent: '#0F766E',
    borderAccent: 'border-emerald-200',
    ringAccent: 'focus:ring-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-900',
    badgeText: 'text-emerald-700',
    icon: React.createElement(FileText, { className: 'w-5 h-5 text-emerald-300' }),
    chips: [
      { label: 'Merchant Effort', value: 'Fill Invoice Form' },
      { label: 'Settlement Terms', value: 'Net 7 / 14 / 30' },
      { label: 'Best For', value: 'Agencies & Wholesalers' },
    ],
    whenToUse: 'When businesses invoice corporate clients and want crypto settlement with formal invoice numbers, line items, and token guardrails.',
    merchantEffort: 'Enters client details, chooses which tokens/chains are allowed, sets due date, and sends the payment link.',
    shopperExperience: 'Client receives a formal invoice page, previews accepted crypto options, and settles with proof of payment.',
  },
  headless: {
    key: 'headless',
    number: '04',
    title: 'Headless Payment API',
    kicker: 'Custom Enterprise Experience',
    tagline: 'The merchant owns 100% of the checkout interface; the PSP processes settlement silently in the background.',
    description: 'Enterprise brand builds its bespoke cart and checkout button. The frontend calls the merchant server, which calls POST /api/v1/psp/charges.',
    route: '/psp/console/headless',
    gradient: 'from-slate-900 via-slate-800 to-cyan-950',
    bgSoft: 'bg-cyan-50/50',
    accent: '#06B6D4',
    borderAccent: 'border-cyan-300/40',
    ringAccent: 'focus:ring-cyan-500',
    badgeBg: 'bg-cyan-950/60 text-cyan-300 border border-cyan-800',
    badgeText: 'text-cyan-400',
    icon: React.createElement(Globe, { className: 'w-5 h-5 text-cyan-400' }),
    chips: [
      { label: 'Merchant Effort', value: 'Full Developer Control' },
      { label: 'UI Branding', value: '100% Merchant Custom' },
      { label: 'Best For', value: 'Enterprise & Mobile Apps' },
    ],
    whenToUse: 'When high-volume enterprise merchants require full control over their checkout design and want zero third-party UI widgets.',
    merchantEffort: 'Developer integrates PSP charge API on backend and connects custom checkout button.',
    shopperExperience: 'Completely seamless, on-brand merchant checkout with native crypto options.',
  },
  plugin: {
    key: 'plugin',
    number: '05',
    title: 'Store Platform Plugin',
    kicker: 'Shopify / WooCommerce Extension',
    tagline: 'Zero-code platform extension — merchants activate Orki in store settings and accept crypto alongside cards.',
    description: 'The PSP ships an e-commerce extension. Merchants enable it in one click, and store orders sync to Paid automatically via webhooks.',
    route: '/psp/console/plugin',
    gradient: 'from-amber-500 via-orange-600 to-amber-700',
    bgSoft: 'bg-orange-50/70',
    accent: '#F97316',
    borderAccent: 'border-orange-200',
    ringAccent: 'focus:ring-orange-500',
    badgeBg: 'bg-orange-100 text-orange-900',
    badgeText: 'text-orange-700',
    icon: React.createElement(Plug, { className: 'w-5 h-5 text-amber-300' }),
    chips: [
      { label: 'Merchant Effort', value: 'Toggle On in Settings' },
      { label: 'Platform', value: 'WooCommerce / Shopify' },
      { label: 'Best For', value: 'SME Online Stores' },
    ],
    whenToUse: 'When offering a plug-and-play payment method for merchants on platforms like WooCommerce, Shopify, or Magento.',
    merchantEffort: 'Installs plugin once, toggles "Enable Pay with Orki" in store admin, and saves.',
    shopperExperience: 'Selects "Pay with Orki" at store checkout alongside credit cards and completes payment.',
  },
  widget: {
    key: 'widget',
    number: '06',
    title: 'Embedded Script / Modal',
    kicker: 'Drop-In Checkout Modal',
    tagline: 'A drop-in JavaScript widget that renders a secure payment modal directly on the merchant’s website.',
    description: 'The merchant adds orki-widget.js to their page. Clicking Pay pops a sleek modal directly over the page without navigating away.',
    route: '/psp/console/widget',
    gradient: 'from-sky-500 via-blue-600 to-indigo-800',
    bgSoft: 'bg-sky-50/70',
    accent: '#0284C7',
    borderAccent: 'border-sky-200',
    ringAccent: 'focus:ring-sky-500',
    badgeBg: 'bg-sky-100 text-sky-900',
    badgeText: 'text-sky-700',
    icon: React.createElement(LayoutTemplate, { className: 'w-5 h-5 text-sky-300' }),
    chips: [
      { label: 'Merchant Effort', value: 'Copy 1 Script Tag' },
      { label: 'Modal Experience', value: 'Stays In-Page' },
      { label: 'Best For', value: 'Custom Websites' },
    ],
    whenToUse: 'When a merchant has their own website and wants a clean checkout modal without building backend redirect flows.',
    merchantEffort: 'Includes the script tag and invokes OrkiCheckoutModal.open().',
    shopperExperience: 'Clicks Pay, modal animates smoothly over the page, completes payment, and the page updates in-place.',
  },
}
