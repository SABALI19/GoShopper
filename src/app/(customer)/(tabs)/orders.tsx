import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RefreshableScrollView } from "../../../components/ui/RefreshableScrollView";
import { apiBaseUrl } from "../../../features/api/client";
import { useCartStore } from "../../../features/cart/store";
import {
  cancelCustomerOrder,
  fetchCustomerOrders,
  getCheckoutIssues,
  getOrderErrorMessage,
  requestCheckoutQuote,
  type CustomerOrder,
  type SubOrder,
} from "../../../features/orders/api";
import { getStoreById } from "../../../features/stores/data";
import { darkColors, radius, spacing, typography } from "../../../theme";

type OrderFilter = "All" | "Delivered" | "In Progress" | "Cancelled";
type AvailableItem = { productId: string; name: string; quantity: number; unitPriceKobo: number; image: number | { uri: string } };
type ReorderReview = { storeId: string; storeName: string; items: AvailableItem[]; unavailable: { productId: string; message: string }[] };
const filters: OrderFilter[] = ["All", "Delivered", "In Progress", "Cancelled"];
const pageSize = 20;

export default function OrdersScreen() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const addItems = useCartStore((state) => state.addItems);
  const [selectedFilter, setSelectedFilter] = useState<OrderFilter>("All");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const [review, setReview] = useState<ReorderReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const loadOrders = useCallback(async (nextPage = 1, append = false) => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setOrders([]);
      setError("Sign in to view your orders.");
      setLoading(false);
      return;
    }
    if (!apiBaseUrl) {
      setError("The Go-Shopper API URL is not configured for this app build.");
      setLoading(false);
      return;
    }
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session could not be verified. Sign in again, then retry.");
      const result = await fetchCustomerOrders(token, nextPage, pageSize);
      setOrders((current) => append ? [...current, ...result.orders] : result.orders);
      setPage(result.page);
      setTotal(result.total);
    } catch (loadError) {
      setError(getOrderErrorMessage(loadError));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void loadOrders(); });
    return () => { active = false; };
  }, [loadOrders]);

  const visibleOrders = useMemo(() => orders.filter((order) => matchesFilter(order, selectedFilter)), [orders, selectedFilter]);
  const cancel = (order: CustomerOrder) => {
    Alert.alert("Cancel this order?", "Only an unpaid pending order can be cancelled. The server will release the reserved stock.", [
      { text: "Keep Order", style: "cancel" },
      { text: "Cancel Order", style: "destructive", onPress: () => void cancelOrder(order) },
    ]);
  };

  const cancelOrder = async (order: CustomerOrder) => {
    setBusyOrder(order.orderNumber);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session could not be verified. Sign in again, then retry.");
      await cancelCustomerOrder(token, order.orderNumber);
      await loadOrders(1, false);
    } catch (cancelError) {
      setError(getOrderErrorMessage(cancelError));
    } finally {
      setBusyOrder(null);
    }
  };

  const checkReorder = async (subOrder: SubOrder) => {
    setReview(null);
    setReviewError("");
    setReviewLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session could not be verified. Sign in again, then retry.");
      const requestLines = subOrder.items.map((item) => ({ storeId: subOrder.storeId, productId: item.productId, quantity: item.quantity }));
      let quote;
      let unavailable: ReorderReview["unavailable"] = [];
      try {
        quote = await requestCheckoutQuote(token, requestLines);
      } catch (quoteError) {
        const issues = getCheckoutIssues(quoteError);
        if (!issues.length) throw quoteError;
        unavailable = issues.map((issue) => ({ productId: issue.productId ?? "", message: issue.message }));
        const unavailableIds = new Set(unavailable.map((item) => item.productId));
        const remaining = requestLines.filter((item) => !unavailableIds.has(item.productId));
        quote = remaining.length ? await requestCheckoutQuote(token, remaining) : null;
      }
      const storeQuote = quote?.stores.find((store) => store.storeId === subOrder.storeId);
      const localStore = getStoreById(subOrder.storeId);
      const items = storeQuote?.items.map((item) => ({
        productId: item.productId,
        name: item.productName,
        quantity: item.quantity,
        unitPriceKobo: item.unitPriceKobo,
        image: localStore?.products.find((product) => product.id === item.productId)?.image ?? require("../../../../assets/images/store/bokku-rice.png"),
      })) ?? [];
      setReview({ storeId: subOrder.storeId, storeName: storeQuote?.storeName ?? subOrder.storeName, items, unavailable });
    } catch (checkError) {
      setReviewError(getOrderErrorMessage(checkError));
    } finally {
      setReviewLoading(false);
    }
  };

  const addAvailableToCart = () => {
    if (!review?.items.length) return;
    addItems(review.items.map((item) => ({
      productId: item.productId,
      storeId: review.storeId,
      storeName: review.storeName,
      name: item.name,
      unitPriceKobo: item.unitPriceKobo,
      image: item.image,
      quantity: item.quantity,
    })));
    setReview(null);
    router.push("/(customer)/cart");
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <StatusBar style="light" />
      <RefreshableScrollView refreshAction={() => loadOrders(1, false)} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>My Orders</Text>
        <View style={styles.filterBar}>{filters.map((filter) => {
          const selected = selectedFilter === filter;
          return <Pressable key={filter} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setSelectedFilter(filter)} style={[styles.filter, selected && styles.selectedFilter]}><Text numberOfLines={1} style={styles.filterText}>{filter}</Text></Pressable>;
        })}</View>

        {loading ? <View style={styles.state}><ActivityIndicator color={darkColors.primary} /><Text style={styles.emptyText}>Loading orders…</Text></View> : null}
        {error ? <View accessibilityRole="alert" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => void loadOrders()} style={styles.retryButton}><Text style={styles.retryText}>Try Again</Text></Pressable></View> : null}
        {!loading && !error && visibleOrders.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{orders.length ? `No ${selectedFilter.toLowerCase()} orders` : "No orders yet"}</Text><Text style={styles.emptyText}>{orders.length ? "Choose another filter to see your orders." : "Your placed orders will appear here."}</Text></View> : null}

        <View style={styles.orderList}>{visibleOrders.map((order) => {
          const firstStore = order.subOrders[0];
          const store = firstStore ? getStoreById(firstStore.storeId) : undefined;
          return (
            <View key={order.orderNumber} style={styles.orderCard}>
              <View style={styles.orderMain}>
                <Image resizeMode="cover" source={store?.logo ?? require("../../../../assets/images/home/store-bokku.png")} style={styles.storeLogo} />
                <View style={styles.orderDetails}>
                  <Text numberOfLines={1} style={styles.storeName}>{order.subOrders.map((item) => item.storeName).join(", ") || "Go-Shopper Order"}</Text>
                  <Text style={styles.orderReference}>{formatDate(order.createdAt)} · {order.orderNumber}</Text>
                  <Text style={styles.orderReference}>{order.subOrders.length} supermarket{subOrderPlural(order.subOrders.length)} · {humanize(order.paymentStatus ?? "pending")}</Text>
                </View>
                <Text style={styles.orderAmount}>{formatNaira(order.totalKobo)}</Text>
              </View>
              <View style={styles.orderFooter}>
                <View style={[styles.statusBadge, statusStyle(order.status)]}><Text style={[styles.statusText, statusTextStyle(order.status)]}>{humanize(order.status)}</Text></View>
                <View style={styles.actionRow}>
                  {order.status === "pending_payment" ? <Pressable disabled={busyOrder === order.orderNumber} onPress={() => cancel(order)} style={styles.textAction}><Text style={styles.cancelLabel}>{busyOrder === order.orderNumber ? "Working…" : "Cancel"}</Text></Pressable> : null}
                  <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/(customer)/order/[orderId]", params: { orderId: order.orderNumber } })} style={styles.viewButton}><Text style={styles.buttonText}>Details</Text></Pressable>
                </View>
              </View>
              {order.subOrders.map((subOrder) => (
                <View key={subOrder.subOrderNumber} style={styles.subOrderRow}>
                  <View style={styles.subOrderCopy}><Text style={styles.subOrderName}>{subOrder.storeName}</Text><Text style={styles.subOrderStatus}>{humanize(subOrder.status)} · {formatNaira(subOrder.totalKobo)}</Text></View>
                  <Pressable accessibilityRole="button" disabled={busyOrder !== null} onPress={() => void checkReorder(subOrder)} style={[styles.reorderButton, busyOrder !== null && styles.disabled]}><Text style={styles.buttonText}>Reorder</Text></Pressable>
                </View>
              ))}
            </View>
          );
        })}</View>
        {page * pageSize < total && !loading && !error ? <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => void loadOrders(page + 1, true)} style={styles.loadMore}>{loadingMore ? <ActivityIndicator color={darkColors.primary} /> : <Text style={styles.loadMoreText}>Load more orders</Text>}</Pressable> : null}
      </RefreshableScrollView>

      <Modal animationType="slide" onRequestClose={() => { setReview(null); setReviewError(""); }} transparent visible={review !== null || reviewLoading || Boolean(reviewError)}>
        <View style={styles.modalBackdrop}><View style={styles.reviewSheet}>
          <View style={styles.sheetHandle} /><Text style={styles.reviewTitle}>Check items for reorder</Text>
          {reviewLoading ? <View style={styles.state}><ActivityIndicator color={darkColors.primary} /><Text style={styles.emptyText}>Checking current store prices and availability…</Text></View> : null}
          {review ? <>
            <Text style={styles.reviewStore}>{review.storeName}</Text>
            <ScrollView style={styles.reviewList} showsVerticalScrollIndicator={false}>
              {review.items.map((item) => <View key={item.productId} style={styles.reviewItem}><Image source={item.image} style={styles.reviewImage} /><View style={styles.reviewItemInfo}><Text style={styles.reviewItemName}>{item.name}</Text><Text style={styles.reviewItemQuantity}>Available quantity: {item.quantity}</Text><Text style={styles.reviewPrice}>{formatNaira(item.unitPriceKobo)}</Text></View><Text style={styles.availableStatus}>Available</Text></View>)}
              {review.unavailable.map((item, index) => <View key={`${item.productId}:${index}`} style={styles.issueRow}><Text style={styles.unavailableStatus}>{item.message}</Text></View>)}
              {!review.items.length && !review.unavailable.length ? <Text style={styles.reviewEmpty}>No items are currently available to reorder.</Text> : null}
            </ScrollView>
            {review.items.length ? <Pressable accessibilityRole="button" onPress={addAvailableToCart} style={styles.addAvailableButton}><Text style={styles.buttonText}>Add Available Items to Cart</Text></Pressable> : null}
          </> : null}
          {reviewError ? <><Text accessibilityRole="alert" style={styles.reviewEmpty}>{reviewError}</Text><Pressable accessibilityRole="button" onPress={() => { setReviewError(""); }} style={styles.addAvailableButton}><Text style={styles.buttonText}>Close</Text></Pressable></> : null}
          {review && !reviewLoading ? <Pressable accessibilityRole="button" onPress={() => setReview(null)} style={styles.cancelButton}><Text style={styles.cancelText}>Close</Text></Pressable> : null}
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

