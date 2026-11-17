import type { get_paymentDetailsForPayer } from "@/api-services/types/publicPayments/get_paymentDetailsForPayer";
import { toast } from "sonner";
import { decodeBase64Tx, formatCustomerData } from "@/utils/paymentFormatters";
import { parseMetaMaskError } from "@/utils/pareseMetamaskError";
import {
  usePostCheckApprovalAndGetApproveTxMutation,
  usePostPreparePaymentTransactionMutation,
  usePostSubmitPaymentTxHashMutation,
} from "@/api-services/generated";
import { useState } from "react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { waitForTransactionReceipt, estimateFeesPerGas } from "@wagmi/core";
import { config as wagmiConfig } from "@/config";
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react";
import type { Provider } from "@reown/appkit-adapter-solana/react";
import { useSendTransaction } from "wagmi";
import { useAppKitProvider } from "@reown/appkit/react";
import type { get_checkPaymentStatus } from "@/api-services/types/publicPayments/get_checkPaymentStatus";

interface ExecutePaymentParams {
  payerAddress: string;
  networkId: string;
  tokenId: string;
  quoteId: string;
  pd: get_paymentDetailsForPayer;
  customerInfoData: Record<string, string>;
  isSolana: boolean;
  identifier: string;
  // When the checkout closes; no step up to the payment signature runs after it
  deadlineMs?: number | null;
}

// "awaiting": the payment prompt is open; "signed": the payment has been sent.
// Either way the page must stay on the payment until the flow ends.
export type PaymentSignatureState = "none" | "awaiting" | "signed";

class PaymentSessionExpiredError extends Error {
  constructor() {
    super("This payment session has expired");
    this.name = "PaymentSessionExpiredError";
  }
}

// An execution that only grants allowance: signing it late moves no funds
const isApprovalExecution = (execution: { id?: string; kind?: string }) =>
  [execution.id, execution.kind].some((v) =>
    v?.toLowerCase().includes("approv"),
  );

const parseChainId = (chainId: string | number | undefined): number | undefined => {
  if (chainId === undefined || chainId === null) return undefined;
  if (typeof chainId === "number") return chainId;
  const str = String(chainId).trim();
  if (str.startsWith("0x") || str.startsWith("0X")) {
    return parseInt(str, 16);
  }
  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? undefined : parsed;
};

const parseBigIntValue = (val?: string | number): bigint => {
  if (!val) return BigInt(0);
  try {
    return BigInt(val);
  } catch (err) {
    console.warn(`[Payment Flow] Failed to parse value as BigInt: ${val}`, err);
    return BigInt(0);
  }
};

const parseBigIntGas = (val?: string | number): bigint | undefined => {
  if (!val || val === "0" || val === "0x0" || val === 0) return undefined;
  try {
    return BigInt(val);
  } catch (err) {
    console.warn(`[Payment Flow] Failed to parse gas as BigInt: ${val}`, err);
    return undefined;
  }
};

const parseBigIntFee = (val?: string | number): bigint | undefined => {
  if (!val || val === "0" || val === "0x0" || val === 0) return undefined;
  try {
    return BigInt(val);
  } catch (err) {
    console.warn(`[Payment Flow] Failed to parse fee as BigInt: ${val}`, err);
    return undefined;
  }
};

const assertTestnetChain = (chainId: number | undefined): void => {
  if (chainId !== 84532) {
    throw new Error("The payment transaction is not on Base Sepolia. No transaction was sent.");
  }
};

interface GasFeeParams {
  chainId?: number;
  maxPriorityFeePerGas?: string | number;
  maxFeePerGas?: string | number;
}

