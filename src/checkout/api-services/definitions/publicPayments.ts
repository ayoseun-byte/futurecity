/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "../config";
import { type get_paymentDetailsForPayer, type CryptoOption, type CustomCustomerField, type Network, type Recipient } from "../types/publicPayments/get_paymentDetailsForPayer";
import { type post_checkApprovalAndGetApproveTx } from "../types/publicPayments/post_checkApprovalAndGetApproveTx";
import { type post_preparePaymentTransaction } from "../types/publicPayments/post_preparePaymentTransaction";
import { type post_submitPaymentTxHash } from "../types/publicPayments/post_submitPaymentTxHash";
import { type get_checkPaymentStatus } from "../types/publicPayments/get_checkPaymentStatus";
import { type get_payerSelectableSwapTokensForAPayment } from "../types/publicPayments/get_payerSelectableSwapTokensForAPayment";
import { type get_createAShortLivedExchangeRateQuoteForAPayment } from "../types/publicPayments/get_createAShortLivedExchangeRateQuoteForAPayment";

export interface PayerSelectableSwapTokensForAPaymentParams {
  /** Network ID from the payment details response. */
  network_id: string;
}

export interface CreateAShortLivedExchangeRateQuoteForAPaymentParams {
  /** Network ID (from payment details). */
  network_id: string;
  /** Required when token swaps are disabled. Cryptocurrency ID from payment details. */
  cryptocurrency_id?: string;
  /** Required when token swaps are enabled. EVM token contract or Solana mint address chosen by the payer from /swap-tokens. */
  payer_token_mint?: string;
  /** Required for EVM token swaps. Connected payer wallet address. */
  payer_address?: string;
  /** Quantity (for multi-sale payments). Default: 1. Must be at least 1. */
  quantity?: string;
}

export interface CheckApprovalAndGetApproveTxPayload {
  /** Payer's wallet address. */
  payer_address: string;
  /** Network ID (from payment details). */
  network_id: string;
  /** Required when token swaps are disabled. Cryptocurrency ID from payment details. */
  cryptocurrency_id?: string;
  /** Required when token swaps are enabled and the selected payer token is SPL/erc20-like rather than native. Solana mint address from `/swap-tokens`. */
  payer_token_mint?: string;
  /** Required when a quote was generated. For swap-enabled payments, always send the quote ID from `/quote`. */
  quote_id?: string;
  /** Must be at least 1. */
  quantity?: number;
}

export interface PreparePaymentTransactionPayload {
  /** Payer's wallet address. */
  payer_address: string;
  /** Network ID (from payment details). */
  network_id: string;
  /** Required when token swaps are disabled. Cryptocurrency ID from payment details. */
  cryptocurrency_id?: string;
  /** Optional for swap-enabled payments if the client wants to echo the selected mint, but the backend primarily resolves the payer token from `quote_id`. */
  payer_token_mint?: string;
  /** Required for swap-enabled payments and for any payment where a quote was generated. Quote ID from `/quote`. */
  quote_id?: string;
  /** Quantity (for multi-sale payments). Default: 1. */
  quantity?: number;
  /** Customer details when required by merchant. */
  customer_data?: {
    name?: string;
    email?: string;
    phone?: string;
    shipping_address?: string;
    [key: string]: any;
  };
}

export interface SubmitPaymentTxHashPayload {
  /** Prepare ID from pay endpoint. */
  prepare_id: string;
  /** Transaction hash. */
  tx_hash: string;
}

const FIAT_CODES = new Set([
  "usd", "eur", "gbp", "ngn", "aed", "inr", "cad", "aud",
  "jpy", "chf", "zar", "kes", "ghs", "brl", "mxn", "sgd", "hkd",
]);

const TOKEN_TITLES: Record<string, string> = {
  usdc: "USD Coin",
  usdt: "Tether",
  eth: "Ether",
  weth: "Wrapped Ether",
  sol: "Solana",
  eurc: "Euro Coin",
  dai: "Dai",
};

