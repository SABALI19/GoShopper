import { Pressable, StyleSheet, Text, View } from "react-native";
import { darkColors, radius, spacing, typography } from "../../theme";

export type MenuItem = { label: string; onPress: () => void };
export function MoreMenu({ items, onSignOut, signingOut = false }: { items: MenuItem[]; onSignOut: () => void; signingOut?: boolean }) {
  return <View style={styles.card}>
    {items.map((item) => <Pressable key={item.label} accessibilityRole="button" onPress={item.onPress} style={styles.row}><Text style={styles.label}>{item.label}</Text><Text style={styles.chevron}>›</Text></Pressable>)}
    <Pressable accessibilityRole="button" disabled={signingOut} onPress={onSignOut} style={[styles.row, styles.signOut]}><Text style={styles.signOutText}>{signingOut ? "Signing out…" : "Sign out"}</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  card: { overflow: "hidden", borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  row: { minHeight: spacing.xxl, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: darkColors.border },
  label: { ...typography.storeBody, color: darkColors.white },
  chevron: { ...typography.storeSection, color: darkColors.mutedText },
  signOut: { borderBottomWidth: 0 },
  signOutText: { ...typography.storeBody, color: darkColors.warning },
});
