import React from 'react'
import { X, Send, ShieldAlert } from 'lucide-react'

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
}

export const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-onion-200 overflow-hidden">
        <div className="bg-onion p-5 text-white flex items-center justify-between border-b border-onion-700">
          <div className="flex items-center space-x-2">
            <Send className="w-5 h-5 text-onion-200" />
            <h2 className="font-bold text-base">External wallet transfer</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-onion-700/60 transition text-onion-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 text-xs">
          <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <ShieldAlert className="mb-2 h-5 w-5 text-amber-700" />
            <p className="font-bold">Transfers are unavailable.</p>
            <p className="mt-1 leading-relaxed">A chain signer and transaction broadcaster are not configured. No transfer will be submitted or marked as confirmed.</p>
          </div>
          <button type="button" onClick={onClose} className="w-full rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-200">Close</button>
        </div>
      </div>
    </div>
  )
}
