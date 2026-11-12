import React from 'react'
import { ChevronDown } from 'lucide-react'

interface JsonBlockProps {
  value: unknown
  label?: string
  collapsed?: boolean
  className?: string
}

/** Pretty-printed JSON with a collapsible body. */
export const JsonBlock: React.FC<JsonBlockProps> = ({ value, label, collapsed = true, className = '' }) => {
  const [open, setOpen] = React.useState(!collapsed)
  const text = React.useMemo(() => {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }, [value])

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
      >
        <span>{label ?? 'payload'}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <pre className="px-3 pb-3 pt-1 text-[10.5px] leading-relaxed font-mono text-slate-700 overflow-x-auto max-h-96 whitespace-pre-wrap break-all">
          {text}
        </pre>
      )}
    </div>
  )
}
