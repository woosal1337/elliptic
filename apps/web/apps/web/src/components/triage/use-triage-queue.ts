"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";
import type { Project, Task } from "@/lib/types";
import { useProjects } from "@/hooks/use-project-queries";

export interface TriageTask extends Task {
  __projectName: string;
  __projectKey: string;
}

export type TriageDecision = "accept" | "duplicate" | "decline" | "snooze";

interface ProcessVariables {
  task: TriageTask;
  decision: TriageDecision;
}

const SNOOZE_MS = 24 * 60 * 60 * 1000;

const triageKey = (orgId: string) => ["orgs", orgId, "triage"] as const;

export interface TriageQueue {
  tasks: TriageTask[];
  activeProjectCount: number;
  isPending: boolean;
  isError: boolean;
  errorMessage: string | null;
  refetch: () => void;
  process: (task: TriageTask, decision: TriageDecision) => void;
  processingId: string | null;
}

export function useTriageQueue(orgId: string, resolved = false): TriageQueue {
  const projects = useProjects(orgId);
  const queryClient = useQueryClient();

  const triage = useQuery({
    queryKey: [...triageKey(orgId), resolved ? "resolved" : "open"] as const,
    queryFn: ({ signal }) =>
      api.get<Task[]>(orgPath(orgId, `/triage${resolved ? "?resolved=true" : ""}`), signal),
  });

  const projectMeta = useMemo(() => {
    const map = new Map<string, Project>();
    for (const project of projects.data ?? []) map.set(project.id, project);
    return map;
  }, [projects.data]);

  const tasks = useMemo<TriageTask[]>(
    () =>
      (triage.data ?? []).map((task) => ({
        ...task,
        __projectKey: task.identifier.split("-")[0] ?? "",
        __projectName: projectMeta.get(task.project_id)?.name ?? "",
      })),
    [triage.data, projectMeta]
  );

  const activeProjectCount = useMemo(
    () => new Set(tasks.map((task) => task.project_id)).size,
    [tasks]
  );

  const process = useMutation({
    mutationFn: ({ task, decision }: ProcessVariables) => {
      const base = orgPath(orgId, `/tasks/${task.id}/triage`);
      if (decision === "accept") return api.post<Task>(`${base}/accept`, { status: "todo" });
      if (decision === "duplicate") return api.post<Task>(`${base}/duplicate`, {});
      if (decision === "decline") return api.post<Task>(`${base}/decline`, {});
      return api.post<Task>(`${base}/snooze`, {
        snoozed_till: new Date(Date.now() + SNOOZE_MS).toISOString(),
      });
    },
    onSuccess: (_task, { decision }: ProcessVariables) => {
      if (decision === "accept") toast.success("Accepted, moved to To do", { duration: 1500 });
      if (decision === "duplicate") toast.success("Marked as duplicate", { duration: 1500 });
      if (decision === "decline") toast.success("Declined", { duration: 1500 });
      if (decision === "snooze") toast.success("Snoozed for a day", { duration: 1500 });
    },
    onError: (error) => toast.error(errorMessage(error)),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: triageKey(orgId) });
    },
  });

  const refetch = useCallback(() => void triage.refetch(), [triage]);

  const runProcess = useCallback(
    (task: TriageTask, decision: TriageDecision) => {
      process.mutate({ task, decision });
    },
    [process]
  );

  return {
    tasks,
    activeProjectCount,
    isPending: projects.isPending || triage.isPending,
    isError: projects.isError || triage.isError,
    errorMessage: triage.isError
      ? errorMessage(triage.error)
      : projects.isError
        ? errorMessage(projects.error)
        : null,
    refetch,
    process: runProcess,
    processingId: process.isPending ? process.variables?.task.id ?? null : null,
  };
}
