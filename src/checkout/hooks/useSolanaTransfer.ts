// hooks/useSolanaTransfer.ts
import { useCallback, useState } from "react";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react";
import type { Provider } from "@reown/appkit-adapter-solana/react";
import {
    PublicKey,
    SystemProgram,
    Transaction,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";

export interface TransferResult {
    signature: string;
    explorerUrl: string;
}

export function useSolanaTransfer() {
    const { address, isConnected } = useAppKitAccount();
    const { connection } = useAppKitConnection();
    const { walletProvider } = useAppKitProvider<Provider>("solana");

    const [balance, setBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBalance = useCallback(async () => {
        if (!address || !connection) return;
        try {
            const pubkey = new PublicKey(address);
            const lamports = await connection.getBalance(pubkey);
            setBalance(Number(lamports) / LAMPORTS_PER_SOL);
        } catch (e) {
            setError("Failed to fetch balance");
        }
    }, [address, connection]);

    const sendSOL = useCallback(
        async (toAddress: string, amountSOL: number): Promise<TransferResult> => {
            if (!isConnected || !address || !connection || !walletProvider) {
                throw new Error("Wallet not connected");
            }

            setLoading(true);
            setError(null);

            try {
                const from = new PublicKey(address);
                const to = new PublicKey(toAddress);
                const lamports = Math.round(amountSOL * LAMPORTS_PER_SOL);

                const { blockhash, lastValidBlockHeight } =
                    await connection.getLatestBlockhash("confirmed");

                const tx = new Transaction({
                    feePayer: from,
                    recentBlockhash: blockhash,
                }).add(
                    SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports })
                );

                // AppKit opens the wallet modal for user approval
                const signature = await walletProvider.sendTransaction(tx, connection);

                // Confirm with matching commitment level to avoid timeout issues
                await connection.confirmTransaction(
                    { signature, blockhash, lastValidBlockHeight },
                    "confirmed"
                );

                await fetchBalance(); // refresh after send

                return {
                    signature,
                    explorerUrl: `https://solscan.io/tx/${signature}`,
                };
            } catch (e: any) {
                const msg = e?.message ?? "Transaction failed";
                setError(msg);
                throw new Error(msg);
            } finally {
                setLoading(false);
            }
        },
        [address, connection, isConnected, walletProvider, fetchBalance]
    );

    return { balance, loading, error, fetchBalance, sendSOL, address, isConnected };
}