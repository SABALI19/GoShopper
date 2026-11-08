import { useAuth } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "../../components/ui/Icon";
import { RefreshableScrollView } from "../../components/ui/RefreshableScrollView";
import { apiBaseUrl } from "../../features/api/client";
import { fetchCustomerOrder, getOrderErrorMessage, type CustomerOrder } from "../../features/orders/api";
import { darkColors, radius, spacing, typography } from "../../theme";

export default function PaymentScreen() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <StatusBar style="light" />
      <RefreshableScrollView refreshAction={loadOrder} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.backButton}>
          <Icon color={darkColors.white} name="back" size={spacing.lg} />
        </Pressable>
        <View style={styles.statusIcon}><Icon color={darkColors.primary} name="clock" size={spacing.xl} /></View>
        <Text style={styles.title}>Order Created</Text>
        <Text style={styles.description}>Your order is saved and awaiting payment. Payment initiation is coming soon; no payment has been taken.</Text>

        {loading ? <View style={styles.state}><ActivityIndicator color={darkColors.primary} /><Text style={styles.muted}>Loading your order…</Text></View> : null}
        {error ? <View accessibilityRole="alert" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => void loadOrder()} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></Pressable></View> : null}
        {order ? (
          <>
            <View style={styles.orderCard}>
              <SummaryRow label="Order Number" value={order.orderNumber} />
              <SummaryRow label="Order Date" value={formatDate(order.createdAt)} />
              <SummaryRow label="Payment Status" value={humanize(order.paymentStatus ?? "pending")} />
              <SummaryRow label="Order Status" value={humanize(order.status)} />
              <View style={styles.totalRow}><Text style={styles.totalLabel}>Total Amount</Text><Text style={styles.amount}>{formatNaira(order.totalKobo)}</Text></View>
            </View>
            <Text style={styles.subOrdersTitle}>Stores in this order ({order.subOrders.length})</Text>
            {order.subOrders.map((subOrder) => (
              <View key={subOrder.id} style={styles.subOrderCard}>
                <View style={styles.subOrderHead}><Text style={styles.storeName}>{subOrder.storeName}</Text><Text style={styles.storeStatus}>{humanize(subOrder.status)}</Text></View>
                <Text style={styles.subOrderNumber}>{subOrder.subOrderNumber}</Text>
                <Text style={styles.subOrderAmount}>{formatNaira(subOrder.totalKobo)} · {subOrder.items.length} item{subOrder.items.length === 1 ? "" : "s"}</Text>
                {subOrder.items.map((item) => <View key={`${subOrder.subOrderNumber}:${item.productId}`} style={styles.itemRow}>
                  <Text numberOfLines={1} style={styles.itemName}>{item.productName} × {item.quantity}</Text>
                  <Text style={styles.itemAmount}>{formatNaira(item.lineTotalKobo)}</Text>
                </View>)}
              </View>
            ))}
          </>
        ) : null}

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={!order} onPress={() => order && router.push({ pathname: "/(customer)/order/[orderId]", params: { orderId: order.orderNumber } })} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, !order && styles.disabled]}>
            <Text style={styles.primaryLabel}>View Order Details</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.replace("/(customer)/(tabs)/orders")} style={styles.secondaryButton}><Text style={styles.secondaryLabel}>My Orders</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.replace("/(customer)/(tabs)/explore")} style={styles.shopButton}><Text style={styles.shopLabel}>Continue Shopping</Text></Pressable>
        </View>
      </RefreshableScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.muted}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
}

function formatNaira(amountKobo: number) { return `₦${(amountKobo / 100).toLocaleString("en-NG")}`; }
function humanize(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  page: { flexGrow: 1, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  backButton: { width: spacing.xl, height: spacing.xl, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  statusIcon: { width: spacing.xxl + spacing.md, height: spacing.xxl + spacing.md, marginTop: spacing.xxl, alignSelf: "center", alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.warningSurface },
  title: { ...typography.orderTitle, marginTop: spacing.md, color: darkColors.white, textAlign: "center" },
  description: { ...typography.storeBody, marginTop: spacing.xs, color: darkColors.mutedText, textAlign: "center" },
  state: { padding: spacing.lg, alignItems: "center", gap: spacing.sm },
  muted: { ...typography.storeBody, color: darkColors.mutedText },
  errorBox: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.errorSurface },
  errorText: { ...typography.storeBody, color: darkColors.error },
  retryButton: { marginTop: spacing.sm, padding: spacing.sm, alignItems: "center" },
  retryText: { ...typography.button, color: darkColors.primary },
  orderCard: { marginTop: spacing.xl, padding: spacing.md, borderWidth: 1, borderColor: darkColors.inputBorder, borderRadius: radius.md, backgroundColor: darkColors.inputSurface },
  row: { minHeight: spacing.xl, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  value: { ...typography.storeBody, color: darkColors.white, textAlign: "right" },
  totalRow: { minHeight: spacing.xl, marginTop: spacing.xs, paddingTop: spacing.xs, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderColor: darkColors.border },
  totalLabel: { ...typography.storeSection, color: darkColors.white },
  amount: { ...typography.storeSection, color: darkColors.primary },
  subOrdersTitle: { ...typography.storeSection, marginTop: spacing.lg, marginBottom: spacing.sm, color: darkColors.white },
  subOrderCard: { marginBottom: spacing.xs, padding: spacing.sm, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  subOrderHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs },
  storeName: { ...typography.storeBody, flex: 1, color: darkColors.white },
  storeStatus: { ...typography.storeCaption, color: darkColors.warning },
  subOrderNumber: { ...typography.storeCaption, marginTop: spacing.xxs, color: darkColors.mutedText },
  subOrderAmount: { ...typography.storeBody, marginTop: spacing.xs, color: darkColors.white },
  itemRow: { minHeight: spacing.lg, marginTop: spacing.xxs, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs },
  itemName: { ...typography.storeCaption, flex: 1, color: darkColors.mutedText },
  itemAmount: { ...typography.storeCaption, color: darkColors.white },
  actions: { gap: spacing.xs, marginTop: "auto", paddingTop: spacing.lg },
  primaryButton: { minHeight: spacing.buttonHeight, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  primaryLabel: { ...typography.button, color: darkColors.white },
  secondaryButton: { minHeight: spacing.buttonHeight, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: darkColors.primary, borderRadius: radius.round },
  secondaryLabel: { ...typography.button, color: darkColors.primary },
  shopButton: { minHeight: spacing.buttonHeight, alignItems: "center", justifyContent: "center" },
  shopLabel: { ...typography.button, color: darkColors.primary },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.8 },
});
