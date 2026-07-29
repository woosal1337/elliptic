import { FC, Fragment, ReactNode } from "react"
import { Linking, TextStyle, View, ViewStyle } from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { typography } from "@/theme/typography"

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g

/** Lightweight read-only markdown for task descriptions / comments (RN). */
export const Markdown: FC<{ source: string }> = ({ source }) => {
  const {
    theme: { colors },
  } = useAppTheme()

  const renderInline = (text: string): ReactNode[] =>
    text.split(INLINE).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <Text key={i} weight="semiBold" text={part.slice(2, -2)} />
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <Text
            key={i}
            text={part.slice(1, -1)}
            style={[$code, { backgroundColor: colors.subtle, color: colors.text }]}
          />
        )
      }
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
      if (link && link[1] && link[2]) {
        const href = link[2]
        const safe = href.startsWith("/") || /^https?:\/\/|^mailto:/i.test(href)
        if (safe) {
          return (
            <Text
              key={i}
              text={link[1]}
              style={{ color: colors.tint }}
              onPress={() => void Linking.openURL(href)}
            />
          )
        }
        return <Fragment key={i}>{link[1]}</Fragment>
      }
      return <Fragment key={i}>{part}</Fragment>
    })

  const lines = source.split("\n")
  return (
    <View style={$block}>
      {lines.map((line, idx) => {
        if (line.trim().length === 0) return null
        const heading = /^(#{1,3})\s+(.*)$/.exec(line)
        if (heading && heading[2] !== undefined) {
          return (
            <Text key={idx} style={$heading}>
              {renderInline(heading[2])}
            </Text>
          )
        }
        const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
        if (bullet && bullet[1] !== undefined) {
          return <Text key={idx}>{["•  ", ...renderInline(bullet[1])]}</Text>
        }
        return (
          <Text key={idx} style={$para}>
            {renderInline(line)}
          </Text>
        )
      })}
    </View>
  )
}

const $block: ViewStyle = { gap: 6 }
const $code: TextStyle = { fontFamily: typography.code.normal, fontSize: 13, borderRadius: 4 }
const $heading: TextStyle = { fontFamily: typography.display.semiBold, fontSize: 17 }
const $para: TextStyle = { lineHeight: 22 }
