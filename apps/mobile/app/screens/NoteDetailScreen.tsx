import { FC, useEffect, useLayoutEffect, useState } from "react"
import { Alert, Pressable, TextStyle, View, ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"

import { Markdown } from "@/components/Markdown"
import { Screen } from "@/components/Screen"
import { Skeleton } from "@/components/Skeleton"
import { displayFontStyles, Text, textSizeStyles } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useToast } from "@/components/Toast"
import { useOrg } from "@/context/OrgContext"
import type { NotesStackScreenProps } from "@/navigators/navigationTypes"
import { TAB_BAR_CLEARANCE } from "@/navigators/tabBarClearance"
import { api } from "@/services/api"
import { invalidate } from "@/services/query"
import { useAppTheme } from "@/theme/context"

export const NoteDetailScreen: FC<NotesStackScreenProps<"NoteDetail">> = ({
  route,
  navigation,
}) => {
  const { activeOrg } = useOrg()
  const toast = useToast()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const { noteId } = route.params
  const [title, setTitle] = useState(route.params.title)
  const [savedTitle, setSavedTitle] = useState(route.params.title)
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [mode, setMode] = useState<"preview" | "edit">("preview")

  useEffect(() => {
    let active = true
    if (!activeOrg) return
    void api.getNote(activeOrg.id, noteId).then((note) => {
      if (active && note) {
        setTitle(note.title)
        setSavedTitle(note.title)
        setContent(note.content)
        setMode(note.content.trim() ? "preview" : "edit")
        setLoading(false)
      } else if (active) {
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [activeOrg, noteId])

  const save = async () => {
    if (!activeOrg || saving) return
    setSaving(true)
    const okContent = await api.updateNote(activeOrg.id, noteId, content)
    let okTitle = true
    if (title.trim() && title !== savedTitle) {
      okTitle = await api.updateNoteTitle(activeOrg.id, noteId, title.trim())
      if (okTitle) setSavedTitle(title.trim())
    }
    setSaving(false)
    invalidate(activeOrg.id, "notes") // the list shows title + snippet
    if (okContent && okTitle) {
      setDirty(false)
      toast("Note saved", { variant: "success" })
    } else {
      toast("Couldn't save note", { variant: "error" })
    }
  }

  const remove = () => {
    if (!activeOrg) return
    Alert.alert("Delete note", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          void api.deleteNote(activeOrg.id, noteId).then((ok) => {
            invalidate(activeOrg.id, "notes")
            if (ok) navigation.goBack()
            else toast("Couldn't delete note", { variant: "error" })
          }),
      },
    ])
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={$headerRow}>
          {dirty ? (
            <Pressable onPress={() => void save()} disabled={saving}>
              <Text
                text={saving ? "Saving…" : "Save"}
                weight="medium"
                style={{ color: colors.tint }}
              />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setMode((m) => (m === "preview" ? "edit" : "preview"))}
            hitSlop={8}
            accessibilityLabel={mode === "preview" ? "Edit note" : "Preview note"}
          >
            <Ionicons
              name={mode === "preview" ? "create-outline" : "eye-outline"}
              size={20}
              color={colors.text}
            />
          </Pressable>
          <Pressable onPress={remove} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </Pressable>
        </View>
      ),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, saving, content, title, mode])

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={{
        padding: spacing.lg,
        gap: spacing.sm,
        paddingBottom: TAB_BAR_CLEARANCE,
      }}
    >
      {loading ? (
        <Skeleton height={200} />
      ) : mode === "preview" ? (
        <Pressable onPress={() => setMode("edit")}>
          <Text preset="heading" text={title || "Untitled"} style={{ marginBottom: spacing.sm }} />
          {content.trim() ? (
            <Markdown source={content} />
          ) : (
            <Text text="Empty note. Tap to write…" style={{ color: colors.textDim }} />
          )}
        </Pressable>
      ) : (
        <>
          <TextField
            value={title}
            onChangeText={(t) => {
              setTitle(t)
              setDirty(true)
            }}
            placeholder="Title"
            style={$titleInput}
          />
          <TextField
            value={content}
            onChangeText={(text) => {
              setContent(text)
              setDirty(true)
            }}
            multiline
            placeholder="Write…"
            style={$bodyInput}
            inputWrapperStyle={$editor}
          />
        </>
      )}
    </Screen>
  )
}

// Editing keeps the preview's type: the title is the `heading` preset and the
// body is what Markdown renders, so tapping in does not reflow the note.
const $titleInput: TextStyle = { ...textSizeStyles.xxl, ...displayFontStyles.bold }
const $bodyInput: TextStyle = { ...textSizeStyles.sm }
const $editor: TextStyle = { minHeight: 240, alignItems: "flex-start" }
const $headerRow: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 16 }
