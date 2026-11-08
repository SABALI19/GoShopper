import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { darkColors, radius, spacing, typography } from "../../../theme";

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <Icon color={focused ? darkColors.primary : darkColors.tabInactive} name={name} size={spacing.tabIconSize} />;
}

export default function SupermarketTabsLayout() {
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: darkColors.primary,
    tabBarInactiveTintColor: darkColors.tabInactive,
    tabBarStyle: styles.tabBar,
    tabBarLabelStyle: styles.label,
    sceneStyle: styles.scene,
  }}>
    <Tabs.Screen name="index" options={{ title: "Dashboard", tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="home" /> }} />
    <Tabs.Screen name="orders" options={{ title: "Orders", tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="orders" /> }} />
  </Tabs>;
}

const styles = StyleSheet.create({
  scene: { backgroundColor: darkColors.background },
  tabBar: { height: spacing.tabBarHeight, paddingTop: spacing.sm, backgroundColor: darkColors.tabBar, borderTopWidth: 0, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  label: { ...typography.tabLabel },
});
