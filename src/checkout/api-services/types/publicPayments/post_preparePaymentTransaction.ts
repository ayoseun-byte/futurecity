export type post_preparePaymentTransaction = {
  prepare_id: string;
  payment_tx: PaymentTx;
  merchant_wallet: string;
  token: string;
  amount: string;
  input_amount?: string;
};

export type PaymentTx = NonSwapPaymentTx | SwapPaymentTx;

interface NonSwapPaymentTx {
  signingMethod: string;
  tx: TransactionTx;
  meta: TransactionMeta;
  requestId?: never;
  executions?: never;
}

interface SwapPaymentTx {
  signingMethod: "relay";
  requestId: string;
  executions: Execution[];
  tx?: never;
  meta?: never;
}

interface TransactionTx {
  from: string;
  to: string;
  data: string;
  value: string;

  nonce?: string;

  gas: string;
  chainId: string | number;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

interface TransactionMeta {
  network: string;
  networkName: string;
  action: string;
  merchantWallet: string;
  token: string;
  isNativePayment: boolean;
  amount: string;
}

interface Execution {
  id: string;
  kind: string;
  tx: TransactionTx;
  statusCheck: StatusCheck;
  requestId: string;
}

interface StatusCheck {
  endpoint: string;
  method: string;
}
