import React, { useState } from 'react'
import {
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

export interface ConcernResolution {
  hasConcern: boolean
  severity: 'critical' | 'warning' | 'info' | 'success'
  badgeLabel: string
  issueTitle: string
  explanation: string
  actionParty: 'PSP' | 'Merchant' | 'Compliance' | 'None'
  recommendedAction: string
  actionKey?: 'copy_link' | 'edit_profile' | 'retry_kyb' | 'view_reason'
}

export function resolveMerchantConcern(
  status: string,
  nextStep?: string | null,
  reasonCode?: string | null,
  reasonText?: string | null
): ConcernResolution {
  const normStatus = String(status || '').toLowerCase()
  const normCode = String(reasonCode || '').toLowerCase()
  const text = String(reasonText || '').toLowerCase()

  // 1. Prefill mismatch
  if (
    normCode === 'kyb_prefill_mismatch' ||
    text.includes('prefill') ||
    text.includes('pre-fill') ||
    text.includes('mismatch')
  ) {
    return {
      hasConcern: true,
      severity: 'critical',
      badgeLabel: 'Pre-fill Mismatch',
      issueTitle: 'KYB Registry Data Discrepancy',
      explanation:
        reasonText ||
        'Legal business name or license number does not match commercial registry records.',
      actionParty: 'PSP',
      recommendedAction:
        'PSP Action: Correct trade license or legal name in merchant profile, or confirm discrepancy.',
      actionKey: 'edit_profile',
    }
  }

  // 2. Sumsub retry required
  if (
    normCode === 'sumsub_retry_required' ||
    text.includes('additional document') ||
    text.includes('retry required')
  ) {
    return {
      hasConcern: true,
      severity: 'critical',
      badgeLabel: 'Doc Re-upload Required',
      issueTitle: 'Unreadable or Expired Document',
      explanation:
        reasonText ||
        'Institutional document verification requires re-upload (proof of address or license).',
      actionParty: 'Merchant',
      recommendedAction:
        'Merchant Action: Signatory must re-upload a utility bill under 90 days via onboarding link.',
      actionKey: 'copy_link',
    }
  }

  // 3. Sumsub API Failed
  if (
    normCode === 'sumsub_api_failed' ||
    text.includes('service temporarily unavailable')
  ) {
    return {
      hasConcern: true,
      severity: 'warning',
      badgeLabel: 'Verification Service Busy',
      issueTitle: 'Upstream Verification Provider Error',
      explanation:
        reasonText || 'Sumsub service temporarily timed out during verification.',
      actionParty: 'PSP',
      recommendedAction:
        'PSP Action: Click Sync DB to re-trigger verification check once service recovers.',
      actionKey: 'retry_kyb',
    }
  }

  // 4. In review / on hold
  if (
    normCode === 'sumsub_review_pending' ||
    normCode === 'verification_on_hold' ||
    normStatus === 'on_hold'
  ) {
    return {
      hasConcern: true,
      severity: 'warning',
      badgeLabel: 'Compliance Review Hold',
      issueTitle: 'Institutional Due Diligence Review',
      explanation: reasonText || 'Application under institutional compliance review.',
      actionParty: 'Compliance',
      recommendedAction:
        'Compliance Action: Awaiting Orki Compliance Officer review and sanction clearing.',
      actionKey: 'view_reason',
    }
  }

  // 5. Rejected
  if (normCode === 'sumsub_rejected' || normStatus === 'rejected') {
    return {
      hasConcern: true,
      severity: 'critical',
      badgeLabel: 'Application Rejected',
      issueTitle: 'Compliance Criteria Not Met',
      explanation:
        reasonText || 'Merchant business failed compliance screening.',
      actionParty: 'None',
      recommendedAction:
        'Merchant cannot be activated. Contact Orki support for review.',
      actionKey: 'view_reason',
    }
  }

  // 6. Action required generic fallback
  if (normStatus === 'verification_action_required') {
    return {
      hasConcern: true,
      severity: 'critical',
      badgeLabel: 'Action Required',
      issueTitle: 'Verification Incomplete',
      explanation:
        reasonText || 'Additional verification particulars needed before approval.',
      actionParty: 'Merchant',
      recommendedAction:
        'Merchant Action: Signatory must review onboarding steps and complete missing items.',
      actionKey: 'copy_link',
    }
  }

  // 7. Passkey pending
  if (nextStep === 'PASSKEY' || (normStatus === 'verified' && !text.includes('active'))) {
    return {
      hasConcern: true,
      severity: 'info',
      badgeLabel: 'Passkey Ceremony Pending',
      issueTitle: 'Smart Accounts Unlocked · Keys Unregistered',
      explanation:
        'KYB verification passed. Multi-chain settlement wallets require hardware passkey biometric enrollment.',
      actionParty: 'Merchant',
      recommendedAction:
        'Merchant Action: Signatory must open /setup ceremony link and enroll hardware passkey.',
      actionKey: 'copy_link',
    }
  }

  // 8. Terms pending
  if (nextStep === 'TERMS') {
    return {
      hasConcern: true,
      severity: 'info',
      badgeLabel: 'Terms Acceptance Pending',
      issueTitle: 'Hosted Legal Agreement Unsigned',
      explanation:
        'Merchant has completed initial business profile, pending Terms of Service acceptance.',
      actionParty: 'Merchant',
      recommendedAction:
        'Merchant Action: Signatory must sign hosted terms (/tos/:token) to proceed to verification.',
      actionKey: 'copy_link',
    }
  }

  // Active / Normal
  return {
    hasConcern: false,
    severity: 'success',
    badgeLabel: 'Operational',
    issueTitle: 'Fully Operational',
    explanation: 'Merchant is active and processing payments normally.',
    actionParty: 'None',
    recommendedAction: 'No action required.',
  }
}

interface MerchantConcernBadgeProps {
  status: string
  nextStep?: string | null
  statusReasonCode?: string | null
  statusReason?: string | null
  merchantId?: string
  externalId?: string
  onCopyOnboardingLink?: () => void
}

export const MerchantConcernBadge: React.FC<MerchantConcernBadgeProps> = ({
  status,
  nextStep,
  statusReasonCode,
  statusReason,
  merchantId,
  externalId,
  onCopyOnboardingLink,
}) => {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const concern = resolveMerchantConcern(status, nextStep, statusReasonCode, statusReason)

  if (!concern.hasConcern) {
    return null
  }

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onCopyOnboardingLink) {
      onCopyOnboardingLink()
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      const link = `${window.location.origin}/setup?merchantId=${merchantId || ''}`
      navigator.clipboard.writeText(link).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  // Severity style tokens
  const containerStyles =
    concern.severity === 'critical'
      ? 'bg-rose-50/90 border-rose-200 text-rose-900'
      : concern.severity === 'warning'
      ? 'bg-amber-50/90 border-amber-200 text-amber-900'
      : 'bg-indigo-50/90 border-indigo-200 text-indigo-900'

  const badgeStyles =
    concern.severity === 'critical'
      ? 'bg-rose-100 text-rose-700 border-rose-300'
      : concern.severity === 'warning'
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-indigo-100 text-indigo-700 border-indigo-300'

  const actorBadgeStyles =
    concern.actionParty === 'PSP'
      ? 'bg-onion-100 text-onion-900 border-onion-300'
      : concern.actionParty === 'Merchant'
      ? 'bg-blue-100 text-blue-800 border-blue-300'
      : 'bg-slate-100 text-slate-700 border-slate-300'

  return (
    <div className={`mt-1.5 rounded-lg border p-2 text-xs transition-all ${containerStyles}`}>
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-1.5 font-semibold text-[11px]">
          {concern.severity === 'critical' ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          ) : concern.severity === 'warning' ? (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          ) : (
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          )}
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeStyles}`}>
            {concern.badgeLabel}
          </span>
          {concern.actionParty !== 'None' && (
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${actorBadgeStyles}`}>
              {concern.actionParty} Action Needed
            </span>
          )}
        </div>
        <button
          type="button"
          className="text-slate-500 hover:text-slate-800 p-0.5"
          title={expanded ? 'Hide concern details' : 'Show concern details & resolution'}
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded ? (
        <div className="mt-2 space-y-2 pt-2 border-t border-current/15 text-[11px]">
          <div>
            <div className="font-semibold text-slate-900">{concern.issueTitle}</div>
            <p className="text-slate-700 text-[10.5px] mt-0.5 leading-relaxed">
              {concern.explanation}
            </p>
          </div>

          <div className="rounded bg-white/70 p-2 border border-current/10 space-y-1">
            <div className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
              What Needs To Be Done:
            </div>
            <div className="font-medium text-slate-900 leading-snug">
              {concern.recommendedAction}
            </div>
          </div>

          {/* Action triggers */}
          <div className="flex items-center space-x-2 pt-0.5">
            {concern.actionKey === 'copy_link' && (
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-[10.5px] font-semibold text-slate-800 shadow-2xs transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-500" />
                    <span>Copy Setup Link</span>
                  </>
                )}
              </button>
            )}
            <a
              href={`/psp/merchants/${merchantId || externalId}`}
              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-900 text-white hover:bg-slate-800 rounded text-[10.5px] font-semibold shadow-2xs transition"
            >
              <span>Manage Merchant</span>
            </a>
          </div>
        </div>
      ) : (
        <div className="text-[10px] text-slate-600 mt-1 truncate">
          👉 {concern.recommendedAction}
        </div>
      )}
    </div>
  )
}
