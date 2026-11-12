import React from 'react'

interface FieldProps {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export const Field: React.FC<FieldProps> = ({ label, hint, required, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="block text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-1">
      {label}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </span>
    {children}
    {hint && <span className="block text-[10px] text-slate-400 mt-1">{hint}</span>}
  </label>
)

export const inputClass =
  'w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-onion-500 focus:outline-none bg-white'

export const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...rest }) => (
  <input className={`${inputClass} ${className}`} {...rest} />
)

export const SelectInput: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className = '',
  children,
  ...rest
}) => (
  <select className={`${inputClass} ${className}`} {...rest}>
    {children}
  </select>
)

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className = '',
  ...rest
}) => (
  <textarea className={`${inputClass} font-mono ${className}`} {...rest} />
)