function normalizeCustomerInfo(rawFields: any): {
  requiresCustomerInfo: boolean;
  customerInfo: get_paymentDetailsForPayer["customer_info"];
} {
  const emptySystem = {
    email: { type: "email" as const, label: "Email", required: "0" as const },
    phone: { type: "tel" as const, label: "Phone", required: "0" as const },
    name_and_shipping: { type: "text" as const, label: "Full Name & Shipping", required: "0" as const },
  };

  if (!rawFields) {
    return {
      requiresCustomerInfo: false,
      customerInfo: { custom: [], system: emptySystem },
    };
  }

  if (!Array.isArray(rawFields) && rawFields.system) {
    const hasRequiredSystem =
      rawFields.system?.email?.required === "1" ||
      rawFields.system?.phone?.required === "1" ||
      rawFields.system?.name_and_shipping?.required === "1";
    const hasCustom = Array.isArray(rawFields.custom) && rawFields.custom.length > 0;
    return {
      requiresCustomerInfo: Boolean(hasRequiredSystem || hasCustom),
      customerInfo: rawFields,
    };
  }

  const fieldList: any[] = Array.isArray(rawFields)
    ? rawFields
    : Array.isArray(rawFields.custom)
      ? rawFields.custom
      : [];

  const system = {
    email: {
      type: "email" as const,
      label: "Email",
      required: (rawFields?.email ? "1" : "0") as "0" | "1",
    },
    phone: {
      type: "tel" as const,
      label: "Phone",
      required: (rawFields?.phone ? "1" : "0") as "0" | "1",
    },
    name_and_shipping: {
      type: "text" as const,
      label: "Full Name & Shipping",
      required: (rawFields?.nameAndShipping ? "1" : "0") as "0" | "1",
    },
  };

  const custom: CustomCustomerField[] = [];
  for (const field of fieldList) {
    if (!field || !field.key) continue;
    const keyLower = String(field.key).toLowerCase();
    const isReq = field.required === true || field.required === "1" || field.required === 1;
    if (keyLower === "email") {
      system.email.required = isReq ? "1" : "0";
      if (field.label) system.email.label = field.label;
    } else if (keyLower === "phone") {
      system.phone.required = isReq ? "1" : "0";
      if (field.label) system.phone.label = field.label;
    } else if (keyLower === "name_and_shipping" || keyLower === "nameandshipping") {
      system.name_and_shipping.required = isReq ? "1" : "0";
      if (field.label) system.name_and_shipping.label = field.label;
    } else {
      custom.push({
        key: String(field.key),
        type: String(field.type || "text"),
        label: String(field.label || field.key),
        required: isReq ? "1" : "0",
        description: field.description ?? null,
        options: Array.isArray(field.options) ? field.options : undefined,
      });
    }
  }

  const requiresCustomerInfo =
    system.email.required === "1" ||
    system.phone.required === "1" ||
    system.name_and_shipping.required === "1" ||
    custom.length > 0;

  return {
    requiresCustomerInfo,
    customerInfo: { custom, system },
  };
}

export function normalizePaymentDetails(
  identifier: string,
  raw: any,
  assetsPayload?: { assets?: any[]; swapsAvailable?: boolean; swapTokens?: string[] },
): get_paymentDetailsForPayer {
  if (raw?.price_denomination_asset && Array.isArray(raw?.crypto_options)) {
    return raw as get_paymentDetailsForPayer;
  }

  const rawAssets = Array.isArray(assetsPayload?.assets) ? assetsPayload.assets : [];
  const tokenMap = new Map<string, CryptoOption & { decimals?: number }>();
  const recipientMap = new Map<string, Recipient>();

  for (const asset of rawAssets) {
    const tokenKey = String(asset.token || "").toLowerCase();
    const netKey = String(asset.network || "").toLowerCase();
    if (!tokenKey || !netKey) continue;

    const netObj: Network = {
      id: netKey,
      slug: netKey,
      title: String(asset.networkName || asset.network || netKey),
      logo: "",
      token_address: String(asset.address || ""),
    };

    if (asset.merchantWallet && !recipientMap.has(netKey)) {
      recipientMap.set(netKey, {
        network: netObj,
        wallet_address: String(asset.merchantWallet),
      });
    }

    let existing = tokenMap.get(tokenKey);
    if (!existing) {
      existing = {
        id: tokenKey,
        slug: tokenKey,
        title: TOKEN_TITLES[tokenKey] || tokenKey.toUpperCase(),
        logo: "",
        networks: [],
        ...(typeof asset.decimals === "number" ? { decimals: asset.decimals } : {}),
      };
      tokenMap.set(tokenKey, existing);
    }

    if (!existing.networks.some((n) => n.id === netKey)) {
      existing.networks.push(netObj);
    }
  }

  const currencyLower = String(raw?.currency || "usd").toLowerCase();
  const { requiresCustomerInfo, customerInfo } = normalizeCustomerInfo(raw?.customerFields);
  const chargeStatus = String(raw?.status || "open").toLowerCase();
  const isDynamic = Boolean(
    raw?.charge ||
    raw?.type === "single" ||
    raw?.type === "single_use" ||
    raw?.pricing === "dynamic" ||
    identifier.startsWith("chg_"),
  );

  return {
    product_title: String(
      raw?.description ||
        raw?.invoice?.number ||
        raw?.merchantName ||
        "Orki Checkout",
    ),
    description:
      raw?.description && raw?.merchantName
        ? `${raw.merchantName} · ${raw.description}`
        : String(raw?.merchantName || raw?.description || ""),
    images: [],
    checkout_type: raw?.type,
    charge_status: chargeStatus,
    price: String(raw?.amount ?? "0"),
    price_denomination: FIAT_CODES.has(currencyLower) ? "fiat" : "crypto",
    price_denomination_asset: {
      id: currencyLower,
      slug: currencyLower,
      code: currencyLower.toUpperCase(),
      symbol: currencyLower.toUpperCase(),
      title: currencyLower.toUpperCase(),
      logo: "",
    },
    customer_can_change_price: raw?.pricing === "dynamic" && !raw?.amount,
    is_dynamic: isDynamic,
    allows_token_swaps: false,
    allows_card_pay: false,
    crypto_options: Array.from(tokenMap.values()),
    swap_networks: [],
    recipients: Array.from(recipientMap.values()),
    allows_multiple_sales: raw?.type === "reusable",
    min_sales: 1,
    max_sales: Number(raw?.salesLimit?.max ?? 1),
    requires_customer_info: requiresCustomerInfo,
    customer_info: customerInfo,
    redirect_option: raw?.redirectUrl ? "auto" : "none",
    redirect_url: String(raw?.redirectUrl || ""),
    show_badge: Boolean(raw?.appearance?.showOrkiBadge ?? true),
    primary_color: String(raw?.appearance?.primaryColor || "#000000"),
    button_color: String(raw?.appearance?.buttonColor || "#000000"),
    expires_at: raw?.expiresAt ?? null,
  };
}

