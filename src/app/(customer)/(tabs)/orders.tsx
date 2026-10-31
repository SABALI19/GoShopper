import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Poppins_400Regular, Poppins_500Medium, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { useCartStore } from "../../../features/cart/store";
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
  const addItem = useCartStore((state) => state.addItem);
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_700Bold });
  const visibleOrders = selectedFilter === "All"
    ? sampleOrders
    : sampleOrders.filter((order) => order.status === selectedFilter);

  if (!fontsLoaded) return null;

  const reorder = (order: MockOrder) => {
    const store = getStoreById(order.storeId);
    if (!store) return;
    const orderProducts = order.lines.map((line) => ({
      product: store.products.find((product) => product.id === line.productId),
      quantity: line.quantity,
    }));
    if (!orderProducts.length || orderProducts.some((entry) => !entry.product)) {
      router.push({ pathname: "/(customer)/store/[storeId]", params: { storeId: store.id } });
      return;
    }
    orderProducts.forEach(({ product, quantity }) => {
      if (!product) return;
      for (let count = 0; count < quantity; count += 1) {
        addItem({ productId: product.id, storeId: store.id, name: product.name, description: product.description, unitPriceKobo: product.priceKobo, image: product.image });
      }
    });
    router.push("/(customer)/cart");
  };

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
                  <Pressable accessibilityRole="button" onPress={() => reorder(order)} style={({ pressed }) => [styles.reorderButton, pressed && styles.pressed]}>
                    <Text style={styles.reorderText}>Re Order</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          {visibleOrders.length === 0 ? <Text style={styles.emptyText}>No {selectedFilter.toLowerCase()} orders.</Text> : null}
        </View>
      </ScrollView>
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
  pressed: { opacity: 0.8 },
  emptyText: { ...typography.storeBody, padding: spacing.lg, color: darkColors.mutedText, textAlign: "center" },
});
