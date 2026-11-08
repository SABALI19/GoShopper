import { apiRequest } from "../api/client";

export type AdminSummary = {
  registeredCustomers: number;
  totalSupermarkets: number;
  activeSupermarkets: number;
  pendingStoreApprovals: number;
  suspendedStores: number;
  totalParentOrders: number;
  awaitingPaymentOrders: number;
  confirmedProcessingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  customerActionRequiredOrders: number;
};
export type AdminActivity = { type: string; action: string; targetType: string; targetId: string; reason?: string; name?: string; createdAt?: string };
export type AdminStore = {
  id: string; slug: string; name: string; category: string; tagline?: string; description?: string;
  logoUrl?: string; coverImageUrl?: string; address?: { line1?: string; city?: string; state?: string };
  openHours?: string; isActive: boolean; isApproved: boolean; approvalStatus: "pending" | "approved" | "rejected";
  approvalReason?: string; suspensionReason?: string; suspendedAt?: string | null; createdAt?: string;
  productCount?: number; owner?: { name: string; email: string; phone: string } | null;
};
export type AdminProduct = { id: string; productKey: string; name: string; description?: string; category?: string; imageUrl?: string; priceKobo: number; stockQuantity: number; isAvailable: boolean };
export type AdminUser = { id: string; firstName: string; lastName: string; email: string; phone: string; role: string; isSuspended: boolean; suspensionReason?: string; suspendedAt?: string | null; createdAt?: string };
export type AdminOrder = {
  id: string; orderNumber: string; delivery?: { fullName: string; phone: string; address: string };
  merchandiseSubtotalKobo: number; deliveryFeeKobo: number; serviceFeeKobo: number; totalKobo: number;
  paymentStatus: string; status: string; customerAction?: { reason?: string; affectedStoreName?: string; decision?: string | null; amountKobo?: number };
  customerActionHistory?: { reason?: string; decision?: string; affectedStoreName?: string; requestedAt?: string; decidedAt?: string }[];
  refundObligations?: { key: string; kind: string; storeName: string; productName?: string; amountKobo: number; status: string; reason: string; createdAt: string }[];
  subOrders: { subOrderNumber: string; storeName: string; storeId: string; status: string; merchandiseSubtotalKobo: number; totalKobo: number; items: { productName: string; productId: string; unitPriceKobo: number; quantity: number; lineTotalKobo: number; fulfilmentStatus?: string; unavailableReason?: string; refundAmountKobo?: number; refundStatus?: string; unavailableAt?: string | null; auditEvents?: { type?: string; reason?: string; at?: string }[] }[]; customerAction?: { reason?: string; decision?: string | null } }[];
  createdAt?: string; customer?: Pick<AdminUser, "firstName" | "lastName" | "email" | "phone" | "role"> | null;
};
export type PlatformSettings = { minimumStoreSubtotalKobo: number; deliveryFeeKobo: number; serviceFeeKobo: number; source: "environment" | "database"; updatedAt: string | null };
export type AdminRider = { id: string; firstName: string; lastName: string; email: string; phone: string; isSuspended: boolean; approvalStatus: "pending" | "approved" | "rejected"; vehicleType: string; isOnline: boolean; hasActiveDelivery: boolean; createdAt?: string };
export type AdminApplication = { id: string; reference: string; type: "supermarket" | "rider"; status: string; data: Record<string, string | string[]>; feedback: string; reviewerNotes: string; history: { status: string; message: string; createdAt: string }[]; createdAt: string };
export type AdminApplicationAudit = { actorClerkUserId: string; action: string; reason: string; metadata: Record<string, unknown>; createdAt: string };
export type AdminDelivery = { id: string; parentOrderNumber: string; subOrderNumber: string; storeId: string; storeName: string; status: string; assignedAt?: string | null; arrivedAt?: string | null; pickedUpAt?: string | null; dispatchedAt?: string | null; deliveredAt?: string | null; failedAt?: string | null; failureReason?: string; deliveryNotes?: string; proofVerifiedAt?: string | null; rider?: { firstName: string; lastName: string; phone: string; vehicleType?: string; approvalStatus?: string; isOnline?: boolean; isSuspended?: boolean } | null; destination?: { fullName: string; address: string; phone: string }; assignmentHistory?: { rider: { firstName: string; lastName: string; phone: string } | null; action: string; reason?: string; createdAt: string }[]; history?: { actorRole: string; action: string; fromStatus: string; toStatus: string; reason?: string; createdAt: string }[] };

