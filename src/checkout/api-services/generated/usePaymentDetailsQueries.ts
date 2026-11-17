/* eslint-disable @typescript-eslint/no-explicit-any */
// Generated file - DO NOT EDIT
import {
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { publicPaymentsApi } from "../definitions/publicPayments";
import { useApiQuery, useApiMutation } from ".";

// Helper Types
type ApiData<T extends (...args: any) => any> = Awaited<ReturnType<T>>;
type ApiVars<T extends (...args: any) => any> = Parameters<T>[0];

export const publicPaymentsKeys = {
  all: ["publicPayments"] as const,
  get_paymentDetailsForPayer: (
    params: ApiVars<typeof publicPaymentsApi.get_paymentDetailsForPayer>,
  ) =>
    [...publicPaymentsKeys.all, "get_paymentDetailsForPayer", params] as const,
  get_payerSelectableSwapTokensForAPayment: (
    params: ApiVars<
      typeof publicPaymentsApi.get_payerSelectableSwapTokensForAPayment
    >,
  ) =>
    [
      ...publicPaymentsKeys.all,
      "get_payerSelectableSwapTokensForAPayment",
      params,
    ] as const,
  get_createAShortLivedExchangeRateQuoteForAPayment: (
    params: ApiVars<
      typeof publicPaymentsApi.get_createAShortLivedExchangeRateQuoteForAPayment
    >,
  ) =>
    [
      ...publicPaymentsKeys.all,
      "get_createAShortLivedExchangeRateQuoteForAPayment",
      params,
    ] as const,
  get_checkPaymentStatus: (
    params: ApiVars<typeof publicPaymentsApi.get_checkPaymentStatus>,
  ) => [...publicPaymentsKeys.all, "get_checkPaymentStatus", params] as const,
};

export const useGetPaymentDetailsForPayerQuery = <
  TData = ApiData<typeof publicPaymentsApi.get_paymentDetailsForPayer>,
>(
  params: ApiVars<typeof publicPaymentsApi.get_paymentDetailsForPayer>,
  options?: Omit<
    UseQueryOptions<
      ApiData<typeof publicPaymentsApi.get_paymentDetailsForPayer>,
      Error,
      TData
    >,
    "queryKey" | "queryFn"
  >,
) =>
  useApiQuery(
    publicPaymentsKeys.get_paymentDetailsForPayer(params),
    () => publicPaymentsApi.get_paymentDetailsForPayer(params),
    options,
  );

export const useGetPayerSelectableSwapTokensForAPaymentQuery = <
  TData = ApiData<
    typeof publicPaymentsApi.get_payerSelectableSwapTokensForAPayment
  >,
>(
  params: ApiVars<
    typeof publicPaymentsApi.get_payerSelectableSwapTokensForAPayment
  >,
  options?: Omit<
    UseQueryOptions<
      ApiData<
        typeof publicPaymentsApi.get_payerSelectableSwapTokensForAPayment
      >,
      Error,
      TData
    >,
    "queryKey" | "queryFn"
  >,
) =>
  useApiQuery(
    publicPaymentsKeys.get_payerSelectableSwapTokensForAPayment(params),
    () => publicPaymentsApi.get_payerSelectableSwapTokensForAPayment(params),
    options,
  );

export const useGetCreateAShortLivedExchangeRateQuoteForAPaymentQuery = <
  TData = ApiData<
    typeof publicPaymentsApi.get_createAShortLivedExchangeRateQuoteForAPayment
  >,
>(
  params: ApiVars<
    typeof publicPaymentsApi.get_createAShortLivedExchangeRateQuoteForAPayment
  >,
  options?: Omit<
    UseQueryOptions<
      ApiData<
        typeof publicPaymentsApi.get_createAShortLivedExchangeRateQuoteForAPayment
      >,
      Error,
      TData
    >,
    "queryKey" | "queryFn"
  >,
) =>
  useApiQuery(
    publicPaymentsKeys.get_createAShortLivedExchangeRateQuoteForAPayment(
      params,
    ),
    () =>
      publicPaymentsApi.get_createAShortLivedExchangeRateQuoteForAPayment(
        params,
      ),
    options,
  );

export const usePostCheckApprovalAndGetApproveTxMutation = (
  options?: Omit<
    UseMutationOptions<
      ApiData<typeof publicPaymentsApi.post_checkApprovalAndGetApproveTx>,
      Error,
      ApiVars<typeof publicPaymentsApi.post_checkApprovalAndGetApproveTx>
    >,
    "mutationFn"
  >,
) => {
  const queryClient = useQueryClient();
  void queryClient;

  return useApiMutation(publicPaymentsApi.post_checkApprovalAndGetApproveTx, {
    ...options,
    onSuccess: (data, variables, context) => {
      (options?.onSuccess as any)?.(data, variables, context);
    },
  });
};

export const usePostPreparePaymentTransactionMutation = (
  options?: Omit<
    UseMutationOptions<
      ApiData<typeof publicPaymentsApi.post_preparePaymentTransaction>,
      Error,
      ApiVars<typeof publicPaymentsApi.post_preparePaymentTransaction>
    >,
    "mutationFn"
  >,
) => {
  const queryClient = useQueryClient();
  void queryClient;

  return useApiMutation(publicPaymentsApi.post_preparePaymentTransaction, {
    ...options,
    onSuccess: (data, variables, context) => {
      (options?.onSuccess as any)?.(data, variables, context);
    },
  });
};

export const usePostSubmitPaymentTxHashMutation = (
  options?: Omit<
    UseMutationOptions<
      ApiData<typeof publicPaymentsApi.post_submitPaymentTxHash>,
      Error,
      ApiVars<typeof publicPaymentsApi.post_submitPaymentTxHash>
    >,
    "mutationFn"
  >,
) => {
  const queryClient = useQueryClient();
  void queryClient;

  return useApiMutation(publicPaymentsApi.post_submitPaymentTxHash, {
    ...options,
    onSuccess: (data, variables, context) => {
      if (variables?.identifier) {
        queryClient.invalidateQueries({
          queryKey: publicPaymentsKeys.get_paymentDetailsForPayer(variables.identifier),
        });
      }
      (options?.onSuccess as any)?.(data, variables, context);
    },
  });
};

export const useGetCheckPaymentStatusQuery = <
  TData = ApiData<typeof publicPaymentsApi.get_checkPaymentStatus>,
>(
  params: ApiVars<typeof publicPaymentsApi.get_checkPaymentStatus>,
  options?: Omit<
    UseQueryOptions<
      ApiData<typeof publicPaymentsApi.get_checkPaymentStatus>,
      Error,
      TData
    >,
    "queryKey" | "queryFn"
  >,
) =>
  useApiQuery(
    publicPaymentsKeys.get_checkPaymentStatus(params),
    () => publicPaymentsApi.get_checkPaymentStatus(params),
    options,
  );
