import React from "react";
import styles from "./ErrorState.module.css";

interface ErrorStateProps {
    message?: string;
    onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message = "Something went wrong", onRetry }) => {
    return (
        <div className={styles.container}>
            <div className={styles.iconWrapper}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 8V12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 16H12.01" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            <h3 className={styles.title}>Error Loading Payment</h3>
            <p className={styles.message}>{message}</p>
            {onRetry && (
                <button className={styles.retryButton} onClick={onRetry}>
                    Try Again
                </button>
            )}
        </div>
    );
};
