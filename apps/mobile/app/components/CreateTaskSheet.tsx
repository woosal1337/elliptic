import { FC, useEffect, useState } from "react"
import { View, ViewStyle } from "react-native"

import { Button } from "@/components/Button"
import { DatePickerSheet } from "@/components/DatePickerSheet"
import { FieldRow } from "@/components/FieldRow"
import { Option, OptionSheet } from "@/components/OptionSheet"
import { Sheet } from "@/components/Sheet"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useAuth } from "@/context/AuthContext"
import { api } from "@/services/api"
import type { Member, Project } from "@/services/api/types"
import { useAppTheme } from "@/theme/context"
import {
  cap,
  CUSTOM_DUE,
  DUE_OPTIONS,
  PRIORITY_OPTIONS,
  prettyLabel,
  STATUS_OPTIONS,
} from "@/utils/taskOptions"

type Picker = "project" | "priority" | "assignee" | "due" | "status"

export const CreateTaskSheet: FC<{
  orgId: string
  visible: boolean
  onClose: () => void
  onCreated: () => void
}> = ({ orgId, visible, onClose, onCreated }) => {
  const { user } = useAuth()
  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [projectId, setProjectId] = useState<string | null>(null)
  const [status, setStatus] = useState("backlog")
  const [priority, setPriority] = useState("none")
  const [assigneeId, setAssigneeId] = useState<string | null>(user?.id ?? null)
  const [due, setDue] = useState("")
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [picker, setPicker] = useState<Picker | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    if (!visible) return
    void api.listProjects(orgId).then((p) => {
      setProjects(p)
      setProjectId((cur) => cur ?? p[0]?.id ?? null)
    })
    void api.listMembers(orgId).then(setMembers)
  }, [visible, orgId])

  const projectName = projects.find((p) => p.id === projectId)?.name ?? "Select…"
  const assigneeName = assigneeId
    ? (members.find((m) => m.user_id === assigneeId)?.full_name ?? "Me")
    : "Unassigned"
  const dueLabel = due ? (DUE_OPTIONS.find((o) => o.value === due)?.label ?? due) : "No due date"

  const submit = async () => {
    if (!title.trim() || !projectId || saving) return
    setSaving(true)
    setError(null)
    const task = await api.createTask(orgId, projectId, {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      assignee_id: assigneeId,
      due_date: due || null,
    })
    setSaving(false)
    if (task) {
      setTitle("")
      setDescription("")
      setStatus("backlog")
      setPriority("none")
      setDue("")
      onCreated()
      onClose()
    } else {
      setError("Couldn't create the task. Try again.")
    }
  }

  const memberOptions: Option[] = [
    { label: "Unassigned", value: "" },
    ...members.map((m) => ({ label: m.full_name, value: m.user_id })),
  ]
  const projectOptions: Option[] = projects.map((p) => ({
    label: `${p.name} (${p.key})`,
    value: p.id,
  }))

  return (
    <>
      <Sheet visible={visible} onClose={onClose} title="New task">
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xs }}>
          <TextField value={title} onChangeText={setTitle} placeholder="Task title" autoFocus />
          <TextField
            value={description}
            onChangeText={setDescription}
            placeholder="Add description…"
            multiline
          />
          <FieldRow
            label="Project"
            value={projectName}
            muted={!projectId}
            onPress={() => setPicker("project")}
          />
          <FieldRow
            label="Status"
            value={prettyLabel(status, STATUS_OPTIONS)}
            onPress={() => setPicker("status")}
          />
          <FieldRow label="Priority" value={cap(priority)} onPress={() => setPicker("priority")} />
          <FieldRow label="Assignee" value={assigneeName} onPress={() => setPicker("assignee")} />
          <FieldRow label="Due" value={dueLabel} onPress={() => setPicker("due")} />
          {error ? (
            <Text text={error} size="xs" style={{ color: colors.error, marginTop: spacing.xs }} />
          ) : null}
          <Button
            text={saving ? "Creating…" : "Create task"}
            preset="filled"
            disabled={!title.trim() || !projectId || saving}
            onPress={() => void submit()}
            style={$createBtn}
          />
        </View>
      </Sheet>

      <OptionSheet
        visible={picker === "project"}
        onClose={() => setPicker(null)}
        title="Project"
        options={projectOptions}
        selected={projectId}
        onSelect={setProjectId}
      />
      <OptionSheet
        visible={picker === "status"}
        onClose={() => setPicker(null)}
        title="Status"
        options={STATUS_OPTIONS}
        selected={status}
        onSelect={setStatus}
      />
      <OptionSheet
        visible={picker === "priority"}
        onClose={() => setPicker(null)}
        title="Priority"
        options={PRIORITY_OPTIONS}
        selected={priority}
        onSelect={setPriority}
      />
      <OptionSheet
        visible={picker === "assignee"}
        onClose={() => setPicker(null)}
        title="Assignee"
        options={memberOptions}
        selected={assigneeId ?? ""}
        onSelect={(v) => setAssigneeId(v || null)}
      />
      <OptionSheet
        visible={picker === "due"}
        onClose={() => setPicker(null)}
        title="Due date"
        options={DUE_OPTIONS}
        selected={due}
        onSelect={(v) => (v === CUSTOM_DUE ? setShowDatePicker(true) : setDue(v))}
      />
      <DatePickerSheet
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        initial={due || null}
        onPick={setDue}
      />
    </>
  )
}

const $createBtn: ViewStyle = { marginTop: 12 }
