export type get_createAShortLivedExchangeRateQuoteForAPayment = {
  quote_id: string;
  source_amount: string;
  source_currency: string;
  source_type: "fiat" | "crypto";
  target_amount: string;
  target_amount_raw: string;
  target_currency: string;
  route_cost?: string | null;
  route_cost_usd?: string | null;
  rate: string;
  expires_at: string;
};
