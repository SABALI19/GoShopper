import type { ReactNode } from "react";
import { Text, View, StyleSheet } from "react-native";
import { GoShopperBag } from "../GoShopperBag";
import { darkColors, radius, shadows, spacing, typography } from "../../theme";

export function CustomerBrandHeader({ action }: { action?: ReactNode }) {
  return (
    <View accessibilityRole="header" style={styles.shell}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <GoShopperBag size={spacing.xl} />
          <Text style={styles.name}>Go<Text style={styles.hyphen}>-</Text>Shopper</Text>
        </View>
        {action ?? <View style={styles.actionSpace} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: darkColors.brandHeaderBorder,
    backgroundColor: darkColors.brandHeaderSurface,
    ...shadows.card,
  },
  header: {
    minHeight: spacing.xxl,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  name: { ...typography.homeBrand, color: darkColors.white },
  hyphen: { color: darkColors.primary },
  actionSpace: { width: spacing.xl, height: spacing.xl },
});
