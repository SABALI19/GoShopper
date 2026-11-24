import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiBaseUrl } from "../api/client";
import { queryClient } from "../api/queryClient";

export type AppUser = { id: string; firstName: string; lastName: string; email: string; phone: string; emailVerified: boolean; phoneVerified: boolean; role: "customer" | "supermarket" | "rider" | "admin"; approvalStatus: string; isSuspended: boolean; lastLoginAt?: string | null; avatarUrl?: string };
type AuthContextValue = { isLoaded: boolean; isSignedIn: boolean; user: AppUser | null; getToken: () => Promise<string | null>; signIn: (identifier: string, password: string) => Promise<void>; register: (data: Record<string, string>) => Promise<AppUser>; forgotPassword: (email: string) => Promise<void>; resetPassword: (token: string, password: string) => Promise<void>; signOut: () => Promise<void>; signOutAll: () => Promise<void>; updateUser: (data: { firstName: string; lastName: string }) => Promise<void>; updateAvatar: (avatarUrl: string) => void; refreshUser: () => Promise<AppUser | null> };
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
  const updateAvatar = useCallback((avatarUrl: string) => setUser((current) => current ? { ...current, avatarUrl } : null), []);
  useEffect(() => { void (async () => { accessToken = await SecureStore.getItemAsync(ACCESS_KEY); if (!accessToken) await refresh(); else { try { await refreshUser(); } catch { await refresh(); } } setLoaded(true); })(); }, [refresh, refreshUser]);
  const signIn = useCallback(async (identifier: string, password: string) => { const result = await request<{ accessToken: string; refreshToken: string; user: AppUser }>("/login", "POST", { identifier, password }); await saveTokens(result); setUser(result.user); }, []);
  const register = useCallback(async (data: Record<string, string>) => {
    const { role = "customer", ...registration } = data;
    const result = await request<{ accessToken: string; refreshToken: string; user: AppUser }>(`/register/${role}`, "POST", registration);
    await saveTokens(result);
    setUser(result.user);
    queryClient.clear();
    return result.user;
  }, []);
  const forgotPassword = useCallback(async (email: string) => { await request("/password/forgot", "POST", { email }); }, []);
  const resetPassword = useCallback(async (token: string, password: string) => { await request("/password/reset", "POST", { token, password }); }, []);
  const signOut = useCallback(async () => { try { const token = await getToken(); if (token) await request("/logout", "POST", {}, token); } finally { accessToken = null; setUser(null); await SecureStore.deleteItemAsync(ACCESS_KEY); await SecureStore.deleteItemAsync(REFRESH_KEY); queryClient.clear(); } }, [getToken]);
  const signOutAll = useCallback(async () => { try { const token = await getToken(); if (token) await request("/logout-all", "POST", {}, token); } finally { accessToken = null; setUser(null); await SecureStore.deleteItemAsync(ACCESS_KEY); await SecureStore.deleteItemAsync(REFRESH_KEY); queryClient.clear(); } }, [getToken]);
  const updateUser = useCallback(async (data: { firstName: string; lastName: string }) => { const token = await getToken(); if (!token) throw new Error("Sign in again."); const result = await request<{ user: AppUser }>("/me", "PATCH", data, token); setUser(result.user); }, [getToken]);
  const value = useMemo(() => ({ isLoaded, isSignedIn: Boolean(user), user, getToken, signIn, register, forgotPassword, resetPassword, signOut, signOutAll, updateUser, updateAvatar, refreshUser }), [forgotPassword, getToken, isLoaded, refreshUser, register, resetPassword, signIn, signOut, signOutAll, updateAvatar, updateUser, user]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth() { const value = useContext(Context); if (!value) throw new Error("AuthProvider is missing."); return value; }
