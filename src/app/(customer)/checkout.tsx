import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useUser } from "@clerk/expo";
import { Poppins_400Regular, Poppins_500Medium, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon, type IconName } from "../../components/ui/Icon";
import { checkoutCouponDiscountKobo, estimatedDeliveryFeeKobo } from "../../features/cart/pricing";
import { useCartStore } from "../../features/cart/store";
import { darkColors, radius, spacing, typography } from "../../theme";

type PaymentMethod = "card" | "transfer" | "cash";

const paymentMethods: { id: PaymentMethod; label: string; subtitle?: string; icon: IconName }[] = [
  { id: "card", label: "Credit/Debit Card", icon: "card" },
  { id: "transfer", label: "Bank Transfer", icon: "bank" },
  { id: "cash", label: "Cash on Delivery", subtitle: "Pay upon receiving your order", icon: "cash" },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useUser();
  const lines = useCartStore((state) => state.lines);
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(user?.primaryPhoneNumber?.phoneNumber ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState("");
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_700Bold });

  const subtotalKobo = lines.reduce((sum, line) => sum + line.unitPriceKobo * line.quantity, 0);
  const deliveryFeeKobo = lines.length ? estimatedDeliveryFeeKobo : 0;
  const couponDiscountKobo = lines.length ? Math.min(checkoutCouponDiscountKobo, subtotalKobo) : 0;
  const totalKobo = Math.max(0, subtotalKobo + deliveryFeeKobo - couponDiscountKobo);

  if (!fontsLoaded) return null;

  const placeOrder = () => {
    if (!lines.length) {
      setError("Add items to your cart before placing an order.");
      return;
    }
    if (!fullName.trim() || !address.trim() || !phone.trim() || !paymentMethod) {
      setError("Complete your delivery details and select a payment method.");
      return;
    }
    setError("");
    router.push({
      pathname: "/(customer)/payment",
      params: { method: paymentMethod, amountKobo: String(totalKobo) },
    });
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardLayout}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
        <View style={styles.paymentOptions}>
          {paymentMethods.map((method) => {
            const selected = paymentMethod === method.id;
            return (
              <Pressable key={method.id} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setPaymentMethod(method.id)} style={styles.paymentOption}>
                <Icon color={darkColors.primary} name={method.icon} size={spacing.md} />
                <View style={styles.paymentCopy}>
                  <Text style={styles.paymentLabel}>{method.label}</Text>
                  {method.subtitle ? <Text style={styles.paymentSubtitle}>{method.subtitle}</Text> : null}
                </View>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, styles.summaryHeading]}>Order Summary</Text>
        <View style={styles.summaryCard}>
          {lines.length ? lines.map((line) => (
            <View key={`${line.storeId}-${line.productId}`} style={styles.summaryItem}>
              <Image source={line.image} style={styles.summaryImage} />
              <View style={styles.summaryItemCopy}>
                <Text numberOfLines={1} style={styles.summaryItemName}>{line.name}</Text>
                <Text style={styles.summaryItemDescription}>{line.description ?? `Qty ${line.quantity}`}</Text>
              </View>
              <Text style={styles.summaryItemPrice}>{formatNaira(line.unitPriceKobo * line.quantity)}</Text>
            </View>
          )) : (
            <View style={styles.emptySummaryCard}>
              <Text style={styles.emptySummary}>Your cart is empty.</Text>
            </View>
          )}
          <View style={styles.summaryTotals}>
            <View style={styles.summaryDivider} />
            <SummaryRow label="Subtotal" value={formatNaira(subtotalKobo)} />
            <SummaryRow label="Delivery Fee" value={formatNaira(deliveryFeeKobo)} />
            <SummaryRow label="Coupon Discount" value={`− ${formatNaira(couponDiscountKobo)}`} accent />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>{formatNaira(totalKobo)}</Text>
            </View>
          </View>
        </View>

      </ScrollView>
      <View style={styles.footer}>
        {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
        <Pressable accessibilityRole="button" onPress={placeOrder} style={({ pressed }) => [styles.placeOrderButton, pressed && styles.pressed]}>
          <Text style={styles.placeOrderLabel}>Place Order</Text>
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, accent && styles.accentValue]}>{value}</Text>
    </View>
  );
}

