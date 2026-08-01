"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import type { TaskKind, TaskPriority, WorkItemTemplate } from "@/lib/types";
import { api, errorMessage, orgPath } from "@/lib/api";

export const templateKeys = {
  all: (orgId: string, projectId: string) =>
    ["orgs", orgId, "projects", projectId, "templates"] as const,
};

export function useTemplates(orgId: string, projectId: string, enabled = true) {
  return useQuery({
    queryKey: templateKeys.all(orgId, projectId),
    queryFn: ({ signal }) =>
      api.get<WorkItemTemplate[]>(orgPath(orgId, `/projects/${projectId}/templates`), signal),
    enabled,
  });
}

export function useCreateTemplate(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      title: string;
      description?: string | null;
      priority?: TaskPriority;
      kind?: TaskKind;
    }) => api.post<WorkItemTemplate>(orgPath(orgId, `/projects/${projectId}/templates`), input),
    onSuccess: () => {
      toast.success("Template created");
      void queryClient.invalidateQueries({ queryKey: templateKeys.all(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteTemplate(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      api.delete(orgPath(orgId, `/templates/${templateId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: templateKeys.all(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
