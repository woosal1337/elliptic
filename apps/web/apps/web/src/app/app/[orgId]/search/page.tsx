"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import { CheckSquare, FolderKanban, Search } from "lucide-react";
import { Badge, EmptyState, Input, Skeleton } from "@elliptic/ui";
import type { Page, Project, Task } from "@/lib/types";
import { api, orgPath } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { taskKeys } from "@/hooks/use-task-queries";
import { useProjects } from "@/hooks/use-project-queries";
import { PriorityIcon, StatusDot } from "@/components/tasks/task-bits";

export default function SearchPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  const projects = useProjects(orgId);
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

  const projectName = useMemo(() => {
    const map = new Map<string, Project>();
    for (const project of activeProjects) map.set(project.id, project);
    return map;
  }, [activeProjects]);

  const normalized = query.trim().toLowerCase();

  const projectMatches = useMemo(() => {
    if (!normalized) return [];
    return activeProjects.filter(
      (project) =>
        project.name.toLowerCase().includes(normalized) ||
        project.key.toLowerCase().includes(normalized)
    );
  }, [activeProjects, normalized]);

  const taskMatches = useMemo(() => {
    if (!normalized) return [];
    const out: Task[] = [];
    for (const result of taskQueries) {
      for (const task of result.data ?? []) {
        if (
          task.title.toLowerCase().includes(normalized) ||
          task.identifier.toLowerCase().includes(normalized)
        ) {
          out.push(task);
        }
      }
    }
    return out.slice(0, 50);
  }, [taskQueries, normalized]);

  const tasksLoading = taskQueries.some((result) => result.isPending);
  const hasResults = projectMatches.length > 0 || taskMatches.length > 0;

  const onQueryChange = (value: string) => {
    setQuery(value);
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("q", value);
    else url.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
      <PageHeader eyebrow="Workspace" title="Search" description="Find projects and work items across your org." />
      <Input
        autoFocus
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search projects and tasks…"
        aria-label="Search"
      />

      {!normalized ? (
        <EmptyState icon={<Search />} title="Start typing to search" description="Results update as you type." />
      ) : projects.isPending || (activeProjects.length > 0 && tasksLoading) ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-md" />
          ))}
        </div>
      ) : !hasResults ? (
        <EmptyState icon={<Search />} title="No matches" description={`Nothing found for “${query}”.`} />
      ) : (
        <div className="flex flex-col gap-6">
          {projectMatches.length > 0 ? (
            <section className="flex flex-col gap-1.5">
              <h2 className="text-mono-label font-mono uppercase tracking-wide text-muted-foreground/70">
                Projects
              </h2>
              <ul className="overflow-hidden rounded-lg border border-border bg-surface">
                {projectMatches.map((project) => (
                  <li key={project.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/app/${orgId}/projects/${project.id}`)}
                      className="flex w-full items-center gap-3 border-b border-border px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-muted/50"
                    >
                      <FolderKanban className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-small font-medium text-foreground">
                        {project.name}
                      </span>
                      <Badge variant="outline" className="font-mono">
                        {project.key}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {taskMatches.length > 0 ? (
            <section className="flex flex-col gap-1.5">
              <h2 className="text-mono-label font-mono uppercase tracking-wide text-muted-foreground/70">
                Tasks
              </h2>
              <ul className="overflow-hidden rounded-lg border border-border bg-surface">
                {taskMatches.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/app/${orgId}/projects/${task.project_id}?task=${task.id}`)
                      }
                      className="flex w-full items-center gap-2.5 border-b border-border px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-muted/50"
                    >
                      <StatusDot status={task.status} className="shrink-0" />
                      <PriorityIcon priority={task.priority} />
                      <span className="shrink-0 font-mono text-caption text-muted-foreground">
                        {task.identifier}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-small text-foreground">
                        {task.title}
                      </span>
                      <span className="hidden shrink-0 text-caption text-muted-foreground sm:inline">
                        {projectName.get(task.project_id)?.key ?? ""}
                      </span>
                      <CheckSquare className="size-3.5 shrink-0 text-muted-foreground/60" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
