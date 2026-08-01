"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import type {
  Initiative,
  InitiativeProject,
  InitiativeStatus,
  InitiativeUpdate,
  ProjectHealth,
} from "@/lib/types";
import { api, errorMessage, orgPath } from "@/lib/api";

export const initiativeKeys = {
  all: (orgId: string) => ["orgs", orgId, "initiatives"] as const,
  projects: (orgId: string, initiativeId: string) =>
    ["orgs", orgId, "initiatives", initiativeId, "projects"] as const,
  updates: (orgId: string, initiativeId: string) =>
    ["orgs", orgId, "initiatives", initiativeId, "updates"] as const,
};

export function useInitiativeUpdates(orgId: string, initiativeId: string, enabled = true) {
  return useQuery({
    queryKey: initiativeKeys.updates(orgId, initiativeId),
    queryFn: ({ signal }) =>
      api.get<InitiativeUpdate[]>(orgPath(orgId, `/initiatives/${initiativeId}/updates`), signal),
    enabled,
  });
}

export function usePostInitiativeUpdate(orgId: string, initiativeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { health: ProjectHealth; summary: string }) =>
      api.post<InitiativeUpdate>(orgPath(orgId, `/initiatives/${initiativeId}/updates`), input),
    onSuccess: () => {
      toast.success("Update posted");
      void queryClient.invalidateQueries({
        queryKey: initiativeKeys.updates(orgId, initiativeId),
      });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useInitiatives(orgId: string) {
  return useQuery({
    queryKey: initiativeKeys.all(orgId),
    queryFn: ({ signal }) => api.get<Initiative[]>(orgPath(orgId, "/initiatives"), signal),
  });
}

export function useCreateInitiative(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string | null; target_date?: string | null }) =>
      api.post<Initiative>(orgPath(orgId, "/initiatives"), input),
    onSuccess: () => {
      toast.success("Initiative created");
      void queryClient.invalidateQueries({ queryKey: initiativeKeys.all(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateInitiative(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { initiativeId: string; status?: InitiativeStatus; name?: string }) => {
      const { initiativeId, ...body } = input;
      return api.patch<Initiative>(orgPath(orgId, `/initiatives/${initiativeId}`), body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: initiativeKeys.all(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteInitiative(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (initiativeId: string) =>
      api.delete(orgPath(orgId, `/initiatives/${initiativeId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: initiativeKeys.all(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useInitiativeProjects(orgId: string, initiativeId: string, enabled = true) {
  return useQuery({
    queryKey: initiativeKeys.projects(orgId, initiativeId),
    queryFn: ({ signal }) =>
      api.get<InitiativeProject[]>(orgPath(orgId, `/initiatives/${initiativeId}/projects`), signal),
    enabled,
  });
}

export function useAddInitiativeProject(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { initiativeId: string; projectId: string }) =>
      api.post(orgPath(orgId, `/initiatives/${input.initiativeId}/projects/${input.projectId}`)),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: initiativeKeys.all(orgId) });
      void queryClient.invalidateQueries({
        queryKey: initiativeKeys.projects(orgId, input.initiativeId),
      });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRemoveInitiativeProject(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { initiativeId: string; projectId: string }) =>
      api.delete(orgPath(orgId, `/initiatives/${input.initiativeId}/projects/${input.projectId}`)),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: initiativeKeys.all(orgId) });
      void queryClient.invalidateQueries({
        queryKey: initiativeKeys.projects(orgId, input.initiativeId),
      });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
