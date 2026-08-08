import { FC, useEffect, useState } from "react"
import { AppState, Image, ImageStyle, View, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"

const ICON = require("../../assets/images/app-icon.png")

const ICON_SIZE = 88

/**
 * Hides app content with a branded overlay whenever the app is not active
 * (app switcher, Face ID prompt, backgrounding) — a privacy screen (COS-234).
 *
 * Shows the app icon rather than the wordmark. This is the card the user scrubs
 * past in the switcher, where every other app is identified by its icon — a line
 * of text reads as a page that failed to load, and is slower to pick out than
 * the mark they already tap on the home screen.
 */
export const PrivacyOverlay: FC = () => {
  const {
    theme: { colors },
  } = useAppTheme()
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => setHidden(state !== "active"))
    return () => sub.remove()
  }, [])

  if (!hidden) return null
  return (
    <View style={[$overlay, { backgroundColor: colors.background }]} pointerEvents="none">
      <Image source={ICON} style={$icon} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  )
}

const $overlay: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  alignItems: "center",
  justifyContent: "center",
}
// The source is a full square — iOS and Android round the icon themselves, and a
// pre-rounded source shows dark wedges outside their mask — so the radius here
// is what gives the overlay the same silhouette the user taps on the home screen.
const $icon: ImageStyle = {
  width: ICON_SIZE,
  height: ICON_SIZE,
  borderRadius: ICON_SIZE * 0.22,
}
