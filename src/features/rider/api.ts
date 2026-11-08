import { apiRequest } from "../api/client";

export type RiderDelivery = {
  id: string; parentOrderNumber: string; subOrderNumber: string; storeId: string; storeName: string;
  status: string; assignedAt?: string | null; acceptedAt?: string | null; arrivedAt?: string | null;
  pickedUpAt?: string | null; dispatchedAt?: string | null; deliveredAt?: string | null;
  failedAt?: string | null; failureReason?: string; deliveryNotes?: string;
  destination?: { fullName: string; address: string; phone: string };
  history?: { action: string; fromStatus: string; toStatus: string; reason?: string; createdAt: string }[];
};
export type RiderProfile = { firstName: string; lastName: string; phone: string; vehicleType: string; approvalStatus: string; isOnline: boolean; isSuspended: boolean };
export async function fetchRiderProfile(token: string) { return apiRequest<{ profile: RiderProfile; activeDelivery: Pick<RiderDelivery, "id" | "parentOrderNumber" | "subOrderNumber" | "storeName" | "status"> | null; summary: { activeCount: number; completedCount: number; assignedCount: number } }>("/api/rider/profile", { token }); }
export async function setRiderAvailability(token: string, isOnline: boolean) { return apiRequest<{ profile: RiderProfile }>("/api/rider/availability", { token, method: "PATCH", body: { isOnline } }); }
export async function fetchRiderDeliveries(token: string) { return apiRequest<{ deliveries: RiderDelivery[]; page: number; limit: number; total: number }>("/api/rider/deliveries?limit=100", { token }); }
export async function fetchRiderDelivery(token: string, id: string) { return (await apiRequest<{ delivery: RiderDelivery }>(`/api/rider/deliveries/${encodeURIComponent(id)}`, { token })).delivery; }
export async function riderDeliveryAction(token: string, id: string, action: "accept" | "arrive" | "in-transit" | "complete" | "fail", body: Record<string, string> = {}) { return apiRequest<{ delivery: RiderDelivery }>(`/api/rider/deliveries/${encodeURIComponent(id)}/${action}`, { token, method: "POST", body }); }
export function riderErrorMessage(error: unknown) { return error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "Could not reach Go-Shopper. Check your connection and retry."; }
