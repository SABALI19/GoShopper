import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { RefreshableScrollView } from "../../../components/ui/RefreshableScrollView";
import { StoreSelector } from "../../../components/supermarket/StoreSelector";
import { apiMessage, fetchManagedStores, fetchStoreOrders, type StoreOrder } from "../../../features/supermarket/api";
import { useSupermarketStore } from "../../../features/supermarket/store";
import { darkColors, radius, spacing, typography } from "../../../theme";

const filters = [
  { label: "All", status: "all" },
  { label: "Pending payment", status: "pending_payment" },
  { label: "Awaiting", status: "pending_fulfilment" },
  { label: "Accepted", status: "accepted" },
  { label: "Preparing", status: "preparing" },
  { label: "Ready", status: "ready_for_dispatch" },
  { label: "Dispatched", status: "dispatched" },
  { label: "Delivered", status: "delivered" },
  { label: "Cancelled", status: "cancelled" },
];
const pageSize = 20;

export default function SupermarketOrdersScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const stores = useSupermarketStore((state) => state.stores);
  const selectedStoreId = useSupermarketStore((state) => state.selectedStoreId);
  const setStores = useSupermarketStore((state) => state.setStores);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [storesLoading, setStoresLoading] = useState(stores.length === 0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const loadStores = useCallback(async () => {
    setStoresLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session could not be verified. Sign in again.");
      setStores(await fetchManagedStores(token));
    } catch (loadError) {
      setError(apiMessage(loadError));
    } finally {
      setStoresLoading(false);
    }
  }, [getToken, setStores]);

  const loadOrders = useCallback(async (nextPage = 1, append = false) => {
    if (!selectedStoreId) return;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session could not be verified. Sign in again.");
      const result = await fetchStoreOrders(token, selectedStoreId, nextPage, pageSize, selectedFilter);
      setOrders((current) => append ? [...current, ...result.orders] : result.orders);
      setPage(result.page);
      setTotal(result.total);
    } catch (loadError) {
      setError(apiMessage(loadError));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [getToken, selectedFilter, selectedStoreId]);

  useEffect(() => {
    if (!stores.length) void Promise.resolve().then(() => void loadStores());
  }, [loadStores, stores.length]);
  useEffect(() => {
    if (selectedStoreId && stores.some((store) => store.id === selectedStoreId)) {
      void Promise.resolve().then(() => void loadOrders());
    }
  }, [loadOrders, selectedStoreId, stores]);

  const canLoadMore = page * pageSize < total;

  return <SafeAreaView edges={["top"]} style={styles.screen}>
    <StatusBar style="light" />
    <RefreshableScrollView refreshAction={() => selectedStoreId ? loadOrders(1, false) : loadStores()} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Store Orders</Text>
      <Text style={styles.subtitle}>Orders and fulfilment for the selected store.</Text>
      <StoreSelector />

      {storesLoading && !stores.length ? <View style={styles.state}><ActivityIndicator color={darkColors.primary} /><Text style={styles.stateText}>Loading your stores…</Text></View> : null}
      {!storesLoading && !error && !stores.length ? <EmptyState icon="store" title="No stores found" description="This supermarket account does not have a store assigned yet." /> : null}
      {stores.length > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {filters.map((filter) => {
          const selected = selectedFilter === filter.status;
          return <Pressable key={filter.status} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setSelectedFilter(filter.status)} style={[styles.filter, selected && styles.filterSelected]}><Text style={[styles.filterText, selected && styles.filterTextSelected]}>{filter.label}</Text></Pressable>;
        })}
      </ScrollView> : null}

      {error ? <View accessibilityRole="alert" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Button title="Retry" onPress={() => void (stores.length ? loadOrders() : loadStores())} /></View> : null}
      {loading ? <View style={styles.state}><ActivityIndicator color={darkColors.primary} /><Text style={styles.stateText}>Loading store orders…</Text></View> : null}
      {!loading && !error && stores.length > 0 && orders.length === 0 ? <View style={styles.empty}><EmptyState icon="orders" title="No orders in this view" description="Orders for this store will appear here when available." /></View> : null}

      {orders.map((order) => <Pressable key={order.subOrderNumber} accessibilityRole="button" onPress={() => router.push({ pathname: "/(supermarket)/order/[orderId]", params: { storeId: selectedStoreId ?? "", orderId: order.subOrderNumber } })} style={styles.orderCard}>
        <View style={styles.orderHead}><Text numberOfLines={1} style={styles.orderReference}>{order.subOrderNumber}</Text><Text style={styles.amount}>{formatNaira(order.totalKobo)}</Text></View>
        <Text style={styles.parentReference}>Parent order {order.parentOrderNumber}</Text>
        <View style={styles.metadata}><Text style={styles.metaText}>{order.items?.length ?? 0} item{order.items?.length === 1 ? "" : "s"}</Text><Text style={styles.metaText}>{formatNaira(order.merchandiseSubtotalKobo)} merchandise</Text></View>
        <View style={styles.orderFoot}><Text style={order.status === "pending_payment" ? styles.paymentPending : order.paymentStatus === "paid" ? styles.paymentPaid : styles.paymentPending}>{order.status === "pending_payment" ? "Pending payment" : order.paymentStatus === "paid" ? "Paid" : "Awaiting verified payment"}</Text><Text style={styles.status}>{humanize(order.status)} · {formatDate(order.createdAt)}</Text></View>
      </Pressable>)}

      {canLoadMore && !loading && !error ? <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => void loadOrders(page + 1, true)} style={styles.loadMore}>{loadingMore ? <ActivityIndicator color={darkColors.primary} /> : <Text style={styles.loadMoreText}>Load more orders</Text>}</Pressable> : null}
    </RefreshableScrollView>
  </SafeAreaView>;
}

