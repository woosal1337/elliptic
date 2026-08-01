"use client";

import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Boxes,
  Download,
  GalleryVerticalEnd,
  List,
  Plus,
  Trash2,
  GanttChartSquare,
} from "lucide-react";
import {
  Badge,
  Button,
  DatePicker,
  EmptyState,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import type { Module, ModuleStatus } from "@/lib/types";
import { formatDate } from "@/lib/format";
import {
  downloadModuleCsv,
  useCreateModule,
  useDeleteModule,
  useModules,
  useModulesSummary,
  useSetModuleArchived,
  useUpdateModule,
} from "@/hooks/use-module-queries";
import { useMilestones } from "@/hooks/use-milestone-queries";
import { ErrorState } from "@/components/error-state";
import { ModuleTimeline } from "@/components/projects/module-timeline";

type ModuleView = "list" | "gallery" | "timeline";

const VIEWS: { key: ModuleView; label: string; icon: typeof List }[] = [
  { key: "list", label: "List", icon: List },
  { key: "gallery", label: "Gallery", icon: GalleryVerticalEnd },
  { key: "timeline", label: "Timeline", icon: GanttChartSquare },
];

function ModulesSummaryBar({ orgId, projectId }: { orgId: string; projectId: string }) {
  const summary = useModulesSummary(orgId, projectId);
  if (!summary.data || summary.data.module_count === 0) return null;
  const { module_count, completed, delayed, task_total, task_done } = summary.data;
  const pct = task_total > 0 ? Math.round((task_done / task_total) * 100) : 0;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: "Modules", value: String(module_count) },
        { label: "Completed", value: String(completed) },
        { label: "Delayed", value: String(delayed), warn: delayed > 0 },
        { label: "Overall progress", value: `${pct}%` },
      ].map((stat) => (
        <div key={stat.label} className="rounded-lg border border-border bg-surface p-3">
          <div
            className={`text-h4 font-semibold tabular ${stat.warn ? "text-warning" : "text-foreground"}`}
          >
            {stat.value}
          </div>
          <div className="text-caption text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

const STATUS_META: Record<
  ModuleStatus,
  { label: string; variant: "neutral" | "success" | "warning" | "danger" }
> = {
  planned: { label: "Planned", variant: "neutral" },
  in_progress: { label: "In progress", variant: "warning" },
  paused: { label: "Paused", variant: "neutral" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

const STATUS_ORDER: ModuleStatus[] = [
  "planned",
  "in_progress",
  "paused",
  "completed",
  "cancelled",
];

export function ProjectModules({ orgId, projectId }: { orgId: string; projectId: string }) {
  const [showArchived, setShowArchived] = useState(false);
  const modules = useModules(orgId, projectId, true, showArchived);
  const createModule = useCreateModule(orgId, projectId);
  const updateModule = useUpdateModule(orgId, projectId);
  const milestones = useMilestones(orgId, projectId);
  const deleteModule = useDeleteModule(orgId, projectId);
  const setArchived = useSetModuleArchived(orgId, projectId);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [view, setView] = useState<ModuleView>("list");

  const submit = () => {
    if (!name.trim()) return;
    createModule.mutate(
      { name: name.trim(), target_date: target || null },
      {
        onSuccess: () => {
          setName("");
          setTarget("");
          setAdding(false);
        },
      }
    );
  };

  const rows = modules.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <ModulesSummaryBar orgId={orgId} projectId={projectId} />
      <div className="flex items-center justify-between">
        <p className="text-small text-muted-foreground">
          Group work items into features or workstreams, each with its own progress.
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showArchived ? "secondary" : "ghost"}
            onClick={() => setShowArchived((value) => !value)}
            aria-pressed={showArchived}
          >
            {showArchived ? "Hide archived" : "Show archived"}
          </Button>
          <div className="flex items-center rounded-md border border-border p-0.5">
            {VIEWS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                aria-label={entry.label}
                onClick={() => setView(entry.key)}
                className={`inline-flex size-7 items-center justify-center rounded ${
                  view === entry.key
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <entry.icon className="size-4" />
              </button>
            ))}
          </div>
          {!adding ? (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" />
              New module
            </Button>
          ) : null}
        </div>
      </div>

      {adding ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <Input
            placeholder="Module name (e.g. Billing)"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Module name"
            className="min-w-48 flex-1"
          />
          <DatePicker
            value={target}
            onChange={(value) => setTarget(value ?? "")}
            placeholder="Target date"
            aria-label="Target date"
            className="w-44"
          />
          <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={submit}
            loading={createModule.isPending}
            disabled={name.trim().length === 0}
          >
            Create
          </Button>
        </div>
      ) : null}

      {modules.isPending ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : modules.isError ? (
        <ErrorState error={modules.error} onRetry={() => void modules.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Boxes />}
          title="No modules yet"
          description="Create a module to group related work items into a feature or workstream."
        />
      ) : view === "timeline" ? (
        <ModuleTimeline modules={rows} />
      ) : view === "gallery" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((module: Module) => {
            const total = module.task_total || 1;
            const pct = Math.round((module.task_done / total) * 100);
            return (
              <div
                key={module.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-small font-semibold text-foreground">
                    {module.name}
                  </span>
                  <Badge variant={STATUS_META[module.status].variant}>
                    {STATUS_META[module.status].label}
                  </Badge>
                </div>
                <span className="text-caption tabular text-muted-foreground">
                  {module.task_done}/{module.task_total} done · {pct}%
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-success" style={{ width: `${pct}%` }} aria-hidden />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((module: Module) => {
            const total = module.task_total || 1;
            return (
              <li
                key={module.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-small font-semibold text-foreground">{module.name}</span>
                    <Badge variant={STATUS_META[module.status].variant}>
                      {STATUS_META[module.status].label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Select
                      value={module.status}
                      onValueChange={(value) =>
                        updateModule.mutate({
                          moduleId: module.id,
                          status: value as ModuleStatus,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-36" aria-label="Module status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_ORDER.map((status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_META[status].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <IconButton
                      aria-label={`Export ${module.name}`}
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        void downloadModuleCsv(orgId, projectId, module.id, module.name)
                      }
                    >
                      <Download className="size-4" />
                    </IconButton>
                    <IconButton
                      aria-label={module.archived_at ? `Restore ${module.name}` : `Archive ${module.name}`}
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setArchived.mutate({ moduleId: module.id, archived: !module.archived_at })
                      }
                    >
                      {module.archived_at ? (
                        <ArchiveRestore className="size-4" />
                      ) : (
                        <Archive className="size-4" />
                      )}
                    </IconButton>
                    <IconButton
                      aria-label={`Delete ${module.name}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteModule.mutate(module.id)}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-caption text-muted-foreground">
                  <Boxes className="size-3.5" />
                  {module.target_date ? formatDate(module.target_date) : "No target date"}
                  <span className="px-1 text-muted-foreground/50">·</span>
                  <span className="tabular">
                    {module.task_done}/{module.task_total} done
                  </span>
                  <span className="px-1 text-muted-foreground/50">·</span>
                  <Select
                    value={module.milestone_id ?? "none"}
                    onValueChange={(value) =>
                      updateModule.mutate(
                        value === "none"
                          ? { moduleId: module.id, clear_milestone: true }
                          : { moduleId: module.id, milestone_id: value }
                      )
                    }
                  >
                    <SelectTrigger className="h-6 w-40 border-none bg-transparent px-1 text-caption" aria-label="Milestone">
                      <SelectValue placeholder="No milestone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No milestone</SelectItem>
                      {(milestones.data ?? []).map((milestone) => (
                        <SelectItem key={milestone.id} value={milestone.id}>
                          {milestone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                  {module.task_done > 0 ? (
                    <div
                      className="bg-success"
                      style={{ width: `${(module.task_done / total) * 100}%` }}
                    />
                  ) : null}
                  {module.task_started > 0 ? (
                    <div
                      className="bg-warning"
                      style={{ width: `${(module.task_started / total) * 100}%` }}
                    />
                  ) : null}
                  {module.task_todo > 0 ? (
                    <div
                      className="bg-border-strong"
                      style={{ width: `${(module.task_todo / total) * 100}%` }}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
