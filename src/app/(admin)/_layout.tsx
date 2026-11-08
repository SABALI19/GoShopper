import { Stack } from "expo-router";
import { AdminRoleGate } from "../../components/auth/RoleGate";
import { darkColors } from "../../theme";

export default function AdminLayout() {
  return <AdminRoleGate><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: darkColors.background } }} /></AdminRoleGate>;
}
