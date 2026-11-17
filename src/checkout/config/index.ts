import {
  solanaDevnet,
  baseSepolia,
} from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

export const projectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() ||
  "orki-checkout-project-id";

export interface NetworkConfig {
  slug: string;
  aliases?: string[];
  appKitNetwork: AppKitNetwork;
  nativeCurrency: string;
}

export const SUPPORTED_CHAINS = {
  evm: [
    {
      slug: "base-sepolia",
      appKitNetwork: baseSepolia,
      nativeCurrency: "ETH",
    },
  ] as NetworkConfig[],

  solana: [
    {
      slug: "solana",
      aliases: ["solana-devnet"],
      appKitNetwork: solanaDevnet,
      nativeCurrency: "SOL",
    },
  ] as NetworkConfig[],
};

export const networks = [
  ...SUPPORTED_CHAINS.evm.map((n) => n.appKitNetwork),
  ...SUPPORTED_CHAINS.solana.map((n) => n.appKitNetwork),
] as [AppKitNetwork, ...AppKitNetwork[]];

export const evmNetworkSlugs = SUPPORTED_CHAINS.evm.flatMap((n) => [
  n.slug,
  ...(n.aliases ?? []),
]);
export const solanaNetworkSlugs = SUPPORTED_CHAINS.solana.flatMap((n) => [
  n.slug,
  ...(n.aliases ?? []),
]);

export function getNativeCurrencyByChainId(
  chainId: number,
): string | undefined {
  return SUPPORTED_CHAINS.evm.find((c) => c.appKitNetwork.id === chainId)
    ?.nativeCurrency;
}

export const wagmiAdapter = new WagmiAdapter({
  ssr: false,
  projectId,
  networks: [baseSepolia],
});

export const config = wagmiAdapter.wagmiConfig;

export const solanaWeb3JsAdapter = new SolanaAdapter();
