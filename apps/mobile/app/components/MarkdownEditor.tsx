import { FC, ReactNode, useCallback, useMemo, useRef, useState } from "react"
// The app's Text wrapper is the right default everywhere else, but children of
// a TextInput must be plain RN Text: they contribute fragments to the native
// attributed string instead of mounting views, which is the whole mechanism
// that lets a heading be drawn at heading size inside a live input.
// eslint-disable-next-line no-restricted-imports
import { Text as RNText, TextInput, TextStyle, View, ViewStyle } from "react-native"

import { BODY_STYLE, lineStyle } from "@/components/markdownStyles"
import { useAppTheme } from "@/theme/context"
import { typography } from "@/theme/typography"
import { parseInline } from "@/utils/markdown"
import {
  applyEdit,
  caretAfterEdit,
  displayLead,
  toDisplay,
  toLines,
  toMarkdown,
  type EditorLine,
} from "@/utils/markdownEditor"

export interface MarkdownEditorProps {
  /** Markdown source. Read once on mount; the editor owns it afterwards. */
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
 * It is one `TextInput` rendered in children mode: the nested `<Text>` nodes
 * become fragments of the native attributed string, so a heading is drawn at
 * heading size inside the live input rather than in a separate preview. Using
 * one input rather than one per line is deliberate — iOS selection cannot span
 * two text views, and losing select-all across a description would be a worse
 * regression than anything this feature fixes.
 *
 * The buffer the user sees is marker-free (see `utils/markdownEditor`), so
 * typing "# " leaves a heading with no visible "#".
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

  // The markdown prop seeds the document; after that the line model is the
  // source of truth, because re-deriving it from markdown on every keystroke
  // would discard the kinds the input rules just assigned.
  const [lines, setLines] = useState<EditorLine[]>(() => toLines(value))
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>()
  const display = useMemo(() => toDisplay(lines), [lines])
  const displayRef = useRef(display)
  displayRef.current = display

  const handleChange = useCallback(
    (next: string) => {
      const caret = caretAfterEdit(displayRef.current, next)
      const result = applyEdit(lines, next, caret)
      setLines(result.lines)
      // Only pin the caret when a rule moved it; otherwise controlling
      // selection every keystroke fights the user's own taps and drags.
      setSelection(result.caret === caret ? undefined : { start: result.caret, end: result.caret })
      onChangeMarkdown(toMarkdown(result.lines))
    },
    [lines, onChangeMarkdown],
  )

  const children: ReactNode[] = []
  lines.forEach((line, index) => {
    const text = `${displayLead(line)}${line.text}`
    children.push(
      <RNText key={`l${index}`} style={lineStyle(line.kind, colors)}>
        {line.kind.type === "code" || line.kind.type === "raw"
          ? text
          : renderInline(text, colors, `${index}`)}
      </RNText>,
    )
    // The newline is a character of the buffer; it has to be emitted or the
    // input's value stops matching the model.
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
          invariant that catches it is inside React Native's Android branch. */}
      <TextInput
        multiline
        autoFocus={autoFocus}
        onChangeText={handleChange}
        onBlur={onBlur}
        onSelectionChange={() => setSelection(undefined)}
        selection={selection}
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

/**
 * Inline emphasis, styled in place. Unlike the block markers these are left
 * visible: eating `**` mid-line would mean rewriting text the caret is sitting
 * inside on every keystroke, and that is exactly the caret arithmetic this
 * design avoids. Dimming them keeps the sentence readable.
 */
function renderInline(
  text: string,
  colors: ReturnType<typeof useAppTheme>["theme"]["colors"],
  keyPrefix: string,
): ReactNode[] {
  return parseInline(text).map((span, i) => {
    const key = `${keyPrefix}-${i}`
    switch (span.kind) {
      case "bold":
        return (
          <RNText key={key} style={{ fontFamily: typography.primary.semiBold }}>
            {`**${span.text}**`}
          </RNText>
        )
      case "italic":
        return <RNText key={key} style={$italic}>{`*${span.text}*`}</RNText>
      case "boldItalic":
        return (
          <RNText key={key} style={[$italic, { fontFamily: typography.primary.semiBold }]}>
            {`***${span.text}***`}
          </RNText>
        )
      case "strike":
        return <RNText key={key} style={$strike}>{`~~${span.text}~~`}</RNText>
      case "code":
        return (
          <RNText key={key} style={{ fontFamily: typography.code.normal }}>
            {`\`${span.text}\``}
          </RNText>
        )
      case "link":
        return (
          <RNText key={key} style={{ color: colors.tint }}>
            {`[${span.text}](${span.href})`}
          </RNText>
        )
      default:
        return <RNText key={key}>{span.text}</RNText>
    }
  })
}

const $wrap: ViewStyle = { borderWidth: 1 }
const $input: TextStyle = { ...BODY_STYLE, fontFamily: typography.primary.normal }
const $italic: TextStyle = { fontStyle: "italic" }
const $strike: TextStyle = { textDecorationLine: "line-through" }
