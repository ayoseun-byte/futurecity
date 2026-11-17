type PaymentStatus = "submitted" | "pending" | "confirmed" | "failed";

export interface get_checkPaymentStatus {
  gateway_payment_id: string;
  transaction_ref: string;
  tx_hash: string;
  explorer_url: string;
  status: PaymentStatus;
  payer_token: {
    mint: string;
    symbol: string;
    amount_raw: string;
    amount: string;
  };
  denomination: string;
  confirmations: number;
  error: string | null;
  confirmed_at: string;
  created_at: string;
}