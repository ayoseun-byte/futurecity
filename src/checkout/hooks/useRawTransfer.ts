import { useEffect, useState, useCallback } from 'react'
import { useAppKitAccount, useAppKitNetwork, useAppKitProvider } from '@reown/appkit/react'
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react'
import type { Provider } from '@reown/appkit-adapter-solana/react'
import { useSendTransaction, useBalance, useReadContract } from 'wagmi'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError } from '@solana/spl-token'
import { erc20Abi, formatUnits } from 'viem'

interface UseRawTransferParams {
    tokenAddress?: string | null
    tokenDecimals?: number
    nativeSymbol?: string
    tokenSymbol?: string
}

export function useRawTransfer({
    tokenAddress,
    tokenDecimals = 6,
    nativeSymbol = '',
    tokenSymbol = '',
}: UseRawTransferParams = {}) {
    const { address, isConnected } = useAppKitAccount()
    const { caipNetwork } = useAppKitNetwork()
    const { walletProvider } = useAppKitProvider<Provider>('solana')
    const { connection } = useAppKitConnection()
    const { sendTransactionAsync } = useSendTransaction()

    const isSolana = String(caipNetwork?.id ?? '').startsWith('solana')

    // Solana balances (manual — wagmi does not cover Solana)
    const [solanaNativeBalance, setSolanaNativeBalance] = useState<number | null>(null)
    const [solanaSplBalance, setSolanaSplBalance] = useState<number | null>(null)

    const fetchSolanaBalances = useCallback(async () => {
        if (!isSolana || !address || !connection) return
        try {
            const pubkey = new PublicKey(address)

            const lamports = await connection.getBalance(pubkey)
            const sol = Number(lamports) / LAMPORTS_PER_SOL
            setSolanaNativeBalance(sol)
            console.log(`[Balance] Native (${nativeSymbol || 'SOL'}):`, sol)

            if (tokenAddress) {
                const mint = new PublicKey(tokenAddress)
                const ata = await getAssociatedTokenAddress(mint, pubkey)
                try {
                    const acct = await getAccount(connection, ata)
                    const bal = Number(acct.amount) / 10 ** tokenDecimals
                    setSolanaSplBalance(bal)
                    console.log(`[Balance] Token (${tokenSymbol}):`, bal)
                } catch (e) {
                    if (e instanceof TokenAccountNotFoundError) {
                        setSolanaSplBalance(0)
                        console.log(`[Balance] Token (${tokenSymbol}): 0 (no ATA)`)
                    }
                }
            } else {
                setSolanaSplBalance(null)
            }
        } catch (e) {
            console.error('[useRawTransfer] Failed to fetch Solana balances:', e)
        }
    }, [isSolana, address, connection, tokenAddress, tokenDecimals, nativeSymbol, tokenSymbol])

    useEffect(() => {
        if (isConnected && isSolana) fetchSolanaBalances()
    }, [isConnected, isSolana, fetchSolanaBalances])

    // EVM balances (wagmi reactive)
    const evmAddress = !isSolana && address ? (address as `0x${string}`) : undefined

    const { data: ethBalanceData } = useBalance({
        address: evmAddress,
        query: { enabled: !!evmAddress },
    })

    const { data: erc20BalanceData } = useReadContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [evmAddress ?? '0x0'],
        query: { enabled: !!evmAddress && !!tokenAddress },
    })

    useEffect(() => {
        if (!isSolana && ethBalanceData) {
            const bal = parseFloat(formatUnits(ethBalanceData.value, 18))
            console.log(`[Balance] Native (${nativeSymbol || 'ETH'}):`, bal)
        }
        if (!isSolana && erc20BalanceData !== undefined) {
            const bal = parseFloat(formatUnits(erc20BalanceData as bigint, tokenDecimals))
            console.log(`[Balance] Token (${tokenSymbol}):`, bal)
        }
    }, [ethBalanceData, erc20BalanceData])

    const nativeBalance = isSolana
        ? solanaNativeBalance
        : ethBalanceData
            ? parseFloat(formatUnits(ethBalanceData.value, 18))
            : null

    const tokenBalance = isSolana
        ? solanaSplBalance
        : erc20BalanceData !== undefined && erc20BalanceData !== null
            ? parseFloat(formatUnits(erc20BalanceData as bigint, tokenDecimals))
            : null

    return {
        address,
        isConnected,
        isSolana,
        walletProvider,
        connection,
        sendTransactionAsync,
        nativeBalance,
        tokenBalance,
        refetchSolanaBalances: fetchSolanaBalances,
    }
}