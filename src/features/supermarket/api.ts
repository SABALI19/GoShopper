import { apiRequest, apiUploadImage } from "../api/client";

export type ManagedStore = {
  id: string;
  slug: string;
  name: string;
  category: string;
  tagline?: string;
  logoUrl?: string;
  hasManagedLogo?: boolean;
  isOpen: boolean;
  isSuspended: boolean;
  isApproved: boolean;
  openHours?: string;
  description?: string;
  address?: { line1?: string; city?: string; state?: string; country?: string };
};

export type ManagedProduct = {
  id: string;
  productKey: string;
  name: string;
  description?: string;
  category: string;
  imageUrl?: string;
  priceKobo: number;
  stockQuantity: number;
  unitType: "unit" | "weight";
  unitLabel: string;
  barcode?: string;
  isAvailable: boolean;
  updatedAt?: string;
};

export type DashboardSummary = {
  totalOrders: number;
  pendingPaymentOrders: number;
  awaitingFulfilmentOrders: number;
  preparingOrders: number;
  readyForDispatchOrders: number;
  dispatchedOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  unableToFulfilOrders: number;
  customerActionRequiredOrders: number;
};

export type StoreRecentOrder = {
  id: string;
  subOrderNumber: string;
  parentOrderNumber: string;
  storeId: string;
  storeName: string;
  itemCount: number;
  merchandiseSubtotalKobo: number;
  totalKobo: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
};

export type StoreOrderItem = {
  productId: string;
  productName: string;
  unitPriceKobo: number;
  quantity: number;
  lineTotalKobo: number;
  fulfilmentStatus?: "pending" | "preparing" | "unavailable" | "fulfilled";
  refundAmountKobo?: number;
  refundStatus?: "not_applicable" | "pending";
  unavailableReason?: string;
  unavailableAt?: string | null;
  auditEvents?: { type: string; reason?: string; at?: string }[];
};

export type StoreOrder = {
  id: string;
  subOrderNumber: string;
  parentOrderNumber: string;
  storeId: string;
  storeName: string;
  items: StoreOrderItem[];
  merchandiseSubtotalKobo: number;
  deliveryFeeKobo: number;
  serviceFeeKobo: number;
  totalKobo: number;
  remainingMerchandiseKobo?: number;
  reservationStatus?: string;
  status: string;
  paymentStatus: string;
  parentStatus?: string;
  delivery?: { fullName: string; address: string; phone: string };
  createdAt: string;
  updatedAt: string;
  parentCreatedAt?: string;
  parentUpdatedAt?: string;
  deliveryProgress?: { id: string; status: string; assigned: boolean; rider?: { firstName: string; lastName: string; phone: string } | null; assignedAt?: string | null; arrivedAt?: string | null; pickedUpAt?: string | null; dispatchedAt?: string | null; deliveredAt?: string | null; failedAt?: string | null; failureReason?: string } | null;
  cancellation?: { reason?: string; cancelledAt?: string | null; cancelledBy?: string | null };
  customerAction?: { reason?: string; affectedStoreName?: string; amountKobo?: number; requestedAt?: string | null; decision?: string | null; decidedAt?: string | null };
};

export async function fetchManagedStores(token: string) {
  const response = await apiRequest<{ stores: ManagedStore[] }>("/api/stores/mine", { token });
  return response.stores;
}

export async function fetchDashboardSummary(token: string, storeId: string) {
  return apiRequest<{ store: ManagedStore; summary: DashboardSummary; recentOrders: StoreRecentOrder[] }>(
    `/api/stores/${encodeURIComponent(storeId)}/dashboard/summary`, { token },
  );
}

export async function fetchStoreOrders(token: string, storeId: string, page: number, limit: number, status?: string) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit), ...(status && status !== "all" ? { status } : {}) });
  return apiRequest<{ orders: StoreOrder[]; page: number; limit: number; total: number }>(
    `/api/stores/${encodeURIComponent(storeId)}/orders?${query.toString()}`, { token },
  );
}

export async function fetchStoreOrder(token: string, storeId: string, orderId: string) {
  const response = await apiRequest<{ order: StoreOrder }>(
    `/api/stores/${encodeURIComponent(storeId)}/orders/${encodeURIComponent(orderId)}`, { token },
  );
  return response.order;
}

export async function updateStoreOrderStatus(token: string, storeId: string, orderId: string, status: string, reason?: string) {
  return apiRequest<{
    order: Omit<StoreOrder, "paymentStatus" | "delivery" | "parentStatus">;
    delivery?: StoreOrder["delivery"];
    deliveryProgress?: StoreOrder["deliveryProgress"];
    parentStatus?: string;
    paymentStatus?: string;
  }>(
    `/api/stores/${encodeURIComponent(storeId)}/orders/${encodeURIComponent(orderId)}/fulfillment`,
    { token, method: "PATCH", body: { status, ...(reason ? { reason } : {}) } },
  );
}

