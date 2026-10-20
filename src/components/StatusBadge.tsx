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
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
          Active & Processing
        </span>
      )
    case 'verifying':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
          Verifying
        </span>
      )
    case 'verification_action_required':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-orange-50 text-orange-700 border border-orange-200/80">
          <AlertTriangle className="w-3 h-3 mr-1 text-orange-500" />
          Action Required
        </span>
      )
    case 'verified':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
          <CheckCircle2 className="w-3 h-3 mr-1 text-blue-500" />
          Verified · Passkey Pending
        </span>
      )
    case 'invited':
    case 'terms_accepted':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <Clock className="w-3 h-3 mr-1 text-slate-500" />
          Setup Required
        </span>
      )
    case 'on_hold':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
          <ShieldAlert className="w-3 h-3 mr-1 text-slate-500" />
          Under Review
        </span>
      )
    case 'rejected':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/80">
          <XCircle className="w-3 h-3 mr-1 text-rose-500" />
          Rejected
        </span>
      )
    case 'disabled':
    case 'suspended':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/80">
          <PauseCircle className="w-3 h-3 mr-1 text-rose-500" />
          Suspended
        </span>
      )
    default:
      return null
  }
}
