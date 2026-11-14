import { Redirect } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "@/features/auth/AuthProvider";
import { darkColors } from "../../theme";

export function CustomerRoleGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useAuth();
  if (!isLoaded) return <GateLoading />;
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;
  if (user?.role === "supermarket" && user.approvalStatus === "approved") return <Redirect href="/(supermarket)/(tabs)" />;
  if (user?.role === "admin") return <Redirect href="/(admin)" />;
  if (user?.role === "rider" && user.approvalStatus === "approved") return <Redirect href="/(rider)/(tabs)" />;
  return children;
}
export function SupermarketRoleGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useAuth();
  if (!isLoaded) return <GateLoading />;
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;
  if (user?.role === "admin") return children;
  if (user?.role !== "supermarket" || user.approvalStatus !== "approved") return <Redirect href="/(customer)/(tabs)" />;
  return children;
}
export function AdminRoleGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useAuth();
  if (!isLoaded) return <GateLoading />;
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;
  if (user?.role !== "admin") return <Redirect href="/(customer)/(tabs)" />;
  return children;
}
export function RiderRoleGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useAuth();
  if (!isLoaded) return <GateLoading />;
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;
  if (user?.role !== "rider" || user.approvalStatus !== "approved") return <Redirect href="/(customer)/(tabs)" />;
  return children;
}
function GateLoading() { return <View style={styles.loading}><ActivityIndicator color={darkColors.primary} /></View>; }
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: darkColors.background } });
