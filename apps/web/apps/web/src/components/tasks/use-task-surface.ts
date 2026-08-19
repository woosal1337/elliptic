"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Task, TaskPriority, TaskStatus } from "@/lib/types";
import { useUpdateTask } from "@/hooks/use-task-queries";
import { useMe } from "@/hooks/use-auth-queries";
import { useTaskKeyboard, type FocusedAction } from "./use-task-keyboard";

type ActionPicker = "status" | "priority" | "assignee";

interface PickerState {
  kind: ActionPicker;
  taskIds: string[];
}

export interface TaskSurface {
  selection: ReturnType<typeof useTaskKeyboard>;
  openTaskId: string | null;
  deepLinkCommentId: string | null;
  peekTaskId: string | null;
  picker: PickerState | null;
  setOpenTaskId: (id: string | null) => void;
  setPeekTaskId: (id: string | null) => void;
  closePicker: () => void;
  onCardSelect: (taskId: string, event: React.MouseEvent) => void;
  applyStatus: (status: TaskStatus) => void;
  applyPriority: (priority: TaskPriority) => void;
  applyAssignee: (userId: string | null) => void;
  pickerTask: Task | null;
}

export function useTaskSurface(
  orgId: string,
  projectId: string,
  order: string[],
  tasksById: Map<string, Task>,
  onSelectFromClick: (taskId: string, event: React.MouseEvent) => void,
  active: boolean
): TaskSurface {
  const updateTask = useUpdateTask(orgId, projectId);
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const taskParam = searchParams.get("task");
  const [openTaskId, setOpenTaskIdState] = useState<string | null>(() => taskParam);
  const deepLinkCommentId = searchParams.get("comment");

  // The URL owns which task is open, so a link that lands on the page we are
  // already on still opens the dialog. Seeding the state at mount alone loses
  // that case: the App Router keeps the same pathname mounted, so a click on an
  // inbox row for this project rewrote ?task= and nothing happened.
  useEffect(() => {
    setOpenTaskIdState(taskParam);
  }, [taskParam]);
  const [peekTaskId, setPeekTaskId] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerState | null>(null);

  const setOpenTaskId = useCallback(
    (id: string | null) => {
      setOpenTaskIdState(id);
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("task", id);
      } else {
        params.delete("task");
        params.delete("comment");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const closePicker = () => setPicker(null);

  const togglePeek = (taskId: string) =>
    setPeekTaskId((current) => (current === taskId ? null : taskId));

  const resolveTargets = (selectedIds: string[], focusedId: string | null) => {
    if (selectedIds.length > 0) return selectedIds;
    return focusedId ? [focusedId] : [];
  };

  const onAction = (action: FocusedAction, focusedId: string | null, selectedIds: string[]) => {
    const targets = resolveTargets(selectedIds, focusedId);
    if (targets.length === 0) return;
    if (action === "assign-me") {
      const userId = me.data?.id;
      if (!userId) return;
      for (const taskId of targets) updateTask.mutate({ taskId, assignee_id: userId });
      return;
    }
    if (action === "rename") {
      const first = targets[0];
      if (first) setOpenTaskId(first);
      return;
    }
    if (action === "create") return;
    setPicker({ kind: action, taskIds: targets });
  };

  const selection = useTaskKeyboard(order, active && openTaskId === null && picker === null, {
    onOpen: (taskId) => {
      setPeekTaskId(null);
      setOpenTaskId(taskId);
    },
    onPeek: togglePeek,
    onAction,
    peekOpen: peekTaskId !== null,
  });

  const applyToPicker = (apply: (taskId: string) => void) => {
    if (!picker) return;
    for (const taskId of picker.taskIds) apply(taskId);
    closePicker();
  };

  const applyStatus = (status: TaskStatus) =>
    applyToPicker((taskId) => updateTask.mutate({ taskId, status }));
  const applyPriority = (priority: TaskPriority) =>
    applyToPicker((taskId) => updateTask.mutate({ taskId, priority }));
  const applyAssignee = (userId: string | null) =>
    applyToPicker((taskId) => updateTask.mutate({ taskId, assignee_id: userId }));

  const pickerTask = useMemo(() => {
    if (!picker || picker.taskIds.length !== 1) return null;
    const id = picker.taskIds[0];
    return id ? tasksById.get(id) ?? null : null;
  }, [picker, tasksById]);

  return {
    selection,
    openTaskId,
    deepLinkCommentId,
    peekTaskId,
    picker,
    setOpenTaskId,
    setPeekTaskId,
    closePicker,
    onCardSelect: onSelectFromClick,
    applyStatus,
    applyPriority,
    applyAssignee,
    pickerTask,
  };
}

export function pickerCount(picker: { taskIds: string[] } | null): number {
  return picker?.taskIds.length ?? 0;
}
