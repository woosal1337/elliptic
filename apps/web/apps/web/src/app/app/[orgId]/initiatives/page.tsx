"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  ChevronDown,
  GanttChartSquare,
  LayoutGrid,
  List,
  Plus,
  Target,
  Trash2,
  X,
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
  cn,
} from "@elliptic/ui";
import type { Initiative, InitiativeStatus } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/error-state";
import { useProjects } from "@/hooks/use-project-queries";
import { InitiativeUpdates } from "@/components/initiatives/initiative-updates";
import {
  useAddInitiativeProject,
  useCreateInitiative,
  useDeleteInitiative,
  useInitiativeProjects,
  useInitiatives,
  useRemoveInitiativeProject,
  useUpdateInitiative,
} from "@/hooks/use-initiative-queries";

const STATUS_META: Record<InitiativeStatus, { label: string; variant: "neutral" | "success" }> = {
  active: { label: "Active", variant: "success" },
  completed: { label: "Completed", variant: "neutral" },
  archived: { label: "Archived", variant: "neutral" },
};

type InitiativeView = "list" | "board" | "timeline";

const VIEW_TABS: { value: InitiativeView; label: string; icon: typeof List }[] = [
  { value: "list", label: "List", icon: List },
  { value: "board", label: "Board", icon: LayoutGrid },
  { value: "timeline", label: "Timeline", icon: GanttChartSquare },
];

const BOARD_COLUMNS: InitiativeStatus[] = ["active", "completed", "archived"];

