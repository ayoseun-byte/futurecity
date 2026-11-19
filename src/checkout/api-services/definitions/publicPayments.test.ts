import { describe, expect, test } from "vitest";
import { publicPaymentsApi } from "./publicPayments";

describe("Unified public checkout API contract", () => {
  test("exposes single canonical endpoint methods matching Merchant_Public_Payment_Frontend", () => {
    expect(typeof publicPaymentsApi.get_paymentDetailsForPayer).toBe("function");
    expect(typeof publicPaymentsApi.get_payerSelectableSwapTokensForAPayment).toBe("function");
    expect(typeof publicPaymentsApi.get_createAShortLivedExchangeRateQuoteForAPayment).toBe("function");
    expect(typeof publicPaymentsApi.post_checkApprovalAndGetApproveTx).toBe("function");
    expect(typeof publicPaymentsApi.post_preparePaymentTransaction).toBe("function");
    expect(typeof publicPaymentsApi.post_submitPaymentTxHash).toBe("function");
    expect(typeof publicPaymentsApi.get_checkPaymentStatus).toBe("function");
  });
});
