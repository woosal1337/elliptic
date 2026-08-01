"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";
import type { StatusCategory } from "@/lib/task-meta";
import type { WorkflowStatus } from "@/lib/workflow";

export const workflowKeys = {
  all: (orgId: string) => ["orgs", orgId, "workflow"] as const,
  list: (orgId: string, teamId: string | null) =>
    [...workflowKeys.all(orgId), teamId ?? "org"] as const,
};

export function useWorkflowStatuses(orgId: string, teamId: string | null) {
  return useQuery({
    queryKey: workflowKeys.list(orgId, teamId),
    queryFn: ({ signal }) =>
      api.get<WorkflowStatus[]>(
        orgPath(orgId, `/workflow/statuses${teamId ? `?team_id=${teamId}` : ""}`),
        signal
      ),
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export interface WorkflowStatusInput {
  name: string;
  category: StatusCategory;
  color: string;
  position?: number;
  team_id?: string | null;
}

export function useCreateWorkflowStatus(orgId: string, teamId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WorkflowStatusInput) =>
      api.post<WorkflowStatus>(orgPath(orgId, "/workflow/statuses"), { ...input, team_id: teamId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.list(orgId, teamId) });
      toast.success("Status added");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateWorkflowStatus(orgId: string, teamId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      name?: string;
      color?: string;
      position?: number;
      is_default?: boolean;
      allow_new_items?: boolean;
    }) => {
      const { id, ...body } = input;
      return api.patch<WorkflowStatus>(orgPath(orgId, `/workflow/statuses/${id}`), body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.list(orgId, teamId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteWorkflowStatus(orgId: string, teamId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, transferTo }: { id: string; transferTo?: string | null }) =>
      api.delete<null>(
        orgPath(
          orgId,
          `/workflow/statuses/${id}${transferTo ? `?transfer_to=${transferTo}` : ""}`
        )
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.list(orgId, teamId) });
      void queryClient.invalidateQueries({ queryKey: workflowKeys.all(orgId) });
      toast.success("Status removed");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useStatusItemCount(orgId: string, statusId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...workflowKeys.all(orgId), statusId, "item-count"] as const,
    queryFn: ({ signal }) =>
      api.get<{ count: number }>(
        orgPath(orgId, `/workflow/statuses/${statusId}/item-count`),
        signal
      ),
    enabled,
  });
}

export type WorkItemKind = "task" | "bug" | "story" | "epic";

export interface WorkflowTransition {
  id: string;
  from_status_id: string;
  to_status_id: string;
  required_role: "admin" | "member" | "viewer" | null;
  kind: WorkItemKind | null;
}

export function useWorkflowTransitions(orgId: string) {
  return useQuery({
    queryKey: [...workflowKeys.all(orgId), "transitions"] as const,
    queryFn: ({ signal }) =>
      api.get<WorkflowTransition[]>(orgPath(orgId, "/workflow/transitions"), signal),
  });
}

export function useCreateWorkflowTransition(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      from_status_id: string;
      to_status_id: string;
      required_role?: "admin" | "member" | "viewer" | null;
      kind?: WorkItemKind | null;
    }) => api.post<WorkflowTransition>(orgPath(orgId, "/workflow/transitions"), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...workflowKeys.all(orgId), "transitions"] });
      toast.success("Transition allowed");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteWorkflowTransition(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transitionId: string) =>
      api.delete(orgPath(orgId, `/workflow/transitions/${transitionId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...workflowKeys.all(orgId), "transitions"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export type ConditionType =
  | "require_assignee"
  | "require_estimate"
  | "require_due_date"
  | "require_dod_complete";

export interface TransitionCondition {
  id: string;
  from_status_id: string;
  to_status_id: string;
  condition: ConditionType;
}

export function useTransitionConditions(orgId: string) {
  return useQuery({
    queryKey: [...workflowKeys.all(orgId), "conditions"] as const,
    queryFn: ({ signal }) =>
      api.get<TransitionCondition[]>(orgPath(orgId, "/workflow/conditions"), signal),
  });
}

export function useCreateTransitionCondition(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { from_status_id: string; to_status_id: string; condition: ConditionType }) =>
      api.post<TransitionCondition>(orgPath(orgId, "/workflow/conditions"), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...workflowKeys.all(orgId), "conditions"] });
      toast.success("Condition added");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteTransitionCondition(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conditionId: string) =>
      api.delete<null>(orgPath(orgId, `/workflow/conditions/${conditionId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...workflowKeys.all(orgId), "conditions"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
