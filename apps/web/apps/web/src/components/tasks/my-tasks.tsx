"use client";

import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { CircleUser } from "lucide-react";
import { Badge, Button, EmptyState, Skeleton, cn } from "@elliptic/ui";
import type { Page, Project, Task } from "@/lib/types";
import { PRIORITY_LABELS, STATUS_LABELS, statusCategory } from "@/lib/task-meta";
import { api, errorMessage, orgPath } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { taskKeys } from "@/hooks/use-task-queries";
import { useProjects } from "@/hooks/use-project-queries";
import { useMe } from "@/hooks/use-auth-queries";
import { useOrgMembers } from "@/hooks/use-org-queries";
import { ErrorState } from "@/components/error-state";
import { PriorityIcon, StatusDot } from "./task-bits";
import { groupTasksByFocus, taskContextLine, type FocusGroup } from "./focus-order";

interface MyTask extends Task {
  __projectName: string;
  __projectKey: string;
}

type MyWorkTab = "assigned" | "created";

const MY_WORK_TABS: readonly { value: MyWorkTab; label: string }[] = [
  { value: "assigned", label: "Assigned" },
  { value: "created", label: "Created by me" },
];

interface Workload {
  open: number;
  started: number;
  done: number;
}

function workloadOf(tasks: readonly Task[]): Workload {
  let open = 0;
  let started = 0;
  let done = 0;
  for (const task of tasks) {
    const category = statusCategory(task.status);
    if (category === "started") started += 1;
    else if (category === "completed") done += 1;
    else if (category !== "cancelled") open += 1;
  }
  return { open, started, done };
}

function WorkBar({
  tabs,
  active,
  counts,
  onChange,
}: {
  tabs: readonly { value: MyWorkTab; label: string }[];
  active: MyWorkTab;
  counts: Record<MyWorkTab, number>;
  onChange: (tab: MyWorkTab) => void;
}) {
  return (
    <div role="tablist" aria-label="Your work" className="flex items-center gap-1">
      {tabs.map((tab) => {
        const selected = tab.value === active;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-small font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              selected
                ? "bg-subtle text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            <span className="tabular text-caption text-muted-foreground">{counts[tab.value]}</span>
          </button>
        );
      })}
    </div>
  );
}

function WorkloadSummary({ workload }: { workload: Workload }) {
  const stats: { label: string; value: number }[] = [
    { label: "Open", value: workload.open },
    { label: "In progress", value: workload.started },
    { label: "Done", value: workload.done },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {stats.map((stat) => (
        <span
          key={stat.label}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-caption text-muted-foreground"
        >
          <span className="tabular font-semibold text-foreground">{stat.value}</span>
          {stat.label}
        </span>
      ))}
    </div>
  );
}

