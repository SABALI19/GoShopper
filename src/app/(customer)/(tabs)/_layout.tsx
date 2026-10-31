import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { darkColors, radius, spacing, typography } from "../../../theme";

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View style={[styles.iconBox, focused && styles.activeIconBox]}>
      <Icon
        color={focused ? darkColors.white : darkColors.tabInactive}
        name={name}
        size={spacing.tabIconSize}
      />
    </View>
  );
}

export default function CustomerTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: darkColors.primary,
        tabBarInactiveTintColor: darkColors.tabInactive,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        sceneStyle: styles.scene,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stores"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ focused }) => <TabIcon name="search" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "My Orders",
          tabBarIcon: ({ focused }) => <TabIcon name="orders" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: darkColors.background,
  },
  tabBar: {
    height: spacing.tabBarHeight,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxs,
    backgroundColor: darkColors.tabBar,
    borderTopWidth: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  tabItem: {
    paddingTop: spacing.xxs,
  },
  tabLabel: {
    ...typography.tabLabel,
  },
  iconBox: {
    width: spacing.tabIconActiveBox,
    height: spacing.tabIconActiveBox,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.round,
  },
  activeIconBox: {
    backgroundColor: darkColors.primary,
  },
});
