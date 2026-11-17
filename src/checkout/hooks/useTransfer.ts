import { useAppKitNetwork } from "@reown/appkit/react";
import { useSPLTransfer } from "./useSPLTransfer";
import { useEVMTransfer } from "./useEVMTransfer";
import type { TokenConfig } from "@/constants/tokens";
import { SUPPORTED_CHAINS, getNativeCurrencyByChainId } from "@/config";

export type ChainType = "solana" | "evm";

export interface NormalizedTransfer {
  address: string | undefined;
  isConnected: boolean;
  nativeBalance: number | null;
  nativeSymbol: string;
  tokenBalances: {
    symbol: string;
    contractAddress: string;
    balance: number;
    logoUrl?: string;
  }[];
  supportedTokens: TokenConfig[];
  loading: boolean;
  error: string | null;
  chain: ChainType;
  fetchBalances: () => Promise<void>;
  sendNative: (
    to: string,
    amount: number,
  ) => Promise<{ signature: string; explorerUrl: string }>;
  sendToken: (
    token: TokenConfig,
    to: string,
    amount: number,
  ) => Promise<{ signature: string; explorerUrl: string }>;
}

export interface UseTransferParams {
  solanaTokens?: TokenConfig[];
  evmTokens?: TokenConfig[];
}

export function useTransfer({
  solanaTokens = [],
  evmTokens = [],
}: UseTransferParams = {}): NormalizedTransfer {
  const { caipNetwork } = useAppKitNetwork();

  // Hooks are unconditionally called with the dynamic token arrays
  const solana = useSPLTransfer(solanaTokens);
  const evm = useEVMTransfer(evmTokens);

  const isSolana = caipNetwork?.caipNetworkId?.startsWith("solana:");

  if (isSolana) {
    const solanaNativeSymbol =
      SUPPORTED_CHAINS.solana[0]?.nativeCurrency ?? "SOL";
    return {
      address: solana.address,
      isConnected: solana.isConnected,
      nativeBalance: solana.solBalance,
      nativeSymbol: solanaNativeSymbol,
      tokenBalances: solana.tokenBalances.map((t) => ({
        symbol: t.symbol,
        contractAddress: t.mint,
        balance: t.balance,
        logoUrl: t.logoUrl,
      })),
      supportedTokens: solanaTokens,
      loading: solana.loading,
      error: solana.error,
      chain: "solana",
      fetchBalances: solana.fetchBalances,
      sendNative: solana.sendSOL,
      sendToken: solana.sendToken,
    };
  }

  const evmChainId = (() => {
    if (typeof caipNetwork?.id === "number") return caipNetwork.id;
    const caipId = caipNetwork?.caipNetworkId;
    if (caipId?.startsWith("eip155:")) {
      const parsed = parseInt(caipId.split(":")[1], 10);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  })();

  const evmNativeSymbol =
    (evmChainId !== undefined
      ? getNativeCurrencyByChainId(evmChainId)
      : undefined) ??
    caipNetwork?.nativeCurrency?.symbol ??
    "ETH";

  return {
    address: evm.address,
    isConnected: evm.isConnected,
    nativeBalance: evm.nativeBalance,
    nativeSymbol: evmNativeSymbol,
    tokenBalances: evm.tokenBalances,
    supportedTokens: evmTokens,
    loading: evm.loading,
    error: evm.error,
    chain: "evm",
    fetchBalances: evm.fetchBalances,
    sendNative: evm.sendNative,
    sendToken: evm.sendToken,
  };
}
