"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import type { Module, ModuleStatus } from "@/lib/types";
import { api, errorMessage, orgPath } from "@/lib/api";
import { taskKeys } from "@/hooks/use-task-queries";

export const moduleKeys = {
  all: (orgId: string, projectId: string) =>
    ["orgs", orgId, "projects", projectId, "modules"] as const,
};

function modulesPath(orgId: string, projectId: string, suffix = ""): string {
  return orgPath(orgId, `/projects/${projectId}/modules${suffix}`);
}

export function useModules(
  orgId: string,
  projectId: string,
  enabled = true,
  includeArchived = false
) {
  return useQuery({
    queryKey: [...moduleKeys.all(orgId, projectId), { includeArchived }] as const,
    queryFn: ({ signal }) =>
      api.get<Module[]>(
        modulesPath(orgId, projectId, includeArchived ? "?include_archived=true" : ""),
        signal
      ),
    enabled,
  });
}

export function useSetModuleArchived(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, archived }: { moduleId: string; archived: boolean }) =>
      api.post<Module>(
        modulesPath(orgId, projectId, `/${moduleId}/${archived ? "archive" : "restore"}`),
        {}
      ),
    onSuccess: (_data, { archived }) => {
      void queryClient.invalidateQueries({ queryKey: moduleKeys.all(orgId, projectId) });
      toast.success(archived ? "Module archived" : "Module restored");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export interface ModulesSummary {
  module_count: number;
  completed: number;
  in_progress: number;
  delayed: number;
  task_total: number;
  task_done: number;
}

export function useModulesSummary(orgId: string, projectId: string) {
  return useQuery({
    queryKey: [...moduleKeys.all(orgId, projectId), "summary"] as const,
    queryFn: ({ signal }) =>
      api.get<ModulesSummary>(modulesPath(orgId, projectId, "/summary"), signal),
  });
}

export function useCreateModule(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      description?: string | null;
      lead_id?: string | null;
      start_date?: string | null;
      target_date?: string | null;
    }) => api.post<Module>(modulesPath(orgId, projectId), input),
    onSuccess: () => {
      toast.success("Module created");
      void queryClient.invalidateQueries({ queryKey: moduleKeys.all(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateModule(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      moduleId: string;
      name?: string;
      description?: string | null;
      lead_id?: string | null;
      clear_lead?: boolean;
      start_date?: string | null;
      target_date?: string | null;
      status?: ModuleStatus;
      milestone_id?: string | null;
      clear_milestone?: boolean;
    }) => {
      const { moduleId, ...body } = input;
      return api.patch<Module>(modulesPath(orgId, projectId, `/${moduleId}`), body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: moduleKeys.all(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteModule(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (moduleId: string) => api.delete(modulesPath(orgId, projectId, `/${moduleId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: moduleKeys.all(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useAssignTaskToModule(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { moduleId: string; taskId: string }) =>
      api.post(modulesPath(orgId, projectId, `/${variables.moduleId}/tasks/${variables.taskId}`)),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: moduleKeys.all(orgId, projectId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(orgId, variables.taskId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUnassignTaskFromModule(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { moduleId: string; taskId: string }) =>
      api.delete(modulesPath(orgId, projectId, `/${variables.moduleId}/tasks/${variables.taskId}`)),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: moduleKeys.all(orgId, projectId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(orgId, variables.taskId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export async function downloadModuleCsv(
  orgId: string,
  projectId: string,
  moduleId: string,
  name: string
): Promise<void> {
  const response = await fetch(modulesPath(orgId, projectId, `/${moduleId}/export.csv`), {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Export failed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `module-${name}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
