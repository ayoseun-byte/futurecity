import { WEB3AUTH_NETWORK, type Web3AuthOptions } from "@web3auth/modal";
import type { Web3AuthContextConfig } from "@web3auth/modal/react";

// Requires vite.config.ts build-time enforcement of VITE_WEB3AUTH_CLIENT_ID.
const CLIENT_ID = import.meta.env.VITE_WEB3AUTH_CLIENT_ID;
if (!CLIENT_ID) {
  throw new Error("VITE_WEB3AUTH_CLIENT_ID is required — set it in .env (see .env.example).");
}

const evmChainConfig = {
  chainNamespace: "eip155" as const,
  chainId: "0x14a34", // 84532 Base Sepolia
  rpcTarget: "https://sepolia.base.org",
  displayName: "Base Sepolia",
  blockExplorerUrl: "https://sepolia.basescan.org/",
  ticker: "ETH",
  tickerName: "Ethereum",
  logo: "https://images.toruswallet.io/base.svg",
  decimals: 18,
  isTestnet: true,
};

const solanaChainConfig = {
  chainNamespace: "solana" as const,
  chainId: "0x67", // Devnet
  rpcTarget: "https://api.devnet.solana.com",
  displayName: "Solana Devnet",
  blockExplorerUrl: "https://explorer.solana.com?cluster=devnet",
  ticker: "SOL",
  tickerName: "Solana",
  logo: "https://images.toruswallet.io/sol.svg",
  decimals: 9,
  isTestnet: true,
};

const web3AuthOptions: Web3AuthOptions = {
  clientId: CLIENT_ID,
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
  defaultChainId: evmChainConfig.chainId,
  chains: [
    evmChainConfig,
    solanaChainConfig,
  ] as unknown as import("@web3auth/modal").Web3AuthOptions["chains"],
  walletServicesConfig: {
    loginMode: "embed",
    whiteLabel: {
      showWidgetButton: false,
      hideWalletConnect: true,
      hideTokenDisplay: true,
      hideNftDisplay: true,
      hideDefiPositionsDisplay: true,
      hideTransfers: true,
      hideTopup: true,
      hideReceive: true,
      hideSwap: true,
      hideShowAllTokens: true,
    },
  },
  privateKeyProvider: undefined,
};

const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions,
};

export const APP_CHAIN_CONFIG = {
  evm: evmChainConfig,
  solana: solanaChainConfig,
};

export default web3AuthContextConfig;
