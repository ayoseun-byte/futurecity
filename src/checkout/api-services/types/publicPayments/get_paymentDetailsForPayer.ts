export interface get_paymentDetailsForPayer {
  product_title: string;
  description: string;
  images: ProductImage[];
  pay_link?: string;
  checkout_type?: string;
  charge_status?: string;
  price: string;
  price_denomination: "crypto" | string;
  price_denomination_asset: Asset;
  customer_can_change_price: boolean;
  is_dynamic?: boolean;
  allows_token_swaps: boolean;
  allows_card_pay: boolean;
  crypto_options: CryptoOption[];
  swap_options?: SwapOptions;
  swap_networks: SwapOptions[];
  recipients: Recipient[];
  allows_multiple_sales: boolean;
  min_sales: number;
  max_sales: number;
  requires_customer_info: boolean;
  customer_info: CustomerInfo;
  redirect_option: "instant" | string;
  redirect_url: string;
  show_badge: boolean;
  primary_color: string;
  button_color: string;
  // Only set for dynamic payments (ISO 8601 or epoch)
  expires_at?: string | null;
}

export interface ProductImage {
  id: string;
  url: string;
  created_at: string;
}

export interface Asset {
  id: string;
  slug?: string;
  code?: string;
  symbol?: string;
  title: string;
  logo: string;
}

export interface SwapOptions {
  network_id: string;
  network: Network;
  provider: string;
  input_tokens_url: string;
}

export interface CryptoOption {
  id: string;
  slug: string;
  title: string;
  logo: string;
  networks: Network[];
}

export interface Network {
  id: string;
  slug: string;
  title: string;
  logo: string;
  token_address?: string;
}

export interface SwapToken {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logo: string | null;
  pool_id: string;
  tvl: number;
}

export interface Recipient {
  network: Network;
  wallet_address: string;
}

export interface CustomerInfo {
  custom: CustomCustomerField[];
  system: SystemCustomerFields;
}

export interface CustomCustomerField {
  key: string;
  type: "text" | "select" | string;
  label: string;
  required: "0" | "1";
  description?: string | null;
  options?: string[];
}

export interface SystemCustomerFields {
  email: SystemField;
  phone: SystemField;
  name_and_shipping: SystemField;
}

export interface SystemField {
  type: "text" | "email" | "tel";
  label: string;
  required: "0" | "1";
}
