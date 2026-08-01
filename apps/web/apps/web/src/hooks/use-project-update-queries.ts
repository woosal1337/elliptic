"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import type { ProjectHealth, ProjectUpdate } from "@/lib/types";
import { api, errorMessage, orgPath } from "@/lib/api";

export const projectUpdateKeys = {
  all: (orgId: string, projectId: string) =>
    ["orgs", orgId, "projects", projectId, "updates"] as const,
};

export function useProjectUpdates(orgId: string, projectId: string, enabled = true) {
  return useQuery({
    queryKey: projectUpdateKeys.all(orgId, projectId),
    queryFn: ({ signal }) =>
      api.get<ProjectUpdate[]>(orgPath(orgId, `/projects/${projectId}/updates`), signal),
    enabled,
  });
}

export function usePostProjectUpdate(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { health: ProjectHealth; summary: string }) =>
      api.post<ProjectUpdate>(orgPath(orgId, `/projects/${projectId}/updates`), input),
    onSuccess: () => {
      toast.success("Update posted");
      void queryClient.invalidateQueries({ queryKey: projectUpdateKeys.all(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
