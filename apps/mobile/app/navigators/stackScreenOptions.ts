import type { NativeStackNavigationOptions } from "@react-navigation/native-stack"

import { useAppTheme } from "@/theme/context"

/**
 * The chrome every stack shares. List screens hide the header and use
 * `ScreenHeader` instead (D2); detail screens keep the native one for its back
 * button and title animation.
 *
 * The header deliberately carries no background: forcing one opts out of the
 * system nav bar material, which on iOS 26 is Liquid Glass with the scroll-edge
 * effect. UIKit insets the content for us, so screens need no extra padding.
 */
export function useStackScreenOptions(): NativeStackNavigationOptions {
  const {
    theme: { colors },
  } = useAppTheme()
  return {
    headerTintColor: colors.text,
    headerTransparent: true,
    contentStyle: { backgroundColor: colors.background },
  }
}
