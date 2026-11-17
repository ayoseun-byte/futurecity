"use client";

import React from "react";
import styles from "./PaymentExpiredCard.module.css";
import Button from "../Button/Button";
import { formatAddress } from "@/utils";

interface PaymentExpiredCardProps {
  price?: string | number;
  priceDenomination?: string;
  expirationDate?: Date | null;
  identifier?: string;
  onReturnToMerchant: () => void;
}

export const PaymentExpiredCard: React.FC<PaymentExpiredCardProps> = ({
  price,
  priceDenomination,
  expirationDate,
  identifier,
  onReturnToMerchant,
}) => {
  const formattedExpiry = expirationDate
    ? `${expirationDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })} at ${expirationDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : null;

  return (
    <div className={styles.expiredCard}>
      <div className={styles.iconWrapper}>
        <div className={styles.iconCircle}>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.clockIcon}
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
      </div>

      <h2 className={styles.title}>Payment Expired</h2>
      <p className={styles.description}>
        This payment session has expired and can no longer accept transactions.
        Please return to the merchant to generate a new payment link.
      </p>

      <div className={styles.detailsCard}>
        {price !== undefined && price !== null && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Amount</span>
            <span className={styles.detailValue}>
              {Number(price).toFixed(2)} {priceDenomination}
            </span>
          </div>
        )}

        {formattedExpiry && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Expired at</span>
            <span className={styles.detailValue}>{formattedExpiry}</span>
          </div>
        )}

        {identifier && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Reference</span>
            <span className={styles.detailValue} title={identifier}>
              {formatAddress(identifier)}
            </span>
          </div>
        )}
      </div>

      <div className={styles.buttonWrapper}>
        <Button variant="primary" onClick={onReturnToMerchant}>
          Return to Merchant
        </Button>
      </div>
    </div>
  );
};
