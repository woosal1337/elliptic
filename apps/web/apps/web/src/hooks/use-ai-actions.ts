"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface ActionProposal {
  action: string;
  params: Record<string, unknown>;
  summary: string;
  ai_run_id: string;
}

export interface ActionResult {
  action: string;
  task_id: string;
  identifier: string;
  title: string;
}

export function useProposeAction(orgId: string) {
  return useMutation({
    mutationFn: (prompt: string) =>
      api.post<ActionProposal>(orgPath(orgId, "/ai/propose-action"), { prompt }),
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useExecuteAction(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (proposal: ActionProposal) =>
      api.post<ActionResult>(orgPath(orgId, "/ai/execute-action"), {
        action: proposal.action,
        params: proposal.params,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["orgs", orgId, "tasks"] });
      toast.success(`Created ${result.identifier}`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
