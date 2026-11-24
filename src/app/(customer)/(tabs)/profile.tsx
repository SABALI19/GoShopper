import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth, type AppUser } from "@/features/auth/AuthProvider";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { RefreshableScrollView } from "../../../components/ui/RefreshableScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { apiRequest, apiUploadImage } from "../../../features/api/client";
import { darkColors, radius, spacing, typography } from "../../../theme";

type ProfileProps = {
  name: string;
  email: string;
  imageUrl?: string;
  onLogout: () => void;
  avatarBusy: boolean;
  avatarError: string;
  avatarNotice: string;
  onChangePhoto: () => void;
  onRemovePhoto: () => void;
};

type MenuItem = { label: string; icon: IconName; section: string };
const menuGroups: MenuItem[][] = [
  [
    { label: "Personal Info", icon: "profile", section: "personal-info" },
    { label: "App Preference", icon: "grid", section: "app-preference" },
  ],
  [
    { label: "Saved Address", icon: "pin", section: "saved-address" },
    { label: "Payment Method", icon: "card", section: "payment-method" },
    { label: "Notification Settings", icon: "bell", section: "notification-settings" },
  ],
  [
    { label: "Refer & Earn", icon: "refer", section: "refer-and-earn" },
    { label: "Help & Support", icon: "help", section: "help-and-support" },
  ],
];

export default function ProfileScreen() {
  return <SignedInProfile />;
}

function SignedInProfile() {
  const router = useRouter();
  const { user, isLoaded, signOut, getToken, updateAvatar } = useAuth();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarNotice, setAvatarNotice] = useState("");
  if (!isLoaded) return null;

  const handleLogout = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  const chooseAvatar = async () => {
    setAvatarError("");
    setAvatarNotice("");
    setAvatarBusy(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setAvatarError("Allow photo library access to choose a profile picture."); return; }
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 1 });
      if (picked.canceled || !picked.assets[0]) return;
      const asset = picked.assets[0];
      const side = Math.min(asset.width || spacing.profileAvatarSize, asset.height || spacing.profileAvatarSize);
      const image = ImageManipulator.manipulate(asset.uri);
      image.crop({ originX: Math.floor(((asset.width || side) - side) / 2), originY: Math.floor(((asset.height || side) - side) / 2), width: side, height: side }).resize({ width: spacing.profileAvatarSize * 4, height: spacing.profileAvatarSize * 4 });
      const rendered = await image.renderAsync();
      const compressed = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Sign in again.");
      const result = await apiUploadImage<{ user: AppUser }>("/api/users/me/avatar", token, compressed.uri);
      updateAvatar(result.user.avatarUrl || "");
      setAvatarNotice("Profile photo updated.");
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : "Could not upload your profile photo.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarError("");
    setAvatarNotice("");
    setAvatarBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Sign in again.");
      const result = await apiRequest<{ user: AppUser }>("/api/users/me/avatar", { token, method: "DELETE" });
      updateAvatar(result.user.avatarUrl || "");
      setAvatarNotice("Profile photo removed.");
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : "Could not remove your profile photo.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const confirmRemoveAvatar = () => Alert.alert("Remove profile photo?", "Your Go-Shopper profile image will be removed.", [
    { text: "Cancel", style: "cancel" },
    { text: "Remove", style: "destructive", onPress: () => void removeAvatar() },
  ]);

  return (
    <ProfileContent
      name={user ? `${user.firstName} ${user.lastName}`.trim() || "Go-Shopper Customer" : "Go-Shopper Customer"}
      email={user?.email ?? user?.phone ?? ""}
      imageUrl={user?.avatarUrl}
      avatarBusy={avatarBusy}
      avatarError={avatarError}
      avatarNotice={avatarNotice}
      onChangePhoto={() => void chooseAvatar()}
      onRemovePhoto={confirmRemoveAvatar}
      onLogout={handleLogout}
    />
  );
}

