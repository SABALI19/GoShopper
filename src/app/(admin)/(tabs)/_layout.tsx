import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { darkColors, radius, spacing, typography } from "../../../theme";

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) { return <Icon name={name} size={spacing.tabIconSize} color={focused ? darkColors.primary : darkColors.tabInactive} />; }

export default function AdminTabsLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: darkColors.primary, tabBarInactiveTintColor: darkColors.tabInactive, tabBarStyle: styles.bar, tabBarLabelStyle: styles.label, sceneStyle: styles.scene }}>
    <Tabs.Screen name="index" options={{ title: "Overview", tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }} />
    <Tabs.Screen name="stores" options={{ title: "Stores", tabBarIcon: ({ focused }) => <TabIcon name="store" focused={focused} /> }} />
    <Tabs.Screen name="customers" options={{ title: "Customers", tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} /> }} />
    <Tabs.Screen name="orders" options={{ title: "Orders", tabBarIcon: ({ focused }) => <TabIcon name="orders" focused={focused} /> }} />
    <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ focused }) => <TabIcon name="grid" focused={focused} /> }} />
  </Tabs>;
}

const styles = StyleSheet.create({ scene: { backgroundColor: darkColors.background }, bar: { height: spacing.tabBarHeight, paddingTop: spacing.xs, backgroundColor: darkColors.tabBar, borderTopWidth: 0, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }, label: { ...typography.tabLabel } });
