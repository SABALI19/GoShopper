import { useRouter } from "expo-router";
import { MoreMenuScreen } from "../../../components/navigation/MoreMenuScreen";

export default function SupermarketMoreScreen() {
  const router = useRouter();
  return <MoreMenuScreen title="More" items={[
    { label: "Store profile", onPress: () => router.push("/(supermarket)/profile" as never) },
  ]} />;
}
