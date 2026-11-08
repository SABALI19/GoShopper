import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "../../components/ui/Icon";
import { RefreshableScrollView } from "../../components/ui/RefreshableScrollView";
import { useCartStore, type CartLine } from "../../features/cart/store";
import { getCartEligibility, type StoreCartSummary } from "../../features/cart/eligibility";
import { minimumStoreSubtotalKobo } from "../../features/cart/config";
import { estimatedDeliveryFeeKobo } from "../../features/cart/pricing";
import { fetchStoreProducts } from "../../features/stores/api";
import { getStoreById, type StoreProduct } from "../../features/stores/data";
import { darkColors, radius, spacing, typography } from "../../theme";

export default function CartScreen() {
  const router = useRouter();
  const lines = useCartStore((state) => state.lines);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const removeStore = useCartStore((state) => state.removeStore);
  const eligibility = getCartEligibility(lines);
  const subtotalKobo = lines.reduce((sum, line) => sum + line.unitPriceKobo * line.quantity, 0);
  const deliveryFeeKobo = lines.length ? estimatedDeliveryFeeKobo : 0;

  if (!hasHydrated) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
        <StatusBar style="light" />
        <View style={styles.loadingState}>
          <ActivityIndicator color={darkColors.primary} />
          <Text style={styles.emptyCopy}>Loading your cart…</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <RefreshableScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {eligibility.stores.map((storeSummary) => {
              const store = getStoreById(storeSummary.storeId);
              const storeName = storeSummary.lines[0]?.storeName ?? store?.name ?? "Store";
              return (
                <View key={storeSummary.storeId} style={styles.storeSection}>
                  <View style={styles.storeHeadingRow}>
                    <Text style={styles.storeHeading}>{storeName}</Text>
                    <Pressable accessibilityLabel={`Remove all items from ${storeName}`} accessibilityRole="button" onPress={() => removeStore(storeSummary.storeId)} style={styles.removeStoreButton}>
                      <Icon color={darkColors.primary} name="trash" size={spacing.sm} />
                      <Text style={styles.removeStoreLabel}>Remove store</Text>
                    </Pressable>
                  </View>
                  <View style={styles.storeItems}>
                    {storeSummary.lines.map((line) => (
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
                      <Text style={styles.storeSubtotal}>{formatNaira(storeSummary.subtotalKobo)}</Text>
                    </View>
                    <StoreEligibility summary={storeSummary} />
                    {!storeSummary.eligible ? (
                      <StoreSuggestions
                        currentLines={storeSummary.lines}
                        storeId={storeSummary.storeId}
                        onAdd={(product) => useCartStore.getState().addItem({
                          productId: product.id,
                          storeId: storeSummary.storeId,
                          storeName,
                          name: product.name,
                          description: product.description,
                          unitPriceKobo: product.priceKobo,
                          image: product.image,
                        })}
                      />
                    ) : null}
                  </View>
                </View>
              );
            })}
          </RefreshableScrollView>

          <View style={styles.summary}>
            <SummaryRow label="Subtotal" value={formatNaira(subtotalKobo)} />
            <SummaryRow label="Estimated delivery" value={formatNaira(deliveryFeeKobo)} />
            {!eligibility.eligible ? (
              <Text accessibilityRole="alert" style={styles.minimumMessage}>
                Each supermarket must reach {formatNaira(minimumStoreSubtotalKobo)} before checkout. Still needed: {eligibility.belowMinimum.map((storeSummary) => {
                  const name = storeSummary.lines[0]?.storeName ?? getStoreById(storeSummary.storeId)?.name ?? "Store";
                  return `${name} ${formatNaira(storeSummary.amountRemainingKobo)}`;
                }).join(", ")}.
              </Text>
            ) : null}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatNaira(subtotalKobo + deliveryFeeKobo)}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !eligibility.eligible }} disabled={!eligibility.eligible} onPress={() => router.push("/(customer)/checkout")} style={({ pressed }) => [styles.checkoutButton, pressed && styles.pressed, !eligibility.eligible && styles.checkoutDisabled]}>
              <Text style={styles.checkoutLabel}>Proceed to Checkout</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <RefreshableScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.emptyState}>
            <Icon color={darkColors.primary} name="cart" size={spacing.xxl} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyCopy}>Explore stores and add products to your cart.</Text>
            <Pressable onPress={() => router.replace("/(customer)/(tabs)/explore")} style={styles.exploreButton}>
              <Text style={styles.checkoutLabel}>Explore stores</Text>
            </Pressable>
          </View>
        </RefreshableScrollView>
      )}
    </SafeAreaView>
  );
}

function StoreEligibility({ summary }: { summary: StoreCartSummary }) {
  const progress = Math.min(1, summary.subtotalKobo / minimumStoreSubtotalKobo);
  return (
    <View style={styles.eligibility}>
      <View style={styles.minimumLabels}>
        <Text style={styles.minimumLabel}>Minimum order: {formatNaira(minimumStoreSubtotalKobo)}</Text>
        {summary.eligible ? (
          <Text style={styles.eligibleLabel}>Minimum reached</Text>
        ) : (
          <Text style={styles.pendingLabel}>Add {formatNaira(summary.amountRemainingKobo)} to qualify</Text>
        )}
      </View>
      <View accessibilityLabel={`Minimum order progress: ${Math.round(progress * 100)} percent`} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }, summary.eligible && styles.progressComplete]} />
      </View>
    </View>
  );
}