function FocusGroupSection({
  group,
  memberName,
  onOpen,
}: {
  group: FocusGroup;
  memberName: Map<string, string>;
  onOpen: (task: MyTask) => void;
}) {
  return (
    <section aria-label={group.label} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 px-0.5">
        <h2 className="text-h4 font-semibold text-foreground">{group.label}</h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-subtle px-1.5 text-caption font-medium text-muted-foreground tabular">
          {group.tasks.length}
        </span>
      </div>
      <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
        {(group.tasks as MyTask[]).map((task) => {
          const assigneeName = task.assignee_id ? memberName.get(task.assignee_id) ?? null : null;
          const context = taskContextLine(task, assigneeName);
          return (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => onOpen(task)}
                className={cn(
                  "group flex w-full items-center gap-3 border-b border-border px-4 py-2.5 text-left transition-colors duration-150 last:border-b-0 hover:bg-muted/50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                )}
              >
                <StatusDot status={task.status} className="mt-0.5 shrink-0" />
                <PriorityIcon priority={task.priority} />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-baseline gap-2.5">
                    <span className="shrink-0 font-mono text-caption text-muted-foreground">
                      {task.identifier}
                    </span>
                    <span className="truncate text-small font-medium text-foreground">
                      {task.title}
                    </span>
                  </div>
                  {context ? (
                    <p className="mt-0.5 line-clamp-1 text-caption text-muted-foreground">
                      {context}
                    </p>
                  ) : null}
                </div>
                <Badge variant="outline" className="hidden shrink-0 font-mono sm:inline-flex">
                  {task.__projectKey}
                </Badge>
                <span className="hidden shrink-0 text-caption text-muted-foreground sm:inline">
                  {STATUS_LABELS[task.status]}
                </span>
                <span className="shrink-0 whitespace-nowrap text-caption text-muted-foreground tabular">
                  {formatRelative(task.updated_at)}
                </span>
                <span className="sr-only">
                  {PRIORITY_LABELS[task.priority]} priority in {task.__projectName}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function MyTasks({ orgId }: { orgId: string }) {
  const me = useMe();
  const projects = useProjects(orgId);
  const members = useOrgMembers(orgId);

  const activeProjects = useMemo(
    () => (projects.data ?? []).filter((project) => project.status === "active"),
    [projects.data]
  );

  const taskQueries = useQueries({
    queries: activeProjects.map((project: Project) => ({
      queryKey: taskKeys.byProject(orgId, project.id),
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const page = await api.get<Page<Task>>(
          orgPath(orgId, `/projects/${project.id}/tasks`),
          signal
        );
        return page.items;
      },
      enabled: projects.isSuccess,
    })),
  });

  const projectById = useMemo(() => {
    const map = new Map<string, Project>();
    for (const project of activeProjects) map.set(project.id, project);
    return map;
  }, [activeProjects]);

  const memberName = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members.data ?? []) {
      map.set(member.user_id, member.full_name);
    }
    return map;
  }, [members.data]);

  const myUserId = me.data?.id ?? null;
  const [tab, setTab] = useState<MyWorkTab>("assigned");

  const collected = useMemo<MyTask[]>(() => {
    const out: MyTask[] = [];
    taskQueries.forEach((query, index) => {
      const project = activeProjects[index];
      if (!project || !query.data) return;
      for (const task of query.data) {
        out.push({
          ...task,
          __projectName: projectById.get(task.project_id)?.name ?? project.name,
          __projectKey: projectById.get(task.project_id)?.key ?? project.key,
        });
      }
    });
    return out;
  }, [taskQueries, activeProjects, projectById]);

  const tabTasks = useMemo<Record<MyWorkTab, MyTask[]>>(() => {
    if (!myUserId) return { assigned: [], created: [] };
    return {
      assigned: collected.filter((task) => task.assignee_id === myUserId),
      created: collected.filter((task) => task.created_by === myUserId),
    };
  }, [collected, myUserId]);

  const activeTasks = tabTasks[tab];
  const groups = useMemo<FocusGroup[]>(() => groupTasksByFocus(activeTasks), [activeTasks]);
  const workload = useMemo(() => workloadOf(activeTasks), [activeTasks]);
  const tabCounts: Record<MyWorkTab, number> = {
    assigned: tabTasks.assigned.length,
    created: tabTasks.created.length,
  };

  const tasksLoading = taskQueries.some((query) => query.isPending);
  const tasksError = taskQueries.find((query) => query.isError);

  if (me.isError) {
    return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;
  }

  if (projects.isError) {
    return <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />;
  }

  if (me.isPending || projects.isPending || (activeProjects.length > 0 && tasksLoading)) {
    return (
      <div className="flex flex-col gap-6">
        {Array.from({ length: 2 }, (_, section) => (
          <div key={section} className="flex flex-col gap-1.5">
            <Skeleton className="h-6 w-32" />
            <div className="flex flex-col gap-px rounded-lg border border-border">
              {Array.from({ length: 4 }, (_, row) => (
                <Skeleton key={row} className="h-12 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tasksError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-small text-muted-foreground">
          {errorMessage(tasksError.error)}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => taskQueries.forEach((query) => void query.refetch())}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WorkBar tabs={MY_WORK_TABS} active={tab} counts={tabCounts} onChange={setTab} />
        {activeTasks.length > 0 ? <WorkloadSummary workload={workload} /> : null}
      </div>
      {activeTasks.length === 0 ? (
        <EmptyState
          icon={<CircleUser />}
          title={tab === "assigned" ? "Nothing assigned to you" : "You haven't created anything yet"}
          description={
            tab === "assigned"
              ? "Tasks assigned to you across your active projects will show up here, ordered by focus."
              : "Tasks you create across your active projects will show up here."
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <FocusGroupSection
              key={group.id}
              group={group}
              memberName={memberName}
              onOpen={(task) => {
                window.location.assign(`/app/${orgId}/projects/${task.project_id}`);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
