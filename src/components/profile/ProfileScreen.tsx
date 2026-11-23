import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../features/auth/AuthProvider";
import { Button } from "../ui/Button";
import { RefreshableScrollView } from "../ui/RefreshableScrollView";
import { darkColors, radius, spacing, typography } from "../../theme";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { apiRequest, apiUploadImage } from "../../features/api/client";

export function ProfileScreen({ title }: { title: string }) {
  const { user, refreshUser, signOut, getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(!user);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
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
  const chooseAvatar = async () => {
    setError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError("Allow photo library access to choose a profile picture."); return; }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 1 });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    const side = Math.min(asset.width || spacing.profileAvatarSize, asset.height || spacing.profileAvatarSize);
    const context = ImageManipulator.manipulate(asset.uri);
    context.crop({ originX: Math.floor(((asset.width || side) - side) / 2), originY: Math.floor(((asset.height || side) - side) / 2), width: side, height: side }).resize({ width: spacing.profileAvatarSize * 4, height: spacing.profileAvatarSize * 4 });
    const rendered = await context.renderAsync();
    const compressed = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
    setAvatarPreview(compressed.uri);
    setAvatarBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Sign in again.");
      await apiUploadImage("/api/users/me/avatar", token, compressed.uri);
      await refreshUser();
      setAvatarPreview(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not upload your profile photo."); }
    finally { setAvatarBusy(false); }
  };
  const removeAvatar = async () => {
    setError(""); setAvatarBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Sign in again.");
      await apiRequest("/api/users/me/avatar", { token, method: "DELETE" });
      setAvatarPreview(null);
      await refreshUser();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not remove your profile photo."); }
    finally { setAvatarBusy(false); }
  };

  return <SafeAreaView edges={["top"]} style={styles.screen}>
    <RefreshableScrollView refreshAction={refresh} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{title}</Text>
      {loading && !user ? <View style={styles.state}><ActivityIndicator color={darkColors.primary} /><Text style={styles.muted}>Loading profile…</Text></View> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {user ? <>
        <View style={styles.identityCard}>
          {avatarPreview || user.avatarUrl ? <Image accessibilityLabel="Profile photo" source={{ uri: avatarPreview || user.avatarUrl }} style={styles.avatar} /> : <View accessibilityLabel={`${initials} profile initials`} style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>}
          <Text style={styles.name}>{[user.firstName, user.lastName].filter(Boolean).join(" ") || "Go-Shopper user"}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.role}>{humanize(user.role)}</Text>
          <View style={styles.avatarActions}><Button title={avatarBusy ? "Saving photo…" : "Change photo"} onPress={() => void chooseAvatar()} loading={avatarBusy} /><Pressable accessibilityRole="button" disabled={avatarBusy || !user.avatarUrl} onPress={() => Alert.alert("Remove profile photo?", "Your initials will be shown instead.", [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => void removeAvatar() }])}><Text style={[styles.removeAvatar, (!user.avatarUrl || avatarBusy) && styles.disabledText]}>Remove photo</Text></Pressable></View>
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
  avatarActions: { width: "100%", marginTop: spacing.sm, gap: spacing.xs },
  removeAvatar: { ...typography.storeCaption, color: darkColors.primary, textAlign: "center", padding: spacing.xs },
  disabledText: { color: darkColors.mutedText },
  initials: { ...typography.profileName, color: darkColors.white },
  name: { ...typography.storeSection, marginTop: spacing.sm, color: darkColors.white, textAlign: "center" },
  email: { ...typography.storeCaption, marginTop: spacing.xxs, color: darkColors.mutedText, textAlign: "center" },
  role: { ...typography.storeCaption, marginTop: spacing.sm, color: darkColors.primary },
  detailsCard: { paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: darkColors.storeSurface },
  detailRow: { minHeight: spacing.xxl, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, borderBottomWidth: 1, borderBottomColor: darkColors.border },
  label: { ...typography.storeCaption, color: darkColors.mutedText },
  value: { ...typography.storeCaption, flexShrink: 1, color: darkColors.white, textAlign: "right" },
});
