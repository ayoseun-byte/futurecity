import React from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyableValueProps {
  value?: string | null
  label?: string
  href?: string
  className?: string
  truncate?: boolean
}

/** A monospace value with a copy button, optionally linking out. */
export const CopyableValue: React.FC<CopyableValueProps> = ({
  value,
  label,
  href,
  className = '',
  truncate = true,
}) => {
  const [copied, setCopied] = React.useState(false)

  if (!value) {
    return <span className={`text-[11px] text-slate-400 ${className}`}>{label ? `${label}: ` : ''}Not available</span>
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const text = truncate && value.length > 22 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {label && <span className="text-[11px] text-slate-500">{label}</span>}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[11px] text-onion hover:underline break-all"
        >
          {text}
        </a>
      ) : (
        <span className="font-mono text-[11px] text-slate-800 break-all">{text}</span>
      )}
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy ${label ?? 'value'}`}
        className="text-slate-400 hover:text-slate-700 shrink-0"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </span>
  )
}
