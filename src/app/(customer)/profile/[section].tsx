import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Icon } from "../../../components/ui/Icon";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { darkColors, radius, spacing, typography } from "../../../theme";

const sections: Record<string, { title: string; description: string; icon: "grid" | "pin" | "card" | "bell" | "refer" | "help" }> = {
  "app-preference": { title: "App Preference", description: "Your app preferences will be available here.", icon: "grid" },
  "saved-address": { title: "Saved Address", description: "You have no saved delivery addresses yet.", icon: "pin" },
  "payment-method": { title: "Payment Method", description: "Your saved payment methods will appear here.", icon: "card" },
  "notification-settings": { title: "Notification Settings", description: "Manage order updates and other notifications here.", icon: "bell" },
  "refer-and-earn": { title: "Refer & Earn", description: "Referral rewards will be available here.", icon: "refer" },
  "help-and-support": { title: "Help & Support", description: "Support options will be available here.", icon: "help" },
};

export default function ProfileSectionScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section: string }>();
  const content = sections[section ?? ""] ?? { title: "Profile", description: "Manage your profile settings here.", icon: "grid" as const };
  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
          <Icon color={darkColors.white} name="back" size={spacing.lg} />
        </Pressable>
        <Text style={styles.title}>{content.title}</Text>
      </View>
      <EmptyState icon={content.icon} title={content.title} description={content.description} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkColors.background },
  header: { paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  backButton: { width: spacing.lg + spacing.xs, height: spacing.lg + spacing.xs, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: darkColors.primary },
  title: { ...typography.storeTitle, color: darkColors.white },
});
