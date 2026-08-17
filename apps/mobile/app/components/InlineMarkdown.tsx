import { FC, Fragment, ReactNode } from "react"
import { TextStyle } from "react-native"

import { CODE_STYLE, ITALIC_STYLE } from "@/components/markdownStyles"
import { Text, TextProps } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { parseInline, type Span } from "@/utils/markdown"
import { openMarkdownLink } from "@/utils/mentionLink"

/**
 * Inline markdown for one-line strings — titles, mostly.
 *
 * Titles are written in the same editor as descriptions, so they arrive with the
 * same syntax in them: `safe`, **shipped**, ~~dropped~~. Rendering them as plain
 * text left the markers on screen, which reads as a typo rather than as markup.
 *
 * Deliberately inline only. A title is one line in a fixed-height row, so blocks
 * have nothing to say there: a table or a heading would either break the row or
 * truncate into nonsense. Anything block-level stays literal, which is the
 * honest outcome — the character was typed, and no layout is harmed by showing
 * it.
 *
 * Links render as their text and stay tappable, but a title is usually inside a
 * pressable row, so the row's own press wins unless the link is hit directly.
 */
export const InlineMarkdown: FC<
  { text: string; numberOfLines?: number } & Pick<TextProps, "size" | "weight" | "style" | "preset">
> = ({ text, numberOfLines, size, weight, style, preset }) => {
  const {
    theme: { colors },
  } = useAppTheme()

  const spans: Span[] = parseInline(text)

  // Nothing to mark up: render one Text so truncation behaves exactly as it did
  // before. Ellipsizing across sibling Texts is measured per child, so a plain
  // title should not start taking a different code path than it used to.
  if (spans.length === 1 && spans[0].kind === "text") {
    return (
      <Text
        text={text}
        size={size}
        weight={weight}
        preset={preset}
        style={style}
        numberOfLines={numberOfLines}
      />
    )
  }

  const rendered: ReactNode[] = spans.map((span, i) => {
    const key = `s-${i}`
    switch (span.kind) {
      case "bold":
        return <Text key={key} weight="semiBold" text={span.text} />
      case "italic":
        return <Text key={key} style={ITALIC_STYLE} text={span.text} />
      case "boldItalic":
        return <Text key={key} weight="semiBold" style={ITALIC_STYLE} text={span.text} />
      case "strike":
        return <Text key={key} style={$strike} text={span.text} />
      case "code":
        return <Text key={key} text={span.text} style={[CODE_STYLE, { color: colors.text }]} />
      case "link":
        return (
          <Text
            key={key}
            text={span.text}
            style={{ color: colors.tint }}
            onPress={() => openMarkdownLink(span.href, span.text)}
          />
        )
      default:
        return <Fragment key={key}>{span.text}</Fragment>
    }
  })

  return (
    <Text size={size} weight={weight} preset={preset} style={style} numberOfLines={numberOfLines}>
      {rendered}
    </Text>
  )
}

const $strike: TextStyle = { textDecorationLine: "line-through" }
