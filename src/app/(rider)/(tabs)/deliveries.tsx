import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../../components/ui/Button";
import { RefreshableScrollView } from "../../../components/ui/RefreshableScrollView";
import { DeliveryCard } from "./index";
import { fetchRiderDeliveries, riderErrorMessage, type RiderDelivery } from "../../../features/rider/api";
import { darkColors, radius, spacing, typography } from "../../../theme";
export default function RiderDeliveries() { const { getToken } = useAuth(); const router = useRouter(); const [rows, setRows] = useState<RiderDelivery[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const load = useCallback(async () => { setLoading(true); setError(""); try { const token = await getToken(); if (!token) throw new Error("Sign in again."); setRows((await fetchRiderDeliveries(token)).deliveries); } catch (e) { setError(riderErrorMessage(e)); } finally { setLoading(false); } }, [getToken]); useEffect(() => { const task = setTimeout(() => void load(), 0); return () => clearTimeout(task); }, [load]); return <SafeAreaView edges={["top"]} style={styles.screen}><RefreshableScrollView refreshAction={load} contentContainerStyle={styles.page}><Text style={styles.title}>My Deliveries</Text>{loading ? <ActivityIndicator color={darkColors.primary} /> : null}{error ? <View style={styles.card}><Text style={styles.error}>{error}</Text><Button title="Retry" onPress={() => void load()} /></View> : null}{!loading && !error && rows.length === 0 ? <View style={styles.card}><Text style={styles.muted}>No deliveries have been assigned to you.</Text></View> : rows.map((delivery) => <DeliveryCard key={delivery.id} delivery={delivery} onPress={() => router.push(`/(rider)/delivery/${delivery.id}` as never)} />)}</RefreshableScrollView></SafeAreaView>; }
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: darkColors.background }, page: { padding: spacing.md, paddingBottom: spacing.xxl }, title: { ...typography.orderTitle, color: darkColors.white, marginBottom: spacing.md }, card: { padding: spacing.md, marginBottom: spacing.sm, borderRadius: radius.md, backgroundColor: darkColors.storeSurface }, error: { ...typography.storeCaption, color: darkColors.error }, muted: { ...typography.storeBody, color: darkColors.mutedText } });

