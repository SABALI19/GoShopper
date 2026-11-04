export const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") || "";

export type ApiError = Error & { status?: number; code?: string };

export async function apiRequest<T>(path: string, options: {
  token?: string | null;
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
} = {}): Promise<T> {
  if (!apiBaseUrl) throw new Error("EXPO_PUBLIC_API_URL is not configured");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `API request failed (${response.status})`) as ApiError;
    error.status = response.status;
    error.code = payload?.error?.code;
    throw error;
  }
  return payload as T;
}
