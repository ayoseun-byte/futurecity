export type get_payerSelectableSwapTokensForAPayment = {
  network_id: string;
  network: string;
  provider: string;
  tokens: Token[];
};

interface Token {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logo: string;
  is_native: boolean;
  verified: boolean;
  chain_id: number;
}
