import React from 'react'

interface CardProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  padded?: boolean
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  actions,
  children,
  className = '',
  padded = true,
}) => (
  <section className={`mat-card ${className}`}>
    {(title || actions) && (
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div>
          {title && <h3 className="text-sm font-bold text-slate-900">{title}</h3>}
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </header>
    )}
    <div className={padded ? 'px-5 pb-5' : ''}>{children}</div>
  </section>
)

interface StatProps {
  label: string
  value: React.ReactNode
  hint?: string
}

export const Stat: React.FC<StatProps> = ({ label, value, hint }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
    <p className="text-lg font-bold text-slate-900 tabular-nums mt-1">{value}</p>
    {hint && <p className="text-[10px] text-slate-500 mt-0.5">{hint}</p>}
  </div>
)
