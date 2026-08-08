import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"

import { AppIcon, type IconName } from "@/components/AppIcon"
import { useOrg } from "@/context/OrgContext"
import { HomeNavigator } from "@/navigators/HomeNavigator"
import { InboxNavigator } from "@/navigators/InboxNavigator"
import { NotesNavigator } from "@/navigators/NotesNavigator"
import { ProfileNavigator } from "@/navigators/ProfileNavigator"
import { TabBarVisibilityProvider, useTabBarHidden } from "@/navigators/tabBarVisibility"
import { TasksNavigator } from "@/navigators/TasksNavigator"
import { useAppTheme } from "@/theme/context"
import { useUnreadCount } from "@/utils/useUnreadCount"

import type { MainTabParamList } from "./navigationTypes"

const Tab = createBottomTabNavigator<MainTabParamList>()

/**
 * Android's tab bar.
 *
 * iOS uses the native bar from `@bottom-tabs/react-navigation`, whose icons are
 * SF Symbols — an Apple format with no Android equivalent. Given one, the
 * Android bar drew no icons and collapsed to a black strip with a single
 * clipped label, so only the first tab was reachable.
 *
 * This is the JS tab bar instead, drawing the same lucide glyphs the rest of
 * the app uses. It costs the platform-native bar on Android and buys a bar that
 * exists, matches the theme, and shows all five destinations.
 */
const ICONS: Record<keyof MainTabParamList, IconName> = {
  Home: "house",
  Tasks: "square-check",
  Notes: "file-text",
  Inbox: "bell",
  Profile: "circle-user",
}

function Tabs() {
  const { activeOrg } = useOrg()
  const unread = useUnreadCount(activeOrg?.id)
  const {
    theme: { colors },
  } = useAppTheme()
  const hidden = useTabBarHidden()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.navText,
        tabBarStyle: hidden
          ? { display: "none" }
          : { backgroundColor: colors.background, borderTopColor: colors.separator },
        tabBarIcon: ({ color, size }) => (
          <AppIcon name={ICONS[route.name as keyof MainTabParamList]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Tasks" component={TasksNavigator} />
      <Tab.Screen name="Notes" component={NotesNavigator} />
      <Tab.Screen
        name="Inbox"
        component={InboxNavigator}
        options={{ tabBarBadge: unread > 0 ? unread : undefined }}
      />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  )
}

export function MainNavigator() {
  return (
    <TabBarVisibilityProvider>
      <Tabs />
    </TabBarVisibilityProvider>
  )
}
