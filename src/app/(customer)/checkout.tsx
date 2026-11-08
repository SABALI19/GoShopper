import { useAuth, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon, type IconName } from "../../components/ui/Icon";
import { RefreshableScrollView } from "../../components/ui/RefreshableScrollView";
import { apiBaseUrl } from "../../features/api/client";
import { useCartStore } from "../../features/cart/store";
import {
  createCustomerOrder,
  getCheckoutIssues,
  getOrderErrorMessage,
  requestCheckoutQuote,
  type CheckoutItemInput,
  type CheckoutQuote,
} from "../../features/orders/api";
import { clearOrderAttemptKey, getOrderAttemptKey } from "../../features/orders/idempotency";
import { darkColors, radius, spacing, typography } from "../../theme";

const paymentMethods: { label: string; icon: IconName }[] = [
  { label: "Credit/Debit Card", icon: "card" },
  { label: "Bank Transfer", icon: "bank" },
  { label: "Cash on Delivery", icon: "cash" },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const lines = useCartStore((state) => state.lines);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const clearCart = useCartStore((state) => state.clearCart);
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(user?.primaryPhoneNumber?.phoneNumber ?? "");
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<{ storeId?: string; productId?: string; message: string }[]>([]);
  const submitLock = useRef(false);
  const requestItems = useMemo<CheckoutItemInput[]>(() => lines.map(({ storeId, productId, quantity }) => ({
    storeId,
    productId,
    quantity,
  })), [lines]);

  const refreshQuote = useCallback(async () => {
    setIssues([]);
    if (!requestItems.length) {
      setQuote(null);
      setError("");
      return;
    }
    if (!isLoaded) return;
    if (!isSignedIn) {
      setQuote(null);
      setError("Sign in to verify your cart and continue to checkout.");
      return;
    }
    if (!apiBaseUrl) {
      setQuote(null);
      setError("The Go-Shopper API URL is not configured for this app build.");
      return;
    }

    setQuoteLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session could not be verified. Sign in again, then retry.");
      const freshQuote = await requestCheckoutQuote(token, requestItems);
      setQuote(freshQuote);
    } catch (requestError) {
      setQuote(null);
      setError(getOrderErrorMessage(requestError));
      setIssues(getCheckoutIssues(requestError));
    } finally {
      setQuoteLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, requestItems]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void refreshQuote(); });
    return () => { active = false; };
  }, [refreshQuote]);

  const placeOrder = async () => {
    if (submitLock.current) return;
    if (!fullName.trim() || !address.trim() || !phone.trim()) {
      setError("Complete your delivery details before placing the order.");
      return;
    }
    if (!requestItems.length) {
      setError("Add items to your cart before placing an order.");
      return;
    }
    if (!isSignedIn) {
      setError("Sign in to continue to checkout.");
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    setError("");
    setIssues([]);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session could not be verified. Sign in again, then retry.");
      const request = {
        items: requestItems,
        delivery: { fullName: fullName.trim(), address: address.trim(), phone: phone.trim() },
      };
      const latestQuote = await requestCheckoutQuote(token, requestItems);
      if (!latestQuote.eligible) {
        setQuote(latestQuote);
        setError("Every supermarket must meet its minimum before this order can be placed. Review the store amounts below and update your cart.");
        return;
      }
      if (!quote || !sameQuotePrices(quote, latestQuote)) {
        setQuote(latestQuote);
        setError("Prices or fees changed. Review the verified total below, then tap Place Order again to confirm.");
        return;
      }

      const idempotencyKey = await getOrderAttemptKey(request);
      const result = await createCustomerOrder(token, request, idempotencyKey);
      try { await clearOrderAttemptKey(); } catch { /* A leftover key safely replays this same request. */ }
      clearCart();
      router.replace({ pathname: "/(customer)/payment", params: { orderId: result.order.orderNumber } });
    } catch (requestError) {
      setError(getOrderErrorMessage(requestError));
      setIssues(getCheckoutIssues(requestError));
      if (requestError && typeof requestError === "object" && "status" in requestError && requestError.status === 409) {
        await refreshQuote();
      }
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  if (!hasHydrated || !isLoaded) {
    return <ScreenState message="Loading your checkout…" loading />;
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardLayout}>
        <RefreshableScrollView refreshAction={refreshQuote} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addressFields}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput autoCapitalize="words" onChangeText={setFullName} placeholder="Enter Full Name" placeholderTextColor={darkColors.placeholder} style={styles.input} value={fullName} />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Delivery Address</Text>
              <TextInput multiline onChangeText={setAddress} placeholder="Enter Address" placeholderTextColor={darkColors.placeholder} style={[styles.input, styles.addressInput]} textAlignVertical="top" value={address} />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput keyboardType="phone-pad" onChangeText={setPhone} placeholder="Enter Phone Number" placeholderTextColor={darkColors.placeholder} style={styles.input} value={phone} />
            </View>
          </View>

          <Text style={[styles.sectionTitle, styles.paymentHeading]}>Payment Method</Text>
          <Text style={styles.comingSoon}>Payment options are coming soon. Orders created now remain pending payment.</Text>
          <View style={styles.paymentOptions}>
            {paymentMethods.map((method) => (
              <View key={method.label} accessibilityState={{ disabled: true }} style={[styles.paymentOption, styles.disabledOption]}>
                <Icon color={darkColors.primary} name={method.icon} size={spacing.md} />
                <View style={styles.paymentCopy}>
                  <Text style={styles.paymentLabel}>{method.label}</Text>
                  <Text style={styles.paymentSubtitle}>Coming soon</Text>
                </View>
                <View style={styles.radio} />
              </View>
            ))}
          </View>

          <Text style={[styles.sectionTitle, styles.summaryHeading]}>Verified Order Summary</Text>
          {!requestItems.length ? <Text style={styles.emptySummary}>Your cart is empty. Add items before checkout.</Text> : null}
          {quoteLoading && !quote ? <InlineState message="Checking live prices, stock and store minimums…" loading /> : null}
          {quote ? (
            <View style={styles.summaryCard}>
              {quote.stores.map((store) => (
                <View key={store.storeId} style={styles.storeQuote}>
                  <View style={styles.storeQuoteHeader}>
                    <Text style={styles.storeQuoteName}>{store.storeName}</Text>
                    <Text style={[styles.eligibility, store.eligible ? styles.eligible : styles.ineligible]}>{store.eligible ? "Eligible" : `Add ${formatNaira(store.amountRemainingKobo)}`}</Text>
                  </View>
                  <Text style={styles.minimumCopy}>Minimum {formatNaira(store.minimumOrderKobo)} merchandise subtotal</Text>
                  {store.items.map((item) => {
                    const cartLine = lines.find((line) => line.storeId === store.storeId && line.productId === item.productId);
                    return (
                      <View key={`${store.storeId}:${item.productId}`} style={styles.summaryItem}>
                        {cartLine ? <Image source={cartLine.image} style={styles.summaryImage} /> : <View style={styles.summaryImageFallback} />}
                        <View style={styles.summaryItemCopy}>
                          <Text numberOfLines={1} style={styles.summaryItemName}>{item.productName}</Text>
                          <Text style={styles.summaryItemDescription}>{item.quantity} × {formatNaira(item.unitPriceKobo)}</Text>
                        </View>
                        <Text style={styles.summaryItemPrice}>{formatNaira(item.lineTotalKobo)}</Text>
                      </View>
                    );
                  })}
                  <SummaryRow label="Store merchandise subtotal" value={formatNaira(store.merchandiseSubtotalKobo)} />
                </View>
              ))}
              <View style={styles.summaryTotals}>
                <View style={styles.summaryDivider} />
                <SummaryRow label="Merchandise subtotal" value={formatNaira(quote.merchandiseSubtotalKobo)} />
                <SummaryRow label="Delivery Fee" value={formatNaira(quote.deliveryFeeKobo)} />
                <SummaryRow label="Service Fee" value={formatNaira(quote.serviceFeeKobo)} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalAmount}>{formatNaira(quote.totalKobo)}</Text>
                </View>
              </View>
            </View>
          ) : null}
          {quote && !quote.eligible ? <View style={styles.errorCard}>
            <Text style={styles.errorText}>Some supermarket orders are below their merchandise minimum. Delivery and service fees do not count toward that minimum.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace("/(customer)/cart")} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Update Cart</Text></Pressable>
          </View> : null}
          {error ? <View accessibilityRole="alert" style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            {issues.map((issue, index) => <Text key={`${issue.storeId}:${issue.productId}:${index}`} style={styles.issueText}>{issue.message}</Text>)}
            {requestItems.length ? <Pressable accessibilityRole="button" onPress={() => router.replace("/(customer)/cart")} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Review Cart</Text></Pressable> : null}
          </View> : null}
        </RefreshableScrollView>
        <View style={styles.footer}>
          <Pressable accessibilityRole="button" disabled={!quote?.eligible || quoteLoading || submitting || !apiBaseUrl} onPress={() => void placeOrder()} style={({ pressed }) => [styles.placeOrderButton, pressed && styles.pressed, (!quote?.eligible || quoteLoading || submitting || !apiBaseUrl) && styles.disabledButton]}>
            {submitting ? <ActivityIndicator color={darkColors.white} /> : <Text style={styles.placeOrderLabel}>{quoteLoading ? "Refreshing Quote…" : "Place Order"}</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ScreenState({ message, loading }: { message: string; loading?: boolean }) {
  return <SafeAreaView edges={["top", "bottom"]} style={styles.screen}><StatusBar style="light" /><View style={styles.loadingState}>{loading ? <ActivityIndicator color={darkColors.primary} /> : null}<Text style={styles.loadingText}>{message}</Text></View></SafeAreaView>;
}

function InlineState({ message, loading }: { message: string; loading?: boolean }) {
  return <View style={styles.inlineState}>{loading ? <ActivityIndicator color={darkColors.primary} /> : null}<Text style={styles.loadingText}>{message}</Text></View>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>;
}

function sameQuotePrices(left: CheckoutQuote, right: CheckoutQuote) {
  const shape = (quote: CheckoutQuote) => JSON.stringify({
    stores: quote.stores.map((store) => ({
      storeId: store.storeId,
      merchandiseSubtotalKobo: store.merchandiseSubtotalKobo,
      minimumOrderKobo: store.minimumOrderKobo,
      eligible: store.eligible,
      items: store.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPriceKobo: item.unitPriceKobo, lineTotalKobo: item.lineTotalKobo })),
    })),
    deliveryFeeKobo: quote.deliveryFeeKobo,
    serviceFeeKobo: quote.serviceFeeKobo,
    totalKobo: quote.totalKobo,
  });
  return shape(left) === shape(right);
}

