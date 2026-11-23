import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Merchant, Organization, Transaction } from '../../types'
import type { PspDashboardMetrics } from '../../services/pspMerchantService'
import {
  Plus,
  Calendar,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowUpRight,
} from 'lucide-react'

interface PspEnterpriseDashboardProps {
  organization: Organization
  merchants: Merchant[]
  transactions: Transaction[]
  dashboardMetrics?: PspDashboardMetrics | null
  onNavigateTab: (tab: string) => void
  onOpenAddMerchant?: () => void
}

const SALES_SERIES = [
  { date: 'Jun 2', value: 168000 },
  { date: 'Jun 7', value: 122000 },
  { date: 'Jun 12', value: 48000 },
  { date: 'Jun 15', value: 58000 },
  { date: 'Jun 17', value: 138000 },
  { date: 'Jun 22', value: 112000 },
  { date: 'Jun 27', value: 139000 },
  { date: 'Jul 2', value: 174000 },
]

const HISTORY_BARS = [
  { label: '01', base: 340, solana: 480, offramp: 680, pending: 980 },
  { label: '02', base: 520, solana: 410, offramp: 540, pending: 1150 },
  { label: '03', base: 890, solana: 1240, offramp: 620, pending: 610 },
  { label: '04', base: 640, solana: 1520, offramp: 940, pending: 620 },
  { label: '05', base: 1120, solana: 1180, offramp: 620, pending: 540 },
  { label: '06', base: 490, solana: 860, offramp: 1190, pending: 660 },
  { label: '07', base: 1050, solana: 1220, offramp: 890, pending: 740 },
  { label: '08', base: 720, solana: 910, offramp: 1240, pending: 630 },
  { label: '09', base: 940, solana: 1160, offramp: 580, pending: 440 },
  { label: '10', base: 480, solana: 1380, offramp: 780, pending: 940 },
  { label: '11', base: 1290, solana: 760, offramp: 490, pending: 380 },
  { label: '12', base: 520, solana: 690, offramp: 510, pending: 420 },
  { label: '13', base: 680, solana: 810, offramp: 540, pending: 390 },
  { label: '14', base: 760, solana: 940, offramp: 620, pending: 410 },
]

