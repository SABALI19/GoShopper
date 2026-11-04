import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCartStore } from "../../../features/cart/store";
import { checkReorderAvailability, type ReorderAvailability } from "../../../features/orders/reorder";
import { getStoreById, stores } from "../../../features/stores/data";
import { darkColors, radius, spacing, typography } from "../../../theme";

type OrderStatus = "In Progress" | "Delivered" | "Cancelled";
type OrderFilter = "All" | OrderStatus;

type MockOrder = {
  id: string;
  storeId: string;
  status: OrderStatus;
  totalKobo: number;
  orderedAt: string;
  lines: { productId: string; quantity: number }[];
};

const filters: OrderFilter[] = ["All", "Delivered", "In Progress", "Cancelled"];
const sampleOrders: MockOrder[] = [
  { id: "2563", storeId: "bokku-mart", status: "In Progress", totalKobo: 5_800_000, orderedAt: "Oct 26, 2025", lines: [{ productId: "mama-gold-rice", quantity: 1 }, { productId: "baby-pampers", quantity: 1 }, { productId: "groundnut-oil", quantity: 1 }] },
  { id: "2563", storeId: "home-comforts", status: "Delivered", totalKobo: 15_800_000, orderedAt: "Oct 26, 2025", lines: [] },
  { id: "2563", storeId: "fresh-mart", status: "Cancelled", totalKobo: 15_800_000, orderedAt: "Oct 26, 2025", lines: [] },
];

