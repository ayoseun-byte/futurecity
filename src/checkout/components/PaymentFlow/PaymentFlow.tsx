"use client";

import {
  useGetCreateAShortLivedExchangeRateQuoteForAPaymentQuery,
  useGetPayerSelectableSwapTokensForAPaymentQuery,
  useGetPaymentDetailsForPayerQuery,
} from "@/api-services/generated";
import {
  useAppKit,
  useAppKitNetwork,
  useDisconnect,
} from "@reown/appkit/react";
import { useParams } from "react-router-dom";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import styles from "./PaymentFlow.module.css";

import type { get_checkPaymentStatus } from "@/api-services/types/publicPayments/get_checkPaymentStatus";
import type { SwapOptions } from "@/api-services/types/publicPayments/get_paymentDetailsForPayer";
import { usePaymentPolling } from "@/hooks/usePaymentPolling";
import { useTransfer } from "@/hooks/useTransfer";
import { emitWidgetEvent } from "@/utils/emitWidgetEvent";
import { findAppKitNetwork } from "@/utils/networkMapping";
import { parseMetaMaskError } from "@/utils/pareseMetamaskError";
import { formatBackendTokens } from "@/utils/paymentFormatters";
import type { SelectorOption } from "../DropdownSelector/DropdownSelector";
import { ErrorState } from "../ErrorState/ErrorState";
import { Header } from "../Header/Header";
import { LoadingState } from "../LoadingState/LoadingState";
import { PaymentCard } from "../PaymentCard/PaymentCard";
import { PaymentStatusModal } from "../PaymentStatusModal/PaymentStatusModal";
import { ProductCard } from "../ProductCard/ProductCard";
import { SuccessModal } from "../SuccessModal/SuccessModal";
import { useExecutePayment } from "./useExecutePayment";
import { usePaymentExpiration } from "@/hooks/usePaymentExpiration";
import { PaymentExpiredCard } from "../PaymentExpiredCard/PaymentExpiredCard";
import {
  PaymentCountdown,
  PaymentExpiredWhileSigningNotice,
} from "../PaymentCountdown/PaymentCountdown";

// The checkout closes this long before the merchant's expiry, so a payment
// signed at the last moment still reaches the backend in time
const PAYMENT_SAFETY_MARGIN_MS = 60_000;

