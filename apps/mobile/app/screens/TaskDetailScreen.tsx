import { FC, ReactNode, useCallback, useEffect, useState } from "react"
import { Linking, Pressable, ScrollView, View, ViewStyle } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@expo/vector-icons"
import { KeyboardStickyView } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Avatar } from "@/components/Avatar"
import { Badge } from "@/components/Badge"
import { DatePickerSheet } from "@/components/DatePickerSheet"
import { LabelRow } from "@/components/LabelChip"
import { LabelPickerSheet } from "@/components/LabelPickerSheet"
import { Markdown } from "@/components/Markdown"
import { OptionSheet } from "@/components/OptionSheet"
import { PriorityIcon } from "@/components/PriorityIcon"
import { Screen } from "@/components/Screen"
import { DetailSkeleton } from "@/components/Skeleton"
import { StatusIcon } from "@/components/StatusIcon"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useToast } from "@/components/Toast"
import { useOrg } from "@/context/OrgContext"
import type { TasksStackScreenProps } from "@/navigators/navigationTypes"
import { useHideTabBar } from "@/navigators/useHideTabBar"
import { api } from "@/services/api"
import type { Comment, Member, Project, Task } from "@/services/api/types"
import { invalidate } from "@/services/query"
import { uploadAsset } from "@/services/upload"
import { useAppTheme } from "@/theme/context"
import { hapticSelection, hapticSuccess } from "@/utils/haptics"
import {
  cap,
  CUSTOM_DUE,
  dueLabel,
  DUE_OPTIONS,
  prettyLabel,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
} from "@/utils/taskOptions"

type Picker = "status" | "priority" | "assignee" | "due" | "mention"

const labelChipText = (n: number) => (n === 0 ? "Labels" : n === 1 ? "1 label" : `${n} labels`)

