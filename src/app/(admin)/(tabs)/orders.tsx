import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { AdminCard, AdminError, AdminFilters, AdminLabel, AdminLoading, AdminPage, AdminSearch, AdminValue, dateLabel, humanize, money } from "../../../components/admin/AdminUI";
import { adminErrorMessage, fetchAdminOrders, type AdminOrder } from "../../../features/admin/api";
import { darkColors, spacing, typography } from "../../../theme";

const paymentFilters = [{ label: "Any payment", value: "" }, { label: "Pending", value: "pending" }, { label: "Paid", value: "paid" }, { label: "Failed", value: "failed" }, { label: "Refunded", value: "refunded" }];
const stateFilters = [{ label: "Any status", value: "" }, { label: "Awaiting payment", value: "pending_payment" }, { label: "Processing", value: "processing" }, { label: "Customer action", value: "customer_action_required" }, { label: "Completed", value: "completed" }, { label: "Cancelled", value: "cancelled" }];
export default function AdminOrdersScreen() {
  const { getToken } = useAuth(); const router = useRouter(); const [q, setQ] = useState(""); const [paymentStatus, setPayment] = useState(""); const [status, setStatus] = useState(""); const [storeId, setStoreId] = useState(""); const [exceptionOnly, setExceptionOnly] = useState("");
  const [orders, setOrders] = useState<AdminOrder[]>([]); const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async (nextPage = 1, append = false) => { if (append) setLoadingMore(true); else setLoading(true); setError(""); try { const token = await getToken(); if (!token) throw new Error("Your session could not be verified. Sign in again."); const result = await fetchAdminOrders(token, { q, paymentStatus, status, storeId, customerActionRequired: exceptionOnly, page: nextPage }); setOrders((current) => append ? [...current, ...result.orders] : result.orders); setPage(result.page); setTotal(result.total); } catch (e) { setError(adminErrorMessage(e)); } finally { setLoading(false); setLoadingMore(false); } }, [exceptionOnly, getToken, paymentStatus, q, status, storeId]);
  useEffect(() => { const id = setTimeout(() => void load(), 250); return () => clearTimeout(id); }, [load]);
  return <AdminPage title="Platform orders" subtitle="View parent orders, store fulfilment and customer exceptions." refresh={load}>
    <AdminSearch value={q} onChangeText={setQ} placeholder="Search parent order reference" /><AdminSearch value={storeId} onChangeText={setStoreId} placeholder="Filter by store ID or slug (optional)" />
    <AdminFilters options={paymentFilters} selected={paymentStatus} onSelect={setPayment} /><AdminFilters options={stateFilters} selected={status} onSelect={setStatus} />
    <AdminFilters options={[{ label: "All orders", value: "" }, { label: "Needs customer action", value: "true" }]} selected={exceptionOnly} onSelect={setExceptionOnly} />
    {loading ? <AdminLoading label="Loading platform orders…" /> : null}{error ? <AdminError message={error} retry={() => void load()} /> : null}
    {!loading && !error && !orders.length ? <AdminCard><AdminValue>No orders match these filters.</AdminValue></AdminCard> : null}
    {orders.map((order) => {
      const exceptions = order.subOrders.flatMap((child) => child.items.filter((item) => item.fulfilmentStatus === "unavailable" || item.refundStatus === "pending")).length;
      return <AdminCard key={order.id} onPress={() => router.push({ pathname: "/(admin)/order/[orderId]", params: { orderId: order.orderNumber } } as never)}>
        <View style={styles.top}><View style={styles.flex}><AdminValue>{order.orderNumber}</AdminValue><AdminLabel>{dateLabel(order.createdAt)}</AdminLabel></View><AdminValue>{money(order.totalKobo)}</AdminValue></View>
        <View style={styles.bottom}><Text style={styles.meta}>{humanize(order.status)} · Payment {humanize(order.paymentStatus)}</Text><Text style={order.customerAction?.decision === "pending" || order.status === "customer_action_required" ? styles.attention : styles.meta}>{exceptions ? `${exceptions} item exception${exceptions === 1 ? "" : "s"}` : order.status === "customer_action_required" ? "Customer action required" : "View order"}</Text></View>
        {order.refundObligations?.some((entry) => entry.status === "pending") ? <Text style={styles.pendingRefund}>Pending refund obligations recorded</Text> : null}
      </AdminCard>;
    })}
    {page * 20 < total ? <Button title={loadingMore ? "Loading…" : "Load more orders"} loading={loadingMore} onPress={() => void load(page + 1, true)} /> : null}
  </AdminPage>;
}
const styles = StyleSheet.create({ top: { flexDirection: "row", justifyContent: "space-between", gap: spacing.xs }, flex: { flex: 1 }, bottom: { marginTop: spacing.xs, flexDirection: "row", justifyContent: "space-between", gap: spacing.xs }, meta: { ...typography.storeCaption, color: darkColors.mutedText, flexShrink: 1 }, attention: { ...typography.storeCaption, color: darkColors.warning, textAlign: "right" }, pendingRefund: { ...typography.storeCaption, color: darkColors.warning, marginTop: spacing.xs } });
