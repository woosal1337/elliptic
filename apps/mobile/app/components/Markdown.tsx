import { FC, Fragment, ReactNode } from "react"
import { ScrollView, StyleSheet, TextStyle, View, ViewStyle } from "react-native"

import { CODE_STYLE, headingStyle, ITALIC_STYLE } from "@/components/markdownStyles"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { typography } from "@/theme/typography"
import { parseBlocks, parseInline, type Block, type Span } from "@/utils/markdown"
import { openMarkdownLink } from "@/utils/mentionLink"

/**
 * Read-only markdown for task descriptions, comments and notes.
 *
 * The grammar it understands is deliberately the same one the web's TipTap
 * editor can write, because both surfaces read and write the same column — a
 * description composed on the web used to arrive here with its `####`, `1.`,
 * `>`, fences and `~~` showing as literal characters.
 */
export const Markdown: FC<{ source: string }> = ({ source }) => {
  const {
    theme: { colors },
  } = useAppTheme()

  const renderSpans = (spans: Span[], keyPrefix: string): ReactNode[] =>
    spans.map((span, i) => {
      const key = `${keyPrefix}-${i}`
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
          return <Text key={key} text={span.text} style={[$code, { color: colors.text }]} />
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

  const renderBlock = (block: Block, key: number): ReactNode => {
    switch (block.kind) {
      case "blank":
        return null

      case "heading":
        return (
          <Text key={key} style={headingStyle(block.level)}>
            {renderSpans(parseInline(block.text), String(key))}
          </Text>
        )

      case "bullet":
        return (
          <View key={key} style={[$row, { paddingLeft: block.indent * 8 }]}>
            <Text text="•" style={[$marker, { color: colors.textDim }]} />
            <Text style={$flex}>{renderSpans(parseInline(block.text), String(key))}</Text>
          </View>
        )

      case "ordered":
        return (
          <View key={key} style={[$row, { paddingLeft: block.indent * 8 }]}>
            <Text text={block.marker} style={[$marker, { color: colors.textDim }]} />
            <Text style={$flex}>{renderSpans(parseInline(block.text), String(key))}</Text>
          </View>
        )

      case "code":
        return (
          <View key={key} style={[$codeBlock, { backgroundColor: colors.subtle }]}>
            <Text text={block.lines.join("\n")} style={[$codeText, { color: colors.text }]} />
          </View>
        )

      case "rule":
        return <View key={key} style={[$rule, { backgroundColor: colors.border }]} />

      case "table":
        return (
          <ScrollView
            key={key}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={$tableScroll}
          >
            <View style={[$table, { borderColor: colors.border }]}>
              <View style={[$tableRow, { backgroundColor: colors.subtle }]}>
                {block.header.map((cell, c) => (
                  <View key={c} style={[$cell, { borderColor: colors.border }]}>
                    <Text weight="semiBold" size="xs" style={{ textAlign: block.align[c] }}>
                      {renderSpans(parseInline(cell), `${key}h${c}`)}
                    </Text>
                  </View>
                ))}
              </View>
              {block.rows.map((row, r) => (
                <View key={r} style={[$tableRow, { borderTopColor: colors.border }]}>
                  {row.map((cell, c) => (
                    <View key={c} style={[$cell, { borderColor: colors.border }]}>
                      <Text size="xs" style={{ textAlign: block.align[c] }}>
                        {renderSpans(parseInline(cell), `${key}r${r}c${c}`)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        )

      // Grammar the parser does not model (tables, HTML, footnotes) shows as
      // its own source rather than vanishing — visible beats silently dropped.
      case "raw":
        return <Text key={key} text={block.text} style={[$para, { color: colors.textDim }]} />

      default:
        return (
          <Text key={key} style={$para}>
            {renderSpans(parseInline(block.text), String(key))}
          </Text>
        )
    }
  }

  /**
   * Every `>` line is its own block, because the parser keeps one block per
   * source line so a round trip cannot lose anything. A quote is not one line
   * though, and rendering each block separately gave every line its own rule
   * with the paragraph gap showing through — the bar down the side of a
   * multi-line quote came out as a column of dashes. Consecutive quote lines
   * are drawn inside one bordered group; anything else ends the run, so a
   * blank line between two quotes still separates them.
   */
  const renderBlocks = (blocks: Block[]): ReactNode[] => {
    const out: ReactNode[] = []
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i]!.kind !== "quote") {
        out.push(renderBlock(blocks[i]!, i))
        continue
      }
      const start = i
      const run: Extract<Block, { kind: "quote" }>[] = []
      while (i < blocks.length && blocks[i]!.kind === "quote") {
        run.push(blocks[i++] as Extract<Block, { kind: "quote" }>)
      }
      i--
      out.push(
        <View key={start} style={[$quote, { borderLeftColor: colors.borderStrong }]}>
          {run.map((line, n) => (
            <Text key={n} style={{ color: colors.textDim }}>
              {renderSpans(parseInline(line.text), `${start}-${n}`)}
            </Text>
          ))}
        </View>,
      )
    }
    return out
  }

  return <View style={$block}>{renderBlocks(parseBlocks(source))}</View>
}

const $block: ViewStyle = { gap: 6 }
const $flex: ViewStyle = { flex: 1 }
const $row: ViewStyle = { flexDirection: "row", gap: 8 }
const $marker: TextStyle = { minWidth: 16 }

const $strike: TextStyle = { textDecorationLine: "line-through" }
const $code: TextStyle = { fontFamily: typography.code.normal, fontSize: 13, borderRadius: 4 }
const $codeBlock: ViewStyle = { borderRadius: 8, padding: 10 }
const $codeText: TextStyle = { ...CODE_STYLE }
const $quote: ViewStyle = { borderLeftWidth: 3, paddingLeft: 10, gap: 4 }
const $rule: ViewStyle = { height: 1, marginVertical: 4 }
const $para: TextStyle = { lineHeight: 22 }

// A table can be wider than the phone; it scrolls itself rather than forcing
// the description to wrap into unreadable columns.
const $tableScroll: ViewStyle = { marginVertical: 2 }
const $table: ViewStyle = { borderWidth: 1, borderRadius: 8, overflow: "hidden" }
const $tableRow: ViewStyle = { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth }
const $cell: ViewStyle = {
  minWidth: 96,
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderLeftWidth: StyleSheet.hairlineWidth,
}
