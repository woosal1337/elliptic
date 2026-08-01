"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import type { Worklog, WorklogList } from "@/lib/types";
import { api, errorMessage, orgPath } from "@/lib/api";

export const worklogKeys = {
  all: (orgId: string, taskId: string) => ["orgs", orgId, "tasks", taskId, "worklogs"] as const,
};

function worklogsPath(orgId: string, taskId: string, suffix = ""): string {
  return orgPath(orgId, `/tasks/${taskId}/worklogs${suffix}`);
}

export function useWorklogs(orgId: string, taskId: string) {
  return useQuery({
    queryKey: worklogKeys.all(orgId, taskId),
    queryFn: ({ signal }) => api.get<WorklogList>(worklogsPath(orgId, taskId), signal),
  });
}

export function useCreateWorklog(orgId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { minutes: number; note?: string | null; logged_at?: string | null }) =>
      api.post<Worklog>(worklogsPath(orgId, taskId), input),
    onSuccess: () => {
      toast.success("Time logged");
      void queryClient.invalidateQueries({ queryKey: worklogKeys.all(orgId, taskId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteWorklog(orgId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (worklogId: string) => api.delete(worklogsPath(orgId, taskId, `/${worklogId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: worklogKeys.all(orgId, taskId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function formatMinutes(total: number): string {
  if (total <= 0) return "0m";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export async function downloadProjectWorklogsCsv(orgId: string, projectId: string): Promise<void> {
  const response = await fetch(orgPath(orgId, `/projects/${projectId}/worklogs/export.csv`), {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Export failed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "worklogs.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}


export function useProjectPendingWorklogs(orgId: string, projectId: string, enabled = true) {
  return useQuery({
    queryKey: ["orgs", orgId, "projects", projectId, "worklogs", "pending"] as const,
    enabled,
    queryFn: ({ signal }) =>
      api.get<Worklog[]>(orgPath(orgId, `/projects/${projectId}/worklogs/pending`), signal),
  });
}

export function useDecideWorklog(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { worklogId: string; approve: boolean; note?: string }) =>
      api.post<Worklog>(
        orgPath(orgId, `/worklogs/${input.worklogId}/${input.approve ? "approve" : "reject"}`),
        { note: input.note ?? null }
      ),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({
        queryKey: ["orgs", orgId, "projects", projectId, "worklogs", "pending"],
      });
      toast.success(input.approve ? "Worklog approved" : "Worklog rejected");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
