import React from 'react'
import { ArrowDownRight, ShieldAlert, X } from 'lucide-react'

interface OffRampModalProps {
  isOpen: boolean
  onClose: () => void
}

export const OffRampModal: React.FC<OffRampModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-onion-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-onion-700 bg-onion p-5 text-white">
          <div className="flex items-center space-x-2">
            <ArrowDownRight className="h-5 w-5 text-onion-200" />
            <h2 className="text-base font-bold">Convert crypto to fiat</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-onion-200 transition hover:bg-onion-700/60 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-6 text-xs">
          <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <ShieldAlert className="mb-2 h-5 w-5 text-amber-700" />
            <p className="font-bold">Fiat payout is unavailable.</p>
            <p className="mt-1 leading-relaxed">No payout provider is configured. The backend only provides indicative quotes and will not create or dispatch a payout.</p>
          </div>
          <button type="button" onClick={onClose} className="w-full rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-200">Close</button>
        </div>
      </div>
    </div>
  )
}
