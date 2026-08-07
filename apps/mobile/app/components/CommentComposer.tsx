import { FC, memo, useCallback, useState } from "react"
import { LayoutChangeEvent, Pressable, View, ViewStyle } from "react-native"

import { AppIcon } from "@/components/AppIcon"
import { GlassContainer, GlassField, GlassIconButton, GlassSurface } from "@/components/Glass"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"

export interface CommentComposerProps {
  /** Mentions staged for the next comment, resolved to display names by `memberName`. */
  mentionIds: string[]
  memberName: (userId: string) => string
  onRemoveMention: (userId: string) => void
  onOpenMentionPicker: () => void
  onPickAttachment: () => void
  attaching: boolean
  pendingAttachCount: number
  posting: boolean
  /** Returns true if the comment was accepted, which clears the field. */
  onSubmit: (text: string) => Promise<boolean>
  onLayout: (e: LayoutChangeEvent) => void
  bottomInset: number
}

/**
 * The comment composer, deliberately its own component.
 *
 * The draft used to live in TaskDetailScreen, so every keystroke re-rendered the
 * whole screen — header, metadata rows and the entire comment list — which is
 * what made typing feel heavy on a task with any history. Keeping the text here
 * means a keystroke re-renders one small subtree and nothing else; the parent
 * only hears about it on submit.
 *
 * Memoised because the parent still re-renders for its own reasons (a status
 * change, a refetch) and there is no need to touch the composer when it does.
 */
export const CommentComposer: FC<CommentComposerProps> = memo(function CommentComposer({
  mentionIds,
  memberName,
  onRemoveMention,
  onOpenMentionPicker,
  onPickAttachment,
  attaching,
  pendingAttachCount,
  posting,
  onSubmit,
  onLayout,
  bottomInset,
}) {
  const {
    theme: { colors, radius },
  } = useAppTheme()
  const [text, setText] = useState("")

  const empty = !text.trim() && pendingAttachCount === 0

  const submit = useCallback(async () => {
    if (empty || posting) return
    // Clear optimistically only on success — a failed post that wiped the draft
    // would lose whatever the user typed, and the retry is theirs to make.
    if (await onSubmit(text)) setText("")
  }, [empty, posting, onSubmit, text])

  return (
    <GlassSurface onLayout={onLayout} style={[$bar, { paddingBottom: bottomInset || 8 }]}>
      {pendingAttachCount > 0 || attaching ? (
        <Text
          text={attaching ? "Uploading…" : `${pendingAttachCount} attachment(s)`}
          size="xxs"
          style={{ color: colors.textDim }}
        />
      ) : null}

      {mentionIds.length > 0 ? (
        <View style={$mentionRow}>
          {mentionIds.map((id) => (
            <Pressable
              key={id}
              onPress={() => onRemoveMention(id)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Remove mention of ${memberName(id)}`}
              style={[
                $mentionChip,
                { backgroundColor: colors.accentMuted, borderRadius: radius.full },
              ]}
            >
              <Text
                text={`@${memberName(id)}`}
                size="xxs"
                weight="medium"
                style={{ color: colors.tint }}
              />
              <AppIcon name="x" size={12} color={colors.tint} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* flex-end so the controls and send button stay pinned to the last line
          as the field grows upward, instead of drifting to its vertical centre. */}
      <View style={$row}>
        <GlassContainer spacing={8} style={$controls}>
          <GlassIconButton onPress={onOpenMentionPicker} label="Mention someone">
            <AppIcon name="at-sign" size={18} color={colors.textDim} />
          </GlassIconButton>
          <GlassIconButton onPress={onPickAttachment} label="Attach an image">
            <AppIcon name="image" size={18} color={attaching ? colors.tint : colors.textDim} />
          </GlassIconButton>
        </GlassContainer>

        <GlassField
          value={text}
          onChangeText={setText}
          placeholder="Add a comment…"
          multiline
          containerStyle={$grow}
        />

        <GlassIconButton
          onPress={() => void submit()}
          disabled={empty || posting}
          label="Send comment"
          tint={colors.tint}
          size={38}
        >
          <AppIcon name="arrow-up" size={18} color={colors.onTint} />
        </GlassIconButton>
      </View>
    </GlassSurface>
  )
})

const $bar: ViewStyle = { gap: 8, paddingHorizontal: 12, paddingTop: 8 }
const $row: ViewStyle = { flexDirection: "row", alignItems: "flex-end", gap: 8 }
const $controls: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 6 }
const $grow: ViewStyle = { flex: 1 }
const $mentionRow: ViewStyle = { flexDirection: "row", flexWrap: "wrap", gap: 6 }
const $mentionChip: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  paddingHorizontal: 8,
  paddingVertical: 4,
}
