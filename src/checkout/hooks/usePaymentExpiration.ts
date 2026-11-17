import { useEffect, useMemo, useState } from "react";

export interface UsePaymentExpirationOptions {
  expiresAt?: string | null;
  chargeStatus?: string | null;
  enabled?: boolean;
  // The checkout closes this long before `expiresAt`, leaving time to sign,
  // confirm and submit a payment before the backend's cut-off
  safetyMarginMs?: number;
  // While a payment is on-chain / confirming / done, never flip the UI to "expired"
  isCompletedOrInFlight?: boolean;
}

export interface UsePaymentExpirationResult {
  isExpired: boolean;
  timeLeftMs: number;
  formattedTimeLeft: string;
  hasExpiry: boolean;
  // When the checkout closes (`expiresAt` minus the safety margin), which is
  // what the payer sees as the expiry
  expirationDate: Date | null;
  deadlineMs: number | null;
  isUrgent: boolean;
}

const URGENT_THRESHOLD_MS = 2 * 60 * 1000;

export const parseExpiry = (val?: string | number | null): number | null => {
  if (!val) return null;
  if (typeof val === "number") {
    return val > 1e11 ? val : val * 1000;
  }
  const trimmed = val.trim();
  if (!trimmed) return null;

  // Check if string is purely numeric epoch timestamp
  const num = Number(trimmed);
  if (!isNaN(num) && num > 0) {
    return num > 1e11 ? num : num * 1000;
  }

  // Parse ISO 8601 or other Date string
  const parsed = new Date(trimmed).getTime();
  return isNaN(parsed) ? null : parsed;
};

export const formatDuration = (ms: number): string => {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");

  if (hours > 0) {
    const hh = hours.toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
};

export const usePaymentExpiration = ({
  expiresAt,
  chargeStatus,
  enabled = true,
  safetyMarginMs = 0,
  isCompletedOrInFlight = false,
}: UsePaymentExpirationOptions): UsePaymentExpirationResult => {
  const expiryMs = useMemo(() => parseExpiry(expiresAt), [expiresAt]);
  const targetMs = expiryMs === null ? null : expiryMs - safetyMarginMs;
  const hasExpiry = Boolean(enabled && targetMs !== null);

  // Time left is derived from `now` on every render, so it is correct on the
  // very first render after payment details load (no flash of "expired").
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!hasExpiry || targetMs === null) return;

    setNow(Date.now());
    if (Date.now() >= targetMs) return;

    const intervalId = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= targetMs) clearInterval(intervalId);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [hasExpiry, targetMs]);

  const timeLeftMs =
    hasExpiry && targetMs !== null ? Math.max(0, targetMs - now) : 0;

  const isServerExpired = chargeStatus?.toLowerCase() === "expired";
  const isTimeExpired = hasExpiry && timeLeftMs <= 0;

  const isExpired =
    !isCompletedOrInFlight && (isServerExpired || isTimeExpired);

  return {
    isExpired,
    timeLeftMs,
    formattedTimeLeft: formatDuration(timeLeftMs),
    hasExpiry,
    expirationDate: targetMs !== null ? new Date(targetMs) : null,
    deadlineMs: hasExpiry ? targetMs : null,
    isUrgent: hasExpiry && timeLeftMs > 0 && timeLeftMs <= URGENT_THRESHOLD_MS,
  };
};
