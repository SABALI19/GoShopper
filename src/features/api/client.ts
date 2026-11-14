export const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") || "";

export type ApiError = Error & { status?: number; code?: string; payload?: unknown };

export async function apiRequest<T>(path: string, options: {
  token?: string | null;
  method?: "GET" | "POST" | "PATCH" | "PUT";
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
