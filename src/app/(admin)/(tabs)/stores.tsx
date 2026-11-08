import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { AdminCard, AdminError, AdminFilters, AdminLabel, AdminLoading, AdminPage, AdminSearch, AdminValue, humanize } from "../../../components/admin/AdminUI";
import { adminErrorMessage, createAdminStoreForOwner, fetchAdminStores, type AdminStore } from "../../../features/admin/api";
import { darkColors, spacing, typography } from "../../../theme";

const approvals = [{ label: "All", value: "" }, { label: "Pending", value: "pending" }, { label: "Approved", value: "approved" }, { label: "Rejected", value: "rejected" }];
const statuses = [{ label: "Any status", value: "all" }, { label: "Active", value: "active" }, { label: "Suspended", value: "suspended" }];
export default function AdminStoresScreen() {
  const { getToken } = useAuth(); const router = useRouter();
  const [q, setQ] = useState(""); const [approval, setApproval] = useState(""); const [status, setStatus] = useState("all");
  const [ownerEmail, setOwnerEmail] = useState(""); const [newStoreName, setNewStoreName] = useState(""); const [newStoreCategory, setNewStoreCategory] = useState(""); const [creating, setCreating] = useState(false);
  const [stores, setStores] = useState<AdminStore[]>([]); const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async (nextPage = 1, append = false) => { if (append) setLoadingMore(true); else setLoading(true); setError(""); try { const token = await getToken(); if (!token) throw new Error("Your session could not be verified. Sign in again."); const result = await fetchAdminStores(token, { q, approvalStatus: approval, status, page: nextPage }); setStores((current) => append ? [...current, ...result.stores] : result.stores); setPage(result.page); setTotal(result.total); } catch (e) { setError(adminErrorMessage(e)); } finally { setLoading(false); setLoadingMore(false); } }, [approval, getToken, q, status]);
  useEffect(() => { const id = setTimeout(() => void load(), 250); return () => clearTimeout(id); }, [load]);
  const createForOwner = async () => { if (!ownerEmail.trim() || !newStoreName.trim() || !newStoreCategory.trim()) { Alert.alert("Store details required", "Enter the registered owner's email, store name and category."); return; } setCreating(true); try { const token = await getToken(); if (!token) throw new Error("Your session could not be verified. Sign in again."); await createAdminStoreForOwner(token, { ownerEmail: ownerEmail.trim(), name: newStoreName.trim(), category: newStoreCategory.trim() }); setOwnerEmail(""); setNewStoreName(""); setNewStoreCategory(""); await load(); Alert.alert("Store created", "The store is approved but inactive. Activate it after completing the store setup."); } catch (e) { Alert.alert("Could not create store", adminErrorMessage(e)); } finally { setCreating(false); } };
  return <AdminPage title="Supermarkets" subtitle="Review applications and manage store access." refresh={load}>
    <AdminCard><AdminValue>Create store for a registered owner</AdminValue><AdminLabel>Admin provisioning only. The store remains inactive until activated.</AdminLabel><AdminSearch value={ownerEmail} onChangeText={setOwnerEmail} placeholder="Registered owner's email"/><AdminSearch value={newStoreName} onChangeText={setNewStoreName} placeholder="Store name"/><AdminSearch value={newStoreCategory} onChangeText={setNewStoreCategory} placeholder="Store category"/><Button title={creating?"Creating store…":"Create inactive store"} loading={creating} onPress={()=>void createForOwner()}/></AdminCard>
    <AdminSearch value={q} onChangeText={setQ} placeholder="Search supermarket name" />
    <AdminFilters options={approvals} selected={approval} onSelect={setApproval} />
    <AdminFilters options={statuses} selected={status} onSelect={setStatus} />
    {loading ? <AdminLoading label="Loading supermarkets…" /> : null}{error ? <AdminError message={error} retry={() => void load()} /> : null}
    {!loading && !error && !stores.length ? <AdminCard><AdminValue>No supermarkets match these filters.</AdminValue></AdminCard> : null}
    {stores.map((store) => <AdminCard key={store.id} onPress={() => router.push({ pathname: "/(admin)/store/[storeId]", params: { storeId: store.id } } as never)}>
      <View style={styles.top}><View style={styles.flex}><AdminValue>{store.name}</AdminValue><AdminLabel>{store.category} · {store.id}</AdminLabel></View><Text style={styles.status}>{humanize(store.approvalStatus)}</Text></View>
      <View style={styles.owner}><AdminLabel>Owner</AdminLabel><Text style={styles.copy}>{store.owner?.name || "Unknown owner"} · {store.owner?.email || "No email"}</Text>{store.owner?.phone ? <Text style={styles.copy}>{store.owner.phone}</Text> : null}</View>
      <Text style={store.isActive ? styles.active : styles.suspended}>{store.isActive ? "Active" : "Suspended"}</Text>
    </AdminCard>)}
    {page * 50 < total ? <Button title={loadingMore ? "Loading…" : "Load more supermarkets"} loading={loadingMore} onPress={() => void load(page + 1, true)} /> : null}
  </AdminPage>;
}
const styles = StyleSheet.create({ top: { flexDirection: "row", justifyContent: "space-between", gap: spacing.xs }, flex: { flex: 1 }, status: { ...typography.storeCaption, color: darkColors.primary }, owner: { marginTop: spacing.xs, gap: spacing.xxs }, copy: { ...typography.storeCaption, color: darkColors.white }, active: { ...typography.storeCaption, marginTop: spacing.sm, color: darkColors.success }, suspended: { ...typography.storeCaption, marginTop: spacing.sm, color: darkColors.warning } });
