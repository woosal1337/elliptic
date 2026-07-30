import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from "react-native"
import { BlurView } from "expo-blur"
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
 * A Linear-style floating tab bar: a frosted rounded pill of icon-only tabs, the
 * active one wrapped in a tinted capsule. It floats over the content (screens
 * pad their lists by TAB_BAR_CLEARANCE so nothing hides underneath) and fires a
 * selection haptic on press.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const {
    theme: { colors, radius },
    themeContext,
  } = useAppTheme()
  const insets = useSafeAreaInsets()

  // A pushed screen can hide the bar (see useHideTabBar) when it owns the
  // bottom of the window — e.g. a pinned composer above the keyboard.
  const theme = themeContext
  const focusedOptions = descriptors[state.routes[state.index]?.key ?? ""]?.options
  const focusedBarStyle = StyleSheet.flatten(focusedOptions?.tabBarStyle as StyleProp<ViewStyle>)
  if (focusedBarStyle?.display === "none") return null

  return (
    <View style={[$wrap, { paddingBottom: insets.bottom + 6 }]}>
      <View style={[$pillShadow, { borderRadius: radius.full }]}>
        <BlurView
          intensity={theme === "dark" ? 40 : 55}
          tint={theme === "dark" ? "dark" : "light"}
          style={[
            $pill,
            {
              borderColor: colors.border,
              borderRadius: radius.full,
              backgroundColor: colors.palette.tabBarFill,
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
                      backgroundColor: focused ? colors.accentMuted : colors.transparent,
                    },
                  ]}
                >
                  <Ionicons
                    name={focused ? icon.active : icon.inactive}
                    size={22}
                    color={focused ? colors.tint : colors.navText}
                  />
                  {badge != null ? (
                    <View
                      style={[
                        $badge,
                        { backgroundColor: colors.tint, borderColor: colors.elevated },
                      ]}
                    >
                      <Text text={String(badge)} style={[$badgeText, { color: colors.onTint }]} />
                    </View>
                  ) : null}
                </View>
              </PlatformPressable>
            )
          })}
        </BlurView>
      </View>
    </View>
  )
}

/** Bottom padding a scrollable screen needs so its last row clears the bar. */
export const TAB_BAR_CLEARANCE = 96

const $wrap: ViewStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  paddingHorizontal: 24,
  paddingTop: 6,
}
// The shadow lives on the wrapper: a clipping view can't cast one.
const $pillShadow: ViewStyle = {
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
}
const $pill: ViewStyle = {
  flexDirection: "row",
  overflow: "hidden",
  alignItems: "center",
  justifyContent: "space-between",
  borderWidth: 1,
  paddingHorizontal: 10,
  paddingVertical: 8,
}
const $tab: ViewStyle = { flex: 1, alignItems: "center" }
const $capsule: ViewStyle = {
  paddingHorizontal: 18,
  paddingVertical: 7,
  alignItems: "center",
  justifyContent: "center",
}
const $badgeText: TextStyle = { fontSize: 10, lineHeight: 13 }
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