const PaymentFlow: React.FC = () => {
  const [selectedToken, setSelectedToken] = useState<SelectorOption | null>(
    null,
  );
  const [selectedNetwork, setSelectedNetwork] = useState<SelectorOption | null>(
    null,
  );
  const [customerInfoData, setCustomerInfoData] = useState<
    Record<string, string>
  >({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isRefetchingForPay, setIsRefetchingForPay] = useState(false);
  const successCompletionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestSuccessResultRef = useRef<get_checkPaymentStatus | null>(null);
  const hasTriggeredSuccessCompletionRef = useRef(false);

  const params = useParams();
  const identifier = (params?.identifier || params?.paymentId || params?.slug || "") as string;
  const {
    data: pd,
    isLoading: isPdLoading,
    isError,
  } = useGetPaymentDetailsForPayerQuery(identifier);

  const isDynamicFromUrl = useMemo(() => {
    if (identifier?.startsWith("chg_")) return true;
    if (typeof window !== "undefined") {
      try {
        const search = new URLSearchParams(window.location.search);
        if (
          search.get("dynamic") === "true" ||
          search.get("is_dynamic") === "true"
        ) {
          return true;
        }
        const stored = sessionStorage.getItem(`orki_dynamic_${identifier}`);
        if (stored !== null) return stored === "true";
      } catch {
        // ignore
      }
    }
    return false;
  }, [identifier]);

  const isDynamic = pd?.is_dynamic ?? isDynamicFromUrl;

  useEffect(() => {
    if (pd && identifier && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          `orki_dynamic_${identifier}`,
          String(Boolean(pd.is_dynamic)),
        );
      } catch {
        // ignore
      }
    }
  }, [pd, identifier]);

  const [selectedSwapNetwork, setSelectedSwapNetwork] =
    useState<SwapOptions | null>(null);

  // Auto-select the first swap network when payment details load
  useEffect(() => {
    if (
      pd?.allows_token_swaps &&
      pd.swap_networks?.length &&
      !selectedSwapNetwork
    ) {
      setSelectedSwapNetwork(pd.swap_networks[0]);
    }
  }, [pd]);

  const { data: swapTokenData, isLoading: isFetchingSwapTokens } =
    useGetPayerSelectableSwapTokensForAPaymentQuery(
      {
        identifier,
        params: { network_id: selectedSwapNetwork?.network_id ?? "" },
      },
      { enabled: !!selectedSwapNetwork && pd?.allows_token_swaps === true },
    );

  const computedCryptoOptions = useMemo(() => {
    if (pd?.allows_token_swaps && pd.swap_networks?.length) {
      const tokens = swapTokenData?.tokens ?? [];
      if (tokens.length > 0) {
        const allNetworks = pd.swap_networks.map((sn) => sn.network);
        return tokens.map((t) => ({
          id: t.mint,
          slug: t.symbol,
          title: t.name,
          logo: t.logo || "",
          decimals: t.decimals,
          networks: allNetworks.map((n) => ({ ...n, token_address: t.mint })),
        }));
      }
      return [];
    }
    return pd?.crypto_options ?? [];
  }, [pd, swapTokenData]);

  const {
    address,
    nativeBalance,
    nativeSymbol,
    tokenBalances,
    isConnected,
    chain,
  } = useTransfer({
    solanaTokens: formatBackendTokens(computedCryptoOptions).solanaTokens,
    evmTokens: formatBackendTokens(computedCryptoOptions).evmTokens,
  });

  const { open } = useAppKit();
  const { switchNetwork } = useAppKitNetwork();
  const { disconnect } = useDisconnect();

  const currentNetworkTokenAddress = selectedToken?.networks?.find(
    (n) =>
      n.id === selectedNetwork?.id ||
      n.slug?.toLowerCase() === selectedNetwork?.symbol?.toLowerCase() ||
      n.title?.toLowerCase() === selectedNetwork?.name?.toLowerCase(),
  )?.token_address;

  const currentTokenBalanceObj =
    (currentNetworkTokenAddress
      ? tokenBalances.find(
          (t) =>
            t.contractAddress.toLowerCase() ===
            currentNetworkTokenAddress.toLowerCase(),
        )
      : null) ??
    tokenBalances.find(
      (t) => t.symbol.toLowerCase() === selectedToken?.symbol?.toLowerCase(),
    );

  const tokenBalance = currentTokenBalanceObj?.balance ?? 0;
  const tokenSymbol =
    currentTokenBalanceObj?.symbol ?? selectedToken?.symbol ?? "";

  const {
    isPaying,
    paymentStep,
    paymentSignature,
    showStatusModal,
    paymentStatus,
    paymentStatusDetails,
    setShowStatusModal,
    setPaymentStatus,
    setPaymentStatusDetails,
    executePayment,
  } = useExecutePayment();

  const isPaid = pd?.charge_status === "paid";

  const {
    isExpired,
    hasExpiry,
    timeLeftMs,
    formattedTimeLeft,
    isUrgent,
    expirationDate,
    deadlineMs,
  } = usePaymentExpiration({
    expiresAt: pd?.expires_at,
    chargeStatus: pd?.charge_status,
    safetyMarginMs: PAYMENT_SAFETY_MARGIN_MS,
    // Only a payment the wallet may still send (or already sent) holds the page;
    // expiry during approval or preparation stops the flow instead
    isCompletedOrInFlight:
      paymentSignature !== "none" ||
      showStatusModal ||
      showSuccessModal ||
      isPaid,
  });

  // Leaving now could lose track of a payment the wallet is sending
  useEffect(() => {
    if (paymentSignature === "none") return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [paymentSignature]);

  const hasEmittedExpiredRef = useRef(false);

  // Notify the merchant once, the moment the expired screen is shown
  useEffect(() => {
    if (!isExpired || !isDynamic || hasEmittedExpiredRef.current) return;
    hasEmittedExpiredRef.current = true;
    emitWidgetEvent("ORKI_PAYMENT_EXPIRED", {
      identifier,
      expires_at: pd?.expires_at,
      redirect_url: pd?.redirect_url,
    });
  }, [isExpired, isDynamic, identifier, pd?.expires_at, pd?.redirect_url]);

  const emittedUnrecordedTxHashRef = useRef("");

  // A payment was sent but never recorded: tell the merchant money arrived
  useEffect(() => {
    const txHash = paymentStatusDetails?.tx_hash;
    if (paymentStatus !== "unrecorded" || !isDynamic || !txHash) return;
    if (emittedUnrecordedTxHashRef.current === txHash) return;
    emittedUnrecordedTxHashRef.current = txHash;
    emitWidgetEvent("ORKI_PAYMENT_ERROR", {
      reason: "unrecorded",
      error: paymentStatusDetails?.error,
      tx_hash: txHash,
      identifier,
    });
  }, [
    paymentStatus,
    isDynamic,
    identifier,
    paymentStatusDetails?.tx_hash,
    paymentStatusDetails?.error,
  ]);

  const {
    data: quote,
    refetch: refetchQuote,
    isError: isQuoteError,
    error: quoteError,
  } = useGetCreateAShortLivedExchangeRateQuoteForAPaymentQuery(
    {
      identifier,
      params: {
        network_id: selectedNetwork?.id ?? "",
        ...(pd?.allows_token_swaps && pd?.swap_options
          ? { payer_token_mint: selectedToken?.id, payer_address: address }
          : { cryptocurrency_id: selectedToken?.id }),
      },
    },
    {
      enabled:
        !!selectedNetwork &&
        !!selectedToken &&
        !!address &&
        !isPaying &&
        !isRefetchingForPay &&
        !showStatusModal &&
        !showSuccessModal &&
        paymentStatus !== "confirmed" &&
        paymentStatus !== "submitted" &&
        !isPaid &&
        !isExpired,
    },
  );

  const recipientAddress = useMemo(() => {
    if (!selectedNetwork || !pd) return "";
    // Prefer explicit recipient matching by network id
    const matched = (pd.recipients ?? []).find(
      (r) => r.network?.id === selectedNetwork.id,
    );
    if (matched) return matched.wallet_address;
    // Fallback: for swap mode the swap network may not appear in recipients,
    // but the payer sends to the swap contract — leave blank so executePayment handles it
    return "";
  }, [selectedNetwork, pd]);

  const handleConnectWallet = async () => {
    try {
      await disconnect();
      open();
    } catch (error) {
      console.error(error);
      toast.error(parseMetaMaskError(error));
    }
  };

  const handleTokenSelect = (token: SelectorOption) => {
    setSelectedToken(token);
    setSelectedNetwork(null);
  };

  const handleNetworkSelect = (option: SelectorOption | null) => {
    setSelectedNetwork(option);
    if (option && pd?.swap_networks?.length) {
      const match = pd.swap_networks.find((sn) => sn.network.id === option.id);
      if (match && match.network_id !== selectedSwapNetwork?.network_id) {
        setSelectedSwapNetwork(match);
        setSelectedToken(null);
      }
    }
  };

  const handlePay = async () => {
    // Check the clock directly: onRetry calls this from a stale closure where
    // isExpired is still masked by the open status modal
    const hasLapsed = deadlineMs !== null && Date.now() >= deadlineMs;
    if (isExpired || hasLapsed) {
      toast.error("This payment session has expired");
      return;
    }

    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!selectedNetwork?.id) {
      toast.error("Please select a network");
      return;
    }

    if (!selectedToken?.id) {
      toast.error("Please select a token");
      return;
    }

    if (!pd) {
      toast.error("Payment details not found");
      return;
    }

    setIsRefetchingForPay(true);
    try {
      const { data: refreshedQuote, isError: isRefreshError } =
        await refetchQuote();
      const currentQuoteId = refreshedQuote?.quote_id || quoteId;

      if (!currentQuoteId || isRefreshError) {
        toast.error("Please refresh quote");
        return;
      }

      executePayment({
        payerAddress: address,
        networkId: selectedNetwork?.id,
        tokenId: selectedToken?.id,
        quoteId: currentQuoteId,
        pd,
        customerInfoData,
        isSolana: chain?.toLowerCase() === "solana",
        identifier,
        deadlineMs,
      });
    } finally {
      setIsRefetchingForPay(false);
    }
  };

  const handleReturnToMerchant = () => {
    const isEmbedded = window.parent && window.parent !== window;

    if (isDynamic) {
      emitWidgetEvent("ORKI_CLOSE", {
        reason: "expired",
        identifier,
        redirect_url: pd?.redirect_url,
      });
    }

    // Embedded: the merchant's page owns navigation and handles ORKI_CLOSE
    // (same as the success flow, which never redirects from inside an iframe)
    if (isEmbedded) return;

    if (pd?.redirect_url) {
      window.location.replace(pd.redirect_url);
    } else if (window.opener && !window.opener.closed) {
      window.close();
    } else if (window.history.length > 1) {
      window.history.back();
    }
  };

  const triggerSuccessCompletion = (result?: get_checkPaymentStatus | null) => {
    if (hasTriggeredSuccessCompletionRef.current) return;
    hasTriggeredSuccessCompletionRef.current = true;

    if (successCompletionTimerRef.current) {
      clearTimeout(successCompletionTimerRef.current);
      successCompletionTimerRef.current = null;
    }

    const res = result || latestSuccessResultRef.current;
    const isEmbedded =
      typeof window !== "undefined" &&
      window.parent &&
      window.parent !== window;

    if (isDynamic && res) {
      emitWidgetEvent("ORKI_PAYMENT_SUCCESS", {
        gateway_payment_id: res.gateway_payment_id,
        transaction_ref: res.transaction_ref,
        tx_hash: res.tx_hash,
        status: res.status,
        amount: res.payer_token?.amount,
        token: res.payer_token?.symbol,
        network: selectedNetwork?.name,
        identifier,
        explorer_url: res.explorer_url,
        redirect_url: pd?.redirect_url,
        result: res,
      });
    }

    if (pd?.redirect_url && !isEmbedded) {
      const redirectUrl = pd.redirect_url;
      const redirectOption = pd.redirect_option || "auto";

      if (redirectOption !== "none") {
        window.location.replace(redirectUrl);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (successCompletionTimerRef.current) {
        clearTimeout(successCompletionTimerRef.current);
      }
    };
  }, []);

  usePaymentPolling({
    showStatusModal,
    paymentStatus,
    gatewayPaymentId: paymentStatusDetails?.gateway_payment_id,
    onSuccess: (result) => {
      setShowStatusModal(false);
      setPaymentStatusDetails((prev) => ({ ...prev, ...result }));
      setShowSuccessModal(true);
      toast.success("Payment confirmed!");

      latestSuccessResultRef.current = result;
      hasTriggeredSuccessCompletionRef.current = false;

      const isEmbedded =
        typeof window !== "undefined" &&
        window.parent &&
        window.parent !== window;

      const shouldRedirect = Boolean(
        pd?.redirect_url && !isEmbedded && pd?.redirect_option !== "none",
      );

      // Keep success modal visible for about 3 seconds before triggering redirect or closing checkout window
      if (isDynamic || shouldRedirect) {
        if (successCompletionTimerRef.current) {
          clearTimeout(successCompletionTimerRef.current);
        }
        successCompletionTimerRef.current = setTimeout(() => {
          triggerSuccessCompletion(result);
        }, 3000);
      }
    },
    onFail: (error, txHash) => {
      setPaymentStatus("failed");
      const chainType = chain?.toLowerCase() === "solana" ? "solana" : "evm";
      const parsedError = error
        ? parseMetaMaskError(error, chainType)
        : "Failed to confirm payment";
      setPaymentStatusDetails((prev) => ({
        ...prev,
        error: parsedError,
        tx_hash: txHash,
      }));
      toast.error(parsedError);

      if (isDynamic) {
        emitWidgetEvent("ORKI_PAYMENT_ERROR", {
          error: parsedError,
          tx_hash: txHash,
          gateway_payment_id: paymentStatusDetails?.gateway_payment_id,
          identifier,
        });
      }
    },
  });

  // Auto-select first token (and network for swap mode) on load
  useEffect(() => {
    if (!computedCryptoOptions?.[0] || selectedToken) return;
    const opt = computedCryptoOptions[0];
    const swapNetwork = selectedSwapNetwork
      ? {
          id: selectedSwapNetwork.network.id,
          name: selectedSwapNetwork.network.title,
          icon: selectedSwapNetwork.network.logo,
          symbol: (selectedSwapNetwork.network.slug ?? selectedSwapNetwork.network.id ?? "").toUpperCase(),
        }
      : null;
    const tokenSym = (opt.slug ?? opt.id ?? "").toUpperCase();
    setSelectedToken({
      id: opt.id,
      name: tokenSym,
      subtitle: opt.title,
      icon: opt.logo,
      symbol: tokenSym,
      networks: opt.networks,
    });
    if (swapNetwork) setSelectedNetwork(swapNetwork);
  }, [computedCryptoOptions, selectedToken, selectedSwapNetwork]);

  // Switch AppKit network once when selectedNetwork is set
  useEffect(() => {
    if (!selectedNetwork) return;

    const appKitNetwork = findAppKitNetwork(selectedNetwork.name);
    if (!appKitNetwork) {
      toast.error("Selected network is not supported");
      return;
    }

    switchNetwork(appKitNetwork)
      .then(() => console.log("Network switched successfully"))
      .catch((err) => console.error("Network switch failed:", err));
  }, [selectedNetwork]);

  useEffect(() => {
    if (quote) setQuoteId(quote.quote_id);
  }, [quote]);

  const isLoading =
    isPdLoading || (!!pd?.allows_token_swaps && isFetchingSwapTokens);

  if (isLoading) return <LoadingState isDynamic={isDynamic} />;
  if (!pd || isError)
    return (
      <ErrorState
        message="Failed to load payment details."
        onRetry={() => window.location.reload()}
      />
    );

  return (
    <div className={styles.paymentContainer}>
      <Toaster position="top-center" richColors closeButton />

      <Header
        isWalletConnected={isConnected}
        connectedWallet=""
        walletAddress={address ?? ""}
      />

      <div
        className={`${styles.content} ${
          isDynamic || isExpired ? styles.dynamicContent : ""
        }`}
      >
        {!isDynamic && !isExpired && (
          <ProductCard
            recipient={recipientAddress}
            title={pd.product_title}
            description={pd.description}
            images={pd.images}
          />
        )}

        {isExpired ? (
          <PaymentExpiredCard
            price={Number(pd.price) || 0}
            priceDenomination={(
              pd.price_denomination_asset?.slug ||
              pd.price_denomination_asset?.code ||
              pd.price_denomination_asset?.symbol ||
              "USD"
            ).toUpperCase()}
            expirationDate={expirationDate}
            identifier={identifier}
            onReturnToMerchant={handleReturnToMerchant}
          />
        ) : (
          <PaymentCard
            isWalletConnected={isConnected}
            itemPrice={Number(pd.price) || 0}
            priceDenomination={(
              pd.price_denomination_asset?.slug ||
              pd.price_denomination_asset?.code ||
              pd.price_denomination_asset?.symbol ||
              "USD"
            ).toUpperCase()}
            onConnectWallet={handleConnectWallet}
            quote={quote}
            disableQuoteRefresh={
              isPaying ||
              isRefetchingForPay ||
              showStatusModal ||
              showSuccessModal ||
              paymentStatus === "confirmed" ||
              paymentStatus === "submitted" ||
              isPaid
            }
            refetchQuote={() => {
              if (!showStatusModal && !isPaying) refetchQuote();
            }}
            onPay={handlePay}
            isLoading={isPaying || isRefetchingForPay}
            loadingText={paymentStep}
            cryptoOptions={computedCryptoOptions}
            selectedNetwork={selectedNetwork}
            onNetworkSelect={handleNetworkSelect}
            selectedToken={selectedToken}
            onTokenSelect={handleTokenSelect}
            requiresCustomerInfo={pd.requires_customer_info}
            customerInfo={pd.customer_info}
            onCustomerInfoChange={setCustomerInfoData}
            isFormValid={isFormValid}
            onValidate={setIsFormValid}
            nativeBalance={nativeBalance}
            nativeSymbol={nativeSymbol}
            tokenBalance={tokenBalance}
            tokenSymbol={tokenSymbol}
            isNativeToken={
              selectedToken?.symbol?.toLowerCase() ===
              nativeSymbol.toLowerCase()
            }
            tokenBalances={tokenBalances}
            isQuoteError={isQuoteError}
            quoteError={quoteError}
          />
        )}
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          if (
            !hasTriggeredSuccessCompletionRef.current &&
            latestSuccessResultRef.current
          ) {
            triggerSuccessCompletion(latestSuccessResultRef.current);
          } else if (isDynamic) {
            emitWidgetEvent("ORKI_CLOSE");
          }
        }}
        amount={paymentStatusDetails?.payer_token?.amount ?? "0"}
        network={selectedNetwork?.name ?? ""}
        tokenSymbol={paymentStatusDetails?.payer_token?.symbol ?? ""}
        txHash={paymentStatusDetails?.tx_hash ?? ""}
        fromAddress={address ?? ""}
        toAddress={recipientAddress}
        explorerUrl={paymentStatusDetails?.explorer_url ?? ""}
      />

      <PaymentStatusModal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          if (isDynamic && paymentStatus === "failed") {
            emitWidgetEvent("ORKI_PAYMENT_CANCEL");
          }
        }}
        onRetry={() => {
          setShowStatusModal(false);
          handlePay();
        }}
        status={paymentStatus}
        gatewayPaymentId={paymentStatusDetails?.gateway_payment_id ?? ""}
        transactionRef={paymentStatusDetails?.transaction_ref ?? ""}
        txHash={
          paymentStatus === "unrecorded" ? paymentStatusDetails?.tx_hash : ""
        }
        error={paymentStatusDetails?.error ?? ""}
      />

      {hasExpiry &&
        !isExpired &&
        !isPaid &&
        !showSuccessModal &&
        timeLeftMs > 0 && (
          <PaymentCountdown
            formattedTimeLeft={formattedTimeLeft}
            isUrgent={isUrgent}
          />
        )}

      {paymentSignature === "awaiting" && hasExpiry && timeLeftMs <= 0 && (
        <PaymentExpiredWhileSigningNotice />
      )}
    </div>
  );
};

export default PaymentFlow;
