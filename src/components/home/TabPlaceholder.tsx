import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Poppins_400Regular, Poppins_500Medium } from "@expo-google-fonts/poppins";
import { EmptyState } from "../ui/EmptyState";
import { RefreshableScrollView } from "../ui/RefreshableScrollView";
import { type IconName } from "../ui/Icon";
import { darkColors } from "../../theme";

type TabPlaceholderProps = {
  icon: IconName;
  title: string;
  description: string;
};

export function TabPlaceholder({ icon, title, description }: TabPlaceholderProps) {
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_500Medium });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: darkColors.background }}>
      <StatusBar style="light" />
      <RefreshableScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <EmptyState icon={icon} title={title} description={description} />
      </RefreshableScrollView>
    </SafeAreaView>
  );
}