function ProfileContent({ name, email, imageUrl, onLogout, avatarBusy, avatarError, avatarNotice, onChangePhoto, onRemovePhoto }: ProfileProps) {
  const router = useRouter();
  const openSection = (section: string) => {
    if (section === "personal-info") {
      router.push("/(customer)/profile/edit");
      return;
    }
    router.push({ pathname: "/(customer)/profile/[section]", params: { section } });
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <StatusBar style="light" />
      <RefreshableScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          {imageUrl ? <Image accessibilityLabel={`${name} profile photo`} source={{ uri: imageUrl }} style={styles.avatar} /> : <View accessibilityLabel={`${name} profile initials`} style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarInitials}>{initialsFor(name)}</Text></View>}
          <Text numberOfLines={1} style={styles.name}>{name}</Text>
          <Text numberOfLines={1} style={styles.email}>{email}</Text>
          <View style={styles.photoActions}>
            <Button loading={avatarBusy} onPress={onChangePhoto} title={avatarBusy ? "Saving photo…" : imageUrl ? "Change photo" : "Add profile photo"} />
            {imageUrl ? <Pressable accessibilityRole="button" disabled={avatarBusy} onPress={onRemovePhoto} style={styles.removePhoto}><Text style={[styles.removePhotoText, avatarBusy && styles.disabledText]}>Remove photo</Text></Pressable> : null}
            {avatarBusy ? <ActivityIndicator accessibilityLabel="Saving profile photo" color={darkColors.primary} /> : null}
            {avatarError ? <Text accessibilityRole="alert" style={styles.photoError}>{avatarError}</Text> : null}
            {avatarNotice ? <Text accessibilityLiveRegion="polite" style={styles.photoNotice}>{avatarNotice}</Text> : null}
          </View>
        </View>

        <Pressable accessibilityRole="button" onPress={() => openSection("personal-info")} style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </Pressable>

        <View style={styles.groups}>
          {menuGroups.map((group, groupIndex) => (
            <View key={group[0].section} style={[styles.menuGroup, groupIndex === 0 && styles.firstGroup]}>
              {group.map((item, itemIndex) => (
                <View key={item.section}>
                  <Pressable accessibilityRole="button" onPress={() => openSection(item.section)} style={styles.menuRow}>
                    <View style={styles.menuIcon}>
                      <Icon color={darkColors.white} name={item.icon} size={spacing.md} />
                    </View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Icon color={darkColors.white} name="chevron" size={spacing.md} />
                  </Pressable>
                  {itemIndex < group.length - 1 ? <View style={styles.separator} /> : null}
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.logoutGroup}>
          <Pressable accessibilityRole="button" onPress={onLogout} style={styles.menuRow}>
            <View style={styles.menuIcon}>
              <Icon color={darkColors.white} name="logout" size={spacing.md} />
            </View>
            <Text style={styles.menuLabel}>Log Out</Text>
            <Icon color={darkColors.white} name="chevron" size={spacing.md} />
          </Pressable>
        </View>
      </RefreshableScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  page: { paddingHorizontal: spacing.profilePageInset, paddingBottom: spacing.md },
  identity: { alignItems: "center" },
  avatar: { width: spacing.profileAvatarSize, height: spacing.profileAvatarSize, marginTop: spacing.profileAvatarTop, borderRadius: radius.round },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: darkColors.primary },
  avatarInitials: { ...typography.profileName, color: darkColors.white },
  photoActions: { width: "100%", alignItems: "center", marginTop: spacing.sm, gap: spacing.xs },
  removePhoto: { minHeight: spacing.buttonHeight, justifyContent: "center", paddingHorizontal: spacing.md },
  removePhotoText: { ...typography.authLink, color: darkColors.primary },
  disabledText: { opacity: 0.55 },
  photoError: { ...typography.storeCaption, color: darkColors.error, textAlign: "center" },
  photoNotice: { ...typography.storeCaption, color: darkColors.success, textAlign: "center" },
  name: { ...typography.profileName, maxWidth: "100%", marginTop: spacing.profileNameTop, color: darkColors.white },
  email: { ...typography.profileEmail, color: darkColors.white },
  editButton: { minHeight: spacing.profileEditHeight, marginTop: spacing.profileEditTop, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  editButtonText: { ...typography.authLink, color: darkColors.white },
  groups: { gap: spacing.profileGroupGap },
  firstGroup: { marginTop: spacing.profileFirstGroupTop },
  menuGroup: { paddingHorizontal: spacing.profileGroupInset, borderWidth: spacing.profileBorderWidth, borderColor: darkColors.white, borderRadius: radius.lg },
  menuRow: { minHeight: spacing.profileGroupRowHeight, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  menuIcon: { width: spacing.profileIconSize, height: spacing.profileIconSize, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  menuLabel: { ...typography.profileMenu, flex: 1, color: darkColors.white },
  separator: { height: spacing.progressDotSize / 4, marginLeft: spacing.profileSeparatorInset, backgroundColor: darkColors.border },
  logoutGroup: { marginTop: spacing.profileLogoutTop, paddingHorizontal: spacing.profileGroupInset, borderWidth: spacing.profileBorderWidth, borderColor: darkColors.white, borderRadius: radius.lg },
  pressed: { opacity: 0.8 },
});

function initialsFor(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "GS";
}
