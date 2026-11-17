export type post_submitPaymentTxHash = {
    gateway_payment_id: string;
    transaction_ref: string;
    status: "submitted" | "pending" | "completed" | "failed";
    explorer_url: string;
}
