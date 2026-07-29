import { View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { BottomTabBarProps } from "@react-navigation/bottom-tabs"
import { PlatformPressable } from "@react-navigation/elements"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Text } from "@/components/Text"
import type { MainTabParamList } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import { hapticSelection } from "@/utils/haptics"

const ICONS: Record<
  keyof MainTabParamList,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  Home: { active: "home", inactive: "home-outline" },
  Tasks: { active: "checkbox", inactive: "checkbox-outline" },
  Notes: { active: "document-text", inactive: "document-text-outline" },
  Inbox: { active: "notifications", inactive: "notifications-outline" },
  Profile: { active: "person", inactive: "person-outline" },
}

/**
 * A Linear-style floating tab bar: a rounded pill of icon-only tabs, the active
 * one wrapped in a tinted capsule. Reserves its own height (no content overlap),
 * fires a selection haptic on press.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const {
    theme: { colors, radius },
  } = useAppTheme()
  const insets = useSafeAreaInsets()

  return (
    <View style={[$wrap, { paddingBottom: insets.bottom + 6, backgroundColor: colors.background }]}>
      <View
        style={[
          $pill,
          {
            backgroundColor: colors.elevated,
            borderColor: colors.border,
            borderRadius: radius.full,
            shadowColor: "#000",
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index
          const name = route.name as keyof MainTabParamList
          const icon = ICONS[name]
          const badge = descriptors[route.key]?.options.tabBarBadge

          const onPress = () => {
            hapticSelection()
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            })
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name)
            }
          }

          return (
            <PlatformPressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={`${name}, tab, ${index + 1} of ${state.routes.length}`}
              onPress={onPress}
              style={$tab}
            >
              <View
                style={[
                  $capsule,
                  {
                    borderRadius: radius.full,
                    backgroundColor: focused ? colors.accentMuted : "transparent",
                  },
                ]}
              >
                <Ionicons
                  name={focused ? icon.active : icon.inactive}
                  size={22}
                  color={focused ? colors.tint : colors.navText}
                />
                {badge != null ? (
                  <View style={[$badge, { backgroundColor: colors.tint, borderColor: colors.elevated }]}>
                    <Text
                      text={String(badge)}
                      style={{ color: colors.onTint, fontSize: 10, lineHeight: 13 }}
                    />
                  </View>
                ) : null}
              </View>
            </PlatformPressable>
          )
        })}
      </View>
    </View>
  )
}

const $wrap: ViewStyle = {
  paddingHorizontal: 24,
  paddingTop: 6,
}
const $pill: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  borderWidth: 1,
  paddingHorizontal: 10,
  paddingVertical: 8,
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
}
const $tab: ViewStyle = { flex: 1, alignItems: "center" }
const $capsule: ViewStyle = {
  paddingHorizontal: 18,
  paddingVertical: 7,
  alignItems: "center",
  justifyContent: "center",
}
const $badge: ViewStyle = {
  position: "absolute",
  top: -2,
  right: 8,
  minWidth: 16,
  height: 16,
  borderRadius: 8,
  borderWidth: 1.5,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 3,
}
