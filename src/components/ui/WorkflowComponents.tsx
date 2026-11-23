import type { ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { darkColors, radius, spacing, typography } from "../../theme";

export function SectionCard({ children, title, action, style }: { children: ReactNode; title?: string; action?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.sectionCard, style]}>{title || action ? <View style={styles.sectionHeading}>{title ? <Text style={styles.sectionTitle}>{title}</Text> : <View />}{action}</View> : null}{children}</View>;
}

export function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <View style={styles.statTile}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text>{hint ? <Text style={styles.hint}>{hint}</Text> : null}</View>;
}

export function ListCard({ children, onPress, right }: { children: ReactNode; onPress?: () => void; right?: ReactNode }) {
  const content = <View style={styles.listCard}><View style={styles.listContent}>{children}</View>{right}</View>;
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed ? styles.pressed : undefined}>{content}</Pressable> : content;
}

export function StatusChip({ label, tone = "neutral" }: { label: string; tone?: "success" | "warning" | "error" | "neutral" }) {
  return <View style={[styles.chip, chipStyles[tone]]}><Text style={styles.chipText}>{label}</Text></View>;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return <View accessibilityLabel="Loading" style={styles.skeletonCard}><View style={styles.skeletonTitle} />{Array.from({ length: lines }, (_, index) => <View key={index} style={[styles.skeletonLine, index === lines - 1 && styles.skeletonShort]} />)}</View>;
}

export function BottomSheet({ visible, title, onClose, children, style }: { visible: boolean; title: string; onClose: () => void; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
    <View style={styles.modalRoot}><Pressable accessibilityLabel="Close sheet" style={styles.backdrop} onPress={onClose} /><View style={[styles.sheet, style]}><View style={styles.grabber} /><View style={styles.sheetHeading}><Text style={styles.sectionTitle}>{title}</Text><Pressable accessibilityRole="button" onPress={onClose}><Text style={styles.closeText}>Close</Text></Pressable></View>{children}</View></View>
  </Modal>;
}

export function LoadingCard({ label = "Loading…" }: { label?: string }) {
  return <View style={styles.loadingCard}><ActivityIndicator color={darkColors.primary} /><Text style={styles.hint}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  sectionCard: { padding: spacing.md, borderRadius: radius.card, borderWidth: spacing.profileBorderWidth, borderColor: darkColors.border, backgroundColor: darkColors.storeSurface, gap: spacing.sm },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  sectionTitle: { ...typography.storeSection, color: darkColors.white },
  statTile: { flex: 1, minWidth: spacing.recoverySuccessCardWidth / 2, minHeight: spacing.metricCardHeight, justifyContent: "center", padding: spacing.sm, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  statValue: { ...typography.orderTitle, color: darkColors.primary },
  statLabel: { ...typography.storeCaption, color: darkColors.white },
  hint: { ...typography.storeCaption, color: darkColors.mutedText },
  listCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  listContent: { flex: 1, gap: spacing.xxs },
  pressed: { opacity: 0.78 },
  chip: { alignSelf: "flex-start", paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: radius.round },
  chipText: { ...typography.tabLabel, color: darkColors.white },
  skeletonCard: { padding: spacing.md, borderRadius: radius.card, backgroundColor: darkColors.storeSurface, gap: spacing.sm },
  skeletonTitle: { width: "48%", height: spacing.sm, borderRadius: radius.progress, backgroundColor: darkColors.border },
  skeletonLine: { width: "100%", height: spacing.sm, borderRadius: radius.progress, backgroundColor: darkColors.border },
  skeletonShort: { width: "62%" },
  loadingCard: { minHeight: spacing.metricCardHeight, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.card, backgroundColor: darkColors.storeSurface },
  modalRoot: { flex: 1, justifyContent: "flex-end", backgroundColor: darkColors.overlay },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: { padding: spacing.md, paddingBottom: spacing.xl, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: darkColors.background, gap: spacing.md },
  grabber: { alignSelf: "center", width: spacing.xl, height: spacing.xxs, borderRadius: radius.round, backgroundColor: darkColors.mutedText },
  sheetHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeText: { ...typography.storeCaption, color: darkColors.primary },
});

const chipStyles = StyleSheet.create({
  success: { backgroundColor: darkColors.successSurface },
  warning: { backgroundColor: darkColors.warningSurface },
  error: { backgroundColor: darkColors.errorSurface },
  neutral: { backgroundColor: darkColors.darkTint },
});
