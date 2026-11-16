import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../features/auth/AuthProvider";
import { Button } from "../ui/Button";
import { RefreshableScrollView } from "../ui/RefreshableScrollView";
import { darkColors, radius, spacing, typography } from "../../theme";

export function ProfileScreen({ title }: { title: string }) {
  const { user, refreshUser, signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(!user);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const latest = await refreshUser();
      if (!latest) throw new Error("Your profile could not be loaded. Sign in again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your profile could not be refreshed.");
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);
  useEffect(() => { const task = setTimeout(() => void refresh(), 0); return () => clearTimeout(task); }, [refresh]);
  const initials = useMemo(() => [user?.firstName, user?.lastName].filter(Boolean).map((part) => part![0]).join("").slice(0, 2).toUpperCase() || "GS", [user?.firstName, user?.lastName]);
  const logout = async () => {
    setSigningOut(true);
    try { await signOut(); } catch { /* Local credentials and cache are cleared by AuthProvider. */ } finally { router.replace("/(auth)/login"); }
  };

  return <SafeAreaView edges={["top"]} style={styles.screen}>
    <RefreshableScrollView refreshAction={refresh} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{title}</Text>
      {loading && !user ? <View style={styles.state}><ActivityIndicator color={darkColors.primary} /><Text style={styles.muted}>Loading profile…</Text></View> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {user ? <>
        <View style={styles.identityCard}>
          <View accessibilityLabel={`${initials} profile initials`} style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
          <Text style={styles.name}>{[user.firstName, user.lastName].filter(Boolean).join(" ") || "Go-Shopper user"}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.role}>{humanize(user.role)}</Text>
        </View>
        <View style={styles.detailsCard}>
          {user.phone ? <Detail label="Phone" value={user.phone} /> : null}
          <Detail label="Account status" value={user.isSuspended ? "Suspended" : "Active"} />
          <Detail label="Approval status" value={humanize(user.approvalStatus)} />
          <Detail label="Last login" value={user.lastLoginAt ? formatDate(user.lastLoginAt) : "Not recorded"} />
        </View>
      </> : !loading ? <Text style={styles.muted}>No profile details are available.</Text> : null}
      <Button title={signingOut ? "Signing out…" : "Sign out"} onPress={() => void logout()} loading={signingOut} />
    </RefreshableScrollView>
  </SafeAreaView>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}
function humanize(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }); }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  page: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  title: { ...typography.orderTitle, color: darkColors.white },
  state: { padding: spacing.lg, alignItems: "center", gap: spacing.sm },
  muted: { ...typography.storeCaption, color: darkColors.mutedText },
  error: { ...typography.storeCaption, color: darkColors.warning },
  identityCard: { alignItems: "center", padding: spacing.lg, borderRadius: radius.lg, backgroundColor: darkColors.storeSurface },
  avatar: { width: spacing.profileAvatarSize, height: spacing.profileAvatarSize, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  initials: { ...typography.profileName, color: darkColors.white },
  name: { ...typography.storeSection, marginTop: spacing.sm, color: darkColors.white, textAlign: "center" },
  email: { ...typography.storeCaption, marginTop: spacing.xxs, color: darkColors.mutedText, textAlign: "center" },
  role: { ...typography.storeCaption, marginTop: spacing.sm, color: darkColors.primary },
  detailsCard: { paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  detailRow: { minHeight: spacing.xxl, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, borderBottomWidth: 1, borderBottomColor: darkColors.border },
  label: { ...typography.storeCaption, color: darkColors.mutedText },
  value: { ...typography.storeCaption, flexShrink: 1, color: darkColors.white, textAlign: "right" },
});
