import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { darkColors, radius, spacing, typography } from "../../../theme";

export default function SupermarketProductsScreen() {
  return <SafeAreaView edges={["top"]} style={styles.screen}><View style={styles.card}><Text style={styles.title}>Products</Text><Text style={styles.copy}>Your product catalog and inventory tools are coming in Phase 2.</Text></View></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, padding: spacing.md, backgroundColor: darkColors.background }, card: { padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.storeSurface }, title: { ...typography.storeSection, color: darkColors.white }, copy: { ...typography.storeBody, marginTop: spacing.xs, color: darkColors.mutedText } });