function formatNaira(amountKobo: number) {
  return `₦${(amountKobo / 100).toLocaleString("en-NG")}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  keyboardLayout: { flex: 1 },
  loadingState: { flex: 1, padding: spacing.lg, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  loadingText: { ...typography.storeBody, color: darkColors.mutedText, textAlign: "center" },
  inlineState: { padding: spacing.lg, alignItems: "center", gap: spacing.sm },
  page: { paddingHorizontal: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.lg },
  footer: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.xs, backgroundColor: darkColors.background },
  sectionTitle: { ...typography.storeSection, color: darkColors.white },
  addressFields: { marginTop: spacing.md, gap: spacing.checkoutFieldGap },
  field: { gap: spacing.xs },
  fieldLabel: { ...typography.storeBody, color: darkColors.mutedText },
  input: { ...typography.input, minHeight: spacing.loginFieldHeight, paddingHorizontal: spacing.md, borderWidth: spacing.progressDotSize / 4, borderColor: darkColors.inputBorder, borderRadius: radius.input, backgroundColor: darkColors.inputSurface, color: darkColors.white },
  addressInput: { height: spacing.checkoutAddressHeight, paddingTop: spacing.sm },
  paymentHeading: { marginTop: spacing.checkoutSectionTop, marginBottom: spacing.xs },
  comingSoon: { ...typography.storeCaption, marginBottom: spacing.sm, color: darkColors.warning },
  paymentOptions: { gap: spacing.xxs },
  paymentOption: { minHeight: spacing.checkoutPaymentRowHeight, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.sm, backgroundColor: darkColors.inputSurface },
  disabledOption: { opacity: 0.72 },
  paymentCopy: { flex: 1 },
  paymentLabel: { ...typography.storeBody, color: darkColors.white },
  paymentSubtitle: { ...typography.storeCaption, color: darkColors.mutedText },
  radio: { width: spacing.checkoutRadioSize, height: spacing.checkoutRadioSize, borderWidth: spacing.progressDotSize / 3, borderColor: darkColors.inputBorder, borderRadius: radius.round, backgroundColor: darkColors.white },
  summaryHeading: { marginTop: spacing.checkoutSectionTop, marginBottom: spacing.md },
  summaryCard: { gap: spacing.checkoutCardGap },
  storeQuote: { gap: spacing.xs, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: darkColors.storeSurface },
  storeQuoteHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs },
  storeQuoteName: { ...typography.storeBody, flex: 1, color: darkColors.white },
  eligibility: { ...typography.storeCaption, fontFamily: "Poppins_700Bold", fontWeight: "700" },
  eligible: { color: darkColors.success },
  ineligible: { color: darkColors.warning },
  minimumCopy: { ...typography.storeCaption, color: darkColors.mutedText },
  summaryItem: { minHeight: spacing.checkoutOrderImageSize + spacing.xs, padding: spacing.xs, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.sm, backgroundColor: darkColors.storeCard },
  summaryImage: { width: spacing.checkoutOrderImageSize, height: spacing.checkoutOrderImageSize, borderRadius: radius.sm },
  summaryImageFallback: { width: spacing.checkoutOrderImageSize, height: spacing.checkoutOrderImageSize, borderRadius: radius.sm, backgroundColor: darkColors.inputSurface },
  summaryItemCopy: { flex: 1 },
  summaryItemName: { ...typography.storeBody, color: darkColors.white },
  summaryItemDescription: { ...typography.storeCaption, color: darkColors.mutedText },
  summaryItemPrice: { ...typography.storeBody, color: darkColors.white },
  summaryTotals: { padding: spacing.sm, borderRadius: radius.sm, backgroundColor: darkColors.inputSurface },
  emptySummary: { ...typography.storeCaption, padding: spacing.md, color: darkColors.mutedText },
  summaryDivider: { height: spacing.progressDotSize / 4, marginVertical: spacing.sm, borderStyle: "dotted", borderTopWidth: spacing.progressDotSize / 3, borderColor: darkColors.white },
  summaryRow: { minHeight: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  summaryLabel: { ...typography.storeBody, color: darkColors.white },
  summaryValue: { ...typography.storeBody, color: darkColors.white },
  totalRow: { minHeight: spacing.xl, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  totalLabel: { ...typography.storeSection, color: darkColors.white },
  totalAmount: { ...typography.storeSection, color: darkColors.primary },
  errorCard: { marginTop: spacing.md, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: darkColors.errorSurface },
  errorText: { ...typography.storeCaption, color: darkColors.error },
  issueText: { ...typography.storeCaption, marginTop: spacing.xs, color: darkColors.white },
  secondaryButton: { minHeight: spacing.buttonHeight, marginTop: spacing.sm, alignItems: "center", justifyContent: "center", borderRadius: radius.round, borderWidth: 1, borderColor: darkColors.primary },
  secondaryButtonText: { ...typography.button, color: darkColors.primary },
  placeOrderButton: { minHeight: spacing.buttonHeight, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  placeOrderLabel: { ...typography.button, color: darkColors.white },
  disabledButton: { opacity: 0.55 },
  pressed: { opacity: 0.8 },
});
