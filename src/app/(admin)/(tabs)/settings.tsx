import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { AdminCard, AdminError, AdminLabel, AdminLoading, AdminPage, AdminValue } from "../../../components/admin/AdminUI";
import { adminErrorMessage, fetchPlatformSettings, updatePlatformSettings, type PlatformSettings } from "../../../features/admin/api";
import { darkColors, radius, spacing, typography } from "../../../theme";

type Values = Pick<PlatformSettings, "minimumStoreSubtotalKobo" | "deliveryFeeKobo" | "serviceFeeKobo">;
const fieldInfo: { key: keyof Values; label: string; hint: string }[] = [
  { key: "minimumStoreSubtotalKobo", label: "Minimum merchandise subtotal per store", hint: "Each supermarket must meet this merchandise amount. Delivery and service fees are excluded." },
  { key: "deliveryFeeKobo", label: "Delivery fee", hint: "Applied to new checkout quotes." },
  { key: "serviceFeeKobo", label: "Service fee", hint: "Applied to new checkout quotes." },
];
function formatInput(kobo: number) { return (kobo / 100).toFixed(2); }
function parseNaira(value: string) { if (!/^\d{1,8}(\.\d{0,2})?$/.test(value.trim())) return null; const [naira, fraction = ""] = value.trim().split("."); const result = Number(naira) * 100 + Number(fraction.padEnd(2, "0")); return Number.isSafeInteger(result) ? result : null; }

export default function AdminSettingsScreen() {
  const { getToken } = useAuth(); const [settings, setSettings] = useState<PlatformSettings | null>(null); const [values, setValues] = useState<Record<keyof Values, string>>({ minimumStoreSubtotalKobo: "", deliveryFeeKobo: "", serviceFeeKobo: "" });
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const token = await getToken(); if (!token) throw new Error("Your session could not be verified. Sign in again."); const result = await fetchPlatformSettings(token); setSettings(result); setValues({ minimumStoreSubtotalKobo: formatInput(result.minimumStoreSubtotalKobo), deliveryFeeKobo: formatInput(result.deliveryFeeKobo), serviceFeeKobo: formatInput(result.serviceFeeKobo) }); } catch (e) { setError(adminErrorMessage(e)); } finally { setLoading(false); } }, [getToken]);
  useEffect(() => { const task = setTimeout(() => void load(), 0); return () => clearTimeout(task); }, [load]);
  const save = async () => { const parsed = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, parseNaira(value)])) as Record<keyof Values, number | null>; if (Object.values(parsed).some((amount) => amount === null) || parsed.minimumStoreSubtotalKobo === 0) { setError("Enter valid amounts in naira with up to two decimal places. The per-store minimum must be greater than zero."); return; } setSaving(true); setError(""); try { const token = await getToken(); if (!token) throw new Error("Your session could not be verified. Sign in again."); const result = await updatePlatformSettings(token, parsed as Values); setSettings(result); setValues({ minimumStoreSubtotalKobo: formatInput(result.minimumStoreSubtotalKobo), deliveryFeeKobo: formatInput(result.deliveryFeeKobo), serviceFeeKobo: formatInput(result.serviceFeeKobo) }); Alert.alert("Settings saved", "These values apply to new checkout quotes. Existing orders keep their recorded price snapshots."); } catch (e) { setError(adminErrorMessage(e)); } finally { setSaving(false); } };
  return <AdminPage title="Platform settings" subtitle="Pricing configuration used for new checkout quotes." refresh={load}>
    {loading ? <AdminLoading label="Loading settings…" /> : null}{error ? <AdminError message={error} retry={() => void load()} /> : null}
    {settings ? <>
      <AdminCard><AdminLabel>Current source</AdminLabel><AdminValue accent>{settings.source === "environment" ? "Environment configuration" : "Database settings"}</AdminValue><Text style={styles.note}>{settings.source === "environment" ? "These values currently come from the backend environment. Saving creates audited database settings." : `Last changed ${settings.updatedAt ? new Date(settings.updatedAt).toLocaleString("en-NG") : "—"}.`}</Text></AdminCard>
      {fieldInfo.map(({ key, label, hint }) => <View key={key} style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><View style={styles.inputWrap}><Text style={styles.currency}>₦</Text><TextInput accessibilityLabel={label} value={values[key]} onChangeText={(value) => setValues((current) => ({ ...current, [key]: value.replace(/[^\d.]/g, "") }))} keyboardType="decimal-pad" style={styles.input} /></View><Text style={styles.hint}>{hint}</Text></View>)}
      <View style={styles.info}><AdminValue>Existing orders</AdminValue><Text style={styles.note}>Updating settings affects only future quotes and orders. Existing orders retain their pricing snapshots.</Text></View>
      <Button title={saving ? "Saving…" : "Save platform settings"} onPress={() => void save()} loading={saving} disabled={loading} />
    </> : null}
  </AdminPage>;
}
const styles = StyleSheet.create({ field: { marginBottom: spacing.md }, fieldLabel: { ...typography.fieldLabel, color: darkColors.white, marginBottom: spacing.xs }, inputWrap: { minHeight: spacing.loginFieldHeight, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, borderWidth: 1, borderColor: darkColors.inputBorder, borderRadius: radius.input, backgroundColor: darkColors.inputSurface }, currency: { ...typography.storeBody, color: darkColors.mutedText }, input: { ...typography.storeBody, flex: 1, paddingVertical: spacing.xs, color: darkColors.white }, hint: { ...typography.storeCaption, color: darkColors.mutedText, marginTop: spacing.xxs }, note: { ...typography.storeCaption, color: darkColors.mutedText, marginTop: spacing.xs }, info: { marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.storeSurface } });
