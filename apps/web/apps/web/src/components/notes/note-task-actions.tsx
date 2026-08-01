"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@elliptic/ui";
import { noteKeys } from "@/hooks/use-note-queries";
import { useProjects } from "@/hooks/use-project-queries";
import { useCreateTask } from "@/hooks/use-task-queries";
import { api, orgPath } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import type { Note } from "@/lib/types";
import type { NoteTaskActions, TaskDraft } from "@/components/notes/editor-extensions";

interface UseNoteTaskActionsResult {
  taskActions: NoteTaskActions;
  picker: React.ReactNode;
}

export function useNoteTaskActions(): UseNoteTaskActionsResult {
  const params = useParams<{ orgId?: string; noteId?: string }>();
  const orgId = params.orgId ?? "";
  const noteId = params.noteId ?? "";
  const note = useQuery({
    queryKey: noteKeys.detail(orgId, noteId),
    queryFn: ({ signal }) => api.get<Note>(orgPath(orgId, `/notes/${noteId}`), signal),
    enabled: orgId.length > 0 && noteId.length > 0,
  });
  const projects = useProjects(orgId);

  const noteProjectId = note.data?.project_id ?? null;
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [pending, setPending] = useState<TaskDraft[] | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>("");

  const targetProjectId = pendingProjectId ?? "";
  const createTask = useCreateTask(orgId, targetProjectId);

  useEffect(() => {
    if (!pendingProjectId || !pending) return;
    for (const draft of pending) {
      createTask.mutate({
        title: draft.title,
        status: "todo",
        priority: "none",
      });
    }
    toast.success(pending.length === 1 ? "Created 1 task" : `Created ${pending.length} tasks`);
    setPending(null);
    setPendingProjectId(null);
  }, [pendingProjectId, pending, createTask]);

  const createTasks = useCallback(
    (drafts: TaskDraft[]) => {
      const valid = drafts.filter((draft) => draft.title.trim().length > 0);
      if (valid.length === 0) return;
      if (noteProjectId) {
        setPending(valid);
        setPendingProjectId(noteProjectId);
        return;
      }
      setPending(valid);
      setSelectedProject((projects.data ?? [])[0]?.id ?? "");
    },
    [noteProjectId, projects.data]
  );

  const taskActions = useMemo<NoteTaskActions>(() => ({ createTasks }), [createTasks]);

  const pickerOpen = pending !== null && !noteProjectId && pendingProjectId === null;

  const closePicker = useCallback(() => {
    setPending(null);
    setSelectedProject("");
  }, []);

  const confirmProject = useCallback(() => {
    if (!selectedProject) return;
    setPendingProjectId(selectedProject);
  }, [selectedProject]);

  const picker = (
    <Dialog open={pickerOpen} onOpenChange={(open) => (open ? null : closePicker())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Choose a project</DialogTitle>
          <DialogDescription>
            This note is not linked to a project. Pick where the{" "}
            {pending && pending.length === 1 ? "task" : "tasks"} should land.
          </DialogDescription>
        </DialogHeader>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger aria-label="Project">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {(projects.data ?? []).map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="ghost" onClick={closePicker}>
            Cancel
          </Button>
          <Button onClick={confirmProject} disabled={!selectedProject}>
            Create {pending && pending.length === 1 ? "task" : "tasks"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { taskActions, picker };
}
