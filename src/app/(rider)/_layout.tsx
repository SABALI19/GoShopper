import { Stack } from "expo-router";
import { RiderRoleGate } from "../../components/auth/RoleGate";
import { darkColors } from "../../theme";

export default function RiderLayout() { return <RiderRoleGate><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: darkColors.background } }} /></RiderRoleGate>; }
