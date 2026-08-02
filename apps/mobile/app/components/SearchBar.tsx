import { FC } from "react"
// eslint-disable-next-line no-restricted-imports
import { ActivityIndicator, Pressable, TextInput, View, ViewStyle } from "react-native"

import { AppIcon } from "@/components/AppIcon"
import { GlassSurface, LIQUID_GLASS } from "@/components/Glass"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { typography } from "@/theme/typography"

/** A search field: leading icon, spinner while querying, clear and cancel. */
export const SearchBar: FC<{
  value: string
  onChangeText: (t: string) => void
  placeholder?: string
  autoFocus?: boolean
  /** Shows a spinner in place of the clear button while a query is in flight. */
  loading?: boolean
  /** Renders a trailing "Cancel" that dismisses the search. */
  onCancel?: () => void
}> = ({ value, onChangeText, placeholder = "Search…", autoFocus, loading, onCancel }) => {
  const {
    theme: { colors, radius, spacing },
  } = useAppTheme()
  const field = (
    <GlassSurface
      clear
      style={[
        $bar,
        { borderRadius: radius.full, paddingHorizontal: spacing.sm },
        !LIQUID_GLASS && [
          $bordered,
          { backgroundColor: colors.surface, borderColor: colors.inputBorder },
        ],
      ]}
    >
      <AppIcon name="search" size={18} color={colors.textDim} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={[$input, { color: colors.text, fontFamily: typography.primary.normal }]}
      />
      {loading ? (
        <ActivityIndicator size="small" color={colors.textDim} />
      ) : value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText("")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <AppIcon name="circle-x" size={18} color={colors.textDim} />
        </Pressable>
      ) : null}
    </GlassSurface>
  )

  if (!onCancel) return field

  return (
    <View style={[$row, { gap: spacing.sm }]}>
      {field}
      <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button">
        <Text text="Cancel" size="sm" weight="medium" style={{ color: colors.tint }} />
      </Pressable>
    </View>
  )
}

const $row: ViewStyle = { flexDirection: "row", alignItems: "center" }
const $bordered: ViewStyle = { borderWidth: 1 }

const $bar: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  height: 44,
}
const $input = { flex: 1, fontSize: 15, padding: 0 } as const
