"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface ImportReport {
  created_count: number;
  skipped_count: number;
  identifiers: string[];
  errors: string[];
}

export function useImportTasks(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      api.post<ImportReport>(orgPath(orgId, `/projects/${projectId}/import`), { content }),
    onSuccess: (report) => {
      void queryClient.invalidateQueries({ queryKey: ["orgs", orgId, "tasks"] });
      toast.success(`Imported ${report.created_count} work items`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
