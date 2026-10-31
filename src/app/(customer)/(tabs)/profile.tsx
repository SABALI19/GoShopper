import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useClerk, useUser } from "@clerk/expo";
import { Poppins_400Regular, Poppins_500Medium, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { darkColors, radius, spacing, typography } from "../../../theme";

type ProfileProps = {
  name: string;
  email: string;
  imageUrl?: string;
  onLogout: () => void;
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
  const router = useRouter();
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (publishableKey) return <SignedInProfile />;
  return (
    <ProfileContent
      name="Michael Jake"
      email="Michael Jake@gmail.com"
      onLogout={() => router.replace("/(auth)/login")}
    />
  );
}

function SignedInProfile() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  if (!isLoaded) return null;

  const handleLogout = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  return (
    <ProfileContent
      name={user?.fullName || user?.firstName || "Go-Shopper Customer"}
      email={user?.primaryEmailAddress?.emailAddress ?? user?.primaryPhoneNumber?.phoneNumber ?? ""}
      imageUrl={user?.imageUrl}
      onLogout={handleLogout}
    />
  );
}

function ProfileContent({ name, email, imageUrl, onLogout }: ProfileProps) {
  const router = useRouter();
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_700Bold });
  if (!fontsLoaded) return null;

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
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          <Image
            accessibilityLabel={`${name} profile photo`}
            source={imageUrl ? { uri: imageUrl } : require("../../../../assets/images/profile/profile-reference.png")}
            style={styles.avatar}
          />
          <Text numberOfLines={1} style={styles.name}>{name}</Text>
          <Text numberOfLines={1} style={styles.email}>{email}</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  page: { paddingHorizontal: spacing.profilePageInset, paddingBottom: spacing.md },
  identity: { alignItems: "center" },
  avatar: { width: spacing.profileAvatarSize, height: spacing.profileAvatarSize, marginTop: spacing.profileAvatarTop, borderRadius: radius.round },
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
