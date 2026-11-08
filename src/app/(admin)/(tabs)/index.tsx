import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { AdminCard, AdminError, AdminLabel, AdminLoading, AdminPage, AdminSection, AdminValue, dateLabel, humanize } from "../../../components/admin/AdminUI";
import { adminErrorMessage, fetchAdminSummary, type AdminActivity, type AdminSummary } from "../../../features/admin/api";
import { darkColors, radius, spacing, typography } from "../../../theme";

const metrics: { key: keyof AdminSummary; label: string }[] = [
  { key: "registeredCustomers", label: "Customers" }, { key: "totalSupermarkets", label: "Supermarkets" },
  { key: "activeSupermarkets", label: "Active stores" }, { key: "pendingStoreApprovals", label: "Pending approval" },
  { key: "suspendedStores", label: "Suspended stores" }, { key: "totalParentOrders", label: "Parent orders" },
  { key: "awaitingPaymentOrders", label: "Awaiting payment" }, { key: "confirmedProcessingOrders", label: "Confirmed / processing" },
  { key: "completedOrders", label: "Completed" }, { key: "cancelledOrders", label: "Cancelled" },
  { key: "customerActionRequiredOrders", label: "Customer action needed" },
];

export default function AdminDashboard() {
  const router = useRouter(); const { getToken } = useAuth();
  const [summary, setSummary] = useState<AdminSummary | null>(null); const [activity, setActivity] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const token = await getToken(); if (!token) throw new Error("Your session could not be verified. Sign in again."); const data = await fetchAdminSummary(token); setSummary(data.summary); setActivity(data.recentActivity); } catch (e) { setError(adminErrorMessage(e)); } finally { setLoading(false); } }, [getToken]);
  useEffect(() => { const task = setTimeout(() => void load(), 0); return () => clearTimeout(task); }, [load]);
  return <AdminPage title="Platform overview" subtitle="Live marketplace operations and account activity." refresh={load}>
    {loading && !summary ? <AdminLoading label="Loading platform summary…" /> : null}
    {error ? <AdminError message={error} retry={() => void load()} /> : null}
    {summary ? <>
      <View style={styles.grid}>{metrics.map(({ key, label }) => <View key={key} style={styles.metric}><Text style={styles.metricValue}>{summary[key].toLocaleString("en-NG")}</Text><Text style={styles.metricLabel}>{label}</Text></View>)}</View>
      <AdminSection title="Recent platform activity" />
      {!activity.length ? <AdminCard><AdminValue>No recent activity recorded.</AdminValue></AdminCard> : activity.map((entry, index) => <AdminCard key={`${entry.targetId}-${index}`}><View style={styles.activityRow}><View style={styles.activityCopy}><AdminValue>{entry.name || `${humanize(entry.targetType)} ${entry.targetId}`}</AdminValue><AdminLabel>{entry.type === "admin_action" ? humanize(entry.action) : entry.action}</AdminLabel>{entry.reason ? <Text style={styles.reason}>{entry.reason}</Text> : null}</View><Text style={styles.date}>{dateLabel(entry.createdAt)}</Text></View></AdminCard>)}
      <AdminSection title="Operations" />
      <View style={styles.operations}><Button title="Review onboarding applications" onPress={() => router.push("/(admin)/applications" as never)} /><Button title="Open store operations" onPress={() => router.push("/(supermarket)/(tabs)")} /><Pressable accessibilityRole="button" onPress={() => router.push("/(admin)/deliveries" as never)} style={styles.link}><Text style={styles.linkText}>Delivery operations</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/(admin)/riders" as never)} style={styles.link}><Text style={styles.linkText}>Rider accounts</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/(admin)/(tabs)/orders" as never)} style={styles.link}><Text style={styles.linkText}>Review order exceptions</Text></Pressable></View>
    </> : null}
  </AdminPage>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }, metric: { width: "48%", minHeight: spacing.metricCardHeight, padding: spacing.sm, justifyContent: "center", borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  metricValue: { ...typography.orderTitle, color: darkColors.primary }, metricLabel: { ...typography.storeCaption, color: darkColors.white, marginTop: spacing.xxs },
  activityRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }, activityCopy: { flex: 1, gap: spacing.xxs }, reason: { ...typography.homeCaption, color: darkColors.warning }, date: { ...typography.homeCaption, color: darkColors.mutedText, textAlign: "right", maxWidth: "38%" },
  operations: { gap: spacing.xs }, link: { minHeight: spacing.buttonHeight, alignItems: "center", justifyContent: "center" }, linkText: { ...typography.button, color: darkColors.primary },
});
