/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "../config";
import { type get_paymentDetailsForPayer } from "../types/publicPayments/get_paymentDetailsForPayer";
import { type post_checkApprovalAndGetApproveTx } from "../types/publicPayments/post_checkApprovalAndGetApproveTx";
import { type post_preparePaymentTransaction } from "../types/publicPayments/post_preparePaymentTransaction";
import { type post_submitPaymentTxHash } from "../types/publicPayments/post_submitPaymentTxHash";
import { type get_checkPaymentStatus } from "../types/publicPayments/get_checkPaymentStatus";
import { type get_payerSelectableSwapTokensForAPayment } from "../types/publicPayments/get_payerSelectableSwapTokensForAPayment";
import { type get_createAShortLivedExchangeRateQuoteForAPayment } from "../types/publicPayments/get_createAShortLivedExchangeRateQuoteForAPayment";

export interface PayerSelectableSwapTokensForAPaymentParams {
  /** Network ID from the payment details response. */
  network_id: string;
}

export interface CreateAShortLivedExchangeRateQuoteForAPaymentParams {
  /** Network ID (from payment details). */
  network_id: string;
  /** Required when token swaps are disabled. Cryptocurrency ID from payment details. */
  cryptocurrency_id?: string;
  /** Required when token swaps are enabled. EVM token contract or Solana mint address chosen by the payer from /swap-tokens. */
  payer_token_mint?: string;
  /** Required for EVM token swaps. Connected payer wallet address. */
  payer_address?: string;
  /** Quantity (for multi-sale payments). Default: 1. Must be at least 1. */
  quantity?: string;
}

export interface CheckApprovalAndGetApproveTxPayload {
  /** Payer's wallet address. */
  payer_address: string;
  /** Network ID (from payment details). */
  network_id: string;
  /** Required when token swaps are disabled. Cryptocurrency ID from payment details. */
  cryptocurrency_id?: string;
  /** Required when token swaps are enabled and the selected payer token is SPL/erc20-like rather than native. Solana mint address from `/swap-tokens`. */
  payer_token_mint?: string;
  /** Required when a quote was generated. For swap-enabled payments, always send the quote ID from `/quote`. */
  quote_id?: string;
  /** Must be at least 1. */
  quantity?: number;
}

export interface PreparePaymentTransactionPayload {
  /** Payer's wallet address. */
  payer_address: string;
  /** Network ID (from payment details). */
  network_id: string;
  /** Required when token swaps are disabled. Cryptocurrency ID from payment details. */
  cryptocurrency_id?: string;
  /** Optional for swap-enabled payments if the client wants to echo the selected mint, but the backend primarily resolves the payer token from `quote_id`. */
  payer_token_mint?: string;
  /** Required for swap-enabled payments and for any payment where a quote was generated. Quote ID from `/quote`. */
  quote_id?: string;
  /** Quantity (for multi-sale payments). Default: 1. */
  quantity?: number;
  /** Customer details when required by merchant. */
  customer_data?: {
    name?: string;
    email?: string;
    phone?: string;
    shipping_address?: string;
    [key: string]: any;
  };
}

export interface SubmitPaymentTxHashPayload {
  /** Prepare ID from pay endpoint. */
  prepare_id: string;
  /** Transaction hash. */
  tx_hash: string;
}

export const publicPaymentsApi = {
  /** @description Get payment details for payer. */
  get_paymentDetailsForPayer: (
    identifier: string,
  ): Promise<get_paymentDetailsForPayer> =>
    apiClient.get(`/api/v1/pay/${identifier}`),

  /** @description Get payer-selectable swap tokens for a payment. @param network_id Network ID from the payment details response. */
  get_payerSelectableSwapTokensForAPayment: ({
    identifier,
    params,
  }: {
    identifier: string;
    params: PayerSelectableSwapTokensForAPaymentParams;
  }): Promise<get_payerSelectableSwapTokensForAPayment> =>
    apiClient.get(`/api/v1/pay/${identifier}/swap-tokens`, { params }),

  /** @description Create a short-lived exchange-rate quote for a payment. @param network_id Network ID (from payment details). @param cryptocurrency_id Required when token swaps are disabled. Cryptocurrency ID from payment details. @param payer_token_mint Required when token swaps are enabled. EVM token contract or Solana mint address chosen by the payer from /swap-tokens. @param payer_address Required for EVM token swaps. Connected payer wallet address. @param quantity Quantity (for multi-sale payments). Default: 1. Must be at least 1. */
  get_createAShortLivedExchangeRateQuoteForAPayment: ({
    identifier,
    params,
  }: {
    identifier: string;
    params: CreateAShortLivedExchangeRateQuoteForAPaymentParams;
  }): Promise<get_createAShortLivedExchangeRateQuoteForAPayment> =>
    apiClient.get(`/api/v1/pay/${identifier}/quote`, { params }),

  /** @description Check approval and get approve tx. */
  post_checkApprovalAndGetApproveTx: ({
    identifier,
    payload,
  }: {
    identifier: string;
    payload: CheckApprovalAndGetApproveTxPayload;
  }): Promise<post_checkApprovalAndGetApproveTx> =>
    apiClient.post(`/api/v1/pay/${identifier}/approve`, payload),

  /** @description Prepare payment transaction. */
  post_preparePaymentTransaction: ({
    identifier,
    payload,
  }: {
    identifier: string;
    payload: PreparePaymentTransactionPayload;
  }): Promise<post_preparePaymentTransaction> =>
    apiClient.post(`/api/v1/pay/${identifier}/pay`, payload),

  /** @description Submit payment tx hash. */
  post_submitPaymentTxHash: ({
    identifier,
    payload,
  }: {
    identifier: string;
    payload: SubmitPaymentTxHashPayload;
  }): Promise<post_submitPaymentTxHash> =>
    apiClient.post(`/api/v1/pay/${identifier}/submit`, payload),

  /** @description Check payment status. */
  get_checkPaymentStatus: (
    gatewayPaymentId: string,
  ): Promise<get_checkPaymentStatus> =>
    apiClient.get(`/api/v1/pay/status/${gatewayPaymentId}`),
};
