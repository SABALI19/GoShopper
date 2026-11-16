import { useRouter } from "expo-router";
import { MoreMenuScreen } from "../../../components/navigation/MoreMenuScreen";

export default function AdminMoreScreen() {
  const router = useRouter();
  return <MoreMenuScreen title="More" items={[
    { label: "Applications", onPress: () => router.push("/(admin)/applications" as never) },
    { label: "Customers", onPress: () => router.push("/(admin)/(tabs)/customers" as never) },
    { label: "Riders", onPress: () => router.push("/(admin)/riders" as never) },
    { label: "Deliveries", onPress: () => router.push("/(admin)/deliveries" as never) },
    { label: "Settings", onPress: () => router.push("/(admin)/(tabs)/settings" as never) },
    { label: "Profile", onPress: () => router.push("/(admin)/profile" as never) },
  ]} />;
}