function formatNaira(amountKobo: number) { return `₦${(amountKobo / 100).toLocaleString("en-NG")}`; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }); }
function humanize(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  page: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xl },
  title: { ...typography.orderTitle, color: darkColors.white },
  subtitle: { ...typography.storeBody, marginTop: spacing.xxs, marginBottom: spacing.md, color: darkColors.mutedText },
  filterRow: { gap: spacing.xs, paddingBottom: spacing.md },
  filter: { minHeight: spacing.xl, paddingHorizontal: spacing.sm, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.storeSurface },
  filterSelected: { backgroundColor: darkColors.primary },
  filterText: { ...typography.storeCaption, color: darkColors.white },
  filterTextSelected: { color: darkColors.white },
  state: { padding: spacing.lg, alignItems: "center", gap: spacing.sm },
  stateText: { ...typography.storeCaption, color: darkColors.mutedText },
  orderCard: { marginBottom: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  orderHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs },
  orderReference: { ...typography.storeBody, flex: 1, color: darkColors.white },
  amount: { ...typography.storeBody, color: darkColors.white },
  parentReference: { ...typography.storeCaption, marginTop: spacing.xxs, color: darkColors.mutedText },
  metadata: { marginTop: spacing.xs, flexDirection: "row", justifyContent: "space-between", gap: spacing.xs },
  metaText: { ...typography.storeCaption, color: darkColors.white },
  orderFoot: { marginTop: spacing.xs, paddingTop: spacing.xs, flexDirection: "row", justifyContent: "space-between", gap: spacing.xs, borderTopWidth: 1, borderColor: darkColors.border },
  paymentPending: { ...typography.storeCaption, color: darkColors.warning },
  paymentPaid: { ...typography.storeCaption, color: darkColors.success },
  status: { ...typography.storeCaption, color: darkColors.mutedText, textAlign: "right" },
  empty: { minHeight: spacing.xxl * 3, justifyContent: "center" },
  errorBox: { gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.errorSurface },
  errorText: { ...typography.storeBody, color: darkColors.error },
  loadMore: { minHeight: spacing.buttonHeight, alignItems: "center", justifyContent: "center" },
  loadMoreText: { ...typography.button, color: darkColors.primary },
});
