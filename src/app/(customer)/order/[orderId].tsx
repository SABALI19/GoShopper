import { useAuth } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "../../../components/ui/Icon";
import { RefreshableScrollView } from "../../../components/ui/RefreshableScrollView";
import { apiBaseUrl } from "../../../features/api/client";
import { cancelCustomerOrder, fetchCustomerOrder, getOrderErrorMessage, issueCustomerDeliveryCode, submitCustomerActionDecision, type CustomerOrder } from "../../../features/orders/api";
import { getStoreById } from "../../../features/stores/data";
import { darkColors, radius, spacing, typography } from "../../../theme";

export default function CustomerOrderDetailsScreen() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [error, setError] = useState("");
  const [deliveryCode, setDeliveryCode] = useState<Record<string, string>>({});
  const [requestingDeliveryCode, setRequestingDeliveryCode] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!isLoaded) return;
    if (!orderId || !isSignedIn || !apiBaseUrl) {
      setError(!orderId ? "No order reference was provided." : !isSignedIn ? "Sign in to view this order." : "The Go-Shopper API URL is not configured.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session could not be verified. Sign in again, then retry.");
      setOrder(await fetchCustomerOrder(token, orderId));
    } catch (loadError) {
      setError(getOrderErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, orderId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void loadOrder(); });
    return () => { active = false; };
  }, [loadOrder]);

  const confirmCancellation = () => {
    if (!order) return;
    Alert.alert("Cancel this order?", "This applies to eligible unpaid pending orders. The server will release reserved stock. Refunds are not handled here.", [
      { text: "Keep Order", style: "cancel" },
      { text: "Cancel Order", style: "destructive", onPress: () => void cancelOrder() },
    ]);
  };

  const requestDeliveryCode = async (deliveryId: string) => {
    if (!order) return;
    setRequestingDeliveryCode(deliveryId); setError("");
    try { const token = await getToken(); if (!token) throw new Error("Sign in again to continue."); const result = await issueCustomerDeliveryCode(token, order.orderNumber, deliveryId); setDeliveryCode((current) => ({ ...current, [deliveryId]: result.code })); }
    catch (codeError) { setError(getOrderErrorMessage(codeError)); }
    finally { setRequestingDeliveryCode(null); }
  };

  const cancelOrder = async () => {
    if (!order) return;
    setCancelling(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session could not be verified. Sign in again, then retry.");
      setOrder(await cancelCustomerOrder(token, order.orderNumber));
    } catch (cancelError) {
      setError(getOrderErrorMessage(cancelError));
    } finally {
      setCancelling(false);
    }
  };

  const confirmCustomerDecision = (decision: "proceed_remaining" | "cancel_remaining") => {
    if (!order) return;
    const proceed = decision === "proceed_remaining";
    Alert.alert(
      proceed ? "Continue with the other supermarkets?" : "Cancel the remaining order?",
      proceed
        ? "The affected supermarket order will be cancelled. Other supermarkets can continue. Its refund obligation will remain pending until refunds are implemented."
        : "All not-yet-delivered supermarket orders will be cancelled. Applicable refund obligations will remain pending; no money is being returned now.",
      [
        { text: "Go Back", style: "cancel" },
        { text: proceed ? "Continue Order" : "Cancel Remaining", style: proceed ? "default" : "destructive", onPress: () => void processCustomerDecision(decision) },
      ],
    );
  };

  const processCustomerDecision = async (decision: "proceed_remaining" | "cancel_remaining") => {
    if (!order) return;
    setSubmittingDecision(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session could not be verified. Sign in again, then retry.");
      setOrder(await submitCustomerActionDecision(token, order.orderNumber, decision));
    } catch (decisionError) {
      setError(getOrderErrorMessage(decisionError));
    } finally {
      setSubmittingDecision(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <StatusBar style="light" />
      <RefreshableScrollView refreshAction={loadOrder} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to orders" onPress={() => router.back()} style={styles.backButton}><Icon color={darkColors.white} name="back" size={spacing.lg} /></Pressable>
          <Text style={styles.title}>Order Details</Text><View style={styles.headerSpacer} />
        </View>
        {loading ? <View style={styles.state}><ActivityIndicator color={darkColors.primary} /><Text style={styles.muted}>Loading order details…</Text></View> : null}
        {error ? <View accessibilityRole="alert" style={styles.errorCard}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => void loadOrder()} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></Pressable></View> : null}
        {order ? <>
          <View style={styles.orderCard}>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
            <View style={styles.statusRow}><Text style={styles.muted}>Order status</Text><Text style={styles.statusValue}>{humanize(order.status)}</Text></View>
            <View style={styles.statusRow}><Text style={styles.muted}>Payment status</Text><Text style={styles.statusValue}>{humanize(order.paymentStatus ?? "pending")}</Text></View>
          </View>

          <Text style={styles.sectionTitle}>Delivery Details</Text>
          <View style={styles.card}>
            <Text style={styles.detailPrimary}>{order.delivery?.fullName ?? "—"}</Text>
            <Text style={styles.detailText}>{order.delivery?.address ?? "—"}</Text>
            <Text style={styles.detailText}>{order.delivery?.phone ?? "—"}</Text>
          </View>

          <Text style={styles.sectionTitle}>Supermarket Orders ({order.subOrders.length})</Text>
          {order.customerAction?.decision === "pending" ? <View style={styles.customerActionCard}>
            <Text style={styles.actionTitle}>Your decision is needed</Text>
            <Text style={styles.actionText}>{order.customerAction.affectedStoreName || "A supermarket"} cannot fulfil its order.</Text>
            <Text style={styles.actionText}>Reason: {order.customerAction.reason}</Text>
            <Text style={styles.actionText}>Affected amount: {formatNaira(order.customerAction.amountKobo)}</Text>
            <Text style={styles.actionText}>The other supermarket orders are waiting for your decision.</Text>
            <Pressable accessibilityRole="button" disabled={submittingDecision} onPress={() => confirmCustomerDecision("proceed_remaining")} style={[styles.proceedButton, submittingDecision && styles.disabled]}>
              {submittingDecision ? <ActivityIndicator color={darkColors.white} /> : <Text style={styles.proceedText}>Continue with other supermarkets</Text>}
            </Pressable>
            <Pressable accessibilityRole="button" disabled={submittingDecision} onPress={() => confirmCustomerDecision("cancel_remaining")} style={[styles.rejectButton, submittingDecision && styles.disabled]}>
              <Text style={styles.rejectText}>Cancel remaining order</Text>
            </Pressable>
          </View> : null}
          {order.customerAction?.decision && order.customerAction.decision !== "pending" ? <View style={styles.customerDecisionCard}>
            <Text style={styles.actionTitle}>Decision recorded</Text>
            <Text style={styles.actionText}>{order.customerAction.affectedStoreName || "Supermarket order"}: {humanize(order.customerAction.decision)}</Text>
            <Text style={styles.actionText}>{order.customerAction.reason}</Text>
            {order.customerAction.decidedAt ? <Text style={styles.actionText}>Recorded {formatDate(order.customerAction.decidedAt)}</Text> : null}
          </View> : null}
          {order.subOrders.map((subOrder) => {
            const store = getStoreById(subOrder.storeId);
            return <View key={subOrder.subOrderNumber} style={styles.storeCard}>
              <View style={styles.storeHeader}>
                {store ? <Image source={store.logo} style={styles.storeLogo} /> : <View style={styles.storeLogoPlaceholder} />}
                <View style={styles.storeIdentity}><Text style={styles.storeName}>{subOrder.storeName}</Text><Text style={styles.subOrderNumber}>{subOrder.subOrderNumber}</Text></View>
                <Text style={styles.storeStatus}>{humanize(subOrder.status)}</Text>
              </View>
              {subOrder.delivery ? <View style={styles.deliveryCard}>
                <Text style={styles.deliveryTitle}>Delivery · {humanize(subOrder.delivery.status)}</Text>
                <Text style={styles.deliveryText}>Pickup: {subOrder.delivery.storeName}</Text>
                {subOrder.delivery.rider ? <Text style={styles.deliveryText}>Rider: {[subOrder.delivery.rider.firstName, subOrder.delivery.rider.lastName].filter(Boolean).join(" ")}{subOrder.delivery.rider.phone ? ` · ${subOrder.delivery.rider.phone}` : ""}</Text> : null}
                {subOrder.delivery.status === "failed" ? <Text style={styles.unavailableText}>Delivery issue: {subOrder.delivery.failureReason || "Contact support for help."}</Text> : null}
                {subOrder.delivery.history?.map((event, index) => <Text key={`${event.action}-${index}`} style={styles.deliveryText}>{humanize(event.action)} · {formatDate(event.createdAt)}</Text>)}
                {subOrder.delivery.status === "in_transit" ? <Pressable accessibilityRole="button" disabled={requestingDeliveryCode === subOrder.delivery.id} onPress={() => void requestDeliveryCode(subOrder.delivery!.id)} style={[styles.proceedButton, requestingDeliveryCode === subOrder.delivery.id && styles.disabled]}>{requestingDeliveryCode === subOrder.delivery.id ? <ActivityIndicator color={darkColors.white} /> : <Text style={styles.proceedText}>{deliveryCode[subOrder.delivery.id] ? `Delivery code: ${deliveryCode[subOrder.delivery.id]}` : "Get delivery code"}</Text>}</Pressable> : null}
              </View> : null}
              {subOrder.items.map((item) => {
                const product = store?.products.find((candidate) => candidate.id === item.productId);
                return <View key={`${subOrder.subOrderNumber}:${item.productId}`} style={styles.itemRow}>
                  {product ? <Image source={product.image} style={styles.productImage} /> : <View style={styles.productImagePlaceholder} />}
                  <View style={styles.itemCopy}>
                    <Text numberOfLines={2} style={styles.itemName}>{item.productName}</Text>
                    <Text style={styles.itemDetail}>Qty {item.quantity} · {formatNaira(item.unitPriceKobo)} each</Text>
                    {item.fulfilmentStatus === "unavailable" ? <Text style={styles.unavailableText}>Unavailable: {item.unavailableReason || "The store reported this item unavailable."}</Text> : null}
                    {item.fulfilmentStatus === "unavailable" ? <Text style={styles.refundPendingText}>Refund obligation {formatNaira(item.refundAmountKobo ?? item.lineTotalKobo)} · Pending, not returned</Text> : null}
                  </View>
                  <Text style={styles.itemTotal}>{formatNaira(item.lineTotalKobo)}</Text>
                </View>;
              })}
              {subOrder.items.some((item) => item.fulfilmentStatus === "unavailable") ? <View style={styles.storeTotals}><SummaryRow label="Remaining items being fulfilled" value={formatNaira(subOrder.remainingMerchandiseKobo ?? subOrder.items.filter((item) => item.fulfilmentStatus !== "unavailable").reduce((sum, item) => sum + item.lineTotalKobo, 0))} /></View> : null}
              <View style={styles.storeTotals}>
                <SummaryRow label="Merchandise" value={formatNaira(subOrder.merchandiseSubtotalKobo)} />
                <SummaryRow label="Delivery" value={formatNaira(subOrder.deliveryFeeKobo)} />
                <SummaryRow label="Service fee" value={formatNaira(subOrder.serviceFeeKobo)} />
                <SummaryRow label="Store total" value={formatNaira(subOrder.totalKobo)} strong />
              </View>
            </View>;
          })}

          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.card}>
            <SummaryRow label="Merchandise subtotal" value={formatNaira(order.merchandiseSubtotalKobo)} />
            <SummaryRow label="Delivery fee" value={formatNaira(order.deliveryFeeKobo)} />
            <SummaryRow label="Service fee" value={formatNaira(order.serviceFeeKobo)} />
            <SummaryRow label="Total" value={formatNaira(order.totalKobo)} strong />
          </View>
          {!!order.refundObligations?.length ? <>
            <Text style={styles.sectionTitle}>Refund obligations</Text>
            <View style={styles.card}>
              {order.refundObligations.map((obligation) => <View key={obligation.key} style={styles.refundRow}>
                <Text style={styles.detailPrimary}>{obligation.productName || obligation.storeName}</Text>
                <Text style={styles.detailText}>{obligation.kind.replaceAll("_", " ")} · {formatNaira(obligation.amountKobo)}</Text>
                <Text style={styles.refundPendingText}>Pending — money has not been returned</Text>
              </View>)}
            </View>
          </> : null}
          {order.status === "pending_payment" ? <Pressable accessibilityRole="button" disabled={cancelling} onPress={confirmCancellation} style={[styles.cancelButton, cancelling && styles.disabled]}>{cancelling ? <ActivityIndicator color={darkColors.white} /> : <Text style={styles.cancelLabel}>Cancel Unpaid Order</Text>}</Pressable> : null}
          {order.cancellationReason ? <Text style={styles.cancellationNote}>Cancellation: {order.cancellationReason}</Text> : null}
        </> : null}
      </RefreshableScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <View style={styles.totalRow}><Text style={[styles.totalLabel, strong && styles.strong]}>{label}</Text><Text style={[styles.totalValue, strong && styles.strong]}>{value}</Text></View>;
}
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }); }
function formatNaira(amountKobo: number) { return `₦${(amountKobo / 100).toLocaleString("en-NG")}`; }
function humanize(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  page: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  header: { minHeight: spacing.xxl, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: spacing.xl, height: spacing.xl, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  title: { ...typography.orderTitle, color: darkColors.white },
  headerSpacer: { width: spacing.xl },
  state: { padding: spacing.xl, alignItems: "center", gap: spacing.sm },
  muted: { ...typography.storeBody, color: darkColors.mutedText },
  orderCard: { marginTop: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: darkColors.inputBorder, borderRadius: radius.md, backgroundColor: darkColors.inputSurface },
  orderNumber: { ...typography.storeSection, color: darkColors.white },
  date: { ...typography.storeCaption, marginTop: spacing.xxs, color: darkColors.mutedText },
  statusRow: { minHeight: spacing.xl, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusValue: { ...typography.storeBody, color: darkColors.primary },
  sectionTitle: { ...typography.storeSection, marginTop: spacing.lg, marginBottom: spacing.sm, color: darkColors.white },
  card: { padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  detailPrimary: { ...typography.storeBody, color: darkColors.white },
  detailText: { ...typography.storeCaption, marginTop: spacing.xxs, color: darkColors.mutedText },
  storeCard: { marginBottom: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  storeHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  storeLogo: { width: spacing.ordersLogoSize, height: spacing.ordersLogoSize, borderRadius: radius.sm },
  storeLogoPlaceholder: { width: spacing.ordersLogoSize, height: spacing.ordersLogoSize, borderRadius: radius.sm, backgroundColor: darkColors.inputSurface },
  storeIdentity: { flex: 1 },
  storeName: { ...typography.storeBody, color: darkColors.white },
  subOrderNumber: { ...typography.storeCaption, color: darkColors.mutedText },
  storeStatus: { ...typography.storeCaption, color: darkColors.warning },
  itemRow: { minHeight: spacing.ordersLogoSize + spacing.xs, marginTop: spacing.xs, padding: spacing.xs, flexDirection: "row", alignItems: "center", gap: spacing.xs, borderRadius: radius.sm, backgroundColor: darkColors.storeCard },
  productImage: { width: spacing.ordersLogoSize, height: spacing.ordersLogoSize, borderRadius: radius.sm },
  productImagePlaceholder: { width: spacing.ordersLogoSize, height: spacing.ordersLogoSize, borderRadius: radius.sm, backgroundColor: darkColors.inputSurface },
  itemCopy: { flex: 1 },
  itemName: { ...typography.storeCaption, color: darkColors.white },
  itemDetail: { ...typography.storeCaption, color: darkColors.mutedText },
  itemTotal: { ...typography.storeCaption, color: darkColors.white },
  unavailableText: { ...typography.storeCaption, marginTop: spacing.xxs, color: darkColors.error },
  refundPendingText: { ...typography.storeCaption, marginTop: spacing.xxs, color: darkColors.warning },
  customerActionCard: { marginBottom: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: darkColors.warning, borderRadius: radius.md, backgroundColor: darkColors.warningSurface },
  customerDecisionCard: { marginBottom: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  actionTitle: { ...typography.storeSection, color: darkColors.white },
  actionText: { ...typography.storeCaption, marginTop: spacing.xs, color: darkColors.white },
  proceedButton: { minHeight: spacing.buttonHeight, marginTop: spacing.md, paddingHorizontal: spacing.sm, alignItems: "center", justifyContent: "center", borderRadius: radius.button, backgroundColor: darkColors.primary },
  proceedText: { ...typography.button, color: darkColors.white, textAlign: "center" },
  rejectButton: { minHeight: spacing.buttonHeight, marginTop: spacing.xs, paddingHorizontal: spacing.sm, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: darkColors.error, borderRadius: radius.button },
  rejectText: { ...typography.button, color: darkColors.error },
  refundRow: { paddingVertical: spacing.xs, borderBottomWidth: 1, borderColor: darkColors.border },
  storeTotals: { marginTop: spacing.xs, padding: spacing.xs, borderRadius: radius.sm, backgroundColor: darkColors.inputSurface },
  deliveryCard: { marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: darkColors.inputSurface },
  deliveryTitle: { ...typography.storeBody, color: darkColors.primary },
  deliveryText: { ...typography.storeCaption, marginTop: spacing.xxs, color: darkColors.white },
  totalRow: { minHeight: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  totalLabel: { ...typography.storeCaption, color: darkColors.mutedText },
  totalValue: { ...typography.storeCaption, color: darkColors.white },
  strong: { ...typography.storeBody, color: darkColors.white },
  cancelButton: { minHeight: spacing.buttonHeight, marginTop: spacing.md, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.errorSurface },
  cancelLabel: { ...typography.button, color: darkColors.error },
  cancellationNote: { ...typography.storeCaption, marginTop: spacing.sm, color: darkColors.mutedText },
  disabled: { opacity: 0.6 },
  errorCard: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.errorSurface },
  errorText: { ...typography.storeBody, color: darkColors.error },
  retryButton: { marginTop: spacing.sm },
  retryText: { ...typography.button, color: darkColors.primary },
});
