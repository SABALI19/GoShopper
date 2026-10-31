import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Poppins_400Regular, Poppins_500Medium, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "../../components/ui/Icon";
import { useCartStore } from "../../features/cart/store";
import { estimatedDeliveryFeeKobo } from "../../features/cart/pricing";
import { getStoreById } from "../../features/stores/data";
import { darkColors, radius, spacing, typography } from "../../theme";

export default function CartScreen() {
  const router = useRouter();
  const lines = useCartStore((state) => state.lines);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_700Bold });
  const groupedLines = lines.reduce<Record<string, typeof lines>>((groups, line) => {
    groups[line.storeId] ??= [];
    groups[line.storeId].push(line);
    return groups;
  }, {});
  const subtotalKobo = lines.reduce((sum, line) => sum + line.unitPriceKobo * line.quantity, 0);
  const deliveryFeeKobo = lines.length ? estimatedDeliveryFeeKobo : 0;

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View />
        <Pressable accessibilityLabel="Close cart" accessibilityRole="button" onPress={() => router.back()} style={styles.closeButton}>
          <Icon color={darkColors.dark} name="close" size={spacing.md} />
        </Pressable>
      </View>

      {lines.length ? (
        <>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {Object.entries(groupedLines).map(([storeId, storeLines]) => {
              const store = getStoreById(storeId);
              const storeSubtotal = storeLines.reduce((sum, line) => sum + line.unitPriceKobo * line.quantity, 0);
              return (
                <View key={storeId} style={styles.storeSection}>
                  <Text style={styles.storeHeading}>{store?.name ?? "Store"}</Text>
                  <View style={styles.storeItems}>
                    {storeLines.map((line) => (
                      <View key={`${line.storeId}-${line.productId}`} style={styles.itemCard}>
                        <Image resizeMode="cover" source={line.image} style={styles.itemImage} />
                        <View style={styles.itemInfo}>
                          <Text numberOfLines={1} style={styles.itemName}>{line.name}</Text>
                          <Text style={styles.itemDescription}>{line.description ?? ""}</Text>
                          <Text style={styles.itemPrice}>{formatNaira(line.unitPriceKobo)}</Text>
                        </View>
                        <View style={styles.itemActions}>
                          <Pressable accessibilityLabel={`Remove ${line.name}`} onPress={() => removeItem(line.productId, line.storeId)} style={styles.deleteButton}>
                            <Icon color={darkColors.white} name="trash" size={spacing.md} />
                          </Pressable>
                          <View style={styles.quantityControl}>
                            <Pressable accessibilityLabel={`Decrease ${line.name} quantity`} onPress={() => setQuantity(line.productId, line.storeId, line.quantity - 1)} style={styles.quantityButton}>
                              <Icon color={darkColors.white} name="minus" size={spacing.sm} />
                            </Pressable>
                            <Text style={styles.quantity}>{line.quantity}</Text>
                            <Pressable accessibilityLabel={`Increase ${line.name} quantity`} onPress={() => setQuantity(line.productId, line.storeId, line.quantity + 1)} style={styles.quantityButton}>
                              <Icon color={darkColors.white} name="plus" size={spacing.sm} />
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    ))}
                    <View style={styles.storeSubtotalRow}>
                      <Text style={styles.storeSubtotalLabel}>Store subtotal</Text>
                      <Text style={styles.storeSubtotal}>{formatNaira(storeSubtotal)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.summary}>
            <SummaryRow label="Subtotal" value={formatNaira(subtotalKobo)} />
            <SummaryRow label="Estimated delivery" value={formatNaira(deliveryFeeKobo)} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatNaira(subtotalKobo + deliveryFeeKobo)}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => router.push("/(customer)/checkout")} style={({ pressed }) => [styles.checkoutButton, pressed && styles.pressed]}>
              <Text style={styles.checkoutLabel}>Proceed to Checkout</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Icon color={darkColors.primary} name="cart" size={spacing.xxl} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyCopy}>Explore stores and add products to your cart.</Text>
          <Pressable onPress={() => router.replace("/(customer)/(tabs)/explore")} style={styles.exploreButton}>
            <Text style={styles.checkoutLabel}>Explore stores</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryText}>{label}</Text>
      <Text style={styles.summaryText}>{value}</Text>
    </View>
  );
}

function formatNaira(priceKobo: number) {
  return `₦${(priceKobo / 100).toLocaleString("en-NG")}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  header: { height: spacing.cartHeaderHeight, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeButton: { width: spacing.cartCloseSize, height: spacing.cartCloseSize, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  list: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.lg, gap: spacing.md },
  storeSection: { gap: spacing.xxs },
  storeHeading: { ...typography.homeCaption, color: darkColors.mutedText },
  storeItems: { gap: spacing.cartLineGap },
  itemCard: { height: spacing.cartItemHeight, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  itemImage: { width: spacing.cartItemImageSize, height: spacing.cartItemImageSize, borderRadius: radius.sm },
  itemInfo: { flex: 1, alignSelf: "stretch", justifyContent: "center" },
  itemName: { ...typography.storeSection, color: darkColors.white },
  itemDescription: { ...typography.storeCaption, minHeight: spacing.md, color: darkColors.mutedText },
  itemPrice: { ...typography.storeBody, color: darkColors.white },
  itemActions: { height: spacing.cartItemActionsHeight, alignItems: "flex-end", justifyContent: "space-between" },
  deleteButton: { padding: spacing.xxs },
  quantityControl: { flexDirection: "row", alignItems: "center", gap: spacing.xxs },
  quantityButton: { width: spacing.cartQuantityButtonSize, height: spacing.cartQuantityButtonSize, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.dark },
  quantity: { ...typography.storeBody, minWidth: spacing.md, color: darkColors.white, textAlign: "center" },
  storeSubtotalRow: { paddingHorizontal: spacing.xxs, paddingVertical: spacing.xxs, flexDirection: "row", justifyContent: "space-between" },
  storeSubtotalLabel: { ...typography.storeCaption, color: darkColors.mutedText },
  storeSubtotal: { ...typography.storeCaption, color: darkColors.white },
  summary: { padding: spacing.cartSummaryPadding, gap: spacing.xs, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, backgroundColor: darkColors.inputSurface },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryText: { ...typography.storeBody, color: darkColors.white },
  totalRow: { paddingTop: spacing.xs, flexDirection: "row", justifyContent: "space-between", borderTopWidth: spacing.progressDotSize / 3, borderStyle: "dotted", borderColor: darkColors.border },
  totalLabel: { ...typography.storeBody, color: darkColors.white, fontFamily: "Poppins_700Bold", fontWeight: "700" },
  totalValue: { ...typography.storeBody, color: darkColors.white, fontFamily: "Poppins_500Medium", fontWeight: "500" },
  checkoutButton: { minHeight: spacing.buttonHeight, marginTop: spacing.xxs, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  checkoutLabel: { ...typography.button, color: darkColors.white },
  pressed: { opacity: 0.8 },
  emptyState: { flex: 1, padding: spacing.xl, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  emptyTitle: { ...typography.storeTitle, color: darkColors.white },
  emptyCopy: { ...typography.storeBody, color: darkColors.mutedText, textAlign: "center" },
  exploreButton: { minHeight: spacing.buttonHeight, marginTop: spacing.sm, paddingHorizontal: spacing.xl, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
});
