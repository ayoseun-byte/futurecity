import React from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  Sparkles,
  HelpCircle,
} from 'lucide-react'
import { RailsScenarioBoard } from '../../components/rails/RailsScenarioBoard'
import { scenariosForRole } from '../../services/scenarios'
import { useAuth } from '../../context/AuthContext'
import { DEMO_USE_CASES, type DemoUseCaseKey } from './consoles/demoTheme'

const USE_CASE_ORDER: DemoUseCaseKey[] = [
  'hosted',
  'paylink',
  'invoice',
  'headless',
  'plugin',
  'widget',
]

const COMPARISON_ROWS = [
  {
    model: '01. Hosted Checkout',
    effort: 'Zero Code',
    redirect: 'Yes (Redirect to Hosted URL)',
    target: 'E-commerce Platforms & Marketplaces',
    launchTime: 'Instant (turnkey)',
    route: '/psp/console/hosted',
  },
  {
    model: '02. Checkout Paylink',
    effort: '1 Click (No Site)',
    redirect: 'Yes (Phone / QR link)',
    target: 'Creators, Social DMs, Table QR',
    launchTime: '< 2 Minutes',
    route: '/psp/console/paylink',
  },
  {
    model: '03. B2B Invoice',
    effort: 'Fill Invoice Form',
    redirect: 'Yes (Client Invoice Portal)',
    target: 'Agencies, Consultancies, Wholesalers',
    launchTime: '< 5 Minutes',
    route: '/psp/console/invoicely',
  },
  {
    model: '04. Headless Payment',
    effort: 'Developer API',
    redirect: 'No (100% Custom Frontend)',
    target: 'Enterprise, Native iOS/Android Apps',
    launchTime: '1-2 Days (Backend API)',
    route: '/psp/console/headless',
  },
  {
    model: '05. Store Plugin',
    effort: 'Toggle On in Settings',
    redirect: 'Yes (Redirect to Orki Checkout)',
    target: 'Shopify / WooCommerce SMEs',
    launchTime: '< 5 Minutes',
    route: '/psp/console/plugin',
  },
  {
    model: '06. Embedded Widget',
    effort: '1 Script Tag',
    redirect: 'No (In-Page Modal / iframe)',
    target: 'Custom Websites & Webapps',
    launchTime: '< 1 Hour',
    route: '/psp/console/widget',
  },
]

export const PspRailsView: React.FC = () => {
  const scenarios = scenariosForRole('psp')
  const { user } = useAuth()
  const pspName = user?.name || 'Your PSP'

  return (
    <div className="space-y-8">
      {/* Executive Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl border border-slate-800">
        <div className="max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Executive Demonstration Suite · 6 Live Payment Models</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            How <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-sky-300 to-rose-300">{pspName}</span> Enables Merchants to Accept Multi-Chain Crypto
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Every business collects money differently. Whether your merchant runs a WooCommerce shop, sells via WhatsApp paylinks, generates corporate invoices, or builds a custom enterprise mobile app, this console provides a ready-to-run interactive demo connected to live PSP rails and on-chain settlement.
          </p>
        </div>
      </div>

      {/* 6 Vibrant Use Case Cards Grid */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <span>Payment Collection Models</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any model to open the interactive dual-perspective console (Shopper + Merchant Ledger).
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            Base &amp; Solana · USDC · USDT · EURC
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {USE_CASE_ORDER.map((key) => {
            const meta = DEMO_USE_CASES[key]
            return (
              <div
                key={meta.key}
                className="group rounded-3xl border border-slate-200 bg-white shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden hover:border-slate-300"
              >
                {/* Vibrant Card Top Banner */}
                <div className={`bg-gradient-to-r ${meta.gradient} p-5 text-white relative overflow-hidden`}>
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20">
                      {meta.number}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                      {meta.icon}
                    </div>
                  </div>

                  <div className="mt-4 relative z-10">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                      {meta.kicker}
                    </div>
                    <h3 className="text-lg font-bold text-white mt-0.5">{meta.title}</h3>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {meta.tagline}
                  </p>

                  {/* Chips */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    {meta.chips.map((chip, idx) => (
                      <div key={idx} className="flex justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">{chip.label}:</span>
                        <strong className="text-slate-800">{chip.value}</strong>
                      </div>
                    ))}
                  </div>

                  {/* Launch CTA */}
                  <div className="pt-2">
                    <Link
                      to={meta.route}
                      className="w-full py-2.5 rounded-xl bg-slate-900 group-hover:bg-indigo-600 text-white font-bold text-xs transition duration-200 flex items-center justify-center gap-2 shadow-xs group-hover:shadow-md"
                    >
                      <span>Launch {meta.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* C-Level Decision Matrix: Which Model to Recommend? */}
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm space-y-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Executive Comparison Matrix</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mt-2">
            Which Payment Model Should Your Merchant Choose?
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare integration complexity, customer touchpoint, and time-to-first-payment across all 6 rails.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <th className="py-3 px-4">Payment Model</th>
                <th className="py-3 px-4">Integration Effort</th>
                <th className="py-3 px-4">Shopper Experience</th>
                <th className="py-3 px-4">Best Suited For</th>
                <th className="py-3 px-4">Launch Time</th>
                <th className="py-3 px-4 text-right">Demo Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {COMPARISON_ROWS.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{row.model}</td>
                  <td className="py-3.5 px-4 text-slate-700">
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-[11px] font-semibold">
                      {row.effort}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{row.redirect}</td>
                  <td className="py-3.5 px-4 text-slate-800 font-semibold">{row.target}</td>
                  <td className="py-3.5 px-4 text-emerald-700 font-semibold">{row.launchTime}</td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      to={row.route}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                    >
                      <span>Try</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technical Scenarios Board */}
      <RailsScenarioBoard scenarios={scenarios} />
    </div>
  )
}
