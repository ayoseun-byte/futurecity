import React from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
  icon?: React.ReactNode
}

const variants: Record<ButtonVariant, string> = {
  primary: 'mat-btn-primary',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  loading = false,
  icon,
  className = '',
  children,
  disabled,
  ...rest
}) => (
  <button
    type="button"
    disabled={disabled || loading}
    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    {...rest}
  >
    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
    {children}
  </button>
)
