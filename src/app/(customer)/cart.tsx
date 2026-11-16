import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "../../components/ui/Icon";
import { RefreshableScrollView } from "../../components/ui/RefreshableScrollView";
import { useAuth } from "../../features/auth/AuthProvider";
import { useCartStore } from "../../features/cart/store";
import { getStoreCartSummaries } from "../../features/cart/eligibility";
import { estimatedDeliveryFeeKobo } from "../../features/cart/pricing";
import { getStoreById } from "../../features/stores/data";
import { requestCheckoutQuote, type CheckoutItemInput } from "../../features/orders/api";
import { darkColors, radius, spacing, typography } from "../../theme";

export default function CartScreen() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const lines = useCartStore((state) => state.lines);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const removeStore = useCartStore((state) => state.removeStore);
  const stores = getStoreCartSummaries(lines);
  const subtotalKobo = lines.reduce((sum, line) => sum + line.unitPriceKobo * line.quantity, 0);
  const deliveryFeeKobo = lines.length ? estimatedDeliveryFeeKobo : 0;
  const requestItems = useMemo<CheckoutItemInput[]>(() => lines.map(({ storeId, productId, quantity }) => ({ storeId, productId, quantity })), [lines]);
  const quoteQuery = useQuery({
    queryKey: ["checkout-quote", requestItems],
    enabled: lines.length > 0 && isLoaded && isSignedIn,
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in to verify your cart before checkout.");
      return requestCheckoutQuote(token, requestItems);
    },
    retry: 1,
  });
  const quote = quoteQuery.data;
  const quoteLoading = lines.length > 0 && (!isLoaded || quoteQuery.isFetching);
  const quoteError = quoteQuery.error instanceof Error
    ? quoteQuery.error.message
    : lines.length > 0 && isLoaded && !isSignedIn
      ? "Sign in to verify your cart before checkout."
      : "";

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
            {stores.map((storeSummary) => {
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
                  </View>
                </View>
              );
            })}
          </RefreshableScrollView>

          <View style={styles.summary}>
            <SummaryRow label="Subtotal" value={formatNaira(quote?.merchandiseSubtotalKobo ?? subtotalKobo)} />
            <SummaryRow label="Estimated delivery" value={formatNaira(deliveryFeeKobo)} />
            {quote?.isMultiStore ? <View style={styles.eligibility}>
              <View style={styles.minimumLabels}><Text style={styles.minimumLabel}>Multi-store minimum: {formatNaira(quote.multiStoreMinimumKobo)}</Text></View>
              <View accessibilityLabel={`Multi-store checkout progress: ${Math.round(Math.min(1, quote.merchandiseSubtotalKobo / quote.multiStoreMinimumKobo) * 100)} percent`} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(1, quote.merchandiseSubtotalKobo / quote.multiStoreMinimumKobo) * 100) }} style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(1, quote.merchandiseSubtotalKobo / quote.multiStoreMinimumKobo) * 100}%` }, quote.isEligible && styles.progressComplete]} />
              </View>
              {!quote.isEligible ? <Text accessibilityRole="alert" style={styles.minimumMessage}>Add {formatNaira(quote.amountRemainingKobo)} more to order from multiple stores.</Text> : null}
            </View> : null}
            {quoteLoading ? <Text style={styles.minimumLabel}>Checking live prices…</Text> : null}
            {quoteError ? <Text accessibilityRole="alert" style={styles.minimumMessage}>{quoteError}</Text> : null}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatNaira(subtotalKobo + deliveryFeeKobo)}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !quote?.isEligible }} disabled={!quote?.isEligible || quoteLoading} onPress={() => router.push("/(customer)/checkout")} style={({ pressed }) => [styles.checkoutButton, pressed && styles.pressed, (!quote?.isEligible || quoteLoading) && styles.checkoutDisabled]}>
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
