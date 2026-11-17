"use client";

import type { get_createAShortLivedExchangeRateQuoteForAPayment } from "@/api-services/types/publicPayments/get_createAShortLivedExchangeRateQuoteForAPayment";
import type {
  CheckoutInvoice,
  CustomerInfo,
  get_paymentDetailsForPayer,
} from "@/api-services/types/publicPayments/get_paymentDetailsForPayer";
import poweredLogo from "@/assets/powered-logo.svg";
import qrcodeIcon from "@/assets/qrcode-icon.svg";
import usdcIcon from "@/assets/tokens/usdc.svg";
import WarningIcon from "@/assets/WarningIcon";
import { clipAmount } from "@/utils";
import React, { useEffect, useState } from "react";
import { AdditionalInformation } from "../AdditionalInformation/AdditionalInformation";
import Button from "../Button/Button";
import {
  DropdownSelector,
  type SelectorOption,
} from "../DropdownSelector/DropdownSelector";
import { QRCodeModal } from "../QRCodeModal/QRCodeModal";
import { Tooltip } from "../Tooltip/Tooltip";
import styles from "./PaymentCard.module.css";
import { QuoteRefreshButton } from "./QuoteRefreshButton";

interface PaymentCardProps {
  isWalletConnected: boolean;
  itemPrice: number;
  priceDenomination: string;
  cryptoOptions: get_paymentDetailsForPayer["crypto_options"];
  selectedNetwork: SelectorOption | null;
  selectedToken: SelectorOption | null;
  isLoading?: boolean;
  loadingText?: string;
  requiresCustomerInfo: boolean;
  customerInfo: CustomerInfo;
  isFormValid: boolean;
  quote?: get_createAShortLivedExchangeRateQuoteForAPayment;
  nativeBalance?: number | null;
  tokenBalance?: number | null;
  nativeSymbol?: string;
  tokenSymbol?: string;
  isNativeToken: boolean;
  tokenBalances?: { symbol: string; balance: number }[];
  isQuoteError: boolean;
  quoteError: any;
  invoice?: CheckoutInvoice | null;
  onPay: () => void;
  refetchQuote: () => void;
  disableQuoteRefresh?: boolean;
  onConnectWallet: () => void;
  onNetworkSelect: (option: SelectorOption | null) => void;
  onTokenSelect: (option: SelectorOption) => void;
  onCustomerInfoChange: (data: Record<string, string>) => void;
  onValidate: (isValid: boolean) => void;
}
export const PaymentCard: React.FC<PaymentCardProps> = ({
  isWalletConnected,
  itemPrice,
  priceDenomination,
  cryptoOptions,
  selectedNetwork,
  selectedToken,
  isLoading = false,
  loadingText,
  requiresCustomerInfo,
  customerInfo,
  isFormValid,
  quote,
  nativeBalance,
  tokenBalance,
  nativeSymbol,
  tokenSymbol,
  isNativeToken,
  tokenBalances = [],
  isQuoteError,
  quoteError,
  invoice,
  onPay,
  onValidate,
  refetchQuote,
  disableQuoteRefresh = false,
  onTokenSelect,
  onConnectWallet,
  onNetworkSelect,
  onCustomerInfoChange,
}) => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSufficientBalance, setIsSufficientBalance] = useState(true);

  const quoteReady = !!selectedNetwork && !!selectedToken;

  const tokens: SelectorOption[] = cryptoOptions.map((opt) => {
    const symUpper = (opt.slug ?? opt.id ?? "").toUpperCase();
    const bal = tokenBalances.find(
      (t) => t.symbol.toLowerCase() === symUpper.toLowerCase(),
    );
    return {
      id: opt.id,
      name: symUpper,
      subtitle: opt.title,
      icon: opt.logo,
      symbol: symUpper,
      networks: opt.networks,
      balance: bal?.balance,
    };
  });

  const selectedCryptoOption = cryptoOptions.find(
    (opt) => opt.id === selectedToken?.id,
  );

  const networks: SelectorOption[] = selectedCryptoOption
    ? selectedCryptoOption.networks.map((net) => ({
        id: net.id,
        name: net.title,
        icon: net.logo,
        symbol: (net.slug ?? net.id ?? "").toUpperCase(),
        tokenAddress: net.token_address,
      }))
    : [];

  const handleTokenSelect = (token: SelectorOption) => {
    onTokenSelect(token);
    onNetworkSelect(null);
  };

  useEffect(() => {
    if (typeof window !== "undefined") setCurrentUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (quote && quoteReady) {
      const rentFee = 0.0021;
      const compareAmount = isNativeToken ? nativeBalance : tokenBalance;
      setIsSufficientBalance(
        Number(compareAmount) > Number(quote.target_amount) + rentFee,
      );
    }
  }, [quote, nativeBalance, tokenBalance, quoteReady]);

  const fee = 0;
  const totalPrice = itemPrice + fee;

  const invoiceSummary =
    invoice && invoice.number ? (
      <div className={styles.invoiceSummary}>
        <div className={styles.invoiceRow}>
          <span className={styles.invoiceTitle}>Invoice #{invoice.number}</span>
          {invoice.dueAt && <span>Due {invoice.dueAt}</span>}
        </div>
        {(invoice.billTo?.name || invoice.billTo?.email || invoice.issuedAt) && (
          <div className={styles.invoiceRow}>
            <span>
              {invoice.billTo?.name || invoice.billTo?.email
                ? `Bill to: ${[invoice.billTo?.name, invoice.billTo?.email].filter(Boolean).join(" · ")}`
                : ""}
            </span>
            {invoice.issuedAt && <span>Issued {invoice.issuedAt}</span>}
          </div>
        )}
      </div>
    ) : null;

  if (!isWalletConnected) {
    return (
      <div className={styles.paymentCard}>
        <div className={styles.paymentHeader}>
          <span className={styles.usdcIcon}>
            <img src={usdcIcon} alt="" />
          </span>
          <span>Pay with {priceDenomination}</span>
        </div>
        {invoiceSummary}
        <div className={styles.totalPrice}>
          <span className={styles.priceLabel}>Total price</span>
          <div className={styles.priceAmount}>
            {itemPrice.toFixed(2)} {priceDenomination}
          </div>
        </div>
        <div className={styles.buttonWrapper}>
          <Button variant="primary" onClick={onConnectWallet}>
            CONNECT WALLET
          </Button>
        </div>
        <div className={styles.poweredBy}>
          <img src={poweredLogo} alt="" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.paymentCard}>
      {invoiceSummary}
      <div className={styles.dropdownWrapper}>
        <DropdownSelector
          options={tokens}
          selectedOption={selectedToken}
          onSelect={handleTokenSelect}
          label="Pay with"
        />

        <DropdownSelector
          options={networks}
          selectedOption={selectedNetwork}
          onSelect={onNetworkSelect}
          label="Network"
        />
      </div>
      {cryptoOptions.length === 0 && (
        <div className={styles.error}>
          <WarningIcon style={{ flex: "0 0 auto" }} /> No accepted tokens or networks are currently available for this payment.
        </div>
      )}
      <br />
      {isWalletConnected &&
        nativeBalance !== null &&
        nativeBalance !== undefined && (
          <div className={styles.balance}>
            <div>
              {isNativeToken ? "Available Balance" : "Network Balance"}{" "}
              <Tooltip text="This balance covers the gas fees required by the network to process your transactions." />{" "}
              :{" "}
              <span>
                {clipAmount(nativeBalance)} {nativeSymbol}
              </span>
            </div>
            {tokenBalance !== null &&
              tokenBalance !== undefined &&
              !isNativeToken && (
                <div>
                  {selectedToken?.name} Balance:{" "}
                  <span>
                    {clipAmount(tokenBalance)} {tokenSymbol}
                  </span>
                </div>
              )}
          </div>
        )}

      <div className={styles.priceBreakdown}>
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>Total Price</span>

          {quoteReady && (
            <QuoteRefreshButton
              enabled={quoteReady && !isLoading && !disableQuoteRefresh}
              onRefresh={refetchQuote}
            />
          )}
        </div>

        <div className={styles.totalAmount}>
          {totalPrice.toFixed(2)}{" "}
          <span className={styles.currency}>{priceDenomination}</span>
        </div>
        {quote ? (
          <>
            <div className={styles.rate}>
              ≈ {clipAmount(quote.target_amount, 4)}{" "}
              {quote.target_currency?.toUpperCase()}{" "}
              {quote.route_cost && "(gas fee included)"}
            </div>

            {quote.route_cost && (
              <div className={styles.gasFeeRowContainer}>
                <hr />
                <div className={styles.gasFeeRow}>
                  <span>Gas Fee:</span> ≈{" "}
                  {clipAmount(quote?.route_cost || "", 2)}{" "}
                  {quote?.target_currency}{" "}
                  <span>(~${clipAmount(quote?.route_cost_usd || "", 2)})</span>
                </div>
              </div>
            )}
          </>
        ) : isQuoteError ? (
          <div className={styles.error}>
            <WarningIcon style={{ flex: "0 0 auto" }} />{" "}
            {quoteError?.message || "Failed to fetch quote"}
          </div>
        ) : null}
      </div>

      {!isSufficientBalance && (
        <div className={styles.error}>
          <WarningIcon /> Insufficient{" "}
          {isNativeToken ? nativeSymbol : tokenSymbol} balance to pay for this
          transaction
        </div>
      )}

      {requiresCustomerInfo && (
        <>
          <div className={styles.separator}></div>
          <AdditionalInformation
            customerInfo={customerInfo}
            onChange={onCustomerInfoChange}
            onValidate={onValidate}
          />
        </>
      )}

      <div className={styles.terms}>
        <input
          style={{ width: "16px", height: "16px" }}
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
        />{" "}
        <span>
          I agree to the{" "}
          <a
            href="https://www.orki.io/terms-of-service"
            target="_blank"
            rel="noreferrer noopener"
          >
            Terms & Conditions
          </a>{" "}
          and{" "}
          <a
            href="https://www.orki.io/privacy-policy"
            target="_blank"
            rel="noreferrer noopener"
          >
            Privacy Policy.
          </a>
        </span>
      </div>

      <Button
        variant="primary"
        onClick={isSufficientBalance ? onPay : undefined}
        // Ensures double-clicks are physically disabled while `isLoading` (mapped to isPaying) is true
        disabled={
          isLoading ||
          (requiresCustomerInfo && !isFormValid) ||
          !agreedToTerms ||
          !isSufficientBalance
        }
      >
        {isLoading ? loadingText || "PROCESSING..." : "PAY"}
      </Button>

      <div className={styles.divider}>
        <span>or</span>
      </div>

      <Button variant="secondary" onClick={() => setShowQRModal(true)}>
        <img src={qrcodeIcon} alt="" />
        <div>Pay with QR Code</div>
      </Button>

      <div className={styles.divider}></div>

      <QRCodeModal
        open={showQRModal}
        onOpenChange={setShowQRModal}
        qrCodeUrl={currentUrl}
      />

      <div className={styles.poweredBy}>
        <img src={poweredLogo} alt="" />
      </div>
    </div>
  );
};
