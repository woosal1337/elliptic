import { createNativeBottomTabNavigator } from "@bottom-tabs/react-navigation"
import type { SFSymbol } from "sf-symbols-typescript"

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

const Tab = createNativeBottomTabNavigator<MainTabParamList>()

/** SF Symbols, so the bar draws system glyphs instead of an icon font. */
const ICONS: Record<keyof MainTabParamList, { active: SFSymbol; inactive: SFSymbol }> = {
  Home: { active: "house.fill", inactive: "house" },
  Tasks: { active: "checklist.checked", inactive: "checklist" },
  Notes: { active: "doc.text.fill", inactive: "doc.text" },
  Inbox: { active: "bell.fill", inactive: "bell" },
  Profile: { active: "person.crop.circle.fill", inactive: "person.crop.circle" },
}

const icon =
  (name: keyof MainTabParamList) =>
  ({ focused }: { focused: boolean }) => ({
    sfSymbol: focused ? ICONS[name].active : ICONS[name].inactive,
  })

function Tabs() {
  const { activeOrg } = useOrg()
  const unread = useUnreadCount(activeOrg?.id)
  const {
    theme: { colors },
  } = useAppTheme()
  const hidden = useTabBarHidden()

  return (
    <Tab.Navigator
      tabBarActiveTintColor={colors.tint}
      tabBarHidden={hidden}
      hapticFeedbackEnabled
      // iOS 26: the bar minimises itself as content scrolls up.
      minimizeBehavior="onScrollDown"
    >
      <Tab.Screen name="Home" component={HomeNavigator} options={{ tabBarIcon: icon("Home") }} />
      <Tab.Screen name="Tasks" component={TasksNavigator} options={{ tabBarIcon: icon("Tasks") }} />
      <Tab.Screen name="Notes" component={NotesNavigator} options={{ tabBarIcon: icon("Notes") }} />
      <Tab.Screen
        name="Inbox"
        component={InboxNavigator}
        options={{
          tabBarIcon: icon("Inbox"),
          tabBarBadge: unread > 0 ? String(unread) : undefined,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{ tabBarIcon: icon("Profile") }}
      />
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
