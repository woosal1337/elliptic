"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";
import type { AutomationAction, AutomationTrigger, TriageRule } from "@/lib/automation";

export const automationKeys = {
  all: (orgId: string) => ["orgs", orgId, "automations"] as const,
};

export function useTriageRules(orgId: string) {
  return useQuery({
    queryKey: automationKeys.all(orgId),
    queryFn: ({ signal }) => api.get<TriageRule[]>(orgPath(orgId, "/automations"), signal),
    retry: false,
    staleTime: 60_000,
  });
}

export interface TriageRuleInput {
  name: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  is_skill: boolean;
  enabled?: boolean;
}

export function useCreateTriageRule(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TriageRuleInput) =>
      api.post<TriageRule>(orgPath(orgId, "/automations"), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: automationKeys.all(orgId) });
      toast.success("Automation saved");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateTriageRule(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string } & Partial<TriageRuleInput>) => {
      const { id, ...body } = input;
      return api.patch<TriageRule>(orgPath(orgId, `/automations/${id}`), body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: automationKeys.all(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteTriageRule(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(orgPath(orgId, `/automations/${id}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: automationKeys.all(orgId) });
      toast.success("Automation removed");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRunTriageSkill(orgId: string) {
  return useMutation({
    mutationFn: (input: { rule_id: string; task_id: string }) =>
      api.post<{ ok: boolean }>(orgPath(orgId, `/automations/${input.rule_id}/run`), {
        task_id: input.task_id,
      }),
    onSuccess: () => toast.success("Skill applied"),
    onError: (error) => toast.error(errorMessage(error)),
  });
}
