"use client";

import { useState } from "react";
import { CalendarClock, CalendarSync, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  IconButton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import {
  type ScheduleDependencyType,
  useCreateScheduleLink,
  useDeleteScheduleLink,
  useAutoShift,
  useScheduleLinks,
  useTasks,
} from "@/hooks/use-task-queries";
import { StatusDot } from "./task-bits";

const TYPE_LABELS: Record<ScheduleDependencyType, string> = {
  finish_to_start: "Finish → Start",
  start_to_start: "Start → Start",
  finish_to_finish: "Finish → Finish",
  start_to_finish: "Start → Finish",
};

export function TaskSchedulePanel({
  orgId,
  projectId,
  taskId,
}: {
  orgId: string;
  projectId: string;
  taskId: string;
}) {
  const links = useScheduleLinks(orgId, taskId);
  const autoShift = useAutoShift(orgId, projectId);
  const tasks = useTasks(orgId, projectId);
  const create = useCreateScheduleLink(orgId, taskId);
  const remove = useDeleteScheduleLink(orgId, taskId);
  const [active, setActive] = useState(false);
  const [other, setOther] = useState<string | null>(null);
  const [type, setType] = useState<ScheduleDependencyType>("finish_to_start");
  const [role, setRole] = useState<"predecessor" | "successor">("predecessor");

  const candidates = (tasks.data ?? []).filter((task) => task.id !== taskId);

  const submit = () => {
    if (!other) return;
    create.mutate(
      { other_task_id: other, dependency_type: type, other_is_predecessor: role === "predecessor" },
      {
        onSuccess: () => {
          setOther(null);
          setActive(false);
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
          <CalendarClock className="size-3.5" />
          Scheduling
        </h4>
        {(links.data ?? []).some((l) => l.direction === "successor") ? (
          <button
            type="button"
            className="flex items-center gap-1 text-caption text-accent hover:underline disabled:opacity-50"
            disabled={autoShift.isPending}
            onClick={() => autoShift.mutate(taskId)}
          >
            <CalendarSync className="size-3" />
            Shift dependents
          </button>
        ) : null}
      </div>

      {links.isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : (links.data ?? []).length === 0 ? null : (
        <ul className="flex flex-col gap-1">
          {(links.data ?? []).map((link) => (
            <li
              key={link.link_id}
              className="group flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-caption"
            >
              <Badge variant="outline" size="sm">
                {link.direction === "predecessor" ? "after" : "before"}
              </Badge>
              <StatusDot status={link.status} />
              <span className="shrink-0 font-mono text-muted-foreground">{link.identifier}</span>
              <span className="min-w-0 flex-1 truncate text-foreground">{link.title}</span>
              <span className="hidden text-muted-foreground sm:inline">
                {TYPE_LABELS[link.dependency_type]}
              </span>
              <IconButton
                aria-label="Remove dependency"
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => remove.mutate(link.link_id)}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      {active ? (
        <div className="flex flex-col gap-2 rounded-md border border-input bg-surface p-2.5">
          <Select value={role} onValueChange={(value) => setRole(value as "predecessor" | "successor")}>
            <SelectTrigger aria-label="Direction">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="predecessor">This task comes after…</SelectItem>
              <SelectItem value="successor">This task comes before…</SelectItem>
            </SelectContent>
          </Select>
          <Select value={other ?? ""} onValueChange={(value) => setOther(value)}>
            <SelectTrigger aria-label="Related task">
              <SelectValue placeholder={candidates.length === 0 ? "No other tasks" : "Select a task"} />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.identifier} · {task.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={(value) => setType(value as ScheduleDependencyType)}>
            <SelectTrigger aria-label="Dependency type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TYPE_LABELS) as ScheduleDependencyType[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {TYPE_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="text-caption text-muted-foreground hover:text-foreground"
              onClick={() => setActive(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="text-caption font-medium text-accent disabled:opacity-50"
              disabled={!other || create.isPending}
              onClick={submit}
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-caption text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
        >
          <Plus className="size-3.5 shrink-0" />
          Add scheduling dependency
        </button>
      )}
    </div>
  );
}
