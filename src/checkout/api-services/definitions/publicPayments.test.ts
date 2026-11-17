import { describe, expect, test } from "vitest";
import { normalizePaymentDetails, normalizeQuote } from "./publicPayments";

describe("B2B checkout payload normalization", () => {
  test("normalizes B2B charge show + assets response with price_denomination_asset.slug and options", () => {
    const details = normalizePaymentDetails(
      "chg_01M7MR72F51638FKSV06PY1VRZ",
      {
        id: "chg_01M7MR72F51638FKSV06PY1VRZ",
        type: "single_use",
        pricing: "fixed",
        merchantName: "Corner Shop",
        description: "Order #42",
        charge: { chargeToken: "chg_01M7MR72F51638FKSV06PY1VRZ", paymentLinkId: "pay_123" },
        amount: "4.50000000",
        currency: "usd",
        status: "open",
        customerFields: [
          { key: "email", type: "email", label: "Email", required: true },
          { key: "note", type: "text", label: "Order Note", required: false },
        ],
        appearance: { primaryColor: "#111111", buttonColor: "#222222", showOrkiBadge: true },
        expiresAt: "2026-11-17T15:00:00Z",
        redirectUrl: "https://shop.example.com/done",
      },
      {
        assets: [
          {
            network: "base",
            networkName: "Base Sepolia",
            chainId: 84532,
            family: "evm",
            token: "usdc",
            address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
            decimals: 6,
            merchantWallet: "0x1111111111111111111111111111111111111111",
          },
          {
            network: "solana",
            networkName: "Solana Devnet",
            chainId: null,
            family: "solana",
            token: "usdc",
            address: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
            decimals: 6,
            merchantWallet: "So11111111111111111111111111111111111111112",
          },
        ],
        swapsAvailable: false,
        swapTokens: [],
      },
    );

    expect(details.price_denomination).toBe("fiat");
    expect(details.price_denomination_asset.slug).toBe("usd");
    expect(details.price_denomination_asset.code).toBe("USD");
    expect(details.price).toBe("4.50000000");
    expect(details.charge_status).toBe("open");
    expect(details.is_dynamic).toBe(true);
    expect(details.crypto_options).toHaveLength(1);
    expect(details.crypto_options[0].slug).toBe("usdc");
    expect(details.crypto_options[0].networks.map((n) => n.id)).toEqual(["base", "solana"]);
    expect(details.recipients).toHaveLength(2);
    expect(details.requires_customer_info).toBe(true);
    expect(details.customer_info.system.email.required).toBe("1");
    expect(details.customer_info.custom).toEqual([
      {
        key: "note",
        type: "text",
        label: "Order Note",
        required: "0",
        description: null,
        options: undefined,
      },
    ]);
  });

  test("handles expired B2B charge when /assets fails", () => {
    const details = normalizePaymentDetails("chg_expired", {
      id: "chg_expired",
      type: "single_use",
      pricing: "fixed",
      merchantName: "Corner Shop",
      amount: "10.00000000",
      currency: "usd",
      status: "expired",
      expiresAt: "2026-11-16T12:00:00Z",
    });

    expect(details.charge_status).toBe("expired");
    expect(details.price_denomination_asset.slug).toBe("usd");
    expect(details.crypto_options).toEqual([]);
    expect(details.recipients).toEqual([]);
  });

  test("normalizes B2B camelCase quote into snake_case checkout quote", () => {
    const quote = normalizeQuote({
      quoteId: "01J...",
      sourceAmount: "4.50000000",
      sourceCurrency: "usd",
      sourceType: "fiat",
      token: "usdc",
      targetAmount: "4.500000",
      targetAmountRaw: "4500000",
      rate: "1.000000000000000000",
      expiresAt: "2026-11-17T14:30:00Z",
    });

    expect(quote).toEqual({
      quote_id: "01J...",
      source_amount: "4.50000000",
      source_currency: "USD",
      source_type: "fiat",
      target_amount: "4.500000",
      target_amount_raw: "4500000",
      target_currency: "USDC",
      route_cost: null,
      route_cost_usd: null,
      rate: "1.000000000000000000",
      expires_at: "2026-11-17T14:30:00Z",
    });
  });
});
