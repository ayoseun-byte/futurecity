import React from 'react'
import type { MerchantStatus } from '../types'
import { CheckCircle2, Clock, AlertTriangle, XCircle, ShieldAlert, PauseCircle } from 'lucide-react'

interface StatusBadgeProps {
  status: MerchantStatus
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
          USDC payments: Active
        </span>
      )
    case 'verifying':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5 mr-1 text-amber-500 animate-pulse" />
          Verification in progress
        </span>
      )
    case 'verification_action_required':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
          <AlertTriangle className="w-3.5 h-3.5 mr-1 text-orange-500" />
          We need a little more information
        </span>
      )
    case 'verified':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-blue-500" />
          Verified: Create wallet to finish
        </span>
      )
    case 'invited':
    case 'terms_accepted':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Clock className="w-3.5 h-3.5 mr-1 text-indigo-500" />
          Finish setting up USDC payments
        </span>
      )
    case 'on_hold':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
          <ShieldAlert className="w-3.5 h-3.5 mr-1 text-slate-500" />
          USDC payments are under review
        </span>
      )
    case 'rejected':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3.5 h-3.5 mr-1 text-rose-500" />
          We couldn't verify your business
        </span>
      )
    case 'disabled':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300">
          <PauseCircle className="w-3.5 h-3.5 mr-1 text-gray-500" />
          USDC payments are off
        </span>
      )
    case 'suspended':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
          <XCircle className="w-3.5 h-3.5 mr-1 text-red-600" />
          USDC payments are paused
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {status}
        </span>
      )
  }
}
