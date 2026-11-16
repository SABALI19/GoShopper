import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../features/auth/AuthProvider";
import { darkColors, spacing, typography } from "../../theme";
import { MoreMenu, type MenuItem } from "./MoreMenu";

export function MoreMenuScreen({ title, items }: { title: string; items: MenuItem[] }) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const logout = async () => {
    setSigningOut(true);
    try { await signOut(); } catch { /* Local credentials and cache are cleared by AuthProvider. */ } finally { router.replace("/(auth)/login"); }
  };
  return <SafeAreaView edges={["top"]} style={styles.screen}>
    <Text style={styles.title}>{title}</Text>
    <MoreMenu items={items} onSignOut={() => void logout()} signingOut={signingOut} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, padding: spacing.md, gap: spacing.md, backgroundColor: darkColors.background }, title: { ...typography.orderTitle, color: darkColors.white } });
