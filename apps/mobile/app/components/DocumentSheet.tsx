import { FC, useEffect, useState } from "react"
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { WebView } from "react-native-webview"

import { AppIcon } from "@/components/AppIcon"
import { CODE_STYLE } from "@/components/markdownStyles"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { hapticImpact } from "@/utils/haptics"

const SCREEN_H = Dimensions.get("window").height
const CLOSED = SCREEN_H
const DISMISS_THRESHOLD = 120
const SPRING = { damping: 22, stiffness: 240, mass: 0.7 }

export interface ViewableDocument {
  name: string
  contentType: string
  /** A short-lived signed URL, for the types a WebView can render. */
  url: string | null
  /** Decoded by the API, for the types it cannot. */
  text: string | null
  /** True when the text is only the first window of a longer document. */
  truncated?: boolean
}

/**
 * How to show a document, by type.
 *
 * A WKWebView renders a PDF or an image and nothing else useful: handed
 * `text/markdown` or `text/csv` it draws a blank white page, which reads as a
 * broken document rather than an unsupported one. So text comes from the API,
 * already decoded, and the WebView is kept for the two types it is good at.
 */
function presentation(contentType: string): "web" | "text" | "none" {
  if (contentType.startsWith("image/") || contentType === "application/pdf") return "web"
  if (
    contentType.startsWith("text/") ||
    contentType === "application/json" ||
    contentType === "application/xml"
  ) {
    return "text"
  }
  return "none"
}

/**
 * A Drive document, read inside the app.
 *
 * Handing the URL to `Linking.openURL` used to bounce the reader out to Safari:
 * they left Elliptic to read something Elliptic stores, and coming back meant
 * the app-switcher. This is the same document in a sheet that reaches the top of
 * the screen, so reading a contract is still being in the task you opened it
 * from — drag down (or tap the close button) and the task is right there.
 *
 * A dedicated sheet rather than the shared `Sheet`: that one wraps its children
 * in a ScrollView, and a WebView nested in a ScrollView cannot scroll itself.
 */
export const DocumentSheet: FC<{
  visible: boolean
  document: ViewableDocument | null
  onClose: () => void
}> = ({ visible, document, onClose }) => {
  const {
    theme: { colors, spacing, radius },
  } = useAppTheme()
  const insets = useSafeAreaInsets()
  const [mounted, setMounted] = useState(visible)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const translateY = useSharedValue(CLOSED)
  const backdrop = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      setMounted(true)
      setLoading(true)
      setFailed(false)
      backdrop.value = withTiming(1, { duration: 200 })
      translateY.value = withSpring(0, SPRING)
    } else if (mounted) {
      backdrop.value = withTiming(0, { duration: 180 })
      translateY.value = withTiming(CLOSED, { duration: 200 }, (finished) => {
        if (finished) runOnJS(setMounted)(false)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  // Only the grab area drags. Panning over the document itself belongs to the
  // document — that is how you scroll a long contract.
  const pan = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY)
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD || event.velocityY > 800) {
        runOnJS(hapticImpact)()
        runOnJS(onClose)()
      } else {
        translateY.value = withSpring(0, SPRING)
      }
    })

  const $sheetAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))
  const $backdropAnim = useAnimatedStyle(() => ({ opacity: backdrop.value }))

  if (!mounted) return null

  const mode = document ? presentation(document.contentType) : "none"
  const message = !document
    ? "Opening…"
    : failed
      ? "This document could not be shown"
      : mode === "none"
        ? `A ${document.contentType} document cannot be shown on the phone. Open it from the web app.`
        : mode === "text" && document.text === null
          ? "This document could not be read"
          : mode === "web" && document.url === null
            ? "This document could not be read"
            : null

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={$root}>
        <Animated.View
          style={[$backdropFill, { backgroundColor: colors.palette.overlay50 }, $backdropAnim]}
        >
          <Pressable style={$backdropFill} onPress={onClose} accessibilityLabel="Close document" />
        </Animated.View>

        <Animated.View
          style={[
            $sheet,
            {
              // Extended to the top: the status bar stays clear so the sheet
              // still reads as a sheet you can pull down.
              top: insets.top,
              backgroundColor: colors.elevated,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
            },
            $sheetAnim,
          ]}
        >
          <GestureDetector gesture={pan}>
            <View style={$grabArea}>
              <View style={[$handle, { backgroundColor: colors.borderStrong }]} />
              <View style={[$titleRow, { paddingHorizontal: spacing.lg }]}>
                <Text
                  preset="subheading"
                  text={document?.name ?? ""}
                  numberOfLines={1}
                  style={$flex}
                  accessibilityLabel={`Document ${document?.name ?? ""}`}
                />
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                >
                  <AppIcon name="x" size={20} color={colors.textDim} />
                </Pressable>
              </View>
            </View>
          </GestureDetector>

          <View style={[$body, { borderTopColor: colors.separator }]}>
            {message === null && mode === "web" && document?.url ? (
              <WebView
                source={{ uri: document.url }}
                style={$flex}
                originWhitelist={["http://*", "https://*"]}
                onLoadEnd={() => setLoading(false)}
                onError={() => {
                  setLoading(false)
                  setFailed(true)
                }}
                // The document is ours and short-lived; nothing in it should be
                // able to navigate the sheet somewhere else or open an app.
                javaScriptEnabled={false}
                allowsInlineMediaPlayback
                setSupportMultipleWindows={false}
              />
            ) : null}

            {message === null && mode === "text" && document?.text !== null ? (
              <ScrollView
                style={$flex}
                contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 24 }}
              >
                <Text
                  text={document?.text ?? ""}
                  size="xs"
                  style={[CODE_STYLE, { color: colors.text }]}
                />
                {document?.truncated ? (
                  <Text
                    size="xxs"
                    style={[$note, { color: colors.textDim }]}
                    text="Showing the start of the document. Open it from the web app for the rest."
                  />
                ) : null}
              </ScrollView>
            ) : null}

            {message !== null ? (
              <View style={[$centre, { paddingHorizontal: spacing.xl }]}>
                <Text size="xs" style={[$middle, { color: colors.textDim }]} text={message} />
              </View>
            ) : loading && mode === "web" ? (
              <View style={$centre} pointerEvents="none">
                <Text size="xs" style={{ color: colors.textDim }} text="Opening…" />
              </View>
            ) : null}
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  )
}

const $root: ViewStyle = { flex: 1 }
const $flex: ViewStyle = { flex: 1 }
const $backdropFill: ViewStyle = StyleSheet.absoluteFillObject
const $sheet: ViewStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  overflow: "hidden",
}
const $grabArea: ViewStyle = { paddingTop: 8, gap: 8 }
const $handle: ViewStyle = {
  alignSelf: "center",
  width: 36,
  height: 4,
  borderRadius: 2,
}
const $titleRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingBottom: 10,
}
const $body: ViewStyle = { flex: 1, borderTopWidth: 1 }
const $centre: ViewStyle = {
  ...StyleSheet.absoluteFillObject,
  alignItems: "center",
  justifyContent: "center",
}
const $middle: TextStyle = { textAlign: "center" }
const $note: TextStyle = { marginTop: 16 }