export function normalizeQuote(raw: any): get_createAShortLivedExchangeRateQuoteForAPayment {
  if (raw?.quote_id && raw?.target_amount !== undefined) {
    return raw as get_createAShortLivedExchangeRateQuoteForAPayment;
  }
  return {
    quote_id: String(raw?.quoteId ?? raw?.quote_id ?? ""),
    source_amount: String(raw?.sourceAmount ?? raw?.source_amount ?? "0"),
    source_currency: String(raw?.sourceCurrency ?? raw?.source_currency ?? "").toUpperCase(),
    source_type: (raw?.sourceType ?? raw?.source_type ?? "fiat") as "fiat" | "crypto",
    target_amount: String(raw?.targetAmount ?? raw?.target_amount ?? "0"),
    target_amount_raw: String(raw?.targetAmountRaw ?? raw?.target_amount_raw ?? "0"),
    target_currency: String(raw?.token ?? raw?.target_currency ?? "").toUpperCase(),
    route_cost: raw?.routeCost ?? raw?.route_cost ?? null,
    route_cost_usd: raw?.routeCostUsd ?? raw?.route_cost_usd ?? null,
    rate: String(raw?.rate ?? "1"),
    expires_at: String(raw?.expiresAt ?? raw?.expires_at ?? ""),
  };
}

