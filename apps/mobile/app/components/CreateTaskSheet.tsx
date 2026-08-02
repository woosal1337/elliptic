import { FC, useEffect, useState } from "react"
import { ViewStyle } from "react-native"
import {
  BottomSheet,
  Button,
  DatePicker,
  Form,
  Host,
  Picker,
  Section,
  Text as NativeText,
  TextField,
  Toggle,
} from "@expo/ui/swift-ui"
import { disabled, tag } from "@expo/ui/swift-ui/modifiers"

import { useAuth } from "@/context/AuthContext"
import { api } from "@/services/api"
import type { Member, Project, TaskLabel } from "@/services/api/types"
import { invalidate } from "@/services/query"
import { useAppTheme } from "@/theme/context"
import {
  cap,
  CUSTOM_DUE,
  DUE_OPTIONS,
  PRIORITY_OPTIONS,
  prettyLabel,
  STATUS_OPTIONS,
  toISODate,
} from "@/utils/taskOptions"

const UNASSIGNED = "__unassigned__"

/**
 * Create a task.
 *
 * This is a real `UISheetPresentationController` wrapping a SwiftUI `Form`,
 * not a hand-rolled modal wrapping our own components. That is the point: the
 * pickers are system pickers, the rows are Form rows, and keyboard avoidance,
 * scrolling and drag-to-dismiss are UIKit's problem rather than ours — which
 * is where the previous version's keyboard bug came from.
 *
 * Labels are `Toggle` rows rather than a `Picker` because a picker is
 * single-selection and a task can carry several labels.
 */
export const CreateTaskSheet: FC<{
  orgId: string
  visible: boolean
  onClose: () => void
  onCreated?: () => void
}> = ({ orgId, visible, onClose, onCreated }) => {
  const { user } = useAuth()
  const { themeContext } = useAppTheme()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [projectId, setProjectId] = useState<string | null>(null)
  const [status, setStatus] = useState("backlog")
  const [priority, setPriority] = useState("none")
  const [assigneeId, setAssigneeId] = useState<string | null>(user?.id ?? null)
  const [due, setDue] = useState("")
  const [customDue, setCustomDue] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [labels, setLabels] = useState<TaskLabel[]>([])
  const [labelIds, setLabelIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    void api.listProjects(orgId).then((p) => {
      setProjects(p)
      setProjectId((cur) => cur ?? p[0]?.id ?? null)
    })
    void api.listMembers(orgId).then(setMembers)
    void api.listLabels(orgId).then(setLabels)
  }, [visible, orgId])

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
      label_ids: labelIds,
    })
    setSaving(false)
    if (task) {
      setTitle("")
      setDescription("")
      setStatus("backlog")
      setPriority("none")
      setDue("")
      setCustomDue(false)
      setLabelIds([])
      invalidate(orgId, "tasks")
      onCreated?.()
      onClose()
    } else {
      setError("Couldn't create the task. Try again.")
    }
  }

  const toggleLabel = (id: string, on: boolean) =>
    setLabelIds((current) =>
      on ? [...new Set([...current, id])] : current.filter((x) => x !== id),
    )

  // A preset that is not one of the offered dates is a date the user picked,
  // so the inline calendar stays open on it.
  const dueSelection = customDue ? CUSTOM_DUE : due

  return (
    // Zero-sized on purpose. The sheet is presented by UIKit above everything,
    // so the host needs no area of its own — and an absoluteFill host silently
    // covers the screen and swallows every touch behind it.
    <Host style={$host} colorScheme={themeContext}>
      <BottomSheet
        isPresented={visible}
        onIsPresentedChange={(presented) => {
          if (!presented) onClose()
        }}
      >
        <Form>
          <Section title="New task">
            <TextField defaultValue={title} placeholder="Task title" onValueChange={setTitle} />
            <TextField
              defaultValue={description}
              placeholder="Add description…"
              axis="vertical"
              onValueChange={setDescription}
            />
          </Section>

          <Section title="Details">
            <Picker
              label="Project"
              selection={projectId ?? ""}
              onSelectionChange={(value) => setProjectId(value || null)}
            >
              {projects.map((p) => (
                <NativeText key={p.id} modifiers={[tag(p.id)]}>
                  {`${p.name} (${p.key})`}
                </NativeText>
              ))}
            </Picker>

            <Picker label="Status" selection={status} onSelectionChange={setStatus}>
              {STATUS_OPTIONS.map((o) => (
                <NativeText key={o.value} modifiers={[tag(o.value)]}>
                  {prettyLabel(o.value, STATUS_OPTIONS)}
                </NativeText>
              ))}
            </Picker>

            <Picker label="Priority" selection={priority} onSelectionChange={setPriority}>
              {PRIORITY_OPTIONS.map((o) => (
                <NativeText key={o.value} modifiers={[tag(o.value)]}>
                  {cap(o.value)}
                </NativeText>
              ))}
            </Picker>

            <Picker
              label="Assignee"
              selection={assigneeId ?? UNASSIGNED}
              onSelectionChange={(value) =>
                setAssigneeId(value === UNASSIGNED ? null : String(value))
              }
            >
              <NativeText modifiers={[tag(UNASSIGNED)]}>Unassigned</NativeText>
              {members.map((m) => (
                <NativeText key={m.user_id} modifiers={[tag(m.user_id)]}>
                  {m.full_name}
                </NativeText>
              ))}
            </Picker>
          </Section>

          <Section title="Due">
            <Picker
              label="Due date"
              selection={dueSelection}
              onSelectionChange={(value) => {
                if (value === CUSTOM_DUE) {
                  setCustomDue(true)
                  if (!due) setDue(toISODate(new Date()))
                } else {
                  setCustomDue(false)
                  setDue(String(value))
                }
              }}
            >
              {DUE_OPTIONS.map((o) => (
                <NativeText key={o.value} modifiers={[tag(o.value)]}>
                  {o.label}
                </NativeText>
              ))}
            </Picker>
            {customDue ? (
              <DatePicker
                title="Pick a date"
                selection={due ? new Date(`${due}T00:00:00`) : new Date()}
                displayedComponents={["date"]}
                onDateChange={(date) => setDue(toISODate(date))}
              />
            ) : null}
          </Section>

          {labels.length > 0 ? (
            <Section title="Labels">
              {labels.map((label) => (
                <Toggle
                  key={label.id}
                  label={label.name}
                  isOn={labelIds.includes(label.id)}
                  onIsOnChange={(on) => toggleLabel(label.id, on)}
                />
              ))}
            </Section>
          ) : null}

          <Section>
            {error ? <NativeText>{error}</NativeText> : null}
            <Button
              label={saving ? "Creating…" : "Create task"}
              modifiers={[disabled(!title.trim() || !projectId || saving)]}
              onPress={() => void submit()}
            />
          </Section>
        </Form>
      </BottomSheet>
    </Host>
  )
}

const $host: ViewStyle = { position: "absolute", width: 0, height: 0 }
