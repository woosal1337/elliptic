"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import type { ProjectHealth, WorkItemUpdate } from "@/lib/types";
import { api, errorMessage, orgPath } from "@/lib/api";

export const workItemUpdateKeys = {
  all: (orgId: string, taskId: string) => ["orgs", orgId, "tasks", taskId, "updates"] as const,
};

export function useWorkItemUpdates(orgId: string, taskId: string, enabled = true) {
  return useQuery({
    queryKey: workItemUpdateKeys.all(orgId, taskId),
    queryFn: ({ signal }) =>
      api.get<WorkItemUpdate[]>(orgPath(orgId, `/tasks/${taskId}/updates`), signal),
    enabled,
  });
}

export function usePostWorkItemUpdate(orgId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { health: ProjectHealth; summary: string }) =>
      api.post<WorkItemUpdate>(orgPath(orgId, `/tasks/${taskId}/updates`), input),
    onSuccess: () => {
      toast.success("Update posted");
      void queryClient.invalidateQueries({ queryKey: workItemUpdateKeys.all(orgId, taskId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
