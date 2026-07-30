import type { NativeStackNavigationOptions } from "@react-navigation/native-stack"

import { useAppTheme } from "@/theme/context"

/**
 * The chrome every stack in the app shares: themed header and content
 * background, no hairline shadow. List screens hide the header entirely and use
 * `ScreenHeader` instead (D2); detail screens keep the native one for its back
 * button and title animation.
 */
export function useStackScreenOptions(): NativeStackNavigationOptions {
  const {
    theme: { colors },
  } = useAppTheme()
  return {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background },
  }
}
