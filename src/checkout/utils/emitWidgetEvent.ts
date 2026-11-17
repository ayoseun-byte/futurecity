export type WidgetEventType =
  | "ORKI_PAYMENT_SUCCESS"
  | "ORKI_PAYMENT_ERROR"
  | "ORKI_PAYMENT_CANCEL"
  | "ORKI_CLOSE"
  | "ORKI_PAYMENT_EXPIRED";

export interface WidgetEventMessage {
  type: WidgetEventType;
  event: string;
  payload?: any;
}

/**
 * Emits postMessage events to parent (iframe) or opener (popup/new-tab) window.
 */
export const emitWidgetEvent = (
  type: WidgetEventType,
  payload?: any,
) => {
  if (typeof window === "undefined") return;

  const eventMap: Record<WidgetEventType, string> = {
    ORKI_PAYMENT_SUCCESS: "payment.success",
    ORKI_PAYMENT_ERROR: "payment.error",
    ORKI_PAYMENT_CANCEL: "payment.cancel",
    ORKI_CLOSE: "payment.close",
    ORKI_PAYMENT_EXPIRED: "payment.expired",
  };

  const message: WidgetEventMessage = {
    type,
    event: eventMap[type],
    payload,
  };

  // 1. Post to parent window (if embedded in an iframe)
  if (window.parent && window.parent !== window) {
    try {
      window.parent.postMessage(message, "*");
    } catch (e) {
      console.error("[OrkiWidget] Failed to postMessage to window.parent:", e);
    }
  }

  // 2. Post to opener window (if opened in a popup or new tab)
  if (window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage(message, "*");
    } catch (e) {
      console.error("[OrkiWidget] Failed to postMessage to window.opener:", e);
    }
  }
};
