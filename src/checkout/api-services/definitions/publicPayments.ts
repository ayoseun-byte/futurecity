/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "../config";
import type { get_paymentDetailsForPayer } from "../types/publicPayments/get_paymentDetailsForPayer";
import type { post_checkApprovalAndGetApproveTx } from "../types/publicPayments/post_checkApprovalAndGetApproveTx";
import type { post_preparePaymentTransaction } from "../types/publicPayments/post_preparePaymentTransaction";
import type { post_submitPaymentTxHash } from "../types/publicPayments/post_submitPaymentTxHash";
import type { get_checkPaymentStatus } from "../types/publicPayments/get_checkPaymentStatus";
import type { get_payerSelectableSwapTokensForAPayment } from "../types/publicPayments/get_payerSelectableSwapTokensForAPayment";
import type { get_createAShortLivedExchangeRateQuoteForAPayment } from "../types/publicPayments/get_createAShortLivedExchangeRateQuoteForAPayment";

export interface PayerSelectableSwapTokensForAPaymentParams {
  network_id: string;
}

export interface CreateAShortLivedExchangeRateQuoteForAPaymentParams {
  network_id: string;
  cryptocurrency_id?: string;
  payer_token_mint?: string;
  payer_address?: string;
  quantity?: string;
}

export interface CheckApprovalAndGetApproveTxPayload {
  payer_address: string;
  network_id: string;
  cryptocurrency_id?: string;
  payer_token_mint?: string;
  quote_id?: string;
  quantity?: number;
}

export interface PreparePaymentTransactionPayload {
  payer_address: string;
  network_id: string;
  cryptocurrency_id?: string;
  payer_token_mint?: string;
  quote_id?: string;
  quantity?: number;
  customer_data?: {
    name?: string;
    email?: string;
    phone?: string;
    shipping_address?: string;
    [key: string]: any;
  };
}

export interface SubmitPaymentTxHashPayload {
  prepare_id: string;
  tx_hash: string;
}

export const publicPaymentsApi = {
  get_paymentDetailsForPayer: (
    identifier: string,
  ): Promise<get_paymentDetailsForPayer> =>
    apiClient.get(`/api/v1/pay/${identifier}`),

  get_payerSelectableSwapTokensForAPayment: ({
    identifier,
    params,
  }: {
    identifier: string;
    params: PayerSelectableSwapTokensForAPaymentParams;
  }): Promise<get_payerSelectableSwapTokensForAPayment> =>
    apiClient.get(`/api/v1/pay/${identifier}/swap-tokens`, {
      params: { network: params.network_id, network_id: params.network_id },
    }),

  get_createAShortLivedExchangeRateQuoteForAPayment: ({
    identifier,
    params,
  }: {
    identifier: string;
    params: CreateAShortLivedExchangeRateQuoteForAPaymentParams;
  }): Promise<get_createAShortLivedExchangeRateQuoteForAPayment> =>
    apiClient.get(`/api/v1/pay/${identifier}/quote`, { params }),

  post_checkApprovalAndGetApproveTx: ({
    identifier,
    payload,
  }: {
    identifier: string;
    payload: CheckApprovalAndGetApproveTxPayload;
  }): Promise<post_checkApprovalAndGetApproveTx> =>
    apiClient.post(`/api/v1/pay/${identifier}/approve`, payload),

  post_preparePaymentTransaction: ({
    identifier,
    payload,
  }: {
    identifier: string;
    payload: PreparePaymentTransactionPayload;
  }): Promise<post_preparePaymentTransaction> =>
    apiClient.post(`/api/v1/pay/${identifier}/pay`, payload),

  post_submitPaymentTxHash: ({
    identifier,
    payload,
  }: {
    identifier: string;
    payload: SubmitPaymentTxHashPayload;
  }): Promise<post_submitPaymentTxHash> =>
    apiClient.post(`/api/v1/pay/${identifier}/submit`, payload),

  get_checkPaymentStatus: (
    gatewayPaymentId: string,
  ): Promise<get_checkPaymentStatus> =>
    apiClient.get(`/api/v1/pay/status/${gatewayPaymentId}`),
};