export async function fetchManagedStore(token: string, storeId: string) {
  const result = await apiRequest<{ store: ManagedStore & { description?: string; address?: ManagedStore["address"] } }>(`/api/stores/mine/${encodeURIComponent(storeId)}`, { token });
  return result.store;
}

export async function updateManagedStore(token: string, storeId: string, data: Partial<Pick<ManagedStore, "name" | "category" | "tagline" | "description" | "openHours" | "isOpen">> & { address?: ManagedStore["address"] }) {
  return apiRequest<{ store: ManagedStore }>(`/api/stores/${encodeURIComponent(storeId)}`, { token, method: "PATCH", body: data });
}

export async function uploadStoreLogo(token: string, storeId: string, uri: string) {
  return apiUploadImage<{ store: ManagedStore }>(`/api/stores/mine/${encodeURIComponent(storeId)}/logo`, token, uri);
}

export async function removeStoreLogo(token: string, storeId: string) {
  return apiRequest<{ store: ManagedStore }>(`/api/stores/mine/${encodeURIComponent(storeId)}/logo`, { token, method: "DELETE" });
}

export async function fetchProducts(token: string, storeId: string, params: { page?: number; limit?: number; q?: string; category?: string; availability?: string; lowStock?: boolean } = {}) {
  const query = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 20), ...(params.q ? { q: params.q } : {}), ...(params.category ? { category: params.category } : {}), ...(params.availability && params.availability !== "all" ? { availability: params.availability } : {}), ...(params.lowStock ? { lowStock: "true" } : {}) });
  return apiRequest<{ products: ManagedProduct[]; categories: string[]; lowStockCount: number; page: number; limit: number; total: number }>(`/api/stores/mine/${encodeURIComponent(storeId)}/products?${query}`, { token });
}

export async function createProduct(token: string, storeId: string, data: Omit<ManagedProduct, "id" | "productKey" | "imageUrl" | "updatedAt">) {
  return apiRequest<{ product: ManagedProduct }>(`/api/stores/${encodeURIComponent(storeId)}/products`, { token, method: "POST", body: data });
}

export async function updateProduct(token: string, storeId: string, productId: string, data: Partial<ManagedProduct>) {
  return apiRequest<{ product: ManagedProduct }>(`/api/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(productId)}`, { token, method: "PATCH", body: data });
}

export async function uploadProductImage(token: string, storeId: string, productId: string, uri: string) {
  return apiUploadImage<{ product: ManagedProduct }>(`/api/stores/mine/${encodeURIComponent(storeId)}/products/${encodeURIComponent(productId)}/image`, token, uri);
}

export async function removeProductImage(token: string, storeId: string, productId: string) {
  return apiRequest<{ product: ManagedProduct }>(`/api/stores/mine/${encodeURIComponent(storeId)}/products/${encodeURIComponent(productId)}/image`, { token, method: "DELETE" });
}

export async function confirmStoreHandover(token: string, storeId: string, orderId: string) {
  return apiRequest<{ order: StoreOrder; deliveryProgress: StoreOrder["deliveryProgress"] }>(`/api/stores/${encodeURIComponent(storeId)}/orders/${encodeURIComponent(orderId)}/handover`, { token, method: "POST", body: {} });
}

export async function reportStoreItemUnavailable(token: string, storeId: string, orderId: string, productId: string, reason: string) {
  return apiRequest<{ item: { subOrderNumber: string; productId: string; refundAmountKobo: number; refundStatus: "pending"; remainingMerchandiseKobo: number } }>(
    `/api/stores/${encodeURIComponent(storeId)}/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(productId)}/unavailable`,
    { token, method: "POST", body: { reason } },
  );
}

export async function reportStoreCannotFulfil(token: string, storeId: string, orderId: string, reason: string) {
  return apiRequest<{ action: { subOrderNumber: string; parentOrderNumber: string; customerAction: StoreOrder["customerAction"] } }>(
    `/api/stores/${encodeURIComponent(storeId)}/orders/${encodeURIComponent(orderId)}/unable-to-fulfil`,
    { token, method: "POST", body: { reason } },
  );
}

export function apiMessage(error: unknown) {
  if (error && typeof error === "object" && "status" in error) {
    if (error.status === 401) return "Your session expired. Sign in again to continue.";
    if (error.status === 403) return "This account does not have supermarket access.";
    if (error.status === 404) return "This store or order is not available to this account.";
  }
  return error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message
    : "We couldn't reach the Go-Shopper service. Check your connection and retry.";
}
