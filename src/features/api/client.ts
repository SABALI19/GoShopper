import { File, UploadType } from "expo-file-system";

export const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") || "";

export type ApiError = Error & { status?: number; code?: string; payload?: unknown };

export async function apiRequest<T>(path: string, options: {
  token?: string | null;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
} = {}): Promise<T> {
  if (!apiBaseUrl) throw new Error("EXPO_PUBLIC_API_URL is not configured");
  const send = (token?: string | null) => fetch(`${apiBaseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  let response = await send(options.token);
  if (response.status === 401 && options.token) {
    const { refreshMobileSession } = await import("../auth/AuthProvider");
    const renewed = await refreshMobileSession();
    if (renewed) response = await send(renewed);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `API request failed (${response.status})`) as ApiError;
    error.status = response.status;
    error.code = payload?.error?.code;
    error.payload = payload;
    throw error;
  }
  return payload as T;
}

export async function apiUploadImage<T>(path: string, token: string, imageUri: string): Promise<T> {
  if (!apiBaseUrl) throw new Error("EXPO_PUBLIC_API_URL is not configured");
  const file = new File(imageUri);
  if (!file.exists || file.size === null || file.size <= 0) throw new Error("The selected image could not be read.");
  const send = (accessToken: string) => file.upload(`${apiBaseUrl}${path}`, {
    httpMethod: "POST",
    uploadType: UploadType.BINARY_CONTENT,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
    },
  });
  let response = await send(token);
  if (response.status === 401) {
    const { refreshMobileSession } = await import("../auth/AuthProvider");
    const renewed = await refreshMobileSession();
    if (renewed) response = await send(renewed);
  }
  let payload: unknown = null;
  try { payload = JSON.parse(response.body); } catch { /* Keep a useful status error for non-JSON responses. */ }
  if (response.status < 200 || response.status >= 300) {
    const message = (payload as { error?: { message?: string } } | null)?.error?.message;
    throw new Error(message || `Image upload failed (${response.status}).`);
  }
  return payload as T;
}
