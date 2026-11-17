import React, { useRef, useState } from "react";
import styles from "./SuccessModal.module.css";
import LargeCheckIcon from "@/assets/LargeCheckIcon";
import CloseIcon from "@/assets/CloseIcon";
import ExternalLinkIcon from "@/assets/ExternalLinkIcon";
import Button from "../Button/Button";
import DownloadIcon from "@/assets/DownloadIcon";
import * as Dialog from "@radix-ui/react-dialog";
import { Copy } from "../Copy/Copy";
import { clipAmount, formatAddress } from "@/utils";
import { generateReceiptPdf } from "@/utils/generateReceiptPdf";
import { Copiable } from "../Copiable/Copiable";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  network: string;
  tokenSymbol?: string;
  txHash?: string;
  fromAddress?: string;
  toAddress?: string;
  explorerUrl: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  amount,
  network,
  tokenSymbol,
  txHash,
  fromAddress,
  toAddress,
  explorerUrl,
}) => {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadReceipt = async () => {
    setIsDownloading(true);
    try {
      generateReceiptPdf({ amount, network, tokenSymbol, txHash, fromAddress, toAddress, explorerUrl });
    } catch (err) {
      console.error("Failed to generate receipt:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.modalOverlay} />
        <Dialog.Content
          className={styles.modal}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <button className={styles.closeBtn} onClick={onClose}>
            <CloseIcon />
          </button>

          <div className={styles.successIcon}>
            <div className={styles.checkmarkCircle}>
              <LargeCheckIcon />
            </div>
          </div>
          <Dialog.Title className={styles.successTitle}>Payment Successful</Dialog.Title>
          <Dialog.Description className={styles.successSubtitle}>
            Thank you for your purchase!
          </Dialog.Description>
          <div className={styles.successAmount}>
            {clipAmount(amount)} {tokenSymbol}
          </div>

          <div className={styles.transactionDetails}>
            <div className={styles.detailsWrapper}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Amount Paid</span>
                <span className={styles.detailValue}>
                  {clipAmount(amount)} {tokenSymbol}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Network</span>
                <span className={styles.detailValue}>{network}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Date & Time</span>
                <span className={styles.detailValue}>
                  {new Date().toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}{" "}
                  {new Date().toLocaleTimeString("en-US", {
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              {fromAddress && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>From</span>
                  <Copiable text={fromAddress}>
                    <span title={fromAddress} className={styles.detailValue}>
                      {formatAddress(fromAddress)}
                    </span>
                  </Copiable>
                </div>
              )}
              {toAddress && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>To</span>
                  <Copiable text={toAddress}>
                    <span title={toAddress} className={styles.detailValue}>
                      {formatAddress(toAddress)}
                    </span>
                  </Copiable>
                </div>
              )}
              {txHash && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Transaction Hash</span>
                </div>
              )}
            </div>

            {txHash && (
              <>
                <div title={txHash} className={styles.hashValue}>
                  {formatAddress(txHash)}
                  <Copy text={txHash} color="#474747" />
                </div>
                <a
                  href={explorerUrl || "#"}
                  className={styles.explorerLink}
                  ref={linkRef}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  View on Explorer <ExternalLinkIcon />
                </a>
              </>
            )}
          </div>

          <div className={styles.successActions}>
            <Button variant="secondary" className={styles.closeModalBtn} onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              className={styles.downloadBtn}
              onClick={handleDownloadReceipt}
              disabled={isDownloading}
            >
              <DownloadIcon /> {isDownloading ? "Downloading..." : "Download Receipt"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};