function InitiativeTimeline({ initiatives }: { initiatives: Initiative[] }) {
  const dated = initiatives
    .filter((initiative) => initiative.target_date)
    .map((initiative) => ({
      initiative,
      time: new Date(initiative.target_date as string).getTime(),
    }))
    .filter((entry) => !Number.isNaN(entry.time))
    .sort((a, b) => a.time - b.time);

  if (dated.length === 0) {
    return (
      <EmptyState
        icon={<GanttChartSquare />}
        title="No dated initiatives"
        description="Give initiatives a target date to plot them on the timeline."
      />
    );
  }

  const min = dated[0]!.time;
  const max = dated[dated.length - 1]!.time;
  const span = max - min || 1;
  const now = Date.now();

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="relative mx-2 mt-6 mb-12 h-0.5 rounded-full bg-border">
        {dated.map(({ initiative, time }) => {
          const pct = dated.length === 1 ? 50 : ((time - min) / span) * 100;
          const tone =
            initiative.status === "completed"
              ? "bg-success ring-success/30"
              : time < now
                ? "bg-danger ring-danger/30"
                : "bg-accent ring-accent/30";
          return (
            <div
              key={initiative.id}
              className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${pct}%` }}
            >
              <div className={cn("size-3 rotate-45 rounded-[2px] ring-4", tone)} />
              <div className="absolute top-4 flex w-28 flex-col items-center gap-0.5 text-center">
                <span className="truncate text-caption font-medium text-foreground">
                  {initiative.name}
                </span>
                <span className="text-caption tabular text-muted-foreground">
                  {formatDate(initiative.target_date as string)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InitiativeProjectsManager({ orgId, initiativeId }: { orgId: string; initiativeId: string }) {
  const linked = useInitiativeProjects(orgId, initiativeId);
  const allProjects = useProjects(orgId);
  const addProject = useAddInitiativeProject(orgId);
  const removeProject = useRemoveInitiativeProject(orgId);

  const linkedIds = new Set((linked.data ?? []).map((project) => project.id));
  const available = (allProjects.data ?? []).filter(
    (project) => project.status === "active" && !linkedIds.has(project.id)
  );

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      {(linked.data ?? []).length > 0 ? (
        <ul className="flex flex-col gap-1">
          {(linked.data ?? []).map((project) => {
            const total = project.task_total || 1;
            const pct = Math.round((project.task_done / total) * 100);
            return (
              <li key={project.id} className="flex items-center gap-2 text-small">
                <Badge variant="outline" className="font-mono">
                  {project.key}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-foreground">{project.name}</span>
                <span className="text-caption text-muted-foreground tabular">
                  {project.task_done}/{project.task_total} · {pct}%
                </span>
                <IconButton
                  aria-label={`Remove ${project.name}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProject.mutate({ initiativeId, projectId: project.id })}
                >
                  <X className="size-3.5" />
                </IconButton>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-caption text-muted-foreground">No projects linked yet.</p>
      )}

      {available.length > 0 ? (
        <Select
          onValueChange={(projectId) => addProject.mutate({ initiativeId, projectId })}
          value=""
        >
          <SelectTrigger className="w-56" aria-label="Add project">
            <SelectValue placeholder="Add a project…" />
          </SelectTrigger>
          <SelectContent>
            {available.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}

function InitiativeCard({ orgId, initiative }: { orgId: string; initiative: Initiative }) {
  const updateInitiative = useUpdateInitiative(orgId);
  const deleteInitiative = useDeleteInitiative(orgId);
  const [open, setOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const total = initiative.task_total || 1;
  const meta = STATUS_META[initiative.status];

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-muted-foreground" />
          <span className="text-body font-semibold text-foreground">{initiative.name}</span>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
        <div className="flex items-center gap-1">
          {initiative.status === "active" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                updateInitiative.mutate({ initiativeId: initiative.id, status: "completed" })
              }
            >
              Complete
            </Button>
          ) : null}
          <IconButton
            aria-label={`Delete ${initiative.name}`}
            variant="ghost"
            size="sm"
            onClick={() => deleteInitiative.mutate(initiative.id)}
          >
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>

      {initiative.description ? (
        <p className="text-small text-muted-foreground">{initiative.description}</p>
      ) : null}

      <div className="flex items-center gap-3 text-caption text-muted-foreground">
        <span>
          {initiative.project_count} {initiative.project_count === 1 ? "project" : "projects"}
        </span>
        <span className="text-muted-foreground/50">·</span>
        <span className="tabular">
          {initiative.task_done}/{initiative.task_total} items done
        </span>
        {initiative.weighted_total > 0 ? (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span className="tabular">
              {Math.round((initiative.weighted_done / initiative.weighted_total) * 100)}% by effort
            </span>
          </>
        ) : null}
        {initiative.target_date ? (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span>Target {formatDate(initiative.target_date)}</span>
          </>
        ) : null}
      </div>

      <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        {initiative.task_done > 0 ? (
          <div className="bg-success" style={{ width: `${(initiative.task_done / total) * 100}%` }} />
        ) : null}
        {initiative.task_started > 0 ? (
          <div
            className="bg-warning"
            style={{ width: `${(initiative.task_started / total) * 100}%` }}
          />
        ) : null}
        {initiative.task_todo > 0 ? (
          <div
            className="bg-border-strong"
            style={{ width: `${(initiative.task_todo / total) * 100}%` }}
          />
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-1 text-caption text-muted-foreground transition-colors hover:text-foreground"
          aria-expanded={open}
        >
          <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          Manage projects
        </button>
        <button
          type="button"
          onClick={() => setUpdatesOpen((value) => !value)}
          className="flex items-center gap-1 text-caption text-muted-foreground transition-colors hover:text-foreground"
          aria-expanded={updatesOpen}
        >
          <ChevronDown
            className={`size-3.5 transition-transform ${updatesOpen ? "rotate-180" : ""}`}
          />
          Updates
        </button>
      </div>
      {open ? <InitiativeProjectsManager orgId={orgId} initiativeId={initiative.id} /> : null}
      {updatesOpen ? (
        <InitiativeUpdates orgId={orgId} initiativeId={initiative.id} />
      ) : null}
    </li>
  );
}

export default function InitiativesPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const initiatives = useInitiatives(orgId);
  const createInitiative = useCreateInitiative(orgId);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [view, setView] = useState<InitiativeView>("list");
  const items = initiatives.data ?? [];

  const submit = () => {
    if (!name.trim()) return;
    createInitiative.mutate(
      { name: name.trim(), target_date: target || null },
      {
        onSuccess: () => {
          setName("");
          setTarget("");
        },
      }
    );
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Initiatives"
      />

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 p-3">
        <Input
          placeholder="Initiative name (e.g. Q3 Expansion)"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Initiative name"
          className="min-w-56 flex-1"
        />
        <DatePicker
          value={target}
          onChange={(value) => setTarget(value ?? "")}
          placeholder="Target date"
          aria-label="Target date"
          className="w-44"
        />
        <Button
          onClick={submit}
          loading={createInitiative.isPending}
          disabled={name.trim().length === 0}
        >
          <Plus className="size-4" />
          Create
        </Button>
      </div>

      {items.length > 0 ? (
        <div className="flex items-center gap-0.5 self-start rounded-md border border-border bg-surface p-0.5">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setView(tab.value)}
              className={cn(
                "flex items-center gap-1.5 rounded px-2.5 py-1 text-caption transition-colors",
                view === tab.value
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="size-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {initiatives.isPending ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : initiatives.isError ? (
        <ErrorState error={initiatives.error} onRetry={() => void initiatives.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Target />}
          title="No initiatives yet"
          description="Group related projects under a strategic initiative to track portfolio progress."
        />
      ) : view === "timeline" ? (
        <InitiativeTimeline initiatives={items} />
      ) : view === "board" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {BOARD_COLUMNS.map((status) => {
            const column = items.filter((initiative) => initiative.status === status);
            return (
              <div key={status} className="flex flex-col gap-2">
                <h3 className="px-1 text-caption font-medium text-muted-foreground">
                  {STATUS_META[status].label} · {column.length}
                </h3>
                {column.map((initiative) => (
                  <InitiativeCard key={initiative.id} orgId={orgId} initiative={initiative} />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((initiative) => (
            <InitiativeCard key={initiative.id} orgId={orgId} initiative={initiative} />
          ))}
        </ul>
      )}
    </div>
  );
}
