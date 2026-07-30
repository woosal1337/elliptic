import { useEffect } from "react"
import { useNavigation } from "@react-navigation/native"

/**
 * Hides the floating tab bar while this screen is mounted, and restores it on
 * the way back. For pushed screens that own the bottom of the window — a pinned
 * composer, an editor toolbar — where a tab bar underneath would both crowd the
 * screen and fight the keyboard.
 */
export function useHideTabBar() {
  const navigation = useNavigation()
  useEffect(() => {
    const parent = navigation.getParent()
    parent?.setOptions({ tabBarStyle: { display: "none" } })
    return () => parent?.setOptions({ tabBarStyle: undefined })
  }, [navigation])
}
