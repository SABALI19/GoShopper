import { apiRequest } from "../api/client";

export type CheckoutItemInput = {
  storeId: string;
  productId: string;
  quantity: number;
};

export type CheckoutQuoteItem = {
  productId: string;
  productName: string;
  unitPriceKobo: number;
  quantity: number;
  lineTotalKobo: number;
};

export type CheckoutQuoteStore = {
  storeId: string;
  storeName: string;
  items: CheckoutQuoteItem[];
  merchandiseSubtotalKobo: number;
  minimumOrderKobo: number;
  eligible: boolean;
  amountRemainingKobo: number;
};

export type CheckoutQuote = {
  stores: CheckoutQuoteStore[];
  merchandiseSubtotalKobo: number;
  deliveryFeeKobo: number;
  serviceFeeKobo: number;
  totalKobo: number;
  eligible: boolean;
};

export type OrderItem = CheckoutQuoteItem & {
  fulfilmentStatus?: "pending" | "preparing" | "unavailable" | "fulfilled";
  refundAmountKobo?: number;
  refundStatus?: "not_applicable" | "pending";
  unavailableReason?: string;
  unavailableAt?: string | null;
  auditEvents?: { type: string; reason?: string; at?: string }[];
};

export type SubOrder = {
  id: string;
  subOrderNumber: string;
  parentOrderNumber: string;
  storeId: string;
  storeName: string;
  items: OrderItem[];
  merchandiseSubtotalKobo: number;
  deliveryFeeKobo: number;
  serviceFeeKobo: number;
  totalKobo: number;
  status: string;
  remainingMerchandiseKobo?: number;
  customerAction?: CustomerAction;
  cancellation?: { reason?: string; cancelledAt?: string | null; cancelledBy?: string | null };
  createdAt: string;
  updatedAt: string;
  delivery?: CustomerDelivery | null;
};

export type CustomerDelivery = {
  id: string; status: string; storeName: string; assignedAt?: string | null; acceptedAt?: string | null;
  arrivedAt?: string | null; pickedUpAt?: string | null; dispatchedAt?: string | null;
  deliveredAt?: string | null; failedAt?: string | null; failureReason?: string;
  rider?: { firstName: string; lastName: string; phone: string } | null;
  history?: { action: string; fromStatus: string; toStatus: string; reason?: string; createdAt: string }[];
};

export type CustomerAction = {
  reason: string;
  affectedSubOrderId?: string;
  affectedStoreId?: string;
  affectedStoreName?: string;
  amountKobo: number;
  requestedAt?: string | null;
  decision?: "pending" | "proceed_remaining" | "cancel_remaining" | null;
  decidedAt?: string | null;
};

export type RefundObligation = {
  key: string;
  kind: "item_unavailable" | "store_cancelled" | "parent_cancelled";
  subOrderId: string;
  storeId: string;
  storeName: string;
  productKey?: string;
  productName?: string;
  amountKobo: number;
  status: "pending";
  reason: string;
  createdAt: string;
};

export type CustomerOrder = {
  id: string;
  orderNumber: string;
  delivery?: { fullName: string; address: string; phone: string };
  merchandiseSubtotalKobo: number;
  deliveryFeeKobo: number;
  serviceFeeKobo: number;
  totalKobo: number;
  minimumStoreSubtotalKobo?: number;
  paymentStatus?: "pending" | "paid" | "failed" | "refunded";
  status: string;
  cancellationReason?: string;
  customerAction?: CustomerAction;
  customerActionHistory?: CustomerAction[];
  refundObligations?: RefundObligation[];
  subOrders: SubOrder[];
  createdAt: string;
  updatedAt: string;
};

export type OrderRequest = {
  items: CheckoutItemInput[];
  delivery: { fullName: string; address: string; phone: string };
};

export type OrderListPage = {
  orders: CustomerOrder[];
  page: number;
  limit: number;
  total: number;
};

export async function requestCheckoutQuote(token: string, items: CheckoutItemInput[]) {
  const response = await apiRequest<{ quote: CheckoutQuote }>("/api/checkout/quote", {
    token,
    method: "POST",
    body: { items },
  });
  return response.quote;
}

export async function createCustomerOrder(token: string, request: OrderRequest, idempotencyKey: string) {
  return apiRequest<{ order: CustomerOrder; reused: boolean }>("/api/orders", {
    token,
    method: "POST",
    body: request,
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

export async function fetchCustomerOrders(token: string, page = 1, limit = 20) {
  return apiRequest<OrderListPage>(`/api/orders?page=${page}&limit=${limit}`, { token });
}

export async function fetchCustomerOrder(token: string, orderId: string) {
  const response = await apiRequest<{ order: CustomerOrder }>(`/api/orders/${encodeURIComponent(orderId)}`, { token });
  return response.order;
}

export async function issueCustomerDeliveryCode(token: string, orderId: string, deliveryId: string) {
  return apiRequest<{ code: string; expiresAt: string }>(`/api/orders/${encodeURIComponent(orderId)}/deliveries/${encodeURIComponent(deliveryId)}/code`, { token, method: "POST", body: {} });
}

export async function cancelCustomerOrder(token: string, orderId: string) {
  const response = await apiRequest<{ order: CustomerOrder }>(`/api/orders/${encodeURIComponent(orderId)}/cancel`, {
    token,
    method: "POST",
    body: {},
  });
  return response.order;
}

export async function fetchCustomerActionRequest(token: string, orderId: string) {
  const response = await apiRequest<{ action: {
    orderNumber: string;
    status: string;
    paymentStatus: string;
    decision: "pending";
    reason: string;
    affectedSubOrderNumber: string;
    affectedStoreId: string;
    affectedStoreName: string;
    amountKobo: number;
    createdAt: string;
  } }>(`/api/orders/${encodeURIComponent(orderId)}/customer-action`, { token });
  return response.action;
}

export async function submitCustomerActionDecision(token: string, orderId: string, decision: "proceed_remaining" | "cancel_remaining") {
  const response = await apiRequest<{ order: CustomerOrder }>(`/api/orders/${encodeURIComponent(orderId)}/customer-action/decision`, {
    token,
    method: "POST",
    body: { decision },
  });
  return response.order;
}

export function getOrderErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    const status = "status" in error ? error.status : undefined;
    if (status === 401 || status === 403) return "Your session could not be verified. Sign in again, then retry.";
    if (status === 409) return error.message;
    return error.message;
  }
  return "We couldn't reach the Go-Shopper service. Check your connection and try again.";
}

export function getCheckoutIssues(error: unknown) {
  if (!error || typeof error !== "object" || !("payload" in error)) return [] as { storeId?: string; productId?: string; message: string }[];
  const payload = error.payload as { issues?: unknown } | undefined;
  if (!Array.isArray(payload?.issues)) return [];
  return payload.issues.flatMap((issue) => {
    if (!issue || typeof issue !== "object") return [];
    const value = issue as { storeId?: unknown; productId?: unknown; message?: unknown };
    return [{
      ...(typeof value.storeId === "string" ? { storeId: value.storeId } : {}),
      ...(typeof value.productId === "string" ? { productId: value.productId } : {}),
      message: typeof value.message === "string" ? value.message : "This item needs attention.",
    }];
  });
}
