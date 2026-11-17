// constants/tokens.ts
export interface TokenConfig {
    symbol: string;
    decimals: number;
    logoUrl?: string;
    chain: 'solana' | 'evm';
    mint?: string;      // Solana
    address?: string;   // EVM
}

export const SOLANA_TOKENS: TokenConfig[] = [
    {
        symbol: "USDC",
        chain: 'solana',
        mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
        decimals: 6,
    },
];

export const EVM_TOKENS: TokenConfig[] = [
    {
        symbol: "USDC",
        chain: 'evm',
        address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        decimals: 6,
    },
];  