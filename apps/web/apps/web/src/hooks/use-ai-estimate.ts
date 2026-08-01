"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface EstimateSuggestion {
  suggestion: string | null;
  raw: string;
  scale: string[];
  ai_run_id: string;
}

export function useSuggestEstimate(orgId: string) {
  return useMutation({
    mutationFn: (taskId: string) =>
      api.post<EstimateSuggestion>(orgPath(orgId, "/ai/suggest-estimate"), { task_id: taskId }),
    onError: (error) => toast.error(errorMessage(error)),
  });
}