export default function OrdersScreen() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<OrderFilter>("All");
  const addItems = useCartStore((state) => state.addItems);
  const [checkingOrderId, setCheckingOrderId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<ReorderAvailability | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const visibleOrders = selectedFilter === "All"
    ? sampleOrders
    : sampleOrders.filter((order) => order.status === selectedFilter);

  const reorder = async (order: MockOrder) => {
    setCheckingOrderId(`${order.storeId}:${order.id}`);
    setAvailabilityError(null);
    try {
      const checked = await checkReorderAvailability({
        orderId: order.id,
        storeId: order.storeId,
        lines: order.lines,
      });
      setAvailability(checked);
    } catch {
      setAvailabilityError("We couldn't check this store's availability. Please try again.");
    } finally {
      setCheckingOrderId(null);
    }
  };

  const addAvailableItemsToCart = () => {
    if (!availability) return;
    const store = getStoreById(availability.storeId);
    if (!store) return;

    const availableLines = availability.lines.flatMap((line) => {
      const product = store.products.find((candidate) => candidate.id === line.productId);
      if (!product || line.availableQuantity < 1) return [];
      return [{
        productId: product.id,
        storeId: store.id,
        name: product.name,
        description: product.description,
        unitPriceKobo: line.currentPriceKobo ?? product.priceKobo,
        image: product.image,
        quantity: line.availableQuantity,
      }];
    });

    if (!availableLines.length) return;
    addItems(availableLines);
    setAvailability(null);
    router.push("/(customer)/cart");
  };

  const availableQuantity = availability?.lines.reduce((sum, line) => sum + line.availableQuantity, 0) ?? 0;

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>My Orders</Text>
        <View style={styles.filterBar}>
          {filters.map((filter) => {
            const selected = selectedFilter === filter;
            return (
              <Pressable key={filter} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setSelectedFilter(filter)} style={[styles.filter, selected && styles.selectedFilter]}>
                <Text numberOfLines={1} style={styles.filterText}>{filter}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.orderList}>
          {visibleOrders.map((order) => {
            const store = stores.find((item) => item.id === order.storeId);
            if (!store) return null;
            return (
              <View key={`${order.storeId}-${order.id}`} style={styles.orderCard}>
                <View style={styles.orderMain}>
                  <Image resizeMode="cover" source={store.logo} style={styles.storeLogo} />
                  <View style={styles.orderDetails}>
                    <Text numberOfLines={1} style={styles.storeName}>{store.name}</Text>
                    <Text style={styles.orderReference}>{order.orderedAt} • #{order.id}</Text>
                  </View>
                  <Text style={styles.orderAmount}>{formatNaira(order.totalKobo)}</Text>
                </View>
                <View style={styles.orderFooter}>
                  <View style={[styles.statusBadge, statusStyles[order.status]]}>
                    <Text style={[styles.statusText, statusTextStyles[order.status]]}>{order.status}</Text>
                  </View>
                  <Pressable accessibilityRole="button" disabled={checkingOrderId !== null} onPress={() => void reorder(order)} style={({ pressed }) => [styles.reorderButton, pressed && styles.pressed, checkingOrderId !== null && styles.disabledButton]}>
                    {checkingOrderId === `${order.storeId}:${order.id}`
                      ? <ActivityIndicator color={darkColors.white} size="small" />
                      : <Text style={styles.reorderText}>Re Order</Text>}
                  </Pressable>
                </View>
              </View>
            );
          })}
          {visibleOrders.length === 0 ? <Text style={styles.emptyText}>No {selectedFilter.toLowerCase()} orders.</Text> : null}
        </View>
      </ScrollView>

      <Modal animationType="slide" onRequestClose={() => setAvailability(null)} transparent visible={availability !== null || availabilityError !== null}>
        <View style={styles.modalBackdrop}>
          <View style={styles.reviewSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.reviewTitle}>Check items for reorder</Text>
            {availability ? (
              <>
                <Text style={styles.reviewStore}>{availability.storeName}</Text>
                <Text style={styles.demoNotice}>Demo availability check. Stock and prices will need live server confirmation.</Text>
                <ScrollView style={styles.reviewList} showsVerticalScrollIndicator={false}>
                  {availability.lines.length ? availability.lines.map((line) => {
                    const product = getStoreById(availability.storeId)?.products.find((item) => item.id === line.productId);
                    return (
                      <View key={`${line.productId}-${availability.storeId}`} style={styles.reviewItem}>
                        {product ? <Image resizeMode="cover" source={product.image} style={styles.reviewImage} /> : null}
                        <View style={styles.reviewItemInfo}>
                          <Text numberOfLines={1} style={styles.reviewItemName}>{product?.name ?? "Item"}</Text>
                          <Text style={styles.reviewItemQuantity}>
                            {line.availableQuantity > 0
                              ? `${line.availableQuantity} of ${line.requestedQuantity} available`
                              : `0 of ${line.requestedQuantity} available`}
                          </Text>
                          {line.currentPriceKobo !== null ? <Text style={styles.reviewPrice}>{formatNaira(line.currentPriceKobo)}</Text> : null}
                        </View>
                        <Text style={[styles.availabilityStatus, line.status === "unavailable" ? styles.unavailableStatus : line.status === "limited" ? styles.limitedStatus : styles.availableStatus]}>
                          {line.status === "limited" ? "Limited" : line.status === "available" ? "Available" : "Out of stock"}
                        </Text>
                      </View>
                    );
                  }) : <Text style={styles.reviewEmpty}>This demo order has no saved item lines to check.</Text>}
                </ScrollView>
                <Pressable accessibilityRole="button" disabled={availableQuantity === 0} onPress={addAvailableItemsToCart} style={({ pressed }) => [styles.addAvailableButton, pressed && styles.pressed, availableQuantity === 0 && styles.disabledButton]}>
                  <Text style={styles.reorderText}>{availableQuantity ? "Add available items to cart" : "No available items"}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.reviewEmpty}>{availabilityError}</Text>
                <Pressable accessibilityRole="button" onPress={() => setAvailabilityError(null)} style={styles.addAvailableButton}>
                  <Text style={styles.reorderText}>Close</Text>
                </Pressable>
              </>
            )}
            {availability ? <Pressable accessibilityRole="button" onPress={() => setAvailability(null)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable> : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function formatNaira(amountKobo: number) {
  return `₦${(amountKobo / 100).toLocaleString("en-NG")}`;
}

const statusStyles = StyleSheet.create({
  "In Progress": { backgroundColor: darkColors.warningSurface },
  Delivered: { backgroundColor: darkColors.successSurface },
  Cancelled: { backgroundColor: darkColors.errorSurface },
});

const statusTextStyles = StyleSheet.create({
  "In Progress": { color: darkColors.peach },
  Delivered: { color: darkColors.success },
  Cancelled: { color: darkColors.error },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  page: { paddingHorizontal: spacing.ordersPageInset, paddingBottom: spacing.xl },
  title: { ...typography.orderTitle, marginTop: spacing.xs, marginBottom: spacing.sm, color: darkColors.white, textAlign: "center" },
  filterBar: { minHeight: spacing.ordersFilterHeight, marginBottom: spacing.lg, padding: spacing.xxs, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: radius.sm, backgroundColor: darkColors.storeSurface },
  filter: { flex: 1, minHeight: spacing.xl, alignItems: "center", justifyContent: "center", borderRadius: radius.sm },
  selectedFilter: { backgroundColor: darkColors.primary },
  filterText: { ...typography.homeCaption, color: darkColors.white },
  orderList: { gap: spacing.sm },
  orderCard: { minHeight: spacing.ordersCardHeight, padding: spacing.sm, justifyContent: "space-between", borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  orderMain: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  storeLogo: { width: spacing.ordersLogoSize, height: spacing.ordersLogoSize, borderRadius: radius.sm },
  orderDetails: { flex: 1 },
  storeName: { ...typography.orderCardTitle, color: darkColors.white },
  orderReference: { ...typography.orderCaption, color: darkColors.mutedText },
  orderAmount: { ...typography.orderCaption, color: darkColors.white },
  orderFooter: { marginTop: spacing.xs, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusBadge: { minHeight: spacing.ordersStatusHeight, paddingHorizontal: spacing.xs, alignItems: "center", justifyContent: "center", borderRadius: radius.round },
  statusText: { ...typography.homeCaption, fontFamily: "Poppins_700Bold", fontWeight: "700" },
  reorderButton: { minHeight: spacing.xl, minWidth: spacing.xxl + spacing.xs, paddingHorizontal: spacing.sm, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, backgroundColor: darkColors.primary },
  reorderText: { ...typography.homeCaption, color: darkColors.white },
  disabledButton: { opacity: 0.55 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: darkColors.overlay },
  reviewSheet: { maxHeight: "82%", paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: darkColors.background },
  sheetHandle: { width: spacing.xxl, height: spacing.xxs, marginBottom: spacing.md, alignSelf: "center", borderRadius: radius.round, backgroundColor: darkColors.mutedText },
  reviewTitle: { ...typography.storeSection, color: darkColors.white, textAlign: "center" },
  reviewStore: { ...typography.storeBody, marginTop: spacing.xxs, color: darkColors.primary, textAlign: "center" },
  demoNotice: { ...typography.storeCaption, marginTop: spacing.sm, marginBottom: spacing.sm, color: darkColors.mutedText, textAlign: "center" },
  reviewList: { flexGrow: 0 },
  reviewItem: { minHeight: spacing.ordersLogoSize + spacing.sm, marginBottom: spacing.xs, padding: spacing.xs, flexDirection: "row", alignItems: "center", gap: spacing.xs, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  reviewImage: { width: spacing.ordersLogoSize, height: spacing.ordersLogoSize, borderRadius: radius.sm },
  reviewItemInfo: { flex: 1 },
  reviewItemName: { ...typography.storeCaption, color: darkColors.white },
  reviewItemQuantity: { ...typography.storeCaption, color: darkColors.mutedText },
  reviewPrice: { ...typography.storeCaption, color: darkColors.white },
  availabilityStatus: { ...typography.homeCaption, fontFamily: "Poppins_700Bold", fontWeight: "700" },
  availableStatus: { color: darkColors.success },
  limitedStatus: { color: darkColors.warning },
  unavailableStatus: { color: darkColors.error },
  reviewEmpty: { ...typography.storeBody, marginVertical: spacing.lg, color: darkColors.mutedText, textAlign: "center" },
  addAvailableButton: { minHeight: spacing.buttonHeight, marginTop: spacing.sm, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  cancelButton: { minHeight: spacing.buttonHeight, alignItems: "center", justifyContent: "center" },
  cancelText: { ...typography.button, color: darkColors.mutedText },
  pressed: { opacity: 0.8 },
  emptyText: { ...typography.storeBody, padding: spacing.lg, color: darkColors.mutedText, textAlign: "center" },
});
