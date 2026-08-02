import { FC, ReactNode, useCallback, useMemo, useState } from "react"
// The app's Text wrapper is the right default everywhere else, but children of
// a TextInput must be plain RN Text: they contribute fragments to the native
// attributed string instead of mounting views, which is the whole mechanism
// that lets a heading be drawn at heading size inside a live input.
// eslint-disable-next-line no-restricted-imports
import { Text as RNText, TextInput, TextStyle, View, ViewStyle } from "react-native"

import { BODY_STYLE, ITALIC_STYLE, lineStyle } from "@/components/markdownStyles"
import { useAppTheme } from "@/theme/context"
import { typography } from "@/theme/typography"
import { parseInline } from "@/utils/markdown"
import { toLines } from "@/utils/markdownEditor"

export interface MarkdownEditorProps {
  /** Markdown source. Also the buffer — the two are the same string. */
  value: string
  onChangeMarkdown: (markdown: string) => void
  onBlur?: () => void
  placeholder?: string
  autoFocus?: boolean
  minHeight?: number
  style?: ViewStyle
}

/**
 * A description editor that stays formatted while you type.
 *
 * One `TextInput` rendered in children mode: the nested `<Text>` nodes become
 * fragments of the native attributed string, so a heading is drawn at heading
 * size inside the live input rather than in a separate preview. One input
 * rather than one per line is deliberate — iOS selection cannot span two text
 * views, and losing select-all across a description would be worse than
 * anything this fixes.
 *
 * The markers stay on screen, dimmed. That is not a styling compromise but a
 * consequence of how RN works: children updates restyle the text, they do not
 * rewrite it, so an editor of this shape can make "# " grey but cannot make it
 * disappear. Everything else — heading type, bullet, code face, strikethrough
 * — is live as you type.
 */
export const MarkdownEditor: FC<MarkdownEditorProps> = ({
  value,
  onChangeMarkdown,
  onBlur,
  placeholder,
  autoFocus,
  minHeight = 220,
  style,
}) => {
  const {
    theme: { colors, spacing, radius },
  } = useAppTheme()

  const [markdown, setMarkdown] = useState(value)
  // Re-derived on every keystroke rather than maintained incrementally.
  // Parsing is cheap, and unlike bookkeeping it cannot fall out of step with
  // the text the user can see.
  const lines = useMemo(() => toLines(markdown), [markdown])

  const handleChange = useCallback(
    (next: string) => {
      setMarkdown(next)
      onChangeMarkdown(next)
    },
    [onChangeMarkdown],
  )

  const children: ReactNode[] = []
  lines.forEach((line, index) => {
    children.push(
      <RNText key={`l${index}`} style={lineStyle(line.kind, colors)}>
        {line.lead ? <RNText style={{ color: colors.textDim }}>{line.lead}</RNText> : null}
        {line.kind.type === "code" || line.kind.type === "raw"
          ? line.text
          : renderInline(line.text, colors, `${index}`)}
      </RNText>,
    )
    // The newline is a character of the buffer; it has to be emitted or the
    // input's text stops matching the value handed back to the caller.
    if (index < lines.length - 1) children.push(<RNText key={`n${index}`}>{"\n"}</RNText>)
  })

  return (
    <View
      style={[
        $wrap,
        {
          minHeight,
          borderRadius: radius.lg,
          backgroundColor: colors.elevated,
          borderColor: colors.border,
          padding: spacing.sm,
        },
        style,
      ]}
    >
      {/* Never add `value` here. iOS appends the value fragment *and* the
          children fragments, so the description renders twice — and the
          invariant that catches it lives in React Native's Android branch. */}
      <TextInput
        multiline
        autoFocus={autoFocus}
        onChangeText={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        textAlignVertical="top"
        style={[$input, { color: colors.text, minHeight: minHeight - spacing.sm * 2 }]}
      >
        {children}
      </TextInput>
    </View>
  )
}

/** Inline emphasis, styled in place with its own markers dimmed. */
function renderInline(
  text: string,
  colors: ReturnType<typeof useAppTheme>["theme"]["colors"],
  keyPrefix: string,
): ReactNode[] {
  const dim = { color: colors.textDim }
  return parseInline(text).map((span, i) => {
    const key = `${keyPrefix}-${i}`
    const wrapped = (marker: string, inner: TextStyle) => (
      <RNText key={key}>
        <RNText style={dim}>{marker}</RNText>
        <RNText style={inner}>{span.text}</RNText>
        <RNText style={dim}>{marker}</RNText>
      </RNText>
    )
    switch (span.kind) {
      case "bold":
        return wrapped("**", { fontFamily: typography.primary.semiBold })
      case "italic":
        return wrapped("*", ITALIC_STYLE)
      case "boldItalic":
        return wrapped("***", { ...ITALIC_STYLE, fontWeight: "600" })
      case "strike":
        return wrapped("~~", $strike)
      case "code":
        return wrapped("`", { fontFamily: typography.code.normal })
      case "link":
        return (
          <RNText key={key}>
            <RNText style={dim}>[</RNText>
            <RNText style={{ color: colors.tint }}>{span.text}</RNText>
            <RNText style={dim}>{`](${span.href})`}</RNText>
          </RNText>
        )
      default:
        return <RNText key={key}>{span.text}</RNText>
    }
  })
}

const $wrap: ViewStyle = { borderWidth: 1 }
const $input: TextStyle = { ...BODY_STYLE, fontFamily: typography.primary.normal }

const $strike: TextStyle = { textDecorationLine: "line-through" }
