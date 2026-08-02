import { TextStyle } from "react-native"

import { textSizeStyles } from "@/components/Text"
import type { Theme } from "@/theme/types"
import { typography } from "@/theme/typography"
import type { LineKind } from "@/utils/markdownEditor"

/**
 * One type scale for markdown, shared by the reader and the editor.
 *
 * They must agree exactly. Tapping a description to edit it swaps one
 * component for the other in place, and any difference in size, weight or line
 * height shows up as the text visibly reflowing under your finger — which is a
 * defect this app has already shipped once. Keeping the table here rather than
 * duplicated in both files is what stops it recurring.
 */
export const HEADING_SIZES: Record<number, TextStyle> = {
  1: { fontSize: 22, lineHeight: 28 },
  2: { fontSize: 19, lineHeight: 25 },
  3: { fontSize: 17, lineHeight: 23 },
  4: { fontSize: 15, lineHeight: 21 },
  5: { fontSize: 14, lineHeight: 20 },
  6: { fontSize: 13, lineHeight: 19 },
}

/** Body copy, and the base the editor's TextInput is set to. */
export const BODY_STYLE: TextStyle = { ...textSizeStyles.sm }

export const CODE_STYLE: TextStyle = {
  fontFamily: typography.code.normal,
  fontSize: 13,
  lineHeight: 19,
}

/**
 * Italic runs.
 *
 * Inter ships no italic face here, and iOS will not synthesise one for a
 * custom family — `fontStyle: "italic"` on Inter silently renders upright. The
 * system face does have a true italic, so emphasis borrows it. The family
 * shifts for those few words, which is a smaller wrong than emphasis that does
 * not show at all.
 */
export const ITALIC_STYLE: TextStyle = { fontFamily: "System", fontStyle: "italic" }

export function headingStyle(level: number): TextStyle {
  return { ...HEADING_SIZES[level], fontFamily: typography.display.semiBold }
}

/** The style a whole line is drawn in, by what kind of line it is. */
export function lineStyle(kind: LineKind, colors: Theme["colors"]): TextStyle {
  switch (kind.type) {
    case "heading":
      return headingStyle(kind.level)
    case "quote":
      return { ...BODY_STYLE, ...ITALIC_STYLE, color: colors.textDim }
    case "code":
      return { ...CODE_STYLE, color: colors.textDim }
    case "raw":
      return { ...BODY_STYLE, color: colors.textDim }
    default:
      return BODY_STYLE
  }
}