export async function fetchAdminSummary(token: string) { return apiRequest<{ summary: AdminSummary; recentActivity: AdminActivity[] }>("/api/admin/dashboard/summary", { token }); }
export async function fetchAdminStores(token: string, filters: { q?: string; approvalStatus?: string; status?: string; page?: number }) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== "").map(([key, value]) => [key, String(value)]));
  return apiRequest<{ stores: AdminStore[]; page: number; limit: number; total: number }>(`/api/stores/admin/all?${query}`, { token });
}
export async function fetchAdminStore(token: string, storeId: string) { return (await apiRequest<{ store: AdminStore }>(`/api/stores/admin/${encodeURIComponent(storeId)}`, { token })).store; }
export async function fetchAdminStoreProducts(token: string, storeId: string) { return (await apiRequest<{ products: AdminProduct[] }>(`/api/stores/admin/${encodeURIComponent(storeId)}/products`, { token })).products; }
export async function decideStoreApproval(token: string, storeId: string, decision: "approved" | "rejected", reason = "") { return apiRequest<{ store: AdminStore }>(`/api/stores/admin/${encodeURIComponent(storeId)}/approval`, { token, method: "PATCH", body: { decision, reason } }); }
export async function setStoreActive(token: string, storeId: string, isActive: boolean, reason = "") { return apiRequest<{ store: AdminStore }>(`/api/stores/admin/${encodeURIComponent(storeId)}/status`, { token, method: "PATCH", body: { isActive, reason } }); }
export async function createAdminStoreForOwner(token: string, input: { ownerEmail: string; name: string; category: string; description?: string }) { return apiRequest<{ store: AdminStore }>("/api/stores/admin/create-for-owner", { token, method: "POST", body: input }); }
export async function fetchAdminUsers(token: string, filters: { q?: string; role?: string; status?: string; page?: number }) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== "").map(([key, value]) => [key, String(value)]));
  return apiRequest<{ users: AdminUser[]; page: number; limit: number; total: number }>(`/api/users?${query}`, { token });
}
export async function fetchAdminUser(token: string, userId: string) { return (await apiRequest<{ user: AdminUser }>(`/api/users/admin/${encodeURIComponent(userId)}`, { token })).user; }
export async function fetchAdminUserOrders(token: string, userId: string) { return apiRequest<{ orders: AdminOrder[]; page: number; limit: number; total: number }>(`/api/users/admin/${encodeURIComponent(userId)}/orders`, { token }); }
export async function setUserSuspended(token: string, userId: string, isSuspended: boolean, reason = "") { return apiRequest<{ user: AdminUser }>(`/api/users/admin/${encodeURIComponent(userId)}/status`, { token, method: "PATCH", body: { isSuspended, reason } }); }
export async function fetchAdminOrders(token: string, filters: { q?: string; paymentStatus?: string; status?: string; storeId?: string; customerActionRequired?: string; page?: number }) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== "").map(([key, value]) => [key, String(value)]));
  return apiRequest<{ orders: AdminOrder[]; page: number; limit: number; total: number }>(`/api/admin/orders?${query}`, { token });
}
export async function fetchAdminOrder(token: string, orderId: string) { return (await apiRequest<{ order: AdminOrder }>(`/api/admin/orders/${encodeURIComponent(orderId)}`, { token })).order; }
export async function fetchPlatformSettings(token: string) { return (await apiRequest<{ settings: PlatformSettings }>("/api/admin/settings", { token })).settings; }
export async function updatePlatformSettings(token: string, settings: Pick<PlatformSettings, "minimumStoreSubtotalKobo" | "deliveryFeeKobo" | "serviceFeeKobo">) {
  return (await apiRequest<{ settings: PlatformSettings }>("/api/admin/settings", { token, method: "PUT", body: settings })).settings;
}
export async function fetchAdminDeliveries(token: string, filters: { q?: string; status?: string; page?: number } = {}) { const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== "").map(([key, value]) => [key, String(value)])); return apiRequest<{ deliveries: AdminDelivery[]; page: number; limit: number; total: number }>(`/api/admin/deliveries?${query}`, { token }); }
export async function fetchAdminDelivery(token: string, id: string) { return (await apiRequest<{ delivery: AdminDelivery }>(`/api/admin/deliveries/${encodeURIComponent(id)}`, { token })).delivery; }
export async function assignAdminDelivery(token: string, id: string, riderUserId: string, reason = "") { return apiRequest<{ delivery: AdminDelivery }>(`/api/admin/deliveries/${encodeURIComponent(id)}/assign`, { token, method: "POST", body: { riderUserId, reason } }); }
export async function fetchAdminRiders(token: string, status = "all") { return (await apiRequest<{ riders: AdminRider[] }>(`/api/admin/deliveries/riders/list?status=${encodeURIComponent(status)}`, { token })).riders; }
export async function provisionAdminRider(token: string, clerkUserId: string, vehicleType = "") { return apiRequest<{ rider: AdminRider }>("/api/admin/deliveries/riders/provision", { token, method: "POST", body: { clerkUserId, vehicleType } }); }
export async function updateAdminRider(token: string, riderId: string, update: { approvalStatus?: "pending" | "approved" | "rejected"; vehicleType?: string }) { return apiRequest<{ rider: AdminRider }>(`/api/admin/deliveries/riders/${encodeURIComponent(riderId)}/profile`, { token, method: "PATCH", body: update }); }
export async function fetchAdminApplications(token: string, filters: { type?: string; status?: string; q?: string } = {}) { const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as [string, string][]); return apiRequest<{ applications: AdminApplication[]; page: number; limit: number; total: number }>(`/api/admin/applications?${query}`, { token }); }
export async function fetchAdminApplication(token: string, id: string) { return apiRequest<{ application: AdminApplication; audit: AdminApplicationAudit[] }>(`/api/admin/applications/${encodeURIComponent(id)}`, { token }); }
export async function decideAdminApplication(token: string, id: string, decision: "under_review" | "needs_information" | "approved" | "rejected", reason = "", notes = "") { return apiRequest<{ application: AdminApplication }>(`/api/admin/applications/${encodeURIComponent(id)}/decision`, { token, method: "PATCH", body: { decision, reason, notes } }); }
export function adminErrorMessage(error: unknown) { return error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "Could not reach the Go-Shopper service. Check your connection and retry."; }
