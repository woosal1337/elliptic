"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@elliptic/ui";
import type { BugSeverity, TaskKind, TaskPriority, TaskStatus } from "@/lib/types";
import { useCreateTask } from "@/hooks/use-task-queries";
import { useMe } from "@/hooks/use-auth-queries";
import { useDuplicateCheck } from "@/hooks/use-duplicate-check";
import { useOrgMembers } from "@/hooks/use-org-queries";
import { useProjectMembers } from "@/hooks/use-project-queries";
import { useTemplates } from "@/hooks/use-template-queries";
import { AssigneeSelect, PrioritySelect, SeveritySelect, StatusSelect } from "./task-bits";
import { SegmentedToggle } from "./task-view-toolbar";

const KIND_OPTIONS = [
  { value: "task" as const, label: "Task" },
  { value: "bug" as const, label: "Bug" },
  { value: "story" as const, label: "Story" },
  { value: "epic" as const, label: "Epic" },
];

const DEFAULT_SEVERITY: BugSeverity = "medium";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

type TaskValues = z.infer<typeof taskSchema>;

interface TaskDraft {
  title: string;
  description: string;
}

function draftKey(orgId: string, projectId: string): string {
  return `elliptic:task-draft:${orgId}:${projectId}`;
}

function readDraft(orgId: string, projectId: string): TaskDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(orgId, projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TaskDraft>;
    const title = typeof parsed.title === "string" ? parsed.title : "";
    const description = typeof parsed.description === "string" ? parsed.description : "";
    if (!title.trim() && !description.trim()) return null;
    return { title, description };
  } catch {
    return null;
  }
}

function writeDraft(orgId: string, projectId: string, draft: TaskDraft): void {
  if (typeof window === "undefined") return;
  try {
    if (!draft.title.trim() && !draft.description.trim()) {
      window.localStorage.removeItem(draftKey(orgId, projectId));
      return;
    }
    window.localStorage.setItem(draftKey(orgId, projectId), JSON.stringify(draft));
  } catch {
    return;
  }
}

function clearDraft(orgId: string, projectId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftKey(orgId, projectId));
  } catch {
    return;
  }
}

