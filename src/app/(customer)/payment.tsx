import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon, type IconName } from "../../components/ui/Icon";
import { darkColors, radius, spacing, typography } from "../../theme";

type PaymentMethod = "card" | "transfer" | "cash";

const methodInfo: Record<PaymentMethod, { title: string; icon: IconName; message: string; detail: string }> = {
  card: {
    title: "Credit/Debit Card",
    icon: "card",
    message: "Secure card payment",
    detail: "Card details and any bank OTP must be handled by the payment provider's secure checkout. Go-Shopper does not collect or store your card number or CVV.",
  },
  transfer: {
    title: "Bank Transfer",
    icon: "bank",
    message: "Bank transfer",
    detail: "A dedicated account number, account name, and transfer expiry will appear here after the server creates a payment request.",
  },
  cash: {
    title: "Cash on Delivery",
    icon: "cash",
    message: "Cash on Delivery",
    detail: "Your order must be created by the server before it can be confirmed. That service is not connected yet.",
  },
};

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ method?: string; amountKobo?: string }>();
  const method = isPaymentMethod(params.method) ? params.method : null;
  const amountKobo = Number(params.amountKobo);
  const info = method ? methodInfo[method] : null;
  const formattedAmount = Number.isSafeInteger(amountKobo) && amountKobo >= 0
    ? formatNaira(amountKobo)
    : "—";

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to checkout" onPress={() => router.back()} style={styles.backButton}>
          <Icon color={darkColors.white} name="back" size={spacing.lg} />
        </Pressable>

        <Text style={styles.title}>{info?.title ?? "Payment"}</Text>
        <View style={styles.amountCard}>
          <Text style={styles.muted}>Amount to pay</Text>
          <Text style={styles.amount}>{formattedAmount}</Text>
        </View>

        <View style={styles.providerCard}>
          <View style={styles.iconCircle}>
            <Icon color={darkColors.primary} name={info?.icon ?? "card"} size={spacing.xl} />
          </View>
          <Text style={styles.cardTitle}>{info?.message ?? "Payment method required"}</Text>
          <Text style={styles.description}>{info?.detail ?? "Return to checkout and choose a payment method."}</Text>
        </View>

        <View accessibilityRole="alert" style={styles.notice}>
          <Text style={styles.noticeTitle}>Payment setup is not connected</Text>
          <Text style={styles.noticeCopy}>
            The app has no payment initialization API yet. Checkout must first validate current prices, stock, and the multi-store threshold on the server. Until a provider confirms payment, this order is not placed.
          </Text>
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.replace("/(customer)/checkout")} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonLabel}>Return to Checkout</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function isPaymentMethod(value: string | undefined): value is PaymentMethod {
  return value === "card" || value === "transfer" || value === "cash";
}

function formatNaira(amountKobo: number) {
  return `₦${(amountKobo / 100).toLocaleString("en-NG")}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  page: { flexGrow: 1, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  backButton: { width: spacing.xl, height: spacing.xl, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  title: { ...typography.orderTitle, marginTop: spacing.lg, color: darkColors.white, textAlign: "center" },
  amountCard: { marginTop: spacing.xl, padding: spacing.md, alignItems: "center", borderRadius: radius.lg, backgroundColor: darkColors.inputSurface },
  muted: { ...typography.storeBody, color: darkColors.mutedText },
  amount: { ...typography.orderTitle, marginTop: spacing.xxs, color: darkColors.white },
  providerCard: { marginTop: spacing.lg, padding: spacing.lg, alignItems: "center", borderRadius: radius.lg, backgroundColor: darkColors.storeSurface },
  iconCircle: { width: spacing.xxl, height: spacing.xxl, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.background },
  cardTitle: { ...typography.storeSection, marginTop: spacing.md, color: darkColors.white, textAlign: "center" },
  description: { ...typography.storeBody, marginTop: spacing.sm, color: darkColors.mutedText, textAlign: "center" },
  notice: { marginTop: spacing.lg, padding: spacing.md, borderWidth: 1, borderColor: darkColors.warning, borderRadius: radius.md, backgroundColor: darkColors.warningSurface },
  noticeTitle: { ...typography.storeBody, color: darkColors.white },
  noticeCopy: { ...typography.storeCaption, marginTop: spacing.xs, color: darkColors.white },
  button: { minHeight: spacing.buttonHeight, marginTop: "auto", alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  buttonLabel: { ...typography.button, color: darkColors.white },
  pressed: { opacity: 0.8 },
});