function StoreSuggestions({ currentLines, storeId, onAdd }: {
  currentLines: CartLine[];
  storeId: string;
  onAdd: (product: StoreProduct) => void;
}) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchStoreProducts(storeId)
      .then((remoteProducts) => {
        if (!active) return;
        setProducts(remoteProducts ?? getStoreById(storeId)?.products ?? []);
      })
      .catch(() => {
        if (active) setProducts(getStoreById(storeId)?.products ?? []);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setLoaded(true);
        }
      });
    return () => { active = false; };
  }, [storeId]);

  const inCart = new Set(currentLines.map((line) => line.productId));
  const suggestions = products.filter((product) => !inCart.has(product.id)).slice(0, 3);

  return (
    <View style={styles.suggestions}>
      <Text style={styles.suggestionsTitle}>Add more from this store</Text>
      {loading ? <ActivityIndicator color={darkColors.primary} size="small" /> : null}
      {!loading && loaded && suggestions.length ? suggestions.map((product) => (
        <View key={product.id} style={styles.suggestionRow}>
          <Image resizeMode="cover" source={product.image} style={styles.suggestionImage} />
          <View style={styles.suggestionInfo}>
            <Text numberOfLines={1} style={styles.suggestionName}>{product.name}</Text>
            <Text style={styles.suggestionPrice}>{formatNaira(product.priceKobo)}</Text>
          </View>
          <Pressable accessibilityLabel={`Add ${product.name} from this store`} accessibilityRole="button" onPress={() => onAdd(product)} style={({ pressed }) => [styles.suggestionAdd, pressed && styles.pressed]}>
            <Text style={styles.suggestionAddText}>Add</Text>
          </Pressable>
        </View>
      )) : null}
      {!loading && loaded && suggestions.length === 0 ? (
        <Text style={styles.noSuggestions}>No more products are available from this store right now.</Text>
      ) : null}
    </View>
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
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  header: { height: spacing.cartHeaderHeight, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeButton: { width: spacing.cartCloseSize, height: spacing.cartCloseSize, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  list: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.lg, gap: spacing.md },
  storeSection: { gap: spacing.xxs },
  storeHeadingRow: { minHeight: spacing.cartStoreHeaderHeight, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  storeHeading: { ...typography.homeCaption, color: darkColors.mutedText },
  removeStoreButton: { minHeight: spacing.xl, paddingHorizontal: spacing.xs, flexDirection: "row", alignItems: "center", gap: spacing.xxs },
  removeStoreLabel: { ...typography.homeCaption, color: darkColors.primary },
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
  eligibility: { paddingHorizontal: spacing.xxs, gap: spacing.xs },
  minimumLabels: { gap: spacing.xxs },
  minimumLabel: { ...typography.homeCaption, color: darkColors.mutedText },
  pendingLabel: { ...typography.storeCaption, color: darkColors.primary },
  eligibleLabel: { ...typography.storeCaption, color: darkColors.success },
  progressTrack: { height: spacing.progressTrackHeight, overflow: "hidden", borderRadius: radius.progress, backgroundColor: darkColors.border },
  progressFill: { height: "100%", borderRadius: radius.progress, backgroundColor: darkColors.primary },
  progressComplete: { backgroundColor: darkColors.success },
  suggestions: { marginTop: spacing.xxs, padding: spacing.xs, gap: spacing.xs, borderRadius: radius.sm, backgroundColor: darkColors.surface },
  suggestionsTitle: { ...typography.homeCaption, color: darkColors.mutedText },
  suggestionRow: { minHeight: spacing.cartItemImageSize, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  suggestionImage: { width: spacing.cartItemImageSize, height: spacing.cartItemImageSize, borderRadius: radius.sm },
  suggestionInfo: { flex: 1 },
  suggestionName: { ...typography.storeCaption, color: darkColors.white },
  suggestionPrice: { ...typography.homeCaption, color: darkColors.mutedText },
  suggestionAdd: { minHeight: spacing.xl, minWidth: spacing.xxl, paddingHorizontal: spacing.sm, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, backgroundColor: darkColors.primary },
  suggestionAddText: { ...typography.homeCaption, color: darkColors.white },
  noSuggestions: { ...typography.homeCaption, color: darkColors.mutedText },
  summary: { padding: spacing.cartSummaryPadding, gap: spacing.xs, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, backgroundColor: darkColors.inputSurface },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryText: { ...typography.storeBody, color: darkColors.white },
  totalRow: { paddingTop: spacing.xs, flexDirection: "row", justifyContent: "space-between", borderTopWidth: spacing.progressDotSize / 3, borderStyle: "dotted", borderColor: darkColors.border },
  totalLabel: { ...typography.storeBody, color: darkColors.white, fontFamily: "Poppins_700Bold", fontWeight: "700" },
  totalValue: { ...typography.storeBody, color: darkColors.white, fontFamily: "Poppins_500Medium", fontWeight: "500" },
  checkoutButton: { minHeight: spacing.buttonHeight, marginTop: spacing.xxs, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  checkoutDisabled: { opacity: 0.45 },
  minimumMessage: { ...typography.homeCaption, color: darkColors.peach },
  checkoutLabel: { ...typography.button, color: darkColors.white },
  pressed: { opacity: 0.8 },
  emptyState: { flex: 1, padding: spacing.xl, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  emptyTitle: { ...typography.storeTitle, color: darkColors.white },
  emptyCopy: { ...typography.storeBody, color: darkColors.mutedText, textAlign: "center" },
  exploreButton: { minHeight: spacing.buttonHeight, marginTop: spacing.sm, paddingHorizontal: spacing.xl, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
});
