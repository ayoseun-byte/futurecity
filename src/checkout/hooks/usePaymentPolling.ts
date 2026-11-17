import { useEffect, useRef } from "react";
import { publicPaymentsApi } from "@/api-services/definitions/publicPayments";
import type { get_checkPaymentStatus } from "@/api-services/types/publicPayments/get_checkPaymentStatus";

interface UsePaymentPollingProps {
  showStatusModal: boolean;
  paymentStatus: string;
  gatewayPaymentId?: string;
  onSuccess: (result: get_checkPaymentStatus) => void;
  onFail: (error?: string , tx_hash?: string ) => void;
}

export const usePaymentPolling = ({
  showStatusModal,
  paymentStatus,
  gatewayPaymentId,
  onSuccess,
  onFail,
}: UsePaymentPollingProps) => {
  // Callers pass new callbacks on every render. Keeping them out of the polling
  // effect's deps stops re-renders (e.g. the expiry countdown) restarting the timer
  const onSuccessRef = useRef(onSuccess);
  const onFailRef = useRef(onFail);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onFailRef.current = onFail;
  });

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (
      showStatusModal &&
      (paymentStatus === "submitted" || paymentStatus === "pending") &&
      gatewayPaymentId
    ) {
      intervalId = setInterval(async () => {
        try {
          const result =
            await publicPaymentsApi.get_checkPaymentStatus(gatewayPaymentId);
          if (result.status === "confirmed") {
            onSuccessRef.current(result);
          } else if (result.status === "failed") {
            onFailRef.current(result.error ?? "", result.tx_hash ?? "");
          }
        } catch (error) {
          console.error("Background polling error:", error);
        }
      }, 5000);
    }

    return () => clearInterval(intervalId);
  }, [showStatusModal, paymentStatus, gatewayPaymentId]);
};
