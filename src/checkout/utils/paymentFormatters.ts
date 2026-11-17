import type { PreparePaymentTransactionPayload } from "@/api-services/definitions/publicPayments";
import type { CryptoOption } from "@/api-services/types/publicPayments/get_paymentDetailsForPayer";
import { evmNetworkSlugs, solanaNetworkSlugs } from "@/config";

export const formatCustomerData = (
  requiresCustomerInfo: boolean | undefined,
  customerInfoData: Record<string, string>,
): PreparePaymentTransactionPayload["customer_data"] | undefined => {
  if (!requiresCustomerInfo) return undefined;

  const {
    fullName,
    email,
    phone,
    city,
    country,
    streetName,
    streetNumber,
    zipCode,
    ...customFields
  } = customerInfoData;

  const shipping_address = [streetNumber, streetName, city, zipCode, country]
    .filter(Boolean)
    .join(", ");

  return {
    name: fullName,
    email,
    phone,
    shipping_address: shipping_address || undefined,
    ...customFields,
  };
};

export const decodeBase64Tx = (base64Tx: string): Uint8Array => {
  if (typeof base64Tx !== "string") {
    throw new Error(
      "Expected a base64 string for the Solana transaction, but got an object.",
    );
  }

  if (typeof atob === "function") {
    const binary = atob(base64Tx);
    const len = binary.length;
    const txBuffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) txBuffer[i] = binary.charCodeAt(i);
    return txBuffer;
  } else {
    return Uint8Array.from(Buffer.from(base64Tx, "base64"));
  }
};

export interface TokenConfig {
  symbol: string;
  decimals: number;
  logoUrl?: string;
  chain: "solana" | "evm";
  mint?: string; // Solana
  address?: string; // EVM
}

export const formatBackendTokens = (
  cryptoOptions: (CryptoOption & { decimals?: number })[],
) => {
  const evmTokens: TokenConfig[] = [];
  const solanaTokens: TokenConfig[] = [];

  cryptoOptions.forEach((token) => {
    const symbol = token.slug.toUpperCase();
    const logoUrl = token.logo;

    const isStablecoin = ["USDC", "USDT"].includes(symbol);
    const evmDecimals = token.decimals ?? (isStablecoin ? 6 : 18);
    const solDecimals = token.decimals ?? (isStablecoin ? 6 : 9);

    token.networks.forEach((network) => {
      if (!network.token_address) return;

      const netSlug = network.slug?.toLowerCase();
      if (solanaNetworkSlugs.some((s) => s.toLowerCase() === netSlug)) {
        solanaTokens.push({
          chain: "solana",
          symbol,
          mint: network.token_address,
          decimals: solDecimals,
          logoUrl,
        });
      } else if (evmNetworkSlugs.some((s) => s.toLowerCase() === netSlug)) {
        evmTokens.push({
          chain: "evm",
          symbol,
          address: network.token_address,
          decimals: evmDecimals,
          logoUrl,
        });
      }
    });
  });

  return { evmTokens, solanaTokens };
};
