import React from "react";
import { Skeleton } from "../Skeleton/Skeleton";
import styles from "./LoadingState.module.css";

interface LoadingStateProps {
  isDynamic?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ isDynamic }) => {
    return (
        <div className={styles.container}>
            {/* Header Skeleton */}
            <div className={styles.header}>
                <Skeleton width={80} height={32} borderRadius={8} /> {/* Logo */}
                <div className={styles.headerRight}>
                    <Skeleton width={120} height={32} borderRadius={20} /> {/* Wallet Badge */}
                    <Skeleton width={150} height={32} borderRadius={8} /> {/* Address */}
                </div>
            </div>

            <div
                className={`${styles.content} ${
                    isDynamic ? styles.dynamicContent : ""
                }`}
            >
                {/* Product Card Skeleton */}
                {!isDynamic && (
                    <div className={styles.productCard}>
                        <Skeleton width={100} height={16} style={{ marginBottom: 8 }} /> {/* Recipient Label */}
                        <Skeleton width={200} height={24} style={{ marginBottom: 16 }} /> {/* Title */}

                        <Skeleton width="100%" height={200} borderRadius={16} style={{ marginBottom: 16 }} /> {/* Image */}

                        <div className={styles.productFooter}>
                            <Skeleton width={80} height={16} />
                            <Skeleton width={60} height={16} />
                        </div>
                    </div>
                )}

                {/* Payment Card Skeleton */}
                <div className={styles.paymentCard}>
                    <Skeleton width={100} height={16} style={{ marginBottom: 8 }} />
                    <Skeleton width="100%" height={48} borderRadius={8} style={{ marginBottom: 16 }} /> {/* Token Dropdown */}

                    <Skeleton width={100} height={16} style={{ marginBottom: 8 }} />
                    <Skeleton width="100%" height={48} borderRadius={8} style={{ marginBottom: 24 }} /> {/* Network Dropdown */}

                    {/* Price Box */}
                    <div className={styles.priceBox}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <Skeleton width={80} height={16} />
                            <Skeleton width={40} height={16} />
                        </div>
                        <Skeleton width={160} height={32} style={{ marginBottom: 8 }} />
                        <Skeleton width={100} height={16} />
                    </div>

                    <Skeleton width={150} height={16} style={{ marginBottom: 16 }} />

                    <Skeleton width="100%" height={48} borderRadius={8} /> {/* Pay Button */}

                    <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
                        <Skeleton width={20} height={16} />
                    </div>

                    <Skeleton width="100%" height={48} borderRadius={8} /> {/* QR Button */}
                </div>
            </div>
        </div>
    );
};
