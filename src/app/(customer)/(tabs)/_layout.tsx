import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "../../../components/ui/Icon";
import { darkColors, radius, spacing, typography } from "../../../theme";

// Tweak these to taste
const EXTRA_BAR_HEIGHT = 16; // added on top of spacing.tabBarHeight
const ICON_BOX_EXTRA = 8; // makes the active pill bigger
const ICON_LABEL_GAP = 6; // space between icon and label

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
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: darkColors.primary,
        tabBarInactiveTintColor: darkColors.tabInactive,
        tabBarStyle: [
          styles.tabBar,
          {
            height: spacing.tabBarHeight + EXTRA_BAR_HEIGHT + insets.bottom,
            paddingBottom: Math.max(insets.bottom, spacing.xs),
          },
        ],
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
    paddingTop: spacing.sm,
    backgroundColor: darkColors.tabBar,
    borderTopWidth: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  tabItem: {
    paddingTop: spacing.xs,
  },
  tabLabel: {
    ...typography.tabLabel,
    marginTop: ICON_LABEL_GAP,
  },
  iconBox: {
    width: spacing.tabIconActiveBox + ICON_BOX_EXTRA,
    height: spacing.tabIconActiveBox + ICON_BOX_EXTRA,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.round,
  },
  activeIconBox: {
    backgroundColor: darkColors.primary,
  },
});