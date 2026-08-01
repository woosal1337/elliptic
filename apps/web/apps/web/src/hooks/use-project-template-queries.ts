"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import type { Project } from "@/lib/types";
import { api, errorMessage, orgPath } from "@/lib/api";
import { projectKeys } from "@/hooks/use-project-queries";

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  config: {
    network?: string;
    features?: Record<string, boolean>;
    estimate_scale?: string[];
    labels?: string[];
    seed_items?: { title: string; status: string; priority: string; kind: string }[];
  };
  created_at: string;
}

const templatesKey = (orgId: string) => ["orgs", orgId, "project-templates"] as const;

export function useProjectTemplates(orgId: string) {
  return useQuery({
    queryKey: templatesKey(orgId),
    queryFn: ({ signal }) =>
      api.get<ProjectTemplate[]>(orgPath(orgId, "/project-templates"), signal),
  });
}

export function useSaveProjectTemplate(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string | null }) =>
      api.post<ProjectTemplate>(
        orgPath(orgId, `/project-templates/from-project/${projectId}`),
        input
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: templatesKey(orgId) });
      toast.success("Saved as template");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useInstantiateProjectTemplate(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { templateId: string; name: string; key: string }) =>
      api.post<Project>(orgPath(orgId, `/project-templates/${input.templateId}/instantiate`), {
        name: input.name,
        key: input.key,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists(orgId) });
      toast.success("Project created from template");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteProjectTemplate(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      api.delete<null>(orgPath(orgId, `/project-templates/${templateId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: templatesKey(orgId) });
      toast.success("Template deleted");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
