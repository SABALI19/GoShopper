import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { RefreshableScrollView } from "../../../components/ui/RefreshableScrollView";
import { StoreSelector } from "../../../components/supermarket/StoreSelector";
import { apiBaseUrl } from "../../../features/api/client";
import { apiMessage, fetchDashboardSummary, fetchManagedStores, type DashboardSummary, type StoreRecentOrder } from "../../../features/supermarket/api";
import { useSupermarketStore } from "../../../features/supermarket/store";
import { darkColors, radius, spacing, typography } from "../../../theme";

export default function SupermarketDashboardScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const stores = useSupermarketStore((state) => state.stores);
  const selectedStoreId = useSupermarketStore((state) => state.selectedStoreId);
  const setStores = useSupermarketStore((state) => state.setStores);
  const [storesLoading, setStoresLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<StoreRecentOrder[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
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

  const loadSummary = useCallback(async (storeId = selectedStoreId) => {
    if (!storeId) return;
    setSummaryLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session could not be verified. Sign in again.");
      const result = await fetchDashboardSummary(token, storeId);
      setSummary(result.summary);
      setRecentOrders(result.recentOrders);
    } catch (loadError) {
      setError(apiMessage(loadError));
      setSummary(null);
      setRecentOrders([]);
    } finally {
      setSummaryLoading(false);
    }
  }, [getToken, selectedStoreId]);

  useEffect(() => { void Promise.resolve().then(() => void loadStores()); }, [loadStores]);
  useEffect(() => {
    if (selectedStoreId && stores.some((store) => store.id === selectedStoreId)) {
      void Promise.resolve().then(() => void loadSummary(selectedStoreId));
    }
  }, [loadSummary, selectedStoreId, stores]);

  const refresh = useCallback(async () => {
    if (selectedStoreId) await loadSummary(selectedStoreId);
    else await loadStores();
  }, [loadStores, loadSummary, selectedStoreId]);

  const selectedStore = stores.find((store) => store.id === selectedStoreId);
  const metricCards = useMemo(() => summary ? [
    { label: "Total orders", value: summary.totalOrders, hint: "All store orders" },
    { label: "Pending payment", value: summary.pendingPaymentOrders, hint: "Fulfilment locked" },
    { label: "Awaiting fulfilment", value: summary.awaitingFulfilmentOrders, hint: "Ready to accept" },
    { label: "Preparing", value: summary.preparingOrders, hint: "Being packed" },
    { label: "Ready for dispatch", value: summary.readyForDispatchOrders, hint: "Awaiting rider handoff" },
    { label: "Dispatched", value: summary.dispatchedOrders, hint: "Out for delivery" },
    { label: "Completed", value: summary.completedOrders, hint: "Delivered" },
    { label: "Cancelled", value: summary.cancelledOrders, hint: "Closed orders" },
  ] : [], [summary]);

  return <SafeAreaView edges={["top"]} style={styles.screen}>
    <StatusBar style="light" />
    <RefreshableScrollView refreshAction={refresh} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Store Dashboard</Text>
      <Text style={styles.subtitle}>Manage incoming orders and fulfilment.</Text>
      <StoreSelector />

      {storesLoading ? <View style={styles.state}><ActivityIndicator color={darkColors.primary} /><Text style={styles.stateText}>Loading your stores…</Text></View> : null}
      {!storesLoading && !error && stores.length === 0 ? <EmptyState icon="store" title="No stores found" description="This supermarket account does not have a store assigned yet." /> : null}
      {selectedStore ? <View style={styles.storeStatus}>
        <View style={styles.statusCopy}><Text style={styles.statusName}>{selectedStore.name}</Text><Text style={styles.statusHint}>{selectedStore.isApproved ? (selectedStore.isActive ? "Approved and active" : "Approved, currently inactive") : "Awaiting admin approval"}</Text></View>
        <View style={[styles.statusBadge, selectedStore.isApproved && selectedStore.isActive ? styles.activeBadge : styles.inactiveBadge]}><Text style={styles.statusBadgeText}>{selectedStore.isApproved && selectedStore.isActive ? "Active" : "Inactive"}</Text></View>
      </View> : null}

      {error ? <View accessibilityRole="alert" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Button title="Retry" onPress={() => void (stores.length ? loadSummary() : loadStores())} /></View> : null}
      {summaryLoading && !summary ? <View style={styles.state}><ActivityIndicator color={darkColors.primary} /><Text style={styles.stateText}>Loading dashboard totals…</Text></View> : null}
      {summary ? <>
        <Text style={styles.sectionTitle}>Order Overview</Text>
        <View style={styles.metrics}>{metricCards.map((metric) => <View key={metric.label} style={styles.metricCard}>
          <Text style={styles.metricValue}>{metric.value}</Text><Text style={styles.metricLabel}>{metric.label}</Text><Text style={styles.metricHint}>{metric.hint}</Text>
        </View>)}</View>
        {summary.customerActionRequiredOrders || summary.unableToFulfilOrders ? <View style={styles.exceptionNotice}>
          <Text style={styles.noticeTitle}>Orders need attention</Text>
          <Text style={styles.noticeCopy}>{summary.customerActionRequiredOrders} awaiting customer decision · {summary.unableToFulfilOrders} unable to fulfil</Text>
        </View> : null}
        <View style={styles.recentHeader}><Text style={styles.sectionTitle}>Recent Orders</Text><Pressable onPress={() => router.navigate("/(supermarket)/(tabs)/orders")}><Text style={styles.viewAll}>View all</Text></Pressable></View>
        {recentOrders.length ? recentOrders.map((order) => <Pressable key={order.subOrderNumber} accessibilityRole="button" onPress={() => router.push({ pathname: "/(supermarket)/order/[orderId]", params: { storeId: selectedStoreId ?? "", orderId: order.subOrderNumber } })} style={styles.orderCard}>
          <View style={styles.orderTop}><Text numberOfLines={1} style={styles.orderRef}>{order.subOrderNumber}</Text><Text style={styles.orderAmount}>{formatNaira(order.totalKobo)}</Text></View>
          <Text style={styles.orderMeta}>Parent {order.parentOrderNumber} · {order.itemCount} item{order.itemCount === 1 ? "" : "s"}</Text>
          <View style={styles.orderBottom}><Text style={order.paymentStatus === "paid" ? styles.paid : styles.pending}>{order.paymentStatus === "paid" ? "Paid" : "Pending payment"}</Text><Text style={styles.orderStatus}>{humanize(order.status)} · {formatDate(order.createdAt)}</Text></View>
        </Pressable>) : <Text style={styles.noRecent}>No orders for this store yet.</Text>}
      </> : null}
      {!apiBaseUrl ? <Text style={styles.apiUnavailable}>Configure the API base URL to load live store data.</Text> : null}
    </RefreshableScrollView>
  </SafeAreaView>;
}