function formatNaira(amountKobo: number) {
  return `₦${(amountKobo / 100).toLocaleString("en-NG")}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  keyboardLayout: { flex: 1 },
  page: { paddingHorizontal: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.lg },
  footer: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.xs, backgroundColor: darkColors.background },
  sectionTitle: { ...typography.storeSection, color: darkColors.white },
  addressFields: { marginTop: spacing.md, gap: spacing.checkoutFieldGap },
  field: { gap: spacing.xs },
  fieldLabel: { ...typography.storeBody, color: darkColors.mutedText },
  input: { ...typography.input, minHeight: spacing.loginFieldHeight, paddingHorizontal: spacing.md, borderWidth: spacing.progressDotSize / 4, borderColor: darkColors.inputBorder, borderRadius: radius.input, backgroundColor: darkColors.inputSurface, color: darkColors.white },
  addressInput: { height: spacing.checkoutAddressHeight, paddingTop: spacing.sm },
  paymentHeading: { marginTop: spacing.checkoutSectionTop, marginBottom: spacing.md },
  paymentOptions: { gap: spacing.xxs },
  paymentOption: { minHeight: spacing.checkoutPaymentRowHeight, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.sm, backgroundColor: darkColors.inputSurface },
  paymentCopy: { flex: 1 },
  paymentLabel: { ...typography.storeBody, color: darkColors.white },
  paymentSubtitle: { ...typography.storeCaption, color: darkColors.mutedText },
  radio: { width: spacing.checkoutRadioSize, height: spacing.checkoutRadioSize, alignItems: "center", justifyContent: "center", borderWidth: spacing.progressDotSize / 3, borderColor: darkColors.inputBorder, borderRadius: radius.round, backgroundColor: darkColors.white },
  radioSelected: { borderColor: darkColors.primary },
  radioDot: { width: spacing.sm, height: spacing.sm, borderRadius: radius.round, backgroundColor: darkColors.primary },
  summaryHeading: { marginTop: spacing.checkoutSectionTop, marginBottom: spacing.md },
  summaryCard: { gap: spacing.checkoutCardGap },
  summaryItem: { minHeight: spacing.checkoutOrderImageSize + spacing.xs, padding: spacing.xs, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.sm, backgroundColor: darkColors.storeSurface },
  summaryImage: { width: spacing.checkoutOrderImageSize, height: spacing.checkoutOrderImageSize, borderRadius: radius.sm },
  summaryItemCopy: { flex: 1 },
  summaryItemName: { ...typography.storeBody, color: darkColors.white },
  summaryItemDescription: { ...typography.storeCaption, color: darkColors.mutedText },
  summaryItemPrice: { ...typography.storeBody, color: darkColors.white },
  summaryTotals: { padding: spacing.sm, borderRadius: radius.sm, backgroundColor: darkColors.inputSurface },
  emptySummaryCard: { padding: spacing.sm, borderRadius: radius.sm, backgroundColor: darkColors.storeSurface },
  emptySummary: { ...typography.storeCaption, color: darkColors.mutedText },
  summaryDivider: { height: spacing.progressDotSize / 4, marginVertical: spacing.sm, borderStyle: "dotted", borderTopWidth: spacing.progressDotSize / 3, borderColor: darkColors.white },
  summaryRow: { minHeight: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  summaryLabel: { ...typography.storeBody, color: darkColors.white },
  summaryValue: { ...typography.storeBody, color: darkColors.white },
  accentValue: { color: darkColors.primary },
  totalRow: { minHeight: spacing.xl, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  totalLabel: { ...typography.storeSection, color: darkColors.white },
  totalAmount: { ...typography.storeSection, color: darkColors.primary },
  errorText: { ...typography.storeCaption, marginTop: spacing.sm, color: darkColors.error },
  placeOrderButton: { minHeight: spacing.buttonHeight, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  placeOrderLabel: { ...typography.button, color: darkColors.white },
  pressed: { opacity: 0.8 },
});
