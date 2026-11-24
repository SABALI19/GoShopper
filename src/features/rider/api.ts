import { apiRequest } from "../api/client";

export type RiderDelivery = {
  id: string; parentOrderNumber: string; subOrderNumber: string; storeId: string; storeName: string;
  status: string; assignedAt?: string | null; acceptedAt?: string | null; arrivedAt?: string | null;
  pickedUpAt?: string | null; dispatchedAt?: string | null; deliveredAt?: string | null;
  failedAt?: string | null; failureReason?: string; deliveryNotes?: string;
  destination?: { fullName: string; address: string; phone: string };
  history?: { actorRole?: string; actorName?: string; action: string; fromStatus: string; toStatus: string; reason?: string; createdAt: string; location?: { type: "Point"; coordinates: number[] } }[];
};
export type RiderProfile = { firstName: string; lastName: string; phone: string; vehicleType: string; approvalStatus: string; isOnline: boolean; isSuspended: boolean };
export async function fetchRiderProfile(token: string) { return apiRequest<{ profile: RiderProfile; activeDelivery: Pick<RiderDelivery, "id" | "parentOrderNumber" | "subOrderNumber" | "storeName" | "status"> | null; summary: { activeCount: number; completedCount: number; assignedCount: number } }>("/api/rider/profile", { token }); }
export async function setRiderAvailability(token: string, isOnline: boolean) { return apiRequest<{ profile: RiderProfile }>("/api/rider/availability", { token, method: "PATCH", body: { isOnline } }); }
export async function fetchRiderDeliveries(token: string) { return apiRequest<{ deliveries: RiderDelivery[]; page: number; limit: number; total: number }>("/api/rider/deliveries?limit=100", { token }); }
export async function fetchRiderDelivery(token: string, id: string) { return (await apiRequest<{ delivery: RiderDelivery }>(`/api/rider/deliveries/${encodeURIComponent(id)}`, { token })).delivery; }
export async function riderDeliveryAction(token: string, id: string, action: "accept" | "arrive" | "in-transit" | "complete" | "fail", body: Record<string, string> = {}) { return apiRequest<{ delivery: RiderDelivery }>(`/api/rider/deliveries/${encodeURIComponent(id)}/${action}`, { token, method: "POST", body }); }
export async function confirmRiderPickup(token: string, id: string, code: string) { return apiRequest<{ delivery: RiderDelivery; message: string }>(`/api/rider/deliveries/${encodeURIComponent(id)}/pickup-confirm`, { token, method: "POST", body: { code } }); }
export function riderErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    const messages: Record<string, string> = {
      PICKUP_CODE_INVALID: "That QR or six-digit code does not match this delivery. Check with the store and try again.",
      PICKUP_CODE_EXPIRED: "This pickup code has expired. Ask the store to regenerate it.",
      PICKUP_CODE_USED: "This pickup code was already used. Refresh the delivery status.",
      NOT_ASSIGNED_RIDER: "This delivery is assigned to another rider.",
      RIDER_NOT_ARRIVED: "Mark your arrival at the store before confirming pickup.",
      ORDER_NOT_READY: "The store order is not ready for collection yet.",
      PICKUP_LOCKED: "Pickup verification is locked after too many attempts. Ask the store to regenerate the code.",
    };
    if (messages[error.code]) return messages[error.code];
  }
  return error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "Could not reach Go-Shopper. Check your connection and retry.";
}