export const PspEnterpriseDashboard: React.FC<PspEnterpriseDashboardProps> = ({
  organization,
  merchants,
  transactions,
  dashboardMetrics,
  onNavigateTab,
  onOpenAddMerchant,
}) => {
  const navigate = useNavigate()
  const [dateRange, setDateRange] = useState<'30 Days' | '7 Days' | '90 Days'>('30 Days')
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)

  const totalVolume = dashboardMetrics?.totalVolumeUsdc
    ? dashboardMetrics.totalVolumeUsdc
    : transactions.reduce((acc, tx) => acc + (tx.grossAmount || 0), 0)

  const totalPspFees = dashboardMetrics?.accruedMarkupUsdc
    ? dashboardMetrics.accruedMarkupUsdc
    : transactions.reduce((acc, tx) => acc + (tx.pspMarkupAmount || 0), 0)

  const avgVolume = transactions.length > 0 ? totalVolume / Math.max(transactions.length, 1) : 0
  const activeMerchantsCount = merchants.filter((m) => m.status === 'active').length

  const formatUsd = (val: number) =>
    '$' + val.toLocaleString('en-US', { minimumFractionDigits: val > 0 && val < 100 ? 2 : 0, maximumFractionDigits: 2 })

  // Build smooth SVG path for Sales Volume chart
  const width = 680
  const height = 210
  const padX = 48
  const padY = 20
  const maxVal = 180000
  const chartW = width - padX * 1.4
  const chartH = height - padY * 2

  const pts = SALES_SERIES.map((d, idx) => {
    const x = padX + (idx / (SALES_SERIES.length - 1)) * chartW
    const y = padY + chartH - (d.value / maxVal) * chartH
    return { ...d, x, y }
  })

  const buildSmoothPath = (points: typeof pts) => {
    if (points.length === 0) return ''
    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i]
      const p1 = points[i + 1]
      const cx = (p0.x + p1.x) / 2
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`
    }
    return d
  }

  const linePath = buildSmoothPath(pts)
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${padY + chartH} L ${pts[0].x} ${padY + chartH} Z`

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {organization.name} · {merchants.length} notice-accepted merchants ({activeMerchantsCount} active)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative inline-flex items-center">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as '30 Days' | '7 Days' | '90 Days')}
              className="pl-8 pr-8 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 shadow-2xs appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="30 Days">30 Days</option>
              <option value="7 Days">7 Days</option>
              <option value="90 Days">90 Days</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Top KPI Cards Row (4 columns matching screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Average Sales Volume */}
        <div className="bg-white rounded-xl border border-slate-200 border-t-2 border-t-emerald-500 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Average Sales Volume</p>
              <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
                {formatUsd(avgVolume)}
              </p>
            </div>
            {/* Mini green sparkline */}
            <svg width="56" height="28" viewBox="0 0 56 28" className="text-emerald-500 shrink-0">
              <path
                d="M2 24 C12 22, 18 14, 28 16 C36 18, 44 6, 54 3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="mt-3 flex items-center space-x-1 text-[11px] font-medium text-emerald-600">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+12.3% vs last period</span>
          </div>
        </div>

        {/* Card 2: PSP Markup Fees */}
        <div className="bg-white rounded-xl border border-slate-200 border-t-2 border-t-rose-500 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">PSP Markup Revenue</p>
              <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
                {formatUsd(totalPspFees)}
              </p>
            </div>
            {/* Mini coral sparkline */}
            <svg width="56" height="28" viewBox="0 0 56 28" className="text-rose-500 shrink-0">
              <path
                d="M2 6 C14 8, 22 18, 32 14 C42 10, 48 22, 54 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="mt-3 flex items-center space-x-1 text-[11px] font-medium text-slate-500">
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            <span>{organization.feeSchedule?.pspMarkupBps ?? 35} bps active split</span>
          </div>
        </div>

        {/* Card 3: Transaction Volume */}
        <div className="bg-white rounded-xl border border-slate-200 border-t-2 border-t-emerald-500 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Transaction Volume</p>
              <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
                {formatUsd(totalVolume)}
              </p>
            </div>
            {/* Mini green sparkline */}
            <svg width="56" height="28" viewBox="0 0 56 28" className="text-emerald-500 shrink-0">
              <path
                d="M2 22 C14 20, 20 12, 30 14 C40 16, 46 5, 54 2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="mt-3 flex items-center space-x-1 text-[11px] font-medium text-emerald-600">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{transactions.length} settled txns ({dateRange})</span>
          </div>
        </div>

        {/* Card 4: + Onboard Merchant / Add Widget */}
        <button
          type="button"
          onClick={() => {
            if (onOpenAddMerchant && organization.status === 'sandbox') {
              onOpenAddMerchant()
            } else {
              onNavigateTab('merchants')
            }
          }}
          className="bg-white hover:bg-slate-50 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 p-4 flex flex-col items-center justify-center space-y-2 text-slate-500 hover:text-indigo-700 transition min-h-[118px]"
        >
          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium">
            {organization.status === 'sandbox' ? 'Onboard Sandbox Merchant' : 'Manage Merchants'}
          </span>
        </button>
      </div>

      {/* Middle Row: Sales Volume Spline Chart + Announcements Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 cols: Sales Volume Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Sales Volume</h2>
              <p className="text-[11px] text-slate-400">Multi-chain USDC volume trajectory</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('transactions')}
              className="px-2.5 py-1 rounded-md border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              View All
            </button>
          </div>

          <div className="relative w-full overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-52 overflow-visible">
              <defs>
                <linearGradient id="salesAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Y-Axis grid lines & labels */}
              {[0, 45000, 90000, 135000, 180000].map((tick) => {
                const y = padY + chartH - (tick / maxVal) * chartH
                return (
                  <g key={tick}>
                    <line
                      x1={padX}
                      y1={y}
                      x2={padX + chartW}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x={padX - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-slate-400 text-[9px] font-mono"
                    >
                      ${tick.toLocaleString()}
                    </text>
                  </g>
                )
              })}

              {/* Area fill */}
              <path d={areaPath} fill="url(#salesAreaGrad)" />

              {/* Spline stroke */}
              <path
                d={linePath}
                fill="none"
                stroke="#4f46e5"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Data Points */}
              {pts.map((pt, idx) => (
                <g
                  key={pt.date}
                  onMouseEnter={() => setHoveredPoint(idx)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint === idx ? 5 : 3}
                    fill={hoveredPoint === idx ? '#4f46e5' : '#6366f1'}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <text
                    x={pt.x}
                    y={padY + chartH + 16}
                    textAnchor="middle"
                    className="fill-slate-400 text-[9px]"
                  >
                    {pt.date}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Right 1 col: Announcements Feed */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Announcements</h2>
              <button
                type="button"
                onClick={() => onNavigateTab('notifications')}
                className="px-2.5 py-1 rounded-md border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                View All
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      Orki Passkey Ceremony v2
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">Today</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                    Standalone hosted ZeroDev + Solana passkey setup app is now active for merchant onboarding.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      Notice-Accepted Filter Live
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">Active</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                    PSP merchant directories strictly surface merchants with verified data-sharing consent.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      Base &amp; Solana Dual Rails
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">Ready</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                    Real-time atomic fee splitting enabled for all active {organization.name} merchants.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/psp/rails')}
            className="mt-4 w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-center space-x-1.5 transition"
          >
            <span>Open Orki Direct Rails Lab</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Row: Transaction History Trend (Stacked Bar Chart matching screenshot) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Transaction History Trend</h2>
            <div className="flex items-center space-x-4 mt-1.5 text-[11px] text-slate-500">
              <span className="inline-flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400" />
                <span>Base USDC</span>
              </span>
              <span className="inline-flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
                <span>Solana USDC</span>
              </span>
              <span className="inline-flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-300" />
                <span>Off-Ramp Settlement</span>
              </span>
              <span className="inline-flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500" />
                <span>Direct Split</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('transactions')}
            className="px-2.5 py-1 rounded-md border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition self-start sm:self-auto"
          >
            View All
          </button>
        </div>

        <div className="flex items-end space-x-3 h-48 pt-4 pb-2 border-b border-slate-100">
          {/* Y-Axis labels */}
          <div className="hidden sm:flex flex-col justify-between h-full text-[10px] font-mono text-slate-400 pr-2 select-none">
            <span>4500</span>
            <span>3500</span>
            <span>2500</span>
            <span>1500</span>
            <span>0</span>
          </div>

          {/* Stacked Bars */}
          <div className="flex-1 grid grid-cols-14 gap-2 sm:gap-3 h-full items-end">
            {HISTORY_BARS.map((bar) => {
              const total = bar.base + bar.solana + bar.offramp + bar.pending
              const maxH = 4200
              const pct = (val: number) => `${Math.max(4, Math.round((val / maxH) * 100))}%`
              return (
                <div
                  key={bar.label}
                  className="h-full flex flex-col justify-end items-center group"
                  title={`Day ${bar.label}: ${total.toLocaleString()} txns`}
                >
                  <div className="w-full max-w-[26px] flex flex-col justify-end rounded-t-sm overflow-hidden space-y-px h-full">
                    <div className="bg-emerald-400/90 group-hover:bg-emerald-500 transition" style={{ height: pct(bar.pending) }} />
                    <div className="bg-amber-400/90 group-hover:bg-amber-500 transition" style={{ height: pct(bar.offramp) }} />
                    <div className="bg-rose-300/90 group-hover:bg-rose-400 transition" style={{ height: pct(bar.solana) }} />
                    <div className="bg-indigo-500/90 group-hover:bg-indigo-600 transition" style={{ height: pct(bar.base) }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