export const TaskDetailScreen: FC<TasksStackScreenProps<"TaskDetail">> = ({ route }) => {
  const { activeOrg } = useOrg()
  const {
    theme: { colors, spacing, radius },
  } = useAppTheme()
  const toast = useToast()
  const insets = useSafeAreaInsets()
  // The pinned composer owns the bottom of the window on this screen.
  useHideTabBar()
  const { taskId } = route.params
  const [task, setTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [picker, setPicker] = useState<Picker | null>(null)
  const [commentText, setCommentText] = useState("")
  const [mentionIds, setMentionIds] = useState<string[]>([])
  const [pendingAttach, setPendingAttach] = useState<string[]>([])
  const [attaching, setAttaching] = useState(false)
  const [posting, setPosting] = useState(false)
  const [newSubtask, setNewSubtask] = useState("")
  const [creatingSubtask, setCreatingSubtask] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  // Labels are edited as a draft and committed once, on sheet close.
  const [labelDraft, setLabelDraft] = useState<string[] | null>(null)

  const load = useCallback(async () => {
    if (!activeOrg) return
    const [t, c, s, m, p] = await Promise.all([
      api.getTask(activeOrg.id, taskId),
      api.listComments(activeOrg.id, "task", taskId),
      api.listSubtasks(activeOrg.id, taskId),
      api.listMembers(activeOrg.id),
      api.listProjects(activeOrg.id),
    ])
    setTask(t)
    setComments(c)
    setSubtasks(s)
    setMembers(m)
    setProjects(p)
    setLoading(false)
  }, [activeOrg, taskId])

  useEffect(() => {
    void load()
  }, [load])

  const memberName = (id: string | null) =>
    id ? (members.find((m) => m.user_id === id)?.full_name ?? "Someone") : "Unassigned"

  const changeStatus = async (status: string, undoable = true) => {
    if (!activeOrg || !task) return
    const orgId = activeOrg.id
    const previous = task.status
    if (status === "done") hapticSuccess()
    else hapticSelection()
    setTask({ ...task, status })
    const ok = await api.transitionTaskStatus(orgId, task.id, status)
    invalidate(orgId, "tasks") // keep the Tasks/Home lists in step with the detail
    if (!ok) {
      toast("Couldn't update the status", { variant: "error" })
      void load()
      return
    }
    if (undoable && status !== previous) {
      toast(prettyLabel(status, STATUS_OPTIONS), {
        action: { label: "Undo", onPress: () => void changeStatus(previous, false) },
      })
    }
  }

  const patch = async (p: {
    priority?: string
    assignee_id?: string | null
    due_date?: string | null
  }) => {
    if (!activeOrg || !task) return
    hapticSelection()
    setTask({ ...task, ...p })
    const ok = await api.updateTask(activeOrg.id, task.id, p)
    invalidate(activeOrg.id, "tasks")
    if (!ok) {
      toast("Couldn't save that change", { variant: "error" })
      void load()
    }
  }

  const openLabels = () => setLabelDraft((task?.labels ?? []).map((l) => l.id))

  const closeLabels = () => {
    const ids = labelDraft
    setLabelDraft(null)
    if (!ids || !activeOrg || !task) return
    const current = (task.labels ?? []).map((l) => l.id)
    const unchanged = ids.length === current.length && ids.every((id) => current.includes(id))
    if (unchanged) return
    void api.updateTask(activeOrg.id, task.id, { label_ids: ids }).then((updated) => {
      invalidate(activeOrg.id, "tasks")
      if (updated) void load()
      else toast("Couldn't save labels", { variant: "error" })
    })
  }

  const addSubtask = async () => {
    const title = newSubtask.trim()
    if (!activeOrg || !task?.project_id || !title || creatingSubtask) return
    setCreatingSubtask(true)
    const created = await api.createTask(activeOrg.id, task.project_id, {
      title,
      parent_task_id: task.id,
    })
    setCreatingSubtask(false)
    if (created) {
      setNewSubtask("")
      setSubtasks((prev) => [...prev, created])
    } else {
      toast("Couldn't add subtask", { variant: "error" })
    }
  }

  const toggleSubtask = async (st: Task) => {
    if (!activeOrg) return
    const next = st.status === "done" ? "todo" : "done"
    if (next === "done") hapticSuccess()
    setSubtasks((prev) => prev.map((x) => (x.id === st.id ? { ...x, status: next } : x)))
    const ok = await api.transitionTaskStatus(activeOrg.id, st.id, next)
    invalidate(activeOrg.id, "tasks")
    if (!ok) void load()
  }

  const toggleResolve = async (comment: Comment) => {
    if (!activeOrg) return
    const resolved = !comment.resolved_at
    const ok = await api.resolveComment(activeOrg.id, comment.id, resolved)
    if (ok) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id
            ? { ...c, resolved_at: resolved ? new Date().toISOString() : null }
            : c,
        ),
      )
    }
  }

  const pickAttachment = async () => {
    if (!activeOrg || attaching) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 })
    const asset = result.canceled ? undefined : result.assets[0]
    if (!asset) return
    setAttaching(true)
    const objectId = await uploadAsset(
      activeOrg.id,
      {
        uri: asset.uri,
        name: asset.fileName ?? "image.jpg",
        type: asset.mimeType ?? "image/jpeg",
        size: asset.fileSize ?? 0,
      },
      "comment",
    )
    setAttaching(false)
    if (objectId) setPendingAttach((p) => [...p, objectId])
  }

  const postComment = async () => {
    if (!activeOrg || (!commentText.trim() && pendingAttach.length === 0) || posting) return
    setPosting(true)
    const ok = await api.createComment(
      activeOrg.id,
      "task",
      taskId,
      commentText.trim() || "(attachment)",
      mentionIds,
      pendingAttach,
    )
    setPosting(false)
    if (ok) {
      setCommentText("")
      setMentionIds([])
      setPendingAttach([])
      setComments(await api.listComments(activeOrg.id, "task", taskId))
    } else {
      toast("Couldn't post comment", { variant: "error" })
    }
  }

  const addMention = (userId: string) => {
    if (!members.some((x) => x.user_id === userId)) return
    hapticSelection()
    setMentionIds((ids) => (ids.includes(userId) ? ids : [...ids, userId]))
  }

  const removeMention = (userId: string) =>
    setMentionIds((ids) => ids.filter((id) => id !== userId))

  if (loading || !task) {
    return (
      <Screen preset="scroll">
        <DetailSkeleton />
      </Screen>
    )
  }

  const projectName = projects.find((p) => p.id === task.project_id)?.name
  const memberOptions = [
    { label: "Unassigned", value: "" },
    ...members.map((m) => ({ label: m.full_name, value: m.user_id })),
  ]

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={$fill}
      // KeyboardStickyView lifts the composer; a second avoider would double it.
      KeyboardAvoidingViewProps={{ enabled: false }}
    >
      <ScrollView
        contentContainerStyle={[$scrollContent, { padding: spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text preset="heading" text={task.title} />

        <View style={[$propWrap, { marginTop: spacing.md }]}>
          <PropChip onPress={() => setPicker("status")} testID="prop-status" label="Status">
            <StatusIcon status={task.status} size={15} />
            <Text text={prettyLabel(task.status, STATUS_OPTIONS)} size="xs" weight="medium" />
          </PropChip>
          <PropChip onPress={() => setPicker("priority")} testID="prop-priority" label="Priority">
            <PriorityIcon priority={task.priority} size={13} />
            <Text
              text={task.priority === "none" ? "Priority" : cap(task.priority)}
              size="xs"
              weight="medium"
              style={{ color: task.priority === "none" ? colors.textDim : colors.text }}
            />
          </PropChip>
          <PropChip onPress={() => setPicker("assignee")} testID="prop-assignee" label="Assignee">
            {task.assignee_id ? (
              <Avatar name={memberName(task.assignee_id)} size={16} />
            ) : (
              <Ionicons name="person-circle-outline" size={16} color={colors.textDim} />
            )}
            <Text
              text={task.assignee_id ? memberName(task.assignee_id) : "Assignee"}
              size="xs"
              weight="medium"
              style={{ color: task.assignee_id ? colors.text : colors.textDim }}
            />
          </PropChip>
          <PropChip onPress={() => setPicker("due")} testID="prop-due" label="Due date">
            <Ionicons
              name="calendar-outline"
              size={14}
              color={task.due_date ? colors.text : colors.textDim}
            />
            <Text
              text={task.due_date ? dueLabel(task.due_date) : "Due"}
              size="xs"
              weight="medium"
              style={{ color: task.due_date ? colors.text : colors.textDim }}
            />
          </PropChip>
          <PropChip onPress={openLabels} testID="prop-labels" label="Labels">
            <Ionicons
              name="pricetag-outline"
              size={14}
              color={task.labels?.length ? colors.text : colors.textDim}
            />
            <Text
              text={labelChipText(task.labels?.length ?? 0)}
              size="xs"
              weight="medium"
              style={{ color: task.labels?.length ? colors.text : colors.textDim }}
            />
          </PropChip>
          {projectName ? (
            <View
              style={[
                $propChip,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Ionicons name="cube-outline" size={14} color={colors.textDim} />
              <Text text={projectName} size="xs" weight="medium" numberOfLines={1} />
            </View>
          ) : null}
        </View>

        {task.labels && task.labels.length > 0 ? (
          <View style={{ marginTop: spacing.sm }}>
            <LabelRow labels={task.labels} />
          </View>
        ) : null}

        {task.description ? (
          <View style={{ marginTop: spacing.lg }}>
            <Text preset="formLabel" text="Description" style={{ color: colors.textDim }} />
            <View style={{ marginTop: spacing.xs }}>
              <Markdown source={task.description} />
            </View>
          </View>
        ) : null}

        {task.project_id ? (
          <View style={{ marginTop: spacing.lg }}>
            <Text
              preset="subheading"
              text={`Subtasks${subtasks.length ? ` (${subtasks.length})` : ""}`}
            />
            {subtasks.map((st) => (
              <Pressable key={st.id} onPress={() => void toggleSubtask(st)} style={$subtaskRow}>
                <Ionicons
                  name={st.status === "done" ? "checkbox" : "square-outline"}
                  size={20}
                  color={st.status === "done" ? colors.tint : colors.textDim}
                />
                <View style={$grow}>
                  <Text
                    text={st.title}
                    numberOfLines={1}
                    style={{ color: st.status === "done" ? colors.textDim : colors.text }}
                  />
                </View>
              </Pressable>
            ))}
            <View style={$subtaskRow}>
              <Ionicons name="add" size={20} color={colors.textDim} />
              <TextField
                value={newSubtask}
                onChangeText={setNewSubtask}
                placeholder="Add subtask…"
                containerStyle={$grow}
                onSubmitEditing={() => void addSubtask()}
                returnKeyType="done"
              />
            </View>
          </View>
        ) : null}

        <Text
          preset="subheading"
          text={`Comments (${comments.length})`}
          style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}
        />
        {comments.map((c) => (
          <View key={c.id} style={[$comment, { borderColor: colors.separator }]}>
            <Markdown source={c.content} />
            {c.attachments && c.attachments.length > 0 ? (
              <View style={$attachWrap}>
                {c.attachments.map((a) => (
                  <Pressable
                    key={a.id}
                    onPress={() => void Linking.openURL(a.download_url)}
                    style={[$attachChip, { borderColor: colors.border }]}
                  >
                    <Ionicons name="document-attach-outline" size={14} color={colors.tint} />
                    <Text
                      text={a.filename}
                      size="xxs"
                      numberOfLines={1}
                      style={{ color: colors.tint }}
                    />
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={$commentFooter}>
              {c.resolved_at ? <Badge text="Resolved" variant="success" /> : null}
              <Pressable
                onPress={() => void toggleResolve(c)}
                style={[$smallBtn, { borderColor: colors.border }]}
              >
                <Text
                  text={c.resolved_at ? "Reopen" : "Resolve"}
                  size="xs"
                  weight="medium"
                  style={{ color: colors.tint }}
                />
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View
          style={[
            $composerBar,
            {
              borderTopColor: colors.separator,
              backgroundColor: colors.background,
              paddingBottom: insets.bottom || 8,
            },
          ]}
        >
          {pendingAttach.length > 0 || attaching ? (
            <Text
              text={attaching ? "Uploading…" : `${pendingAttach.length} attachment(s)`}
              size="xxs"
              style={{ color: colors.textDim }}
            />
          ) : null}
          {mentionIds.length > 0 ? (
            <View style={$mentionRow}>
              {mentionIds.map((id) => (
                <Pressable
                  key={id}
                  onPress={() => removeMention(id)}
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
                  <Ionicons name="close" size={12} color={colors.tint} />
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={[$composer, { borderColor: colors.border }]}>
            <Pressable
              onPress={() => setPicker("mention")}
              style={$at}
              accessibilityRole="button"
              accessibilityLabel="Mention someone"
            >
              <Ionicons name="at" size={20} color={colors.textDim} />
            </Pressable>
            <Pressable
              onPress={() => void pickAttachment()}
              style={$at}
              accessibilityRole="button"
              accessibilityLabel="Attach an image"
            >
              <Ionicons
                name="image-outline"
                size={20}
                color={attaching ? colors.tint : colors.textDim}
              />
            </Pressable>
            <View style={$grow}>
              <TextField
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Add a comment…"
                multiline
              />
            </View>
            <Pressable
              onPress={() => void postComment()}
              disabled={!commentText.trim() || posting}
              accessibilityRole="button"
              accessibilityLabel="Send comment"
              style={[$send, { backgroundColor: colors.tint }, commentText.trim() ? null : $dim]}
            >
              <Ionicons name="arrow-up" size={18} color={colors.onTint} />
            </Pressable>
          </View>
        </View>
      </KeyboardStickyView>

      <OptionSheet
        visible={picker === "status"}
        onClose={() => setPicker(null)}
        title="Status"
        options={STATUS_OPTIONS}
        selected={task.status}
        onSelect={(v) => void changeStatus(v)}
      />
      <OptionSheet
        visible={picker === "priority"}
        onClose={() => setPicker(null)}
        title="Priority"
        options={PRIORITY_OPTIONS}
        selected={task.priority}
        onSelect={(v) => void patch({ priority: v })}
      />
      <OptionSheet
        visible={picker === "assignee"}
        onClose={() => setPicker(null)}
        title="Assignee"
        options={memberOptions}
        selected={task.assignee_id ?? ""}
        onSelect={(v) => void patch({ assignee_id: v || null })}
      />
      <OptionSheet
        visible={picker === "due"}
        onClose={() => setPicker(null)}
        title="Due date"
        options={DUE_OPTIONS}
        selected={task.due_date ?? ""}
        onSelect={(v) => {
          if (v === CUSTOM_DUE) setShowDatePicker(true)
          else void patch({ due_date: v || null })
        }}
      />
      <DatePickerSheet
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        initial={task.due_date}
        onPick={(iso) => void patch({ due_date: iso })}
      />
      <LabelPickerSheet
        visible={labelDraft !== null}
        onClose={closeLabels}
        orgId={activeOrg?.id ?? null}
        value={labelDraft ?? []}
        onChange={setLabelDraft}
      />
      <OptionSheet
        visible={picker === "mention"}
        onClose={() => setPicker(null)}
        title="Mention someone"
        options={members.map((m) => ({ label: m.full_name, value: m.user_id }))}
        onSelect={addMention}
      />
    </Screen>
  )
}

/** A tappable property chip (status / priority / assignee / due) — Linear-style. */
const PropChip: FC<{
  onPress?: () => void
  testID?: string
  label?: string
  children: ReactNode
}> = ({ onPress, testID, label, children }) => {
  const {
    theme: { colors, radius },
  } = useAppTheme()
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={label}
      style={[$propChip, { backgroundColor: colors.subtle, borderRadius: radius.full }]}
    >
      {children}
    </Pressable>
  )
}

const $fill: ViewStyle = { flex: 1 }
const $scrollContent: ViewStyle = { paddingBottom: 24 }
// The composer is pinned below the scrolling body (C2) — Screen's keyboard
// avoidance lifts it, so it stays reachable with the keyboard up.
const $composerBar: ViewStyle = {
  borderTopWidth: 1,
  paddingHorizontal: 12,
  paddingVertical: 8,
  gap: 6,
}
const $mentionRow: ViewStyle = { flexDirection: "row", flexWrap: "wrap", gap: 6 }
const $mentionChip: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  paddingHorizontal: 8,
  paddingVertical: 4,
}
const $dim: ViewStyle = { opacity: 0.4 }
const $propWrap: ViewStyle = { flexDirection: "row", flexWrap: "wrap", gap: 8 }
const $propChip: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  borderWidth: 1,
  borderColor: "transparent",
  paddingHorizontal: 10,
  paddingVertical: 6,
}
const $subtaskRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  paddingVertical: 8,
}
const $comment: ViewStyle = {
  borderWidth: 1,
  borderRadius: 12,
  padding: 12,
  marginBottom: 8,
  gap: 8,
}
const $commentFooter: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8 }
const $attachWrap: ViewStyle = { flexDirection: "row", flexWrap: "wrap", gap: 6 }
const $attachChip: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  borderWidth: 1,
  borderRadius: 8,
  paddingHorizontal: 8,
  paddingVertical: 4,
  maxWidth: "100%",
}
const $smallBtn: ViewStyle = {
  borderWidth: 1,
  borderRadius: 8,
  paddingVertical: 6,
  paddingHorizontal: 12,
}
const $composer: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-end",
  gap: 8,
  borderWidth: 1,
  borderRadius: 12,
  padding: 8,
}
const $grow: ViewStyle = { flex: 1 }
const $at: ViewStyle = { padding: 6 }
const $send: ViewStyle = {
  width: 36,
  height: 36,
  borderRadius: 18,
  alignItems: "center",
  justifyContent: "center",
}
