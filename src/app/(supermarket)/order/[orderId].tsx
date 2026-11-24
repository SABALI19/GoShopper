import { useAuth } from "@/features/auth/AuthProvider";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { RefreshableScrollView } from "../../../components/ui/RefreshableScrollView";
import { BottomSheet } from "../../../components/ui/WorkflowComponents";
import { apiBaseUrl } from "../../../features/api/client";
import { apiMessage, fetchStoreOrder, regenerateStorePickupCode, reportStoreCannotFulfil, reportStoreItemUnavailable, reportStorePickupIssue, updateStoreOrderStatus, type StoreOrder } from "../../../features/supermarket/api";
import { darkColors, radius, spacing, typography } from "../../../theme";
import QRCode from "react-native-qrcode-svg";

const nextStatusByCurrent: Record<string, { status: string; label: string } | undefined> = {
  pending_fulfilment: { status: "accepted", label: "Accept Order" },
  accepted: { status: "preparing", label: "Start Preparing" },
  preparing: { status: "ready_for_dispatch", label: "Mark Ready for Dispatch" },
};

export default function SupermarketOrderDetailsScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const params = useLocalSearchParams<{ storeId?: string; orderId?: string }>();
  const storeId = Array.isArray(params.storeId) ? params.storeId[0] : params.storeId;
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestingDecision, setRequestingDecision] = useState(false);
  const [decisionReason, setDecisionReason] = useState("");
  const [itemReasons, setItemReasons] = useState<Record<string, string>>({});
  const [reportingProductId, setReportingProductId] = useState<string | null>(null);
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pickupCode, setPickupCode] = useState("");
  const [pickupCodeBusy, setPickupCodeBusy] = useState(false);
  const [pickupSheetOpen, setPickupSheetOpen] = useState(false);
  const [pickupIssueOpen, setPickupIssueOpen] = useState(false);
  const [pickupIssueReason, setPickupIssueReason] = useState("");
  const [pickupIssueBusy, setPickupIssueBusy] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!storeId || !orderId || !apiBaseUrl) {
      setError(!storeId || !orderId ? "The store or order reference is missing." : "The Go-Shopper API URL is not configured.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session could not be verified. Sign in again.");
      setOrder(await fetchStoreOrder(token, storeId, orderId));
    } catch (loadError) {
      setError(apiMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [getToken, orderId, storeId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void loadOrder(); });
    return () => { active = false; };
  }, [loadOrder]);

  const nextAction = useMemo(() => order ? nextStatusByCurrent[order.status] : undefined, [order]);
  const paymentIsVerified = order?.paymentStatus === "paid";
  const canRequestCustomerDecision = paymentIsVerified && ["pending_fulfilment", "accepted", "preparing"].includes(order?.status ?? "");

  const updateStatus = async (status: string, reason?: string) => {
    if (!order || !storeId) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session could not be verified. Sign in again.");
      const response = await updateStoreOrderStatus(token, storeId, order.subOrderNumber, status, reason);
      setOrder((current) => current ? {
        ...current,
        ...response.order,
        delivery: response.delivery ?? current.delivery,
        deliveryProgress: response.deliveryProgress ?? current.deliveryProgress,
        parentStatus: response.parentStatus ?? current.parentStatus,
        paymentStatus: response.paymentStatus ?? current.paymentStatus,
      } : current);
      if (status === "ready_for_dispatch") {
        setPickupCode(response.pickupCode || "");
        setPickupSheetOpen(Boolean(response.pickupCode));
        await loadOrder();
      }
      setShowDecisionForm(false);
      setDecisionReason("");
    } catch (updateError) {
      setError(apiMessage(updateError));
    } finally {
      setSaving(false);
      setRequestingDecision(false);
    }
  };

  const generatePickupCode = async () => {
    if (!order || !storeId) return;
    setPickupCodeBusy(true); setError(""); setNotice("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session could not be verified. Sign in again.");
      const result = await regenerateStorePickupCode(token, storeId, order.subOrderNumber);
      setPickupCode(result.pickupCode);
      setOrder((current) => current ? { ...current, deliveryProgress: result.deliveryProgress ?? current.deliveryProgress } : current);
      setPickupSheetOpen(true);
      setNotice("A new pickup code was created. Any previous code is now invalid.");
    } catch (pickupError) { setError(apiMessage(pickupError)); }
    finally { setPickupCodeBusy(false); }
  };

  const sendPickupIssue = async () => {
    if (!order || !storeId || pickupIssueReason.trim().length < 3) { setError("Describe the pickup problem in at least 3 characters."); return; }
    setPickupIssueBusy(true); setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session could not be verified. Sign in again.");
      const result = await reportStorePickupIssue(token, storeId, order.subOrderNumber, pickupIssueReason.trim());
      setPickupIssueOpen(false); setPickupIssueReason("");
      setNotice(result.notificationQueued ? "Pickup issue recorded and an admin notification was queued." : "Pickup issue recorded. An admin notification could not be queued.");
      await loadOrder();
    } catch (issueError) { setError(apiMessage(issueError)); }
    finally { setPickupIssueBusy(false); }
  };

  const sendCustomerDecisionRequest = async () => {
    if (!decisionReason.trim()) {
      setError("Add a short reason so the customer knows what happened.");
      return;
    }
    setRequestingDecision(true);
    setError("");
    try {
      const token = await getToken();
      if (!token || !storeId || !order) throw new Error("Your session or order could not be verified.");
      await reportStoreCannotFulfil(token, storeId, order.subOrderNumber, decisionReason.trim());
      setShowDecisionForm(false);
      setDecisionReason("");
      setNotice("The request was recorded. Other supermarket orders are paused until the customer decides.");
      await loadOrder();
    } catch (requestError) {
      setError(apiMessage(requestError));
    } finally {
      setRequestingDecision(false);
    }
  };

  const reportItemUnavailable = async (productId: string) => {
    const reason = itemReasons[productId]?.trim();
    if (!reason) {
      setError("Enter a reason for marking this item unavailable.");
      return;
    }
    if (!storeId || !order) return;
    setReportingProductId(productId);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session could not be verified. Sign in again.");
      const result = await reportStoreItemUnavailable(token, storeId, order.subOrderNumber, productId, reason);
      setNotice(`Item marked unavailable. A ${formatNaira(result.item.refundAmountKobo)} refund obligation is pending; no refund was sent.`);
      setItemReasons((current) => ({ ...current, [productId]: "" }));
      await loadOrder();
    } catch (reportError) {
      setError(apiMessage(reportError));
    } finally {
      setReportingProductId(null);
    }
  };

  return <SafeAreaView edges={["top"]} style={styles.screen}>
    <StatusBar style="light" />
    <RefreshableScrollView refreshAction={loadOrder} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to store orders" onPress={() => router.back()} style={styles.backButton}><Icon color={darkColors.white} name="back" size={spacing.lg} /></Pressable>
        <Text style={styles.title}>Order Details</Text><View style={styles.headerSpace} />
      </View>
      {loading ? <View style={styles.state}><ActivityIndicator color={darkColors.primary} /><Text style={styles.stateText}>Loading order…</Text></View> : null}
      {error ? <View accessibilityRole="alert" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Button title="Retry" onPress={() => void loadOrder()} /></View> : null}

      {order ? <>
        <View style={styles.parentCard}>
          <Text style={styles.parentLabel}>PARENT ORDER</Text>
          <Text style={styles.parentReference}>{order.parentOrderNumber}</Text>
          <Text style={styles.date}>Placed {formatDate(order.parentCreatedAt ?? order.createdAt)}</Text>
          <View style={styles.statusRows}><SummaryRow label="Payment" value={humanize(order.paymentStatus)} /><SummaryRow label="Parent status" value={humanize(order.parentStatus ?? "pending_payment")} /></View>
        </View>

        <View style={styles.storeCard}>
          <Text style={styles.storeLabel}>THIS STORE&apos;S SUB-ORDER</Text>
          <Text style={styles.subOrderReference}>{order.subOrderNumber}</Text>
          <Text style={styles.storeName}>{order.storeName}</Text>
          <View style={styles.statusPill}><Text style={styles.statusText}>{humanize(order.status)}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Delivery details</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoPrimary}>{order.delivery?.fullName ?? "Customer name unavailable"}</Text>
          <Text style={styles.infoText}>{order.delivery?.address ?? "Delivery address unavailable"}</Text>
          <Text style={styles.infoText}>{order.delivery?.phone ?? "Phone number unavailable"}</Text>
        </View>

        <Text style={styles.sectionTitle}>Products</Text>
        <View style={styles.itemsCard}>
          {order.items.map((item) => <View key={item.productId} style={styles.itemBlock}>
            <View style={styles.itemRow}>
            <View style={styles.itemCopy}><Text style={styles.itemName}>{item.productName}</Text><Text style={styles.itemQuantity}>Quantity {item.quantity} × {formatNaira(item.unitPriceKobo)}</Text>
              {item.fulfilmentStatus === "unavailable" ? <Text style={styles.unavailable}>Unavailable: {item.unavailableReason}</Text> : null}
              {item.fulfilmentStatus === "unavailable" ? <Text style={styles.unavailable}>Refund obligation {formatNaira(item.refundAmountKobo ?? item.lineTotalKobo)} · Pending</Text> : null}
            </View>
            <Text style={styles.lineTotal}>{formatNaira(item.lineTotalKobo)}</Text>
            </View>
            {paymentIsVerified && canRequestCustomerDecision && item.fulfilmentStatus !== "unavailable" && item.fulfilmentStatus !== "fulfilled" ? <View style={styles.itemException}>
              <TextInput maxLength={500} onChangeText={(value) => setItemReasons((current) => ({ ...current, [item.productId]: value }))} placeholder="Why is this item unavailable?" placeholderTextColor={darkColors.placeholder} style={styles.reasonInput} value={itemReasons[item.productId] ?? ""} />
              <Button title="Report Item Unavailable" onPress={() => void reportItemUnavailable(item.productId)} loading={reportingProductId === item.productId} />
            </View> : null}
          </View>)}
        </View>

        <Text style={styles.sectionTitle}>Store totals</Text>
        <View style={styles.infoCard}>
          <SummaryRow label="Merchandise subtotal" value={formatNaira(order.merchandiseSubtotalKobo)} />
          {order.items.some((item) => item.fulfilmentStatus === "unavailable") ? <SummaryRow label="Remaining items to fulfil" value={formatNaira(order.remainingMerchandiseKobo ?? order.items.filter((item) => item.fulfilmentStatus !== "unavailable").reduce((sum, item) => sum + item.lineTotalKobo, 0))} /> : null}
          <SummaryRow label="Allocated delivery fee" value={formatNaira(order.deliveryFeeKobo)} />
          <SummaryRow label="Allocated service fee" value={formatNaira(order.serviceFeeKobo)} />
          <SummaryRow label="Store total" value={formatNaira(order.totalKobo)} strong />
        </View>

        {order.customerAction?.reason ? <View style={styles.actionNotice}>
          <Text style={styles.actionNoticeTitle}>Customer decision</Text>
          <Text style={styles.infoText}>{order.customerAction.reason}</Text>
          <Text style={styles.infoText}>{order.customerAction.decision === "pending" ? "Awaiting customer response" : humanize(order.customerAction.decision ?? "")}</Text>
        </View> : null}
        {notice ? <View style={styles.actionNotice}><Text style={styles.actionNoticeTitle}>Request recorded</Text><Text style={styles.infoText}>{notice}</Text></View> : null}

        <Text style={styles.sectionTitle}>Fulfilment</Text>
        {order.deliveryProgress ? <View style={styles.infoCard}>
          <Text style={styles.infoPrimary}>Rider delivery · {humanize(order.deliveryProgress.status)}</Text>
          {order.deliveryProgress.rider ? <Text style={styles.infoText}>Rider: {[order.deliveryProgress.rider.firstName, order.deliveryProgress.rider.lastName].filter(Boolean).join(" ")}{order.deliveryProgress.rider.phone ? ` · ${order.deliveryProgress.rider.phone}` : ""}</Text> : <Text style={styles.infoText}>Waiting for an admin to assign an approved rider.</Text>}
          {order.deliveryProgress.arrivedAt ? <Text style={styles.infoText}>Rider arrived {formatDate(order.deliveryProgress.arrivedAt)}</Text> : null}
          {order.deliveryProgress.pickedUpAt ? <Text style={styles.infoText}>Picked up by {[order.deliveryProgress.rider?.firstName, order.deliveryProgress.rider?.lastName].filter(Boolean).join(" ") || "assigned rider"} · {formatDate(order.deliveryProgress.pickedUpAt)}</Text> : null}
          {order.deliveryProgress.failureReason ? <Text style={styles.unavailable}>Delivery issue: {order.deliveryProgress.failureReason}</Text> : null}
        </View> : null}
        {!paymentIsVerified ? <View style={styles.paymentNotice}><Text style={styles.paymentTitle}>Pending payment</Text><Text style={styles.paymentCopy}>Fulfilment actions unlock only after payment is verified by the server. Do not pack or dispatch this order yet.</Text></View> : null}
        {paymentIsVerified && nextAction ? <Button title={nextAction.label} onPress={() => void updateStatus(nextAction.status)} loading={saving} /> : null}
        {paymentIsVerified && order.status === "ready_for_dispatch" && order.deliveryProgress ? <>
          {pickupCode ? <Button title="Pickup code" onPress={() => setPickupSheetOpen(true)} /> : order.deliveryProgress.assigned ? <Button title="Generate pickup code" onPress={() => void generatePickupCode()} loading={pickupCodeBusy} /> : <Text style={styles.terminalNotice}>The pickup code was generated when this order became ready. If this screen was closed, regenerate it after a rider is assigned.</Text>}
          {["assigned", "accepted", "arrived_at_pickup"].includes(order.deliveryProgress.status) ? <Pressable accessibilityRole="button" disabled={pickupIssueBusy} onPress={() => setPickupIssueOpen(true)} style={styles.exceptionButton}><Text style={styles.exceptionLabel}>Report a problem with this pickup</Text></Pressable> : null}
        </> : null}
        {paymentIsVerified && canRequestCustomerDecision ? <Pressable accessibilityRole="button" disabled={saving} onPress={() => { setError(""); setShowDecisionForm((current) => !current); }} style={styles.exceptionButton}><Text style={styles.exceptionLabel}>Can&apos;t fulfil this store order?</Text></Pressable> : null}
        {showDecisionForm && canRequestCustomerDecision ? <View style={styles.infoCard}>
          <Text style={styles.infoPrimary}>Request customer decision</Text>
          <Text style={styles.infoText}>The affected store order will stop. The customer can approve continuing with the other supermarkets or cancel the remaining order.</Text>
          <TextInput multiline maxLength={500} onChangeText={setDecisionReason} placeholder="Explain why the store cannot fulfil this order" placeholderTextColor={darkColors.placeholder} style={styles.reasonInput} value={decisionReason} />
          <Button title="Send Request" onPress={() => void sendCustomerDecisionRequest()} loading={requestingDecision} />
        </View> : null}
        {paymentIsVerified && !nextAction && !canRequestCustomerDecision ? <Text style={styles.terminalNotice}>No further fulfilment action is available for this status.</Text> : null}
        {order.deliveryProgress?.history?.length ? <><Text style={styles.sectionTitle}>Pickup timeline</Text>{order.deliveryProgress.history.map((event, index) => <View key={`${event.createdAt}-${index}`} style={styles.infoCard}><Text style={styles.infoPrimary}>{event.actorName || event.actorRole || "System"} · {humanize(event.action)}</Text><Text style={styles.infoText}>{formatDate(event.createdAt)}</Text>{event.reason ? <Text style={styles.infoText}>{event.reason}</Text> : null}{event.location ? <Text style={styles.infoText}>Rider location: {event.location.coordinates[1].toFixed(5)}, {event.location.coordinates[0].toFixed(5)}</Text> : null}</View>)}</> : null}
        <Text style={styles.timestamp}>Store order updated {formatDate(order.updatedAt)}</Text>
      </> : null}
    </RefreshableScrollView>
    <BottomSheet visible={pickupSheetOpen} title="Pickup code" onClose={() => setPickupSheetOpen(false)} style={styles.bottomSheet}>
      <Text style={styles.infoText}>Show this QR code to the assigned rider. If scanning is not possible, the rider can choose to enter the code manually.</Text>
      {pickupCode ? <><View style={styles.qrPanel}><QRCode value={pickupCode} size={spacing.pickupQrSize} /></View><Text style={styles.pickupCode}>{pickupCode}</Text></> : <Text style={styles.infoText}>The code is only shown once. Regenerate it to create a new code.</Text>}
      <Text style={styles.infoText}>Pickup status: {humanize(order?.deliveryProgress?.status || "awaiting_assignment")}</Text>
      {order?.deliveryProgress?.assigned ? <Button title={pickupCodeBusy ? "Regenerating…" : "Regenerate code"} onPress={() => void generatePickupCode()} loading={pickupCodeBusy} /> : null}
    </BottomSheet>
    <BottomSheet visible={pickupIssueOpen} title="Report a pickup problem" onClose={() => setPickupIssueOpen(false)} style={styles.bottomSheet}>
      <Text style={styles.infoText}>This records the issue on the delivery timeline and notifies Go-Shopper administration.</Text>
      <TextInput multiline maxLength={500} value={pickupIssueReason} onChangeText={setPickupIssueReason} placeholder="Describe the pickup problem" placeholderTextColor={darkColors.placeholder} style={styles.reasonInput} />
      <Button title="Send report" onPress={() => void sendPickupIssue()} loading={pickupIssueBusy} disabled={pickupIssueReason.trim().length < 3} />
    </BottomSheet>
  </SafeAreaView>;
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <View style={styles.totalRow}><Text style={[styles.totalLabel, strong && styles.strong]}>{label}</Text><Text style={[styles.totalValue, strong && styles.strong]}>{value}</Text></View>;
}
function formatNaira(amountKobo: number) { return `₦${(amountKobo / 100).toLocaleString("en-NG")}`; }
function formatDate(value?: string) { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }); }
function humanize(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  page: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  header: { minHeight: spacing.xxl, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: spacing.xl, height: spacing.xl, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  title: { ...typography.orderTitle, color: darkColors.white },
  headerSpace: { width: spacing.xl },
  state: { padding: spacing.xl, alignItems: "center", gap: spacing.sm },
  stateText: { ...typography.storeCaption, color: darkColors.mutedText },
  parentCard: { marginTop: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: darkColors.inputBorder, borderRadius: radius.md, backgroundColor: darkColors.inputSurface },
  parentLabel: { ...typography.homeCaption, color: darkColors.primary },
  parentReference: { ...typography.storeSection, color: darkColors.white },
  date: { ...typography.storeCaption, marginTop: spacing.xxs, color: darkColors.mutedText },
  statusRows: { marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 1, borderColor: darkColors.border },
  storeCard: { marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  storeLabel: { ...typography.homeCaption, color: darkColors.primary },
  subOrderReference: { ...typography.storeBody, marginTop: spacing.xxs, color: darkColors.white },
  storeName: { ...typography.storeCaption, color: darkColors.mutedText },
  statusPill: { alignSelf: "flex-start", marginTop: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.round, backgroundColor: darkColors.warningSurface },
  statusText: { ...typography.storeCaption, color: darkColors.warning },
  sectionTitle: { ...typography.storeSection, marginTop: spacing.lg, marginBottom: spacing.sm, color: darkColors.white },
  infoCard: { padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  infoPrimary: { ...typography.storeBody, color: darkColors.white },
  infoText: { ...typography.storeCaption, marginTop: spacing.xxs, color: darkColors.mutedText },
  itemsCard: { padding: spacing.sm, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  itemBlock: { paddingBottom: spacing.xs, borderBottomWidth: 1, borderColor: darkColors.border },
  itemRow: { minHeight: spacing.xxl, paddingVertical: spacing.xs, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, borderBottomWidth: 1, borderColor: darkColors.border },
  itemException: { paddingBottom: spacing.sm },
  itemCopy: { flex: 1 },
  itemName: { ...typography.storeBody, color: darkColors.white },
  itemQuantity: { ...typography.storeCaption, marginTop: spacing.xxs, color: darkColors.mutedText },
  lineTotal: { ...typography.storeBody, color: darkColors.white },
  unavailable: { ...typography.storeCaption, color: darkColors.error },
  totalRow: { minHeight: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  totalLabel: { ...typography.storeCaption, color: darkColors.mutedText },
  totalValue: { ...typography.storeCaption, color: darkColors.white },
  strong: { ...typography.storeBody, color: darkColors.white },
  actionNotice: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.warningSurface },
  actionNoticeTitle: { ...typography.storeBody, color: darkColors.white },
  paymentNotice: { marginBottom: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.warningSurface },
  paymentTitle: { ...typography.storeBody, color: darkColors.warning },
  paymentCopy: { ...typography.storeCaption, marginTop: spacing.xxs, color: darkColors.white },
  exceptionButton: { minHeight: spacing.buttonHeight, marginTop: spacing.xs, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: darkColors.warning, borderRadius: radius.button },
  exceptionLabel: { ...typography.button, color: darkColors.warning },
  reasonInput: { minHeight: spacing.xxl, marginVertical: spacing.sm, padding: spacing.sm, textAlignVertical: "top", color: darkColors.white, borderWidth: 1, borderColor: darkColors.inputBorder, borderRadius: radius.input, backgroundColor: darkColors.inputSurface },
  bottomSheet: { gap: spacing.sm },
  qrPanel: { alignSelf: "center", padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.white },
  pickupCode: { ...typography.orderTitle, color: darkColors.white, textAlign: "center", letterSpacing: 3 },
  terminalNotice: { ...typography.storeCaption, marginTop: spacing.sm, color: darkColors.mutedText, textAlign: "center" },
  timestamp: { ...typography.storeCaption, marginTop: spacing.md, color: darkColors.mutedText, textAlign: "center" },
  errorBox: { gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.errorSurface },
  errorText: { ...typography.storeBody, color: darkColors.error },
});
