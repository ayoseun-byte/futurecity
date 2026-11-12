import React from 'react'
import { CheckCircle2, XCircle, Clock, Loader2, AlertTriangle } from 'lucide-react'

export type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning' | 'info' | 'pending'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  danger: 'bg-rose-50 text-rose-700 border-rose-200/80',
  warning: 'bg-amber-50 text-amber-700 border-amber-200/80',
  info: 'bg-blue-50 text-blue-700 border-blue-200/80',
  pending: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
}

interface BadgeProps {
  tone?: BadgeTone
  children: React.ReactNode
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${tones[tone]} ${className}`}
  >
    {children}
  </span>
)

/** Base / Solana marker used wherever a chain is shown. */
export const ChainBadge: React.FC<{ chain: string; className?: string }> = ({ chain, className = '' }) => {
  const normalized = chain.toLowerCase()
  if (normalized === 'solana' || normalized === 'svm') {
    return (
      <Badge tone="info" className={className}>
        Solana
      </Badge>
    )
  }
  if (normalized === 'base' || normalized === 'evm') {
    return (
      <Badge tone="success" className={className}>
        Base
      </Badge>
    )
  }
  return (
    <Badge tone="neutral" className={className}>
      {chain}
    </Badge>
  )
}

export type ResultTone = 'passed' | 'failed' | 'running' | 'awaiting' | 'idle'

const resultTones: Record<ResultTone, BadgeTone> = {
  passed: 'success',
  failed: 'danger',
  running: 'pending',
  awaiting: 'warning',
  idle: 'neutral',
}

const resultIcons: Record<ResultTone, React.ReactNode> = {
  passed: <CheckCircle2 className="w-3 h-3" />,
  failed: <XCircle className="w-3 h-3" />,
  running: <Loader2 className="w-3 h-3 animate-spin" />,
  awaiting: <Clock className="w-3 h-3" />,
  idle: <Clock className="w-3 h-3" />,
}

const resultLabels: Record<ResultTone, string> = {
  passed: 'Passed',
  failed: 'Failed',
  running: 'Running',
  awaiting: 'Awaiting',
  idle: 'Not run',
}

export const ResultBadge: React.FC<{ tone: ResultTone; label?: string }> = ({ tone, label }) => (
  <Badge tone={resultTones[tone]}>
    {resultIcons[tone]}
    {label ?? resultLabels[tone]}
  </Badge>
)

export const WarningBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Badge tone="warning">
    <AlertTriangle className="w-3 h-3" />
    {children}
  </Badge>
)
