import React from "react";
import styles from "./PaymentCard.module.css";
import { useQuoteCountdown } from "@/hooks/useQuoteCountdown";

interface QuoteRefreshButtonProps {
    onRefresh: () => void;
    enabled?: boolean;
}

const RADIUS = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const QuoteRefreshButton: React.FC<QuoteRefreshButtonProps> = ({
    onRefresh,
    enabled = false
}) => {
    const { secondsLeft, progress, refresh } = useQuoteCountdown({
        intervalMs: 60000,
        onRefresh: onRefresh,
        enabled: enabled,
    });

    // Calculate the SVG stroke offset based on the remaining progress
    const strokeDashoffset = CIRCUMFERENCE * progress;

    return (
        <button
            type="button"
            className={styles.refreshButton}
            onClick={refresh}
        >
            <svg
                className={styles.countdownRing}
                width="20"
                height="20"
                viewBox="0 0 20 20"
                aria-hidden="true"
            >
                {/* Background Track */}
                <circle
                    cx="10"
                    cy="10"
                    r={RADIUS}
                    fill="none"
                    strokeWidth="2"
                    className={styles.countdownTrack}
                />
                {/* Draining Arc */}
                <circle
                    cx="10"
                    cy="10"
                    r={RADIUS}
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    className={styles.countdownArc}
                    style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
                />
            </svg>
            <span className={styles.countdownLabel}>Refresh in {secondsLeft}s</span>
        </button>
    );
};