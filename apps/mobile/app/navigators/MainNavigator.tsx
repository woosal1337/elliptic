import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"

import { useOrg } from "@/context/OrgContext"
import { FloatingTabBar } from "@/navigators/FloatingTabBar"
import { HomeNavigator } from "@/navigators/HomeNavigator"
import { InboxNavigator } from "@/navigators/InboxNavigator"
import { NotesNavigator } from "@/navigators/NotesNavigator"
import { ProfileNavigator } from "@/navigators/ProfileNavigator"
import { TasksNavigator } from "@/navigators/TasksNavigator"
import { useUnreadCount } from "@/utils/useUnreadCount"

import type { MainTabParamList } from "./navigationTypes"

const Tab = createBottomTabNavigator<MainTabParamList>()

export function MainNavigator() {
  const { activeOrg } = useOrg()
  const unread = useUnreadCount(activeOrg?.id)

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
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