export const publicPaymentsApi = {
  /** @description Get payment details for payer. */
  get_paymentDetailsForPayer: async (
    identifier: string,
  ): Promise<get_paymentDetailsForPayer> => {
    const raw: any = await apiClient.get(`/api/v1/pay/${identifier}`);
    if (raw?.price_denomination_asset && Array.isArray(raw?.crypto_options)) {
      return raw;
    }

    const statusLower = String(raw?.status || "open").toLowerCase();
    const isTerminalStatus = [
      "expired",
      "paid",
      "completed",
      "cancelled",
      "inactive",
      "sold_out",
    ].includes(statusLower);

    let assetsPayload: { assets?: any[]; swapsAvailable?: boolean; swapTokens?: string[] } | undefined;
    try {
      assetsPayload = await apiClient.get(`/api/v1/pay/${identifier}/assets`);
    } catch (err: any) {
      // Non-payable states (expired, paid, cancelled) return 409/410 from /assets;
      // still return the normalized details so the checkout renders the terminal card.
      // For open/active payments, surface the backend diagnostic instead of showing empty dropdowns.
      if (!isTerminalStatus && err?.statusCode !== 410) {
        throw err;
      }
    }

    return normalizePaymentDetails(identifier, raw, assetsPayload);
  },

  /** @description Get payer-selectable swap tokens for a payment. @param network_id Network ID from the payment details response. */
  get_payerSelectableSwapTokensForAPayment: ({
    identifier,
    params,
  }: {
    identifier: string;
    params: PayerSelectableSwapTokensForAPaymentParams;
  }): Promise<get_payerSelectableSwapTokensForAPayment> =>
    apiClient.get(`/api/v1/pay/${identifier}/swap-tokens`, {
      params: { network: params.network_id },
    }),

  /** @description Create a short-lived exchange-rate quote for a payment. */
  get_createAShortLivedExchangeRateQuoteForAPayment: async ({
    identifier,
    params,
  }: {
    identifier: string;
    params: CreateAShortLivedExchangeRateQuoteForAPaymentParams;
  }): Promise<get_createAShortLivedExchangeRateQuoteForAPayment> => {
    const query: Record<string, string> = {
      network: params.network_id,
      ...(params.cryptocurrency_id ? { token: params.cryptocurrency_id } : {}),
      ...(params.payer_token_mint ? { token: params.payer_token_mint, mode: "swap" } : {}),
      ...(params.payer_address ? { payerAddress: params.payer_address } : {}),
      ...(params.quantity ? { quantity: params.quantity } : {}),
    };
    const raw = await apiClient.get(`/api/v1/pay/${identifier}/quote`, {
      params: query,
    });
    return normalizeQuote(raw);
  },

  /** @description Check approval and get approve tx. */
  post_checkApprovalAndGetApproveTx: async ({
    identifier,
    payload,
  }: {
    identifier: string;
    payload: CheckApprovalAndGetApproveTxPayload;
  }): Promise<post_checkApprovalAndGetApproveTx> => {
    const raw: any = await apiClient.post(`/api/v1/pay/${identifier}/approve`, payload);
    return {
      ...raw,
      needs_approval: Boolean(raw?.needs_approval ?? raw?.needsApproval),
      approve_tx: raw?.approve_tx ?? raw?.approveTx ?? null,
    };
  },

  /** @description Prepare payment transaction. */
  post_preparePaymentTransaction: async ({
    identifier,
    payload,
  }: {
    identifier: string;
    payload: PreparePaymentTransactionPayload;
  }): Promise<post_preparePaymentTransaction> => {
    const raw: any = await apiClient.post(`/api/v1/pay/${identifier}/pay`, payload);
    return {
      ...raw,
      prepare_id: raw?.prepare_id ?? raw?.prepareId,
      payment_tx: raw?.payment_tx ?? raw?.paymentTx,
    };
  },

  /** @description Submit payment tx hash. */
  post_submitPaymentTxHash: ({
    identifier,
    payload,
  }: {
    identifier: string;
    payload: SubmitPaymentTxHashPayload;
  }): Promise<post_submitPaymentTxHash> =>
    apiClient.post(`/api/v1/pay/${identifier}/submit`, payload),

  /** @description Check payment status. */
  get_checkPaymentStatus: async (
    gatewayPaymentId: string,
  ): Promise<get_checkPaymentStatus> => {
    const raw: any = await apiClient.get(`/api/v1/pay/status/${gatewayPaymentId}`);
    const rawStatus = String(raw?.status || "pending").toLowerCase();
    const mappedStatus =
      rawStatus === "confirmed" || rawStatus === "paid" || rawStatus === "completed"
        ? "confirmed"
        : rawStatus === "failed" || rawStatus === "cancelled" || rawStatus === "expired"
          ? "failed"
          : rawStatus === "submitted"
            ? "submitted"
            : "pending";
    return {
      ...raw,
      status: mappedStatus,
      gateway_payment_id: String(raw?.gateway_payment_id ?? raw?.attemptId ?? gatewayPaymentId),
      transaction_ref: String(raw?.transaction_ref ?? raw?.attemptId ?? gatewayPaymentId),
      tx_hash: String(raw?.tx_hash ?? raw?.txHash ?? ""),
      explorer_url: String(raw?.explorer_url ?? raw?.explorerUrl ?? ""),
      confirmed_at: String(raw?.confirmed_at ?? raw?.confirmedAt ?? ""),
      created_at: String(raw?.created_at ?? ""),
      payer_token: raw?.payer_token ?? {
        mint: "",
        symbol: String(raw?.token || "").toUpperCase(),
        amount_raw: String(raw?.amount_raw || "0"),
        amount: String(raw?.amount || "0"),
      },
    };
  },
};
