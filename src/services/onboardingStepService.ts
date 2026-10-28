import type { Merchant, OnboardingStep } from '../types'

export const ONBOARDING_STEP_RANKS: Record<OnboardingStep, number> = {
  OPT_IN: 0,
  NOTICE: 1,
  KYB_INFORMATION: 2,
  TERMS: 3,
  SUMSUB: 4,
  PASSKEY: 5,
  COMPLETED: 6,
}

export const ONBOARDING_STEPS_BY_RANK: (OnboardingStep | null)[] = [
  'OPT_IN',
  'NOTICE',
  'KYB_INFORMATION',
  'TERMS',
  'SUMSUB',
  'PASSKEY',
  null, // 6 is COMPLETED
]

/**
 * Compute the milestone rank that the merchant has already completed based on persistent flags/timestamps.
 * Rank hierarchy:
 * 0: OPT_IN
 * 1: NOTICE
 * 2: KYB_INFORMATION
 * 3: TERMS
 * 4: SUMSUB
 * 5: PASSKEY
 * 6: COMPLETED (null next_step, status ACTIVE)
 */
export function getMerchantMilestoneRank(merchant: Partial<Merchant>): number {
  const statusUpper = merchant.status?.toUpperCase()

  // Rank 6: COMPLETED (Active or Passkey ceremony fully finished)
  if (statusUpper === 'ACTIVE' || merchant.activatedAt || merchant.passkeyRegisteredAt) {
    return 6
  }

  // Rank 5: PASSKEY (Sumsub completed / verified)
  if (statusUpper === 'VERIFIED' || merchant.verifiedAt || merchant.sumsubCompletedAt) {
    return 5
  }

  // Rank 4: SUMSUB (Terms accepted or currently verifying)
  if (
    statusUpper === 'VERIFYING' ||
    merchant.status?.toLowerCase() === 'terms_accepted' ||
    statusUpper === 'TERMS_ACCEPTED' ||
    merchant.termsAcceptedAt
  ) {
    return 4
  }

  // Rank 3: TERMS (KYB Information submitted)
  if (merchant.kybInformationSubmittedAt) {
    return 3
  }

  // Rank 2: KYB_INFORMATION (Notice acknowledged)
  if (merchant.noticeAcknowledgedAt) {
    return 2
  }

  return 0
}

/**
 * Monotonically resolve the merchant's onboarding step.
 * A merchant will NEVER be taken back to a previous step unless isEnforcedByAdmin is true.
 */
export function resolveMonotonicStep(
  merchant: Partial<Merchant>,
  proposedStep?: OnboardingStep | string | null,
  isEnforcedByAdmin = false
): OnboardingStep | null {
  if (isEnforcedByAdmin) {
    if (!proposedStep || proposedStep.toUpperCase() === 'COMPLETED') return null
    return proposedStep as OnboardingStep
  }

  const milestoneRank = getMerchantMilestoneRank(merchant)

  let proposedRank = 0
  if (proposedStep) {
    const cleanProposed = proposedStep.toUpperCase() as OnboardingStep
    proposedRank = ONBOARDING_STEP_RANKS[cleanProposed] ?? 0
  }

  let existingNextStepRank = 0
  if (merchant.nextStep) {
    const cleanNext = merchant.nextStep.toUpperCase() as OnboardingStep
    existingNextStepRank = ONBOARDING_STEP_RANKS[cleanNext] ?? 0
  }

  const effectiveRank = Math.max(milestoneRank, proposedRank, existingNextStepRank)

  return ONBOARDING_STEPS_BY_RANK[effectiveRank] ?? null
}
