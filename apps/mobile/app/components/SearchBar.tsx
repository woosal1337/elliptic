import { FC } from "react"
// eslint-disable-next-line no-restricted-imports
import { Pressable, TextInput, View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { useAppTheme } from "@/theme/context"
import { typography } from "@/theme/typography"

/** A search field: leading icon, clear button, themed. */
export const SearchBar: FC<{
  value: string
  onChangeText: (t: string) => void
  placeholder?: string
  autoFocus?: boolean
}> = ({ value, onChangeText, placeholder = "Search…", autoFocus }) => {
  const {
    theme: { colors, radius, spacing },
  } = useAppTheme()
  return (
    <View
      style={[
        $bar,
        {
          backgroundColor: colors.surface,
          borderColor: colors.inputBorder,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.sm,
        },
      ]}
    >
      <Ionicons name="search" size={18} color={colors.textDim} />
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
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.textDim} />
        </Pressable>
      ) : null}
    </View>
  )
}

const $bar: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  borderWidth: 1,
  height: 44,
}
const $input = { flex: 1, fontSize: 15, padding: 0 } as const
