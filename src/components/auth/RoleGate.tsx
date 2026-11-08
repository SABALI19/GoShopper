import { useAuth, useUser } from "@clerk/expo";
import { Redirect } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { darkColors } from "../../theme";

export function CustomerRoleGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  if (!isLoaded || !userLoaded) return <GateLoading />;
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;
  const role = user?.publicMetadata.role;
  if (role === "supermarket") return <Redirect href="/(supermarket)/(tabs)" />;
  if (role === "admin") return <Redirect href="/(admin)" />;
  if (role === "rider") return <Redirect href={"/(rider)/(tabs)" as never} />;
  return children;
}

export function SupermarketRoleGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  if (!isLoaded || !userLoaded) return <GateLoading />;
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;
  const role = user?.publicMetadata.role;
  if (role === "rider") return <Redirect href={"/(rider)/(tabs)" as never} />;
  if (role !== "supermarket" && role !== "admin") return <Redirect href="/(customer)/(tabs)" />;
  return children;
}

export function AdminRoleGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  if (!isLoaded || !userLoaded) return <GateLoading />;
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;
  const role = user?.publicMetadata.role;
  if (role === "supermarket") return <Redirect href="/(supermarket)/(tabs)" />;
  if (role === "rider") return <Redirect href={"/(rider)/(tabs)" as never} />;
  if (role !== "admin") return <Redirect href="/(customer)/(tabs)" />;
  return children;
}

export function RiderRoleGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  if (!isLoaded || !userLoaded) return <GateLoading />;
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;
  if (user?.publicMetadata.role !== "rider") return <Redirect href="/(customer)/(tabs)" />;
  return children;
}

function GateLoading() {
  return <View style={styles.loading}><ActivityIndicator color={darkColors.primary} /></View>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: darkColors.background },
});
