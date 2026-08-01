"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import type { TaskKind, TaskPriority } from "@/lib/types";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface RecurringTask {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  kind: TaskKind;
  assignee_id: string | null;
  interval_days: number;
  next_run_at: string;
  last_run_at: string | null;
  active: boolean;
}

const key = (orgId: string, projectId: string) =>
  ["orgs", orgId, "projects", projectId, "recurring-tasks"] as const;

export function useRecurringTasks(orgId: string, projectId: string) {
  return useQuery({
    queryKey: key(orgId, projectId),
    queryFn: ({ signal }) =>
      api.get<RecurringTask[]>(orgPath(orgId, `/projects/${projectId}/recurring-tasks`), signal),
  });
}

export function useCreateRecurringTask(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; interval_days: number; priority?: TaskPriority }) =>
      api.post<RecurringTask>(orgPath(orgId, `/projects/${projectId}/recurring-tasks`), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId, projectId) });
      toast.success("Recurring item created");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateRecurringTask(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, ...body }: { ruleId: string; active?: boolean; interval_days?: number }) =>
      api.patch<RecurringTask>(orgPath(orgId, `/recurring-tasks/${ruleId}`), body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteRecurringTask(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => api.delete<null>(orgPath(orgId, `/recurring-tasks/${ruleId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId, projectId) });
      toast.success("Recurring item deleted");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRunRecurringTask(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) =>
      api.post<{ task_id: string }>(orgPath(orgId, `/recurring-tasks/${ruleId}/run`), {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId, projectId) });
      toast.success("Work item created");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
