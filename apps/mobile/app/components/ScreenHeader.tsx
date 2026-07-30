import { FC, ReactNode } from "react"
import { Pressable, View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { hapticSelection } from "@/utils/haptics"

export interface HeaderAction {
  key: string
  icon: keyof typeof Ionicons.glyphMap
  /** Spoken label — also how test flows and screen readers find the button. */
  label: string
  onPress: () => void
  /** Accent-tinted: the screen's primary action (create, triage, …). */
  emphasis?: boolean
}

const SIZE = 34

/**
 * The screen title *is* the header — no nav bar — with icon actions grouped in
 * a pill top-right (D2, the Linear pattern). `children` render directly beneath
 * the title row so a segmented control or search field lines up with it.
 */
export const ScreenHeader: FC<{
  title: string
  subtitle?: string
  actions?: HeaderAction[]
  children?: ReactNode
}> = ({ title, subtitle, actions, children }) => {
  const {
    theme: { colors, spacing, radius },
  } = useAppTheme()
  return (
    <View
      style={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        // Content below always clears the title, with or without children.
        paddingBottom: spacing.sm,
        gap: spacing.sm,
      }}
    >
      <View style={$row}>
        <View style={$titleCol}>
          <Text preset="heading" text={title} numberOfLines={1} />
          {subtitle ? (
            <Text text={subtitle} size="xs" style={{ color: colors.textDim }} numberOfLines={1} />
          ) : null}
        </View>
        {actions?.length ? (
          <View style={[$pill, { backgroundColor: colors.subtle, borderRadius: radius.full }]}>
            {actions.map((a) => (
              <Pressable
                key={a.key}
                testID={`header-action-${a.key}`}
                accessibilityRole="button"
                accessibilityLabel={a.label}
                onPress={() => {
                  hapticSelection()
                  a.onPress()
                }}
                style={$action}
              >
                <Ionicons
                  name={a.icon}
                  size={19}
                  color={a.emphasis ? colors.tint : colors.textDim}
                />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      {children}
    </View>
  )
}

const $row: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 12 }
const $titleCol: ViewStyle = { flex: 1, gap: 2 }
const $pill: ViewStyle = { flexDirection: "row", alignItems: "center" }
const $action: ViewStyle = {
  width: SIZE,
  height: SIZE,
  alignItems: "center",
  justifyContent: "center",
}