function matchesFilter(order: CustomerOrder, filter: OrderFilter) {
  if (filter === "All") return true;
  if (filter === "Cancelled") return order.status === "cancelled";
  if (filter === "Delivered") return order.status === "completed";
  return order.status !== "completed" && order.status !== "cancelled";
}

function statusStyle(status: string) {
  if (status === "completed") return styles.deliveredBadge;
  if (status === "cancelled") return styles.cancelledBadge;
  return styles.pendingBadge;
}
function statusTextStyle(status: string) {
  if (status === "completed") return styles.deliveredText;
  if (status === "cancelled") return styles.cancelledText;
  return styles.pendingText;
}
function humanize(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" }); }
function formatNaira(amountKobo: number) { return `₦${(amountKobo / 100).toLocaleString("en-NG")}`; }
function subOrderPlural(count: number) { return count === 1 ? "" : "s"; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  page: { paddingHorizontal: spacing.ordersPageInset, paddingBottom: spacing.xl },
  title: { ...typography.orderTitle, marginTop: spacing.xs, marginBottom: spacing.sm, color: darkColors.white, textAlign: "center" },
  filterBar: { minHeight: spacing.ordersFilterHeight, marginBottom: spacing.lg, padding: spacing.xxs, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: radius.sm, backgroundColor: darkColors.storeSurface },
  filter: { flex: 1, minHeight: spacing.xl, alignItems: "center", justifyContent: "center", borderRadius: radius.sm },
  selectedFilter: { backgroundColor: darkColors.primary },
  filterText: { ...typography.homeCaption, color: darkColors.white },
  orderList: { gap: spacing.sm },
  orderCard: { padding: spacing.sm, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  orderMain: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  storeLogo: { width: spacing.ordersLogoSize, height: spacing.ordersLogoSize, borderRadius: radius.sm },
  orderDetails: { flex: 1 },
  storeName: { ...typography.orderCardTitle, color: darkColors.white },
  orderReference: { ...typography.orderCaption, color: darkColors.mutedText },
  orderAmount: { ...typography.orderCaption, color: darkColors.white },
  orderFooter: { marginTop: spacing.xs, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusBadge: { minHeight: spacing.ordersStatusHeight, paddingHorizontal: spacing.xs, alignItems: "center", justifyContent: "center", borderRadius: radius.round },
  pendingBadge: { backgroundColor: darkColors.warningSurface },
  deliveredBadge: { backgroundColor: darkColors.successSurface },
  cancelledBadge: { backgroundColor: darkColors.errorSurface },
  statusText: { ...typography.homeCaption, fontFamily: "Poppins_700Bold", fontWeight: "700" },
  pendingText: { color: darkColors.peach },
  deliveredText: { color: darkColors.success },
  cancelledText: { color: darkColors.error },
  actionRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  textAction: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs },
  cancelLabel: { ...typography.homeCaption, color: darkColors.error },
  viewButton: { minHeight: spacing.xl, minWidth: spacing.xxl, paddingHorizontal: spacing.sm, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, backgroundColor: darkColors.primary },
  reorderButton: { minHeight: spacing.xl, paddingHorizontal: spacing.sm, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, backgroundColor: darkColors.primary },
  buttonText: { ...typography.homeCaption, color: darkColors.white },
  subOrderRow: { marginTop: spacing.xs, paddingTop: spacing.xs, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs, borderTopWidth: 1, borderColor: darkColors.border },
  subOrderCopy: { flex: 1 },
  subOrderName: { ...typography.storeCaption, color: darkColors.white },
  subOrderStatus: { ...typography.storeCaption, color: darkColors.mutedText },
  disabled: { opacity: 0.55 },
  state: { padding: spacing.lg, alignItems: "center", gap: spacing.sm },
  emptyCard: { padding: spacing.lg, alignItems: "center", borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  emptyTitle: { ...typography.storeSection, color: darkColors.white },
  emptyText: { ...typography.storeBody, paddingTop: spacing.xs, color: darkColors.mutedText, textAlign: "center" },
  errorBox: { marginBottom: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: darkColors.errorSurface },
  errorText: { ...typography.storeBody, color: darkColors.error },
  retryButton: { paddingTop: spacing.sm },
  retryText: { ...typography.button, color: darkColors.primary },
  loadMore: { minHeight: spacing.buttonHeight, marginTop: spacing.md, alignItems: "center", justifyContent: "center" },
  loadMoreText: { ...typography.button, color: darkColors.primary },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: darkColors.overlay },
  reviewSheet: { maxHeight: "82%", paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: darkColors.background },
  sheetHandle: { width: spacing.xxl, height: spacing.xxs, marginBottom: spacing.md, alignSelf: "center", borderRadius: radius.round, backgroundColor: darkColors.mutedText },
  reviewTitle: { ...typography.storeSection, color: darkColors.white, textAlign: "center" },
  reviewStore: { ...typography.storeBody, marginTop: spacing.xxs, color: darkColors.primary, textAlign: "center" },
  reviewList: { flexGrow: 0, marginTop: spacing.sm },
  reviewItem: { minHeight: spacing.ordersLogoSize + spacing.sm, marginBottom: spacing.xs, padding: spacing.xs, flexDirection: "row", alignItems: "center", gap: spacing.xs, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  reviewImage: { width: spacing.ordersLogoSize, height: spacing.ordersLogoSize, borderRadius: radius.sm },
  reviewItemInfo: { flex: 1 },
  reviewItemName: { ...typography.storeCaption, color: darkColors.white },
  reviewItemQuantity: { ...typography.storeCaption, color: darkColors.mutedText },
  reviewPrice: { ...typography.storeCaption, color: darkColors.white },
  availableStatus: { ...typography.homeCaption, color: darkColors.success },
  unavailableStatus: { ...typography.homeCaption, color: darkColors.error },
  issueRow: { padding: spacing.sm, borderRadius: radius.sm, backgroundColor: darkColors.errorSurface },
  reviewEmpty: { ...typography.storeBody, marginVertical: spacing.lg, color: darkColors.mutedText, textAlign: "center" },
  addAvailableButton: { minHeight: spacing.buttonHeight, marginTop: spacing.sm, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  cancelButton: { minHeight: spacing.buttonHeight, alignItems: "center", justifyContent: "center" },
  cancelText: { ...typography.button, color: darkColors.mutedText },
});