const resolveTransactionFees = async (params: GasFeeParams): Promise<{
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}> => {
  const { chainId, maxPriorityFeePerGas: rawTip, maxFeePerGas: rawMaxFee } = params;
  let tip = parseBigIntFee(rawTip);
  let maxFee = parseBigIntFee(rawMaxFee);

  if (tip) {
    if (!maxFee || maxFee < tip) {
      try {
        if (chainId) {
          const estimated = await estimateFeesPerGas(wagmiConfig, { chainId });
          if (estimated.maxFeePerGas) {
            maxFee = estimated.maxFeePerGas > tip ? estimated.maxFeePerGas : tip * BigInt(2);
          } else {
            maxFee = tip * BigInt(2);
          }
        } else {
          maxFee = tip * BigInt(2);
        }
      } catch (err) {
        console.warn("[Payment Flow] Failed to estimate fees per gas, using fallback buffer:", err);
        maxFee = tip * BigInt(2);
      }
    }
  }

  const result: { maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint } = {};
  if (tip !== undefined) {
    result.maxPriorityFeePerGas = tip;
  }
  if (maxFee !== undefined) {
    result.maxFeePerGas = maxFee;
  }

  return result;
};

export const useExecutePayment = () => {
  const { walletProvider } = useAppKitProvider<Provider>("solana");
  const { connection } = useAppKitConnection();
  const { sendTransactionAsync } = useSendTransaction();

  const [isPaying, setIsPaying] = useState(false);
  const [paymentStep, setPaymentStep] = useState("");
  const [paymentSignature, setPaymentSignature] =
    useState<PaymentSignatureState>("none");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "submitted" | "pending" | "confirmed" | "failed" | "unrecorded"
  >("submitted");
  const [paymentStatusDetails, setPaymentStatusDetails] =
    useState<Partial<get_checkPaymentStatus> | null>(null);

  const { mutateAsync: checkApproval } =
    usePostCheckApprovalAndGetApproveTxMutation();
  const { mutateAsync: preparePayment } =
    usePostPreparePaymentTransactionMutation();
  const { mutateAsync: submitPayment } = usePostSubmitPaymentTxHashMutation();

  const executePayment = async ({
    payerAddress,
    networkId,
    tokenId,
    quoteId,
    pd,
    customerInfoData,
    isSolana,
    identifier,
    deadlineMs,
  }: ExecutePaymentParams) => {
    // 1. ROBUST FIX: Strict Guard Clause to prevent double execution
    if (isPaying) {
      console.warn(
        "[Payment Execution Blocked] A transaction is already in progress.",
      );
      return;
    }

    setIsPaying(true);

    const isPastDeadline = () =>
      deadlineMs != null && Date.now() >= deadlineMs;

    // Checked before each step up to the payment signature: a late approval is
    // harmless, a late payment is not
    const assertSessionOpen = () => {
      if (isPastDeadline()) throw new PaymentSessionExpiredError();
    };

    // Set once the payment is sent; from then on a failure must never be silent
    let sentPaymentHash = "";

    const handleFailure = (err: unknown, chainType: "evm" | "solana") => {
      if (sentPaymentHash) {
        setPaymentStatus("unrecorded");
        setPaymentStatusDetails({
          tx_hash: sentPaymentHash,
          error: parseMetaMaskError(err, chainType),
        });
        setShowStatusModal(true);
        return;
      }
      // Once the session has closed, the expired screen explains what happened
      if (err instanceof PaymentSessionExpiredError || isPastDeadline()) return;
      toast.error(parseMetaMaskError(err, chainType));
    };

    const formattedCustomerData = formatCustomerData(
      pd.requires_customer_info,
      customerInfoData,
    );

    const commonPayload = {
      payer_address: payerAddress,
      network_id: networkId,
      cryptocurrency_id: tokenId,
      quote_id: quoteId,
      quantity: 1,
      ...(formattedCustomerData
        ? { customer_data: formattedCustomerData }
        : {}),
    };

    if (isSolana) {
      try {
        assertSessionOpen();
        setPaymentStep("Preparing Solana payment...");
        const prepareResult = await preparePayment({
          identifier,
          payload: commonPayload,
        });

        assertSessionOpen();
        setPaymentStep("Awaiting wallet signature...");
        const solTxPayload = (prepareResult.payment_tx || (prepareResult as any).paymentTx) as any;
        const encodedSolTx =
          typeof solTxPayload === "string"
            ? solTxPayload
            : solTxPayload?.serialized || solTxPayload?.tx;
        if (!encodedSolTx) {
          throw new Error("Solana transaction payload was missing from prepare response.");
        }
        const txBuffer = decodeBase64Tx(encodedSolTx);

        let transaction: Transaction | VersionedTransaction;
        try {
          transaction = VersionedTransaction.deserialize(txBuffer);
        } catch {
          transaction = Transaction.from(txBuffer);
        }

        let signature: string = "";

        setPaymentSignature("awaiting");
        try {
          signature = await walletProvider!.sendTransaction(
            transaction as any,
            connection as any,
            {
              skipPreflight: true,
              preflightCommitment: "confirmed",
              maxRetries: 0,
            },
          );
        } catch (sendError: any) {
          console.error("[Solana Tx Error] Full Error Object:", sendError);

          if (sendError.logs) {
            console.error(
              "[Solana Tx Error] Transaction Logs:",
              sendError.logs,
            );
          }

          const errorMessage = sendError?.message || String(sendError);
          if (errorMessage.includes("already been processed")) {
            console.warn(
              '[Solana Tx Sync] Caught "already processed" error. The transaction likely succeeded on-chain, but the client RPC panicked.',
            );
            throw new Error(
              "Transaction processed successfully, but encountered a sync delay. Please check your wallet history.",
            );
          }

          throw sendError;
        }

        if (!signature || signature.trim() === "") {
          throw new Error("Solana transaction was sent, but signature was empty.");
        }
        sentPaymentHash = signature;
        setPaymentSignature("signed");

        setPaymentStep("Finalizing payment...");
        const submitResult = await submitPayment({
          identifier,
          payload: { prepare_id: prepareResult.prepare_id, tx_hash: signature },
        });

        setPaymentStatus(
          submitResult.status === "failed" ? "failed" : "pending",
        );
        setPaymentStatusDetails({
          gateway_payment_id: submitResult.gateway_payment_id,
          transaction_ref: submitResult.transaction_ref,
          tx_hash: signature,
        });

        setShowStatusModal(true);
      } catch (err) {
        console.error("[Solana Payment Flow] Failed:", err);
        handleFailure(err, "solana");
      } finally {
        setIsPaying(false);
        setPaymentStep("");
        setPaymentSignature("none");
      }
      return;
    }

    // EVM flow
    try {
      assertSessionOpen();
      // skip approval check if token swap is enabled
      if (!pd.allows_token_swaps) {
        setPaymentStep("Checking token approval...");
        const approvalResult = await checkApproval({
          identifier,
          payload: commonPayload,
        });

        const approvalAny = approvalResult as any;
        const needsApproval = approvalAny.needs_approval ?? approvalAny.needsApproval;
        if (needsApproval) {
          assertSessionOpen();
          setPaymentStep("Approving token spend...");
          const rawApproveTx = approvalAny.approve_tx ?? approvalAny.approveTx;
          const tx = rawApproveTx?.tx ?? rawApproveTx;
          const parsedChainId = parseChainId(tx.chainId);
          assertTestnetChain(parsedChainId);

          const feeParams = await resolveTransactionFees({
            chainId: parsedChainId,
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
            maxFeePerGas: tx.maxFeePerGas,
          });

          const approveHash = await sendTransactionAsync({
            to: tx.to as `0x${string}`,
            data: tx.data as `0x${string}`,
            value: parseBigIntValue(tx.value),
            gas: parseBigIntGas(tx.gas),
            chainId: parsedChainId,
            ...feeParams,
          });

          assertSessionOpen();
          setPaymentStep("Waiting for approval confirmation...");
          await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
        }
      }

      assertSessionOpen();
      setPaymentStep("Preparing payment...");
      const prepareResult = await preparePayment({
        identifier,
        payload: commonPayload,
      });

      let finalTxHash: string = "";

      const rawPaymentTx = (prepareResult.payment_tx || (prepareResult as any).paymentTx) as any;
      const singlePayTx = rawPaymentTx?.tx ?? (rawPaymentTx?.to ? rawPaymentTx : null);

      if (rawPaymentTx?.executions) {
        // Swap Flow: Multiple executions
        const executions = rawPaymentTx.executions;
        const executionHashes: { id: string; kind?: string; hash: string }[] = [];

        for (let i = 0; i < executions.length; i++) {
          const execution = executions[i];
          const isApproval = isApprovalExecution(execution);
          setPaymentStep(
            `Sending transaction ${i + 1} of ${executions.length}...`,
          );

          const execTx = execution.tx;
          const execChainId = parseChainId(execTx.chainId);
          assertTestnetChain(execChainId);

          const feeParams = await resolveTransactionFees({
            chainId: execChainId,
            maxPriorityFeePerGas: execTx.maxPriorityFeePerGas,
            maxFeePerGas: execTx.maxFeePerGas,
          });

          // Once funds have moved, the remaining executions must still run
          if (!sentPaymentHash) {
            assertSessionOpen();
            if (!isApproval) setPaymentSignature("awaiting");
          }

          const hash = await sendTransactionAsync({
            to: execTx.to as `0x${string}`,
            data: execTx.data as `0x${string}`,
            value: parseBigIntValue(execTx.value),
            gas: parseBigIntGas(execTx.gas),
            chainId: execChainId,
            ...feeParams,
          });

          if (!isApproval) {
            sentPaymentHash = hash;
            setPaymentSignature("signed");
          }

          setPaymentStep(`Waiting for confirmation ${i + 1}...`);
          await waitForTransactionReceipt(wagmiConfig, { hash });

          executionHashes.push({ id: execution.id, kind: execution.kind, hash });

          const isFulfillment =
            execution.id?.toLowerCase() === "deposit" ||
            execution.kind?.toLowerCase() === "deposit" ||
            execution.id?.toLowerCase() === "swap" ||
            execution.kind?.toLowerCase() === "swap";

          if (isFulfillment) {
            finalTxHash = hash;
          }
        }

        // Fallback: If no execution specifically matched "deposit" or "swap", use the last execution's hash
        if (!finalTxHash && executionHashes.length > 0) {
          const lastExec = executionHashes[executionHashes.length - 1];
          finalTxHash = lastExec.hash;
        }
      } else if (singlePayTx) {
        // Non-Swap Flow: Single transaction
        setPaymentStep("Sending payment...");
        const payTx = singlePayTx;
        const payChainId = parseChainId(payTx.chainId);
        assertTestnetChain(payChainId);

        const feeParams = await resolveTransactionFees({
          chainId: payChainId,
          maxPriorityFeePerGas: payTx.maxPriorityFeePerGas,
          maxFeePerGas: payTx.maxFeePerGas,
        });

        assertSessionOpen();
        setPaymentSignature("awaiting");
        const payHash = await sendTransactionAsync({
          to: payTx.to as `0x${string}`,
          data: payTx.data as `0x${string}`,
          value: parseBigIntValue(payTx.value),
          gas: parseBigIntGas(payTx.gas),
          chainId: payChainId,
          ...feeParams,
        });
        sentPaymentHash = payHash;
        setPaymentSignature("signed");

        setPaymentStep("Waiting for payment confirmation...");
        await waitForTransactionReceipt(wagmiConfig, { hash: payHash });
        finalTxHash = payHash;
      } else {
        throw new Error("No transaction data returned from prepare.");
      }

      // Guard: Ensure finalTxHash is not empty before submitting to backend
      if (!finalTxHash || typeof finalTxHash !== "string" || finalTxHash.trim() === "") {
        throw new Error("Payment transaction succeeded, but the transaction hash could not be captured. Payment submission aborted. Please check your wallet.");
      }

      setPaymentStep("Finalizing payment...");
      const submitResult = await submitPayment({
        identifier,
        payload: { prepare_id: prepareResult.prepare_id, tx_hash: finalTxHash },
      });

      setPaymentStatus(submitResult.status === "failed" ? "failed" : "pending");
      setPaymentStatusDetails({
        gateway_payment_id: submitResult.gateway_payment_id,
        transaction_ref: submitResult.transaction_ref,
        tx_hash: finalTxHash,
      });
      setShowStatusModal(true);
    } catch (e: any) {
      console.error("[EVM Payment Flow] Failed with error:", e);
      handleFailure(e, "evm");
    } finally {
      setIsPaying(false);
      setPaymentStep("");
      setPaymentSignature("none");
    }
  };

  return {
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
  };
};
