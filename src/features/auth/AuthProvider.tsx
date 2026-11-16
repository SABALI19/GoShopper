import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiBaseUrl } from "../api/client";
import { queryClient } from "../api/queryClient";

export type AppUser = { id: string; firstName: string; lastName: string; email: string; phone: string; emailVerified: boolean; phoneVerified: boolean; role: "customer" | "supermarket" | "rider" | "admin"; approvalStatus: string; isSuspended: boolean; lastLoginAt?: string | null };
type AuthContextValue = { isLoaded: boolean; isSignedIn: boolean; user: AppUser | null; getToken: () => Promise<string | null>; signIn: (identifier: string, password: string) => Promise<void>; register: (data: Record<string, string>) => Promise<{ user: AppUser; verification: { emailSent: boolean; phoneCodeSent: boolean } }>; verifyEmail: (token: string) => Promise<void>; verifyPhone: (email: string, code: string) => Promise<void>; resendVerification: (email: string) => Promise<void>; forgotPassword: (email: string) => Promise<void>; resetPassword: (token: string, password: string) => Promise<void>; signOut: () => Promise<void>; signOutAll: () => Promise<void>; updateUser: (data: { firstName: string; lastName: string }) => Promise<void>; refreshUser: () => Promise<AppUser | null> };
const Context = createContext<AuthContextValue | null>(null);
const ACCESS_KEY = "gs_access_v1";
const REFRESH_KEY = "gs_refresh_v1";
let refreshPromise: Promise<string | null> | null = null;
let accessToken: string | null = null;
let clearSessionState: (() => void) | null = null;

async function request<T>(path: string, method = "GET", body?: unknown, token?: string | null): Promise<T> {
  if (!apiBaseUrl) throw new Error("The Go-Shopper API URL is not configured.");
  const response = await fetch(`${apiBaseUrl}/api/auth${path}`, { method, headers: { Accept: "application/json", ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) { const error = new Error(payload?.error?.message || `Request failed (${response.status})`) as Error & { status?: number; payload?: unknown }; error.status = response.status; error.payload = payload; throw error; }
  return payload as T;
}
async function saveTokens(result: { accessToken: string; refreshToken: string }) { accessToken = result.accessToken; await SecureStore.setItemAsync(ACCESS_KEY, result.accessToken); await SecureStore.setItemAsync(REFRESH_KEY, result.refreshToken); }
function tokenIsFresh(token: string | null) { try { const payload = JSON.parse(atob(token!.split(".")[1])); return payload.exp * 1000 > Date.now() + 30_000; } catch { return false; } }
export async function refreshMobileSession() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => { try { const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY); if (!refreshToken) { accessToken = null; await SecureStore.deleteItemAsync(ACCESS_KEY); clearSessionState?.(); return null; } const result = await request<{ accessToken: string; refreshToken: string; user: AppUser }>("/refresh", "POST", { refreshToken }); await saveTokens(result); return result.accessToken; } catch { accessToken = null; await SecureStore.deleteItemAsync(ACCESS_KEY); await SecureStore.deleteItemAsync(REFRESH_KEY); clearSessionState?.(); return null; } finally { refreshPromise = null; } })();
  return refreshPromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setLoaded] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const clearSession = useCallback(() => setUser(null), []);
  useEffect(() => { clearSessionState = clearSession; return () => { if (clearSessionState === clearSession) clearSessionState = null; }; }, [clearSession]);
  const refresh = useCallback(async (): Promise<string | null> => { const next = await refreshMobileSession(); if (next) { try { const result = await request<{ user: AppUser }>("/me", "GET", undefined, next); setUser(result.user); } catch { setUser(null); } } else setUser(null); return next; }, []);
  const getToken = useCallback(async () => tokenIsFresh(accessToken) ? accessToken : await refresh(), [refresh]);
  const refreshUser = useCallback(async () => { const token = await getToken(); if (!token) return null; const result = await request<{ user: AppUser }>("/me", "GET", undefined, token); setUser(result.user); return result.user; }, [getToken]);
  useEffect(() => { void (async () => { accessToken = await SecureStore.getItemAsync(ACCESS_KEY); if (!accessToken) await refresh(); else { try { await refreshUser(); } catch { await refresh(); } } setLoaded(true); })(); }, [refresh, refreshUser]);
  const signIn = useCallback(async (identifier: string, password: string) => { const result = await request<{ accessToken: string; refreshToken: string; user: AppUser }>("/login", "POST", { identifier, password }); await saveTokens(result); setUser(result.user); }, []);
  const register = useCallback(async (data: Record<string, string>) => request<{ user: AppUser; verification: { emailSent: boolean; phoneCodeSent: boolean } }>(`/register/${data.role || "customer"}`, "POST", data), []);
  const verifyEmail = useCallback(async (token: string) => { await request("/verify-email", "POST", { token }); }, []);
  const verifyPhone = useCallback(async (email: string, code: string) => { await request("/verify-phone", "POST", { email, code }); }, []);
  const resendVerification = useCallback(async (email: string) => { await request("/resend-verification", "POST", { email }); }, []);
  const forgotPassword = useCallback(async (email: string) => { await request("/password/forgot", "POST", { email }); }, []);
  const resetPassword = useCallback(async (token: string, password: string) => { await request("/password/reset", "POST", { token, password }); }, []);
  const signOut = useCallback(async () => { try { const token = await getToken(); if (token) await request("/logout", "POST", {}, token); } finally { accessToken = null; setUser(null); await SecureStore.deleteItemAsync(ACCESS_KEY); await SecureStore.deleteItemAsync(REFRESH_KEY); queryClient.clear(); } }, [getToken]);
  const signOutAll = useCallback(async () => { try { const token = await getToken(); if (token) await request("/logout-all", "POST", {}, token); } finally { accessToken = null; setUser(null); await SecureStore.deleteItemAsync(ACCESS_KEY); await SecureStore.deleteItemAsync(REFRESH_KEY); queryClient.clear(); } }, [getToken]);
  const updateUser = useCallback(async (data: { firstName: string; lastName: string }) => { const token = await getToken(); if (!token) throw new Error("Sign in again."); const result = await request<{ user: AppUser }>("/me", "PATCH", data, token); setUser(result.user); }, [getToken]);
  const value = useMemo(() => ({ isLoaded, isSignedIn: Boolean(user), user, getToken, signIn, register, verifyEmail, verifyPhone, resendVerification, forgotPassword, resetPassword, signOut, signOutAll, updateUser, refreshUser }), [forgotPassword, getToken, isLoaded, refreshUser, register, resendVerification, resetPassword, signIn, signOut, signOutAll, updateUser, user, verifyEmail, verifyPhone]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth() { const value = useContext(Context); if (!value) throw new Error("AuthProvider is missing."); return value; }
