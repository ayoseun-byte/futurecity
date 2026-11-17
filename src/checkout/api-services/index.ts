export * from "./config";


import { publicPaymentsApi } from "./definitions/publicPayments";

export const api = {
  ...publicPaymentsApi,
};
