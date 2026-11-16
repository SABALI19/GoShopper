import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { darkColors, radius, spacing, typography } from "../../../theme";

export default function RiderEarningsScreen() {
  return <SafeAreaView edges={["top"]} style={styles.screen}><View style={styles.card}><Text style={styles.title}>Earnings</Text><Text style={styles.copy}>Earnings will appear when the payout ledger is available. No estimates are shown.</Text></View></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, padding: spacing.md, backgroundColor: darkColors.background }, card: { padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.storeSurface }, title: { ...typography.storeSection, color: darkColors.white }, copy: { ...typography.storeBody, marginTop: spacing.xs, color: darkColors.mutedText } });
