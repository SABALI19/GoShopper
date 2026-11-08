import { Stack } from "expo-router";
import { SupermarketRoleGate } from "../../components/auth/RoleGate";
import { darkColors } from "../../theme";

export default function SupermarketLayout() {
  return <SupermarketRoleGate><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: darkColors.background } }} /></SupermarketRoleGate>;
}
