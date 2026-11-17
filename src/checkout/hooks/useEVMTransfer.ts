import { useCallback, useState } from "react";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import {
    useSendTransaction,
    useWriteContract,
    useReadContracts,
    useBalance,
} from "wagmi";
import { parseEther, parseUnits, formatUnits, erc20Abi } from "viem";
import type { TokenConfig } from "@/constants/tokens";

const EXPLORER: Record<number, string> = {
    84532: "https://sepolia.basescan.org/tx",
};

function getExplorerUrl(chainId: number | undefined, hash: string) {
    const base = chainId ? EXPLORER[chainId] : undefined;
    if (!base) throw new Error("Unsupported EVM network; only Base Sepolia is enabled.");
    return `${base}/${hash}`;
}

export interface TokenBalance {
    symbol: string;
    contractAddress: string;
    balance: number;
    logoUrl?: string;
}

export interface TransferResult {
    signature: string;
    explorerUrl: string;
}

export function useEVMTransfer(tokens: TokenConfig[]) {
    const { address, isConnected } = useAppKitAccount();
    const { caipNetwork } = useAppKitNetwork();
    const chainId = caipNetwork?.id as number | undefined;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: ethBalanceData, refetch: refetchEth } = useBalance({
        address: address as `0x${string}`,
        query: { enabled: !!address },
    });

    // Reactive: Wagmi automatically fetches when the `contracts` array changes
    const { data: erc20Data, refetch: refetchTokens } = useReadContracts({
        contracts: tokens.map((token) => ({
            address: token.address as `0x${string}`,
            abi: erc20Abi,
            functionName: "balanceOf" as const,
            args: [address as `0x${string}`],
        })),
        query: { enabled: !!address && tokens.length > 0 },
    });

    const { sendTransactionAsync } = useSendTransaction();
    const { writeContractAsync } = useWriteContract();

    const fetchBalances = useCallback(async () => {
        await Promise.all([refetchEth(), refetchTokens()]);
    }, [refetchEth, refetchTokens]);

    const nativeBalance = ethBalanceData
        ? parseFloat(formatUnits(ethBalanceData.value, 18))
        : null;

    const tokenBalances: TokenBalance[] = tokens.map((token, i) => ({
        symbol: token.symbol,
        contractAddress: token.address!,
        balance:
            erc20Data?.[i]?.result != null
                ? parseFloat(formatUnits(erc20Data[i].result as bigint, token.decimals))
                : 0,
        logoUrl: token.logoUrl,
    }));

    // ... (sendNative and sendToken remain exactly the same) ...
    const sendNative = useCallback(
        async (to: string, amount: number): Promise<TransferResult> => {
            if (!isConnected) throw new Error("Wallet not connected");
            if (chainId !== 84532) throw new Error("Switch your wallet to Base Sepolia before sending a transaction.");
            setLoading(true);
            setError(null);
            try {
                const hash = await sendTransactionAsync({
                    to: to as `0x${string}`,
                    value: parseEther(amount.toString()),
                });
                await fetchBalances();
                return { signature: hash, explorerUrl: getExplorerUrl(chainId, hash) };
            } catch (e: any) {
                const msg = e?.shortMessage ?? e?.message ?? "Transaction failed";
                setError(msg);
                throw new Error(msg);
            } finally {
                setLoading(false);
            }
        },
        [isConnected, sendTransactionAsync, fetchBalances, chainId]
    );

    const sendToken = useCallback(
        async (token: TokenConfig, to: string, amount: number): Promise<TransferResult> => {
            if (!isConnected || !token.address) throw new Error("Wallet not connected");
            if (chainId !== 84532) throw new Error("Switch your wallet to Base Sepolia before sending a transaction.");
            setLoading(true);
            setError(null);
            try {
                const hash = await writeContractAsync({
                    address: token.address as `0x${string}`,
                    abi: erc20Abi,
                    functionName: "transfer",
                    args: [
                        to as `0x${string}`,
                        parseUnits(amount.toString(), token.decimals),
                    ],
                });
                await fetchBalances();
                return { signature: hash, explorerUrl: getExplorerUrl(chainId, hash) };
            } catch (e: any) {
                const msg = e?.shortMessage ?? e?.message ?? "Transaction failed";
                setError(msg);
                throw new Error(msg);
            } finally {
                setLoading(false);
            }
        },
        [isConnected, writeContractAsync, fetchBalances, chainId]
    );

    return {
        address,
        isConnected,
        nativeBalance,
        tokenBalances,
        loading,
        error,
        fetchBalances,
        sendNative,
        sendToken,
    };
}