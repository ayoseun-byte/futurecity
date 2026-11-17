import React from "react";
import styles from "./PaymentStatusModal.module.css";
import CloseIcon from "@/assets/CloseIcon";
import WarningIcon from "@/assets/WarningIcon";
import Button from "../Button/Button";
import * as Dialog from "@radix-ui/react-dialog";
import { formatAddress } from "@/utils";
import { Copiable } from "../Copiable/Copiable";

// "unrecorded": the payment was sent on-chain but the backend never recorded it
type PaymentStatus =
    | "submitted"
    | "pending"
    | "confirmed"
    | "failed"
    | "unrecorded";

interface PaymentStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRetry?: () => void;
    status: PaymentStatus;
    transactionRef?: string;
    gatewayPaymentId?: string;
    txHash?: string;
    error?: string | null;
}

const statusConfig: Record<
    PaymentStatus,
    { title: string; subtitle: string; variant: string }
> = {
    submitted: {
        title: "Payment Submitted",
        subtitle: "Your transaction has been submitted and is being processed.",
        variant: "submitted",
    },
    pending: {
        title: "Payment Pending",
        subtitle: "Your transaction is being confirmed on the network.",
        variant: "pending",
    },
    confirmed: {
        title: "Payment Confirmed",
        subtitle: "Your payment has been confirmed successfully!",
        variant: "submitted",
    },
    failed: {
        title: "Payment Failed",
        subtitle: "There was an issue processing your payment.",
        variant: "failed",
    },
    unrecorded: {
        title: "Payment Not Recorded",
        subtitle:
            "Your payment was sent but couldn't be recorded. Don't pay again. Contact the merchant with the transaction hash below.",
        variant: "failed",
    },
};

export const PaymentStatusModal: React.FC<PaymentStatusModalProps> = ({
    isOpen,
    onClose,
    onRetry,
    status,
    transactionRef,
    gatewayPaymentId,
    txHash,
    error,
}) => {
    if (!isOpen) return null;

    const config = statusConfig[status];
    const isFailed = status === "failed";
    const isUnrecorded = status === "unrecorded";
    const isProcessing = status === "submitted" || status === "pending";

    const handleClose = () => {
        if (!isProcessing) onClose();
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => {
            if (!open) handleClose();
        }}>
            <Dialog.Portal>
                <Dialog.Overlay className={styles.modalOverlay} />
                <Dialog.Content
                    className={styles.modal}
                    onInteractOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => {
                        if (isProcessing) e.preventDefault();
                    }}
                >
                    {!isProcessing && (
                        <button className={styles.closeBtn} onClick={handleClose}>
                            <CloseIcon />
                        </button>
                    )}

                    <div className={styles.statusIcon}>
                        {isFailed || isUnrecorded ? (
                            <div className={`${styles.iconCircle} ${styles.failed}`}>
                                <WarningIcon width={48} height={48} />
                            </div>
                        ) : (
                            <div
                                className={`${styles.iconCircle} ${styles[config.variant]}`}
                            >
                                <div
                                    className={`${styles.spinner} ${styles[config.variant]}`}
                                />
                            </div>
                        )}
                    </div>

                    <Dialog.Title className={styles.title}>{config.title}</Dialog.Title>
                    <Dialog.Description className={styles.subtitle}>{config.subtitle}</Dialog.Description>

                    <div
                        className={`${styles.statusBadge} ${styles[config.variant]}`}
                    >
                        <span>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                    </div>

                    <div className={styles.detailsSection}>
                        <div className={styles.detailsWrapper}>
                            {gatewayPaymentId && (
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Payment ID</span>
                                    <Copiable text={gatewayPaymentId}>
                                        <span className={styles.detailValue}>
                                            {formatAddress(gatewayPaymentId)}
                                        </span>
                                    </Copiable>
                                </div>
                            )}
                            {transactionRef && (
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Reference</span>
                                    <Copiable text={transactionRef}>
                                        <span className={styles.detailValue}>
                                            {formatAddress(transactionRef)}
                                        </span>
                                    </Copiable>
                                </div>
                            )}
                            {txHash && (
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Transaction</span>
                                    <Copiable text={txHash}>
                                        <span className={styles.detailValue}>
                                            {formatAddress(txHash)}
                                        </span>
                                    </Copiable>
                                </div>
                            )}
                            {error && (
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Error</span>
                                    <span className={styles.detailValue}>{error}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.actions}>
                        {!isProcessing && (
                            <Button
                                variant="secondary"
                                className={styles.closeModalBtn}
                                onClick={handleClose}
                            >
                                Close
                            </Button>
                        )}
                        {isFailed && onRetry && (
                            <Button variant="primary" onClick={onRetry}>
                                Retry Payment
                            </Button>
                        )}
                        {isProcessing && (
                            <Button variant="primary" disabled>
                                Processing...
                            </Button>
                        )}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
