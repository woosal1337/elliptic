"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";
import type { ActionResult } from "@/hooks/use-ai-actions";

export interface RunActionEntry {
  summary: string;
  result: ActionResult;
}

export function useRunAction(orgId: string, conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prompt: string) =>
      api.post<RunActionEntry>(
        orgPath(orgId, `/ai/conversations/${conversationId}/run-action`),
        { prompt }
      ),
    onSuccess: (entry) => {
      void queryClient.invalidateQueries({ queryKey: ["orgs", orgId, "tasks"] });
      toast.success(`Ran: created ${entry.result.identifier}`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
