import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { AdminCard, AdminError, AdminFilters, AdminLabel, AdminLoading, AdminPage, AdminSearch, AdminValue, humanize } from "../../../components/admin/AdminUI";
import { adminErrorMessage, fetchAdminUsers, type AdminUser } from "../../../features/admin/api";
import { darkColors, spacing, typography } from "../../../theme";

const roles = [{ label: "All roles", value: "" }, { label: "Customers", value: "customer" }, { label: "Supermarkets", value: "supermarket" }, { label: "Admins", value: "admin" }];
const statuses = [{ label: "Any status", value: "all" }, { label: "Active", value: "active" }, { label: "Suspended", value: "suspended" }];
export default function AdminCustomersScreen() {
  const { getToken } = useAuth(); const router = useRouter(); const [q, setQ] = useState(""); const [role, setRole] = useState(""); const [status, setStatus] = useState("all");
  const [users, setUsers] = useState<AdminUser[]>([]); const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async (nextPage = 1, append = false) => { if (append) setLoadingMore(true); else setLoading(true); setError(""); try { const token = await getToken(); if (!token) throw new Error("Your session could not be verified. Sign in again."); const result = await fetchAdminUsers(token, { q, role, status, page: nextPage }); setUsers((current) => append ? [...current, ...result.users] : result.users); setPage(result.page); setTotal(result.total); } catch (e) { setError(adminErrorMessage(e)); } finally { setLoading(false); setLoadingMore(false); } }, [getToken, q, role, status]);
  useEffect(() => { const id = setTimeout(() => void load(), 250); return () => clearTimeout(id); }, [load]);
  return <AdminPage title="Accounts" subtitle="Search customers and review account access." refresh={load}>
    <AdminSearch value={q} onChangeText={setQ} placeholder="Search name, email or phone" /><AdminFilters options={roles} selected={role} onSelect={setRole} /><AdminFilters options={statuses} selected={status} onSelect={setStatus} />
    {loading ? <AdminLoading label="Loading accounts…" /> : null}{error ? <AdminError message={error} retry={() => void load()} /> : null}
    {!loading && !error && !users.length ? <AdminCard><AdminValue>No accounts match these filters.</AdminValue></AdminCard> : null}
    {users.map((user) => <AdminCard key={user.id} onPress={() => router.push({ pathname: "/(admin)/user/[userId]", params: { userId: user.id } } as never)}>
      <View style={styles.top}><View style={styles.flex}><AdminValue>{[user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed account"}</AdminValue><AdminLabel>{user.email || user.phone || "No contact details"}</AdminLabel></View><Text style={user.isSuspended ? styles.suspended : styles.active}>{user.isSuspended ? "Suspended" : "Active"}</Text></View>
      <Text style={styles.meta}>{humanize(user.role)} · {user.phone || "No phone"}</Text>
    </AdminCard>)}
    {page * 50 < total ? <Button title={loadingMore ? "Loading…" : "Load more accounts"} loading={loadingMore} onPress={() => void load(page + 1, true)} /> : null}
  </AdminPage>;
}
const styles = StyleSheet.create({ top: { flexDirection: "row", justifyContent: "space-between", gap: spacing.xs }, flex: { flex: 1 }, meta: { ...typography.storeCaption, color: darkColors.mutedText, marginTop: spacing.xs }, active: { ...typography.storeCaption, color: darkColors.success }, suspended: { ...typography.storeCaption, color: darkColors.warning } });
