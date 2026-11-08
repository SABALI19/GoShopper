import { Stack } from "expo-router";
import { darkColors } from "../../theme";
import { CustomerRoleGate } from "../../components/auth/RoleGate";

export default function CustomerLayout() {
  return (
    <CustomerRoleGate>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: darkColors.background },
        }}
      />
    </CustomerRoleGate>
  );
}