function formatNaira(amountKobo: number) { return `₦${(amountKobo / 100).toLocaleString("en-NG")}`; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-NG", { day: "numeric", month: "short" }); }
function humanize(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  page: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xl },
  title: { ...typography.orderTitle, color: darkColors.white },
  subtitle: { ...typography.storeBody, marginTop: spacing.xxs, marginBottom: spacing.md, color: darkColors.mutedText },
  state: { padding: spacing.lg, alignItems: "center", gap: spacing.sm },
  stateText: { ...typography.storeCaption, color: darkColors.mutedText },
  storeStatus: { marginBottom: spacing.md, padding: spacing.sm, flexDirection: "row", alignItems: "center", borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  statusCopy: { flex: 1 },
  statusName: { ...typography.storeBody, color: darkColors.white },
  statusHint: { ...typography.storeCaption, color: darkColors.mutedText },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.round },
  activeBadge: { backgroundColor: darkColors.successSurface },
  inactiveBadge: { backgroundColor: darkColors.warningSurface },
  statusBadgeText: { ...typography.storeCaption, color: darkColors.white },
  sectionTitle: { ...typography.storeSection, marginBottom: spacing.sm, color: darkColors.white },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  metricCard: { width: "48%", minHeight: spacing.metricCardHeight, padding: spacing.sm, justifyContent: "center", borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  metricValue: { ...typography.orderTitle, color: darkColors.primary },
  metricLabel: { ...typography.storeCaption, color: darkColors.white },
  metricHint: { ...typography.homeCaption, marginTop: spacing.xxs, color: darkColors.mutedText },
  exceptionNotice: { marginTop: spacing.md, padding: spacing.sm, borderRadius: radius.md, backgroundColor: darkColors.warningSurface },
  noticeTitle: { ...typography.storeBody, color: darkColors.white },
  noticeCopy: { ...typography.storeCaption, marginTop: spacing.xxs, color: darkColors.peach },
  recentHeader: { marginTop: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  viewAll: { ...typography.storeCaption, color: darkColors.primary },
  orderCard: { marginBottom: spacing.xs, padding: spacing.sm, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  orderTop: { flexDirection: "row", justifyContent: "space-between", gap: spacing.xs },
  orderRef: { ...typography.storeBody, flex: 1, color: darkColors.white },
  orderAmount: { ...typography.storeBody, color: darkColors.white },
  orderMeta: { ...typography.storeCaption, marginTop: spacing.xxs, color: darkColors.mutedText },
  orderBottom: { marginTop: spacing.xs, flexDirection: "row", justifyContent: "space-between", gap: spacing.xs },
  paid: { ...typography.storeCaption, color: darkColors.success },
  pending: { ...typography.storeCaption, color: darkColors.warning },
  orderStatus: { ...typography.storeCaption, color: darkColors.white, textAlign: "right" },
  noRecent: { ...typography.storeBody, padding: spacing.md, color: darkColors.mutedText, textAlign: "center" },
  errorBox: { gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.errorSurface },
  errorText: { ...typography.storeBody, color: darkColors.error },
  apiUnavailable: { ...typography.storeCaption, marginTop: spacing.md, color: darkColors.warning, textAlign: "center" },
});
