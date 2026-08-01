"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import type { ActiveCycle, Cycle } from "@/lib/types";
import { api, errorMessage, orgPath } from "@/lib/api";
import { taskKeys } from "./use-task-queries";

export const cycleKeys = {
  all: (orgId: string, projectId: string) =>
    ["orgs", orgId, "projects", projectId, "cycles"] as const,
};

function cyclesPath(orgId: string, projectId: string, suffix = ""): string {
  return orgPath(orgId, `/projects/${projectId}/cycles${suffix}`);
}

export function useCycles(orgId: string, projectId: string, enabled = true) {
  return useQuery({
    queryKey: cycleKeys.all(orgId, projectId),
    queryFn: ({ signal }) => api.get<Cycle[]>(cyclesPath(orgId, projectId), signal),
    enabled,
  });
}

export function useCreateCycle(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; start_date?: string | null; end_date?: string | null }) =>
      api.post<Cycle>(cyclesPath(orgId, projectId), input),
    onSuccess: () => {
      toast.success("Cycle created");
      void queryClient.invalidateQueries({ queryKey: cycleKeys.all(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useGenerateRecurringCycles(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      base_title: string;
      count: number;
      duration_weeks: number;
      cooldown_days: number;
      start_date: string;
    }) => api.post<Cycle[]>(cyclesPath(orgId, projectId, "/generate"), input),
    onSuccess: (cycles) => {
      toast.success(`Generated ${cycles.length} cycles`);
      void queryClient.invalidateQueries({ queryKey: cycleKeys.all(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteCycle(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cycleId: string) => api.delete(cyclesPath(orgId, projectId, `/${cycleId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cycleKeys.all(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useStartCycle(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cycleId: string) =>
      api.post<Cycle>(cyclesPath(orgId, projectId, `/${cycleId}/start`)),
    onSuccess: () => {
      toast.success("Cycle started");
      void queryClient.invalidateQueries({ queryKey: cycleKeys.all(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useCompleteCycle(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cycleId: string) =>
      api.post<Cycle>(cyclesPath(orgId, projectId, `/${cycleId}/complete`)),
    onSuccess: () => {
      toast.success("Cycle completed");
      void queryClient.invalidateQueries({ queryKey: cycleKeys.all(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useTransferCycle(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { cycleId: string; targetCycleId: string }) =>
      api.post<{ moved: number }>(
        cyclesPath(orgId, projectId, `/${variables.cycleId}/transfer`),
        { target_cycle_id: variables.targetCycleId }
      ),
    onSuccess: (result) => {
      toast.success(
        result.moved === 1 ? "1 item transferred" : `${result.moved} items transferred`
      );
      void queryClient.invalidateQueries({ queryKey: cycleKeys.all(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useAssignTaskToCycle(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { cycleId: string; taskId: string }) =>
      api.post(cyclesPath(orgId, projectId, `/${variables.cycleId}/tasks/${variables.taskId}`)),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: cycleKeys.all(orgId, projectId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(orgId, variables.taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.byProject(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUnassignTaskFromCycle(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { cycleId: string; taskId: string }) =>
      api.delete(cyclesPath(orgId, projectId, `/${variables.cycleId}/tasks/${variables.taskId}`)),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: cycleKeys.all(orgId, projectId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(orgId, variables.taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.byProject(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useActiveCycles(orgId: string) {
  return useQuery({
    queryKey: ["orgs", orgId, "cycles", "active"] as const,
    queryFn: ({ signal }) => api.get<ActiveCycle[]>(orgPath(orgId, "/cycles/active"), signal),
  });
}

export interface CycleVelocity {
  cycles: { id: string; name: string; completed_at: string | null; completed: number; total: number }[];
  average_velocity: number;
  cycle_count: number;
}

export function useCycleVelocity(orgId: string, projectId: string) {
  return useQuery({
    queryKey: [...cycleKeys.all(orgId, projectId), "velocity"] as const,
    queryFn: ({ signal }) =>
      api.get<CycleVelocity>(cyclesPath(orgId, projectId, "/velocity"), signal),
  });
}

export function useTeamCycles(orgId: string, teamId: string, enabled = true) {
  return useQuery({
    queryKey: ["orgs", orgId, "teams", teamId, "cycles"] as const,
    enabled,
    queryFn: ({ signal }) =>
      api.get<ActiveCycle[]>(orgPath(orgId, `/teams/${teamId}/cycles`), signal),
  });
}
