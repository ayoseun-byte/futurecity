
// Generated file - DO NOT EDIT
import {
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
  type UseQueryResult,
  type DefaultError,
  useMutation,
  useQuery,
} from "@tanstack/react-query";

// 1. Mutation Wrapper
export const useApiMutation = <
  TData = unknown,
  TVariables = void,
  TError = DefaultError,
  TContext = unknown,
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<
    UseMutationOptions<TData, TError, TVariables, TContext>,
    "mutationFn"
  >,
) => {
  return useMutation<TData, TError, TVariables, TContext>({
    mutationFn,
    ...options,
  });
};

// 2. Query Wrapper
export const useApiQuery = <
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryKey: TQueryKey,
  queryFn: () => Promise<TQueryFnData>,
  options?: Omit<
    UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    "queryKey" | "queryFn"
  >,
): UseQueryResult<TData, TError> => {
  return useQuery<TQueryFnData, TError, TData, TQueryKey>({
    queryKey,
    queryFn,
    refetchOnWindowFocus: false,
    retry: 1,
    ...options,
  });
};

export * from "./usePaymentDetailsQueries";
