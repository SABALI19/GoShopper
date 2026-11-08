import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { RefreshableScrollView } from "../ui/RefreshableScrollView";
import { darkColors, radius, spacing, typography } from "../../theme";

export function AdminPage({ title, subtitle, refresh, children }: { title: string; subtitle?: string; refresh?: () => Promise<void>; children: ReactNode }) {
  return <SafeAreaView edges={["top"]} style={styles.screen}>
    <RefreshableScrollView refreshAction={refresh} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}{children}
    </RefreshableScrollView>
  </SafeAreaView>;
}

export function AdminCard({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  const content = <View style={styles.card}>{children}</View>;
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{content}</Pressable> : content;
}

export function AdminLoading({ label = "Loading…" }: { label?: string }) {
  return <View style={styles.center}><ActivityIndicator color={darkColors.primary} /><Text style={styles.muted}>{label}</Text></View>;
}

export function AdminError({ message, retry }: { message: string; retry: () => void }) {
  return <View style={styles.error}><Text style={styles.errorText}>{message}</Text><Button title="Retry" onPress={retry} /></View>;
}

export function AdminSection({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.sectionHead}><Text style={styles.section}>{title}</Text>{action && onAction ? <Pressable onPress={onAction}><Text style={styles.action}>{action}</Text></Pressable> : null}</View>;
}
export function AdminBack({ onPress }: { onPress: () => void }) { return <Pressable accessibilityRole="button" onPress={onPress} style={styles.back}><Icon name="back" size={spacing.md} color={darkColors.primary} /><Text style={styles.action}>Back</Text></Pressable>; }

export function AdminLabel({ children }: { children: ReactNode }) { return <Text style={styles.label}>{children}</Text>; }
export function AdminValue({ children, accent = false }: { children: ReactNode; accent?: boolean }) { return <Text style={[styles.value, accent && styles.accent]}>{children}</Text>; }
export function AdminSearch({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) { return <TextInput accessibilityLabel={placeholder} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={darkColors.placeholder} autoCapitalize="none" style={styles.search} />; }
export function AdminFilters({ options, selected, onSelect }: { options: { label: string; value: string }[]; selected: string; onSelect: (value: string) => void }) { return <View style={styles.filters}>{options.map((option) => <Pressable key={option.value} accessibilityRole="tab" accessibilityState={{ selected: selected === option.value }} onPress={() => onSelect(option.value)} style={[styles.filter, selected === option.value && styles.filterSelected]}><Text style={[styles.filterText, selected === option.value && styles.filterTextSelected]}>{option.label}</Text></Pressable>)}</View>; }
export function money(kobo: number) { return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
export function humanize(value?: string) { return (value || "—").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
export function dateLabel(value?: string) { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }); }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background }, page: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: { ...typography.orderTitle, color: darkColors.white }, subtitle: { ...typography.storeBody, color: darkColors.mutedText, marginTop: spacing.xxs, marginBottom: spacing.md },
  card: { marginBottom: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  center: { padding: spacing.lg, alignItems: "center", gap: spacing.sm }, muted: { ...typography.storeCaption, color: darkColors.mutedText },
  error: { padding: spacing.md, marginVertical: spacing.sm, gap: spacing.sm, borderRadius: radius.md, backgroundColor: darkColors.errorSurface }, errorText: { ...typography.storeBody, color: darkColors.error },
  sectionHead: { marginTop: spacing.md, marginBottom: spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  section: { ...typography.storeSection, color: darkColors.white }, action: { ...typography.storeCaption, color: darkColors.primary },
  back: { minHeight: spacing.xl, flexDirection: "row", alignItems: "center", gap: spacing.xxs },
  label: { ...typography.storeCaption, color: darkColors.mutedText }, value: { ...typography.storeBody, color: darkColors.white }, accent: { color: darkColors.primary },
  search: { ...typography.input, minHeight: spacing.homeSearchHeight, marginBottom: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.input, borderWidth: 1, borderColor: darkColors.inputBorder, backgroundColor: darkColors.inputSurface, color: darkColors.white },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm }, filter: { minHeight: spacing.xl, paddingHorizontal: spacing.sm, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.storeSurface }, filterSelected: { backgroundColor: darkColors.primary }, filterText: { ...typography.storeCaption, color: darkColors.white }, filterTextSelected: { color: darkColors.white },
});
