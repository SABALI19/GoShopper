import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../../components/ui/Button";
import { RefreshableScrollView } from "../../../components/ui/RefreshableScrollView";
import { fetchRiderDeliveries, fetchRiderProfile, riderErrorMessage, setRiderAvailability, type RiderDelivery, type RiderProfile } from "../../../features/rider/api";
import { darkColors, radius, spacing, typography } from "../../../theme";

export default function RiderDashboard() {
  const { getToken } = useAuth(); const router = useRouter();
  const [profile, setProfile] = useState<RiderProfile | null>(null); const [deliveries, setDeliveries] = useState<RiderDelivery[]>([]); const [summary, setSummary] = useState({ activeCount: 0, completedCount: 0, assignedCount: 0 });
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const token = await getToken(); if (!token) throw new Error("Sign in again to continue."); const [p, d] = await Promise.all([fetchRiderProfile(token), fetchRiderDeliveries(token)]); setProfile(p.profile); setSummary(p.summary); setDeliveries(d.deliveries); } catch (e) { setError(riderErrorMessage(e)); } finally { setLoading(false); } }, [getToken]);
  useEffect(() => { const task = setTimeout(() => void load(), 0); return () => clearTimeout(task); }, [load]);
  const toggle = async (value: boolean) => { setSaving(true); setError(""); try { const token = await getToken(); if (!token) throw new Error("Sign in again to continue."); const result = await setRiderAvailability(token, value); setProfile(result.profile); } catch (e) { setError(riderErrorMessage(e)); } finally { setSaving(false); } };
  const active = deliveries.filter((d) => ["assigned", "accepted", "arrived_at_pickup", "picked_up", "in_transit"].includes(d.status));
  return <SafeAreaView edges={["top"]} style={styles.screen}><RefreshableScrollView refreshAction={load} contentContainerStyle={styles.page}>
    <Text style={styles.title}>Rider Dashboard</Text><Text style={styles.subtitle}>Your delivery activity and availability.</Text>
    {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Button title="Retry" onPress={() => void load()} /></View> : null}
    {loading && !profile ? <View style={styles.center}><ActivityIndicator color={darkColors.primary} /><Text style={styles.muted}>Loading rider profile…</Text></View> : null}
    {profile ? <>
      <View style={styles.profile}><Text style={styles.profileTitle}>{[profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Rider"}</Text><Text style={styles.muted}>{profile.vehicleType || "Vehicle not set"} · {profile.approvalStatus}</Text>
        <View style={styles.availability}><View><Text style={styles.value}>Availability</Text><Text style={styles.muted}>{profile.isOnline ? "Online and eligible for assignment" : "Offline"}</Text></View><Switch value={profile.isOnline} onValueChange={toggle} disabled={saving || profile.approvalStatus !== "approved" || profile.isSuspended} trackColor={{ false: darkColors.border, true: darkColors.primary }} thumbColor={darkColors.white} /></View>
        {profile.approvalStatus !== "approved" ? <Text style={styles.notice}>Your account needs admin approval before you can go online.</Text> : null}
      </View>
      <View style={styles.metrics}><Metric label="Active" value={summary.activeCount} /><Metric label="Completed" value={summary.completedCount} /><Metric label="Assigned" value={summary.assignedCount} /></View>
      <Text style={styles.section}>Current deliveries</Text>
      {active.length ? active.map((delivery) => <DeliveryCard key={delivery.id} delivery={delivery} onPress={() => router.push(`/(rider)/delivery/${delivery.id}` as never)} />) : <View style={styles.card}><Text style={styles.muted}>No active delivery assignments.</Text></View>}
      <Button title="View all deliveries" onPress={() => router.push("/(rider)/(tabs)/deliveries" as never)} />
    </> : null}
  </RefreshableScrollView></SafeAreaView>;
}
export function DeliveryCard({ delivery, onPress }: { delivery: RiderDelivery; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.card}><View style={styles.row}><Text style={styles.value}>{delivery.parentOrderNumber}</Text><Text style={styles.status}>{humanize(delivery.status)}</Text></View><Text style={styles.muted}>{delivery.storeName} · {delivery.subOrderNumber}</Text>{delivery.destination?.address ? <Text numberOfLines={2} style={styles.address}>{delivery.destination.address}</Text> : null}</Pressable>; }
function Metric({ label, value }: { label: string; value: number }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.muted}>{label}</Text></View>; }
export function humanize(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: darkColors.background }, page: { padding: spacing.md, paddingBottom: spacing.xxl }, title: { ...typography.orderTitle, color: darkColors.white }, subtitle: { ...typography.storeBody, marginTop: spacing.xxs, color: darkColors.mutedText }, profile: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.storeSurface }, profileTitle: { ...typography.storeSection, color: darkColors.white }, availability: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderColor: darkColors.border }, value: { ...typography.storeBody, color: darkColors.white }, muted: { ...typography.storeCaption, color: darkColors.mutedText }, notice: { ...typography.storeCaption, marginTop: spacing.sm, color: darkColors.warning }, metrics: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm }, metric: { flex: 1, padding: spacing.sm, borderRadius: radius.md, backgroundColor: darkColors.storeSurface }, metricValue: { ...typography.orderTitle, color: darkColors.primary }, section: { ...typography.storeSection, marginTop: spacing.lg, marginBottom: spacing.sm, color: darkColors.white }, card: { marginBottom: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.storeSurface }, row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.xs }, status: { ...typography.storeCaption, color: darkColors.primary }, address: { ...typography.storeCaption, marginTop: spacing.xs, color: darkColors.white }, center: { padding: spacing.lg, alignItems: "center", gap: spacing.sm }, error: { gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.errorSurface }, errorText: { ...typography.storeCaption, color: darkColors.error } });

