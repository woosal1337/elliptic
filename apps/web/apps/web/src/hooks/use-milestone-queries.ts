"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import type { Milestone, MilestoneStatus, Task } from "@/lib/types";
import { api, errorMessage, orgPath } from "@/lib/api";
import { taskKeys } from "@/hooks/use-task-queries";

export const milestoneKeys = {
  all: (orgId: string, projectId: string) =>
    ["orgs", orgId, "projects", projectId, "milestones"] as const,
};

function milestonesPath(orgId: string, projectId: string, suffix = ""): string {
  return orgPath(orgId, `/projects/${projectId}/milestones${suffix}`);
}

export function useMilestones(orgId: string, projectId: string, enabled = true) {
  return useQuery({
    queryKey: milestoneKeys.all(orgId, projectId),
    queryFn: ({ signal }) => api.get<Milestone[]>(milestonesPath(orgId, projectId), signal),
    enabled,
  });
}

export function useMilestoneTasks(
  orgId: string,
  projectId: string,
  milestoneId: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: [...milestoneKeys.all(orgId, projectId), milestoneId, "tasks"] as const,
    queryFn: ({ signal }) =>
      api.get<Task[]>(milestonesPath(orgId, projectId, `/${milestoneId}/tasks`), signal),
    enabled,
  });
}

export function useCreateMilestone(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string | null; target_date?: string | null }) =>
      api.post<Milestone>(milestonesPath(orgId, projectId), input),
    onSuccess: () => {
      toast.success("Milestone created");
      void queryClient.invalidateQueries({ queryKey: milestoneKeys.all(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateMilestone(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      milestoneId: string;
      name?: string;
      description?: string | null;
      target_date?: string | null;
      status?: MilestoneStatus;
    }) => {
      const { milestoneId, ...body } = input;
      return api.patch<Milestone>(milestonesPath(orgId, projectId, `/${milestoneId}`), body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: milestoneKeys.all(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteMilestone(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId: string) =>
      api.delete(milestonesPath(orgId, projectId, `/${milestoneId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: milestoneKeys.all(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useAssignTaskToMilestone(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { milestoneId: string; taskId: string }) =>
      api.post(milestonesPath(orgId, projectId, `/${variables.milestoneId}/tasks/${variables.taskId}`)),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: milestoneKeys.all(orgId, projectId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(orgId, variables.taskId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUnassignTaskFromMilestone(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { milestoneId: string; taskId: string }) =>
      api.delete(
        milestonesPath(orgId, projectId, `/${variables.milestoneId}/tasks/${variables.taskId}`)
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: milestoneKeys.all(orgId, projectId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(orgId, variables.taskId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