export function CreateTaskDialog({
  orgId,
  projectId,
  open,
  onOpenChange,
  defaultStatus = "todo",
  defaultTitle = "",
  defaultDescription = "",
  defaultPriority = "none",
  defaultAssigneeId = null,
}: {
  orgId: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: TaskStatus;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultPriority?: TaskPriority;
  defaultAssigneeId?: string | null;
}) {
  const createTask = useCreateTask(orgId, projectId);
  const me = useMe();
  const orgMembers = useOrgMembers(orgId);
  const projectMembers = useProjectMembers(orgId, projectId);
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const templates = useTemplates(orgId, projectId, open);
  const [priority, setPriority] = useState<TaskPriority>(defaultPriority);
  const [assigneeId, setAssigneeId] = useState<string | null>(defaultAssigneeId);
  const [kind, setKind] = useState<TaskKind>("task");
  const [severity, setSeverity] = useState<BugSeverity>(DEFAULT_SEVERITY);

  const form = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: defaultTitle, description: defaultDescription },
  });
  const [hasDraft, setHasDraft] = useState(false);
  const watchedTitle = form.watch("title");
  const duplicates = useDuplicateCheck(orgId, projectId, watchedTitle ?? "");

  useEffect(() => {
    if (!open || defaultTitle) return;
    const draft = readDraft(orgId, projectId);
    if (draft) {
      form.reset({ title: draft.title, description: draft.description });
      setHasDraft(true);
    }
  }, [open, defaultTitle, orgId, projectId, form]);

  useEffect(() => {
    const subscription = form.watch((values) => {
      const draft = { title: values.title ?? "", description: values.description ?? "" };
      writeDraft(orgId, projectId, draft);
      setHasDraft(Boolean(draft.title.trim() || draft.description.trim()));
    });
    return () => subscription.unsubscribe();
  }, [form, orgId, projectId]);

  const discardDraft = () => {
    clearDraft(orgId, projectId);
    form.reset({ title: "", description: "" });
    setHasDraft(false);
  };

  const projectMemberIds = new Set((projectMembers.data ?? []).map((member) => member.user_id));
  const assignableMembers = (orgMembers.data ?? []).filter(
    (member) => projectMemberIds.has(member.user_id) && member.role !== "guest"
  );

  // Work lands on whoever creates it unless the caller names someone else, so the
  // picker opens pre-filled — visible, and changeable before saving. An admin who
  // isn't on this project can't be assigned, so they start Unassigned instead.
  const creatorId = me.data?.id ?? null;
  const creatorIsAssignable = assignableMembers.some((member) => member.user_id === creatorId);
  const initialAssigneeId = defaultAssigneeId ?? (creatorIsAssignable ? creatorId : null);
  useEffect(() => {
    if (!open) return;
    setAssigneeId(initialAssigneeId);
  }, [open, initialAssigneeId]);

  const applyTemplate = (templateId: string) => {
    const template = templates.data?.find((item) => item.id === templateId);
    if (!template) return;
    form.setValue("title", template.title);
    form.setValue("description", template.description ?? "");
    setPriority(template.priority);
    setKind(template.kind);
  };

  const onSubmit = form.handleSubmit((values) => {
    createTask.mutate(
      {
        title: values.title,
        description: values.description || undefined,
        status,
        priority,
        assignee_id: assigneeId,
        unassigned: assigneeId === null,
        kind,
        severity: kind === "bug" ? severity : null,
      },
      {
        onSuccess: () => {
          clearDraft(orgId, projectId);
          setHasDraft(false);
          onOpenChange(false);
          form.reset();
          setStatus(defaultStatus);
          setPriority("none");
          setAssigneeId(initialAssigneeId);
          setKind("task");
          setSeverity(DEFAULT_SEVERITY);
        },
      }
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {(templates.data ?? []).length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Label>Start from template</Label>
              <Select onValueChange={applyTemplate}>
                <SelectTrigger aria-label="Template">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {(templates.data ?? []).map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              placeholder="What needs to be done?"
              autoFocus
              {...form.register("title")}
            />
            {form.formState.errors.title ? (
              <p className="text-caption text-danger">{form.formState.errors.title.message}</p>
            ) : null}
            {(duplicates.data ?? []).length > 0 ? (
              <div className="flex flex-col gap-1 rounded-md border border-warning/40 bg-warning-muted/40 p-2">
                <span className="text-caption font-medium text-foreground">
                  Possible duplicate{(duplicates.data ?? []).length > 1 ? "s" : ""}:
                </span>
                {(duplicates.data ?? []).slice(0, 3).map((candidate) => (
                  <span key={candidate.task_id} className="truncate text-caption text-muted-foreground">
                    • {candidate.title}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              rows={4}
              placeholder="Add context, links, acceptance criteria…"
              {...form.register("description")}
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <SegmentedToggle
                ariaLabel="Task type"
                value={kind}
                options={KIND_OPTIONS}
                onChange={setKind}
              />
            </div>
            {kind === "bug" ? (
              <div className="flex min-w-40 flex-col gap-1.5">
                <Label>Severity</Label>
                <SeveritySelect value={severity} onChange={setSeverity} />
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <StatusSelect value={status} onChange={setStatus} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <PrioritySelect value={priority} onChange={setPriority} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Assignee</Label>
              <AssigneeSelect
                value={assigneeId}
                members={assignableMembers}
                onChange={setAssigneeId}
              />
            </div>
          </div>
          <DialogFooter className="sm:items-center sm:justify-between">
            {hasDraft ? (
              <button
                type="button"
                onClick={discardDraft}
                className="text-caption text-muted-foreground transition-colors hover:text-foreground"
              >
                Draft auto-saved · Discard
              </button>
            ) : (
              <span />
            )}
            <Button type="submit" loading={createTask.isPending}>
              Create task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
