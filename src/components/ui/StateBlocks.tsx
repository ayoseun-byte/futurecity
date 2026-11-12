import React from 'react'
import { Loader2, X, Inbox } from 'lucide-react'

export const Spinner: React.FC<{ label?: string; className?: string }> = ({ label, className = '' }) => (
  <div className={`flex items-center gap-2 text-xs text-slate-500 ${className}`}>
    <Loader2 className="w-4 h-4 animate-spin" />
    {label ?? 'Loading…'}
  </div>
)

interface ErrorBannerProps {
  message: string
  onDismiss?: () => void
  className?: string
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss, className = '' }) => (
  <div
    role="alert"
    className={`mat-card border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-start justify-between gap-3 ${className}`}
  >
    <span className="whitespace-pre-wrap break-words">{message}</span>
    {onDismiss && (
      <button type="button" onClick={onDismiss} aria-label="Dismiss error" className="shrink-0">
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
)

export const EmptyState: React.FC<{ title: string; hint?: string; action?: React.ReactNode }> = ({
  title,
  hint,
  action,
}) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
    <Inbox className="w-5 h-5 text-slate-400" />
    <p className="text-xs font-semibold text-slate-700">{title}</p>
    {hint && <p className="text-[11px] text-slate-500 max-w-md">{hint}</p>}
    {action}
  </div>
)
