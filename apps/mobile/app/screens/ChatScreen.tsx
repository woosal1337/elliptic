import { FC, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Pressable, ScrollView, View, ViewStyle } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { KeyboardStickyView } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { AppIcon } from "@/components/AppIcon"
import { Option, OptionSheet } from "@/components/OptionSheet"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useOrg } from "@/context/OrgContext"
import type { HomeStackScreenProps } from "@/navigators/navigationTypes"
import { useHideTabBar } from "@/navigators/tabBarVisibility"
import { api } from "@/services/api"
import type { ChatMessage } from "@/services/api/types"
import { uploadAsset } from "@/services/upload"
import { useAppTheme } from "@/theme/context"
import { loadString, saveString } from "@/utils/storage"

export const ChatScreen: FC<HomeStackScreenProps<"Chat">> = ({ navigation }) => {
  const { activeOrg } = useOrg()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const insets = useSafeAreaInsets()
  // The message input owns the bottom of the window here.
  useHideTabBar()
  const [convId, setConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [history, setHistory] = useState<Option[] | null>(null)
  const scrollRef = useRef<ScrollView>(null)

  const convKey = activeOrg ? `chat.conv.${activeOrg.id}` : null

  // Resume the last conversation instead of spawning a new one every mount.
  useEffect(() => {
    if (!activeOrg || !convKey) return
    const stored = loadString(convKey)
    if (stored) {
      setConvId(stored)
      void api.listChatMessages(activeOrg.id, stored).then(setMessages)
    } else {
      void api.createConversation(activeOrg.id).then((id) => {
        if (id) {
          setConvId(id)
          saveString(convKey, id)
        }
      })
    }
  }, [activeOrg, convKey])

  const newChat = async () => {
    if (!activeOrg || !convKey) return
    const id = await api.createConversation(activeOrg.id)
    if (id) {
      setConvId(id)
      setMessages([])
      saveString(convKey, id)
    }
  }

  const resume = (id: string) => {
    if (!activeOrg || !convKey) return
    setConvId(id)
    saveString(convKey, id)
    void api.listChatMessages(activeOrg.id, id).then(setMessages)
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={$headerRow}>
          <Pressable
            onPress={() => {
              if (activeOrg)
                void api.listConversations(activeOrg.id).then((cs) =>
                  setHistory(
                    cs.map((c, i) => ({
                      label: c.title || `Conversation ${i + 1}`,
                      value: c.id,
                    })),
                  ),
                )
            }}
          >
            <AppIcon name="clock" size={20} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => void newChat()}>
            <Text text="New" weight="medium" style={{ color: colors.tint }} />
          </Pressable>
        </View>
      ),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, activeOrg, convKey])

  const pickImage = async () => {
    if (!activeOrg || uploading) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 })
    const asset = result.canceled ? undefined : result.assets[0]
    if (!asset) return
    setUploading(true)
    const objectId = await uploadAsset(activeOrg.id, {
      uri: asset.uri,
      name: asset.fileName ?? "image.jpg",
      type: asset.mimeType ?? "image/jpeg",
      size: asset.fileSize ?? 0,
    })
    setUploading(false)
    if (objectId) setPending((prev) => [...prev, objectId])
  }

  const send = async () => {
    const text = input.trim()
    if ((!text && pending.length === 0) || !convId || !activeOrg || sending) return
    const objectIds = [...pending]
    const content = text || "Sent an attachment."
    setInput("")
    setPending([])
    setSending(true)
    setMessages((prev) => [...prev, { id: `tmp-${prev.length}`, role: "user", content }])
    await api.sendChatMessage(activeOrg.id, convId, content, objectIds)
    setMessages(await api.listChatMessages(activeOrg.id, convId))
    setSending(false)
  }

  return (
    <>
      <Screen
        preset="fixed"
        contentContainerStyle={$flex}
        // KeyboardStickyView lifts the input; Screen's avoider would double it.
        KeyboardAvoidingViewProps={{ enabled: false }}
      >
        <ScrollView
          ref={scrollRef}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        >
          {messages.length === 0 ? (
            <Text text="Ask anything about your work." style={{ color: colors.textDim }} />
          ) : (
            messages.map((m) => {
              const mine = m.role === "user"
              const align: "flex-end" | "flex-start" = mine ? "flex-end" : "flex-start"
              const bg = mine ? colors.tint : colors.palette.neutral200
              return (
                <View key={m.id} style={[$bubble, { alignSelf: align, backgroundColor: bg }]}>
                  <Text
                    text={m.content}
                    style={{ color: mine ? colors.palette.neutral100 : colors.text }}
                  />
                </View>
              )
            })
          )}
          {sending ? <Text text="Thinking…" style={{ color: colors.textDim }} /> : null}
        </ScrollView>

        <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
          {pending.length > 0 || uploading ? (
            <View style={[$pendingRow, { backgroundColor: colors.background }]}>
              <AppIcon name="image" size={14} color={colors.tint} />
              <Text
                text={uploading ? "Uploading…" : `${pending.length} image(s) attached`}
                size="xs"
                style={{ color: colors.textDim }}
              />
            </View>
          ) : null}
          <View
            style={[
              $inputRow,
              {
                borderTopColor: colors.separator,
                backgroundColor: colors.background,
                paddingBottom: insets.bottom || 8,
              },
            ]}
          >
            <Pressable onPress={() => void pickImage()} style={$attach}>
              <AppIcon name="plus" size={24} color={colors.textDim} />
            </Pressable>
            <TextField
              value={input}
              onChangeText={setInput}
              placeholder="Message the assistant…"
              multiline
              // Match the 40pt attach and send buttons either side of it; the
              // default is an editor's height and dwarfed them.
              multilineMinHeight={COMPOSER_H}
              containerStyle={$grow}
            />
            <Pressable
              onPress={() => void send()}
              style={[$send, { backgroundColor: colors.tint }]}
            >
              <AppIcon name="arrow-up" size={20} color={colors.palette.neutral100} />
            </Pressable>
          </View>
        </KeyboardStickyView>
      </Screen>

      <OptionSheet
        visible={history !== null}
        onClose={() => setHistory(null)}
        title="Conversations"
        options={history ?? []}
        selected={convId}
        onSelect={resume}
      />
    </>
  )
}

const $flex: ViewStyle = { flex: 1 }
const $grow: ViewStyle = { flex: 1 }
const $headerRow: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 16 }
const $bubble: ViewStyle = {
  maxWidth: "85%",
  borderRadius: 16,
  paddingVertical: 8,
  paddingHorizontal: 12,
}
const $inputRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-end",
  gap: 8,
  padding: 12,
  borderTopWidth: 1,
}
const $pendingRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  paddingHorizontal: 12,
  paddingBottom: 4,
}
// One height for the composer row: the field's resting height and both buttons.
const COMPOSER_H = 40

const $attach: ViewStyle = {
  width: COMPOSER_H,
  height: COMPOSER_H,
  alignItems: "center",
  justifyContent: "center",
}
const $send: ViewStyle = {
  width: COMPOSER_H,
  height: COMPOSER_H,
  borderRadius: COMPOSER_H / 2,
  alignItems: "center",
  justifyContent: "center",
}
