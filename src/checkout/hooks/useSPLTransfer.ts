import { useCallback, useState, useEffect, useMemo } from "react";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react";
import type { Provider } from "@reown/appkit-adapter-solana/react";
import {
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createTransferCheckedInstruction,
    getAccount,
    TokenAccountNotFoundError,
} from "@solana/spl-token";
import type { TokenConfig } from "@/constants/tokens";

export interface TokenBalance {
    symbol: string;
    mint: string;
    balance: number;
    logoUrl?: string;
}

export interface TransferResult {
    signature: string;
    explorerUrl: string;
}

export function useSPLTransfer(tokens: TokenConfig[]) {
    const { address, isConnected } = useAppKitAccount();
    const { connection } = useAppKitConnection();
    const { walletProvider } = useAppKitProvider<Provider>("solana");

    const [solBalance, setSolBalance] = useState<number | null>(null);
    const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // FIX 2: Stringify the tokens array to create a stable dependency.
    // This stops React from thinking the array changed just because the parent re-rendered.
    const tokensJson = useMemo(() => JSON.stringify(tokens), [tokens]);

    const fetchBalances = useCallback(async () => {
        const currentTokens = JSON.parse(tokensJson) as TokenConfig[];
        if (!address || !connection || !currentTokens.length) return;

        let pubkey: PublicKey;

        // FIX 1: Catch the EVM address bleed-over. 
        // If it's an 0x address, new PublicKey() will fail. We just exit silently until the Solana address loads.
        try {
            pubkey = new PublicKey(address);
        } catch (e) {
            return;
        }

        const lamports = await connection.getBalance(pubkey);
        setSolBalance(Number(lamports) / LAMPORTS_PER_SOL);

        const results = await Promise.allSettled(
            currentTokens.map(async (token) => {
                const ata = await getAssociatedTokenAddress(
                    new PublicKey(token.mint!),
                    pubkey
                );
                try {
                    const account = await getAccount(connection, ata);
                    return {
                        symbol: token.symbol,
                        mint: token.mint,
                        balance: Number(account.amount) / 10 ** token.decimals,
                        logoUrl: token.logoUrl,
                    } as TokenBalance;
                } catch (e) {
                    if (e instanceof TokenAccountNotFoundError) {
                        return {
                            symbol: token.symbol,
                            mint: token.mint,
                            balance: 0,
                            logoUrl: token.logoUrl,
                        } as TokenBalance;
                    }
                    throw e;
                }
            })
        );

        setTokenBalances(
            results
                .filter((r): r is PromiseFulfilledResult<TokenBalance> => r.status === "fulfilled")
                .map((r) => r.value)
        );
    }, [address, connection, tokensJson]);

    // Trigger fetch only when our stable dependencies change
    useEffect(() => {
        if (isConnected && address) {
            fetchBalances();
        }
    }, [fetchBalances, isConnected, address]);

    const sendSOL = useCallback(
        async (toAddress: string, amountSOL: number): Promise<TransferResult> => {
            if (!isConnected || !address || !connection || !walletProvider)
                throw new Error("Wallet not connected");

            setLoading(true);
            setError(null);

            try {
                // Ensure we have a valid Solana address before processing
                const from = new PublicKey(address);
                const to = new PublicKey(toAddress);

                const { blockhash, lastValidBlockHeight } =
                    await connection.getLatestBlockhash("confirmed");

                const tx = new Transaction({ feePayer: from, recentBlockhash: blockhash }).add(
                    SystemProgram.transfer({
                        fromPubkey: from,
                        toPubkey: to,
                        lamports: Math.round(amountSOL * LAMPORTS_PER_SOL),
                    })
                );

                const signature = await walletProvider.sendTransaction(tx, connection);
                await connection.confirmTransaction(
                    { signature, blockhash, lastValidBlockHeight },
                    "confirmed"
                );
                await fetchBalances();
                return { signature, explorerUrl: `https://solscan.io/tx/${signature}` };
            } catch (e: any) {
                const msg = e?.message ?? "Transaction failed";
                setError(msg);
                throw new Error(msg);
            } finally {
                setLoading(false);
            }
        },
        [address, connection, isConnected, walletProvider, fetchBalances]
    );

    const sendToken = useCallback(
        async (
            token: TokenConfig,
            toAddress: string,
            amount: number
        ): Promise<TransferResult> => {
            if (!isConnected || !address || !connection || !walletProvider)
                throw new Error("Wallet not connected");

            setLoading(true);
            setError(null);

            try {
                // Ensure we have a valid Solana address before processing
                const from = new PublicKey(address);
                const to = new PublicKey(toAddress);
                const mint = new PublicKey(token.mint!);
                const rawAmount = BigInt(Math.round(amount * 10 ** token.decimals));

                const fromATA = await getAssociatedTokenAddress(mint, from);
                const toATA = await getAssociatedTokenAddress(mint, to);

                const { blockhash, lastValidBlockHeight } =
                    await connection.getLatestBlockhash("confirmed");

                const tx = new Transaction({ feePayer: from, recentBlockhash: blockhash });

                try {
                    await getAccount(connection, toATA);
                } catch (e) {
                    if (e instanceof TokenAccountNotFoundError) {
                        tx.add(
                            createAssociatedTokenAccountInstruction(
                                from,
                                toATA,
                                to,
                                mint
                            )
                        );
                    }
                }

                tx.add(
                    createTransferCheckedInstruction(
                        fromATA,
                        mint,
                        toATA,
                        from,
                        rawAmount,
                        token.decimals
                    )
                );

                const signature = await walletProvider.sendTransaction(tx, connection);
                await connection.confirmTransaction(
                    { signature, blockhash, lastValidBlockHeight },
                    "confirmed"
                );
                await fetchBalances();
                return { signature, explorerUrl: `https://solscan.io/tx/${signature}` };
            } catch (e: any) {
                const msg = e?.message ?? "Transaction failed";
                setError(msg);
                throw new Error(msg);
            } finally {
                setLoading(false);
            }
        },
        [address, connection, isConnected, walletProvider, fetchBalances]
    );

    return {
        address,
        isConnected,
        solBalance,
        tokenBalances,
        loading,
        error,
        fetchBalances,
        sendSOL,
        sendToken,
    };
}