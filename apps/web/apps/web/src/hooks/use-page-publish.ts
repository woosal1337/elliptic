"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface PublishResult {
  public_token: string;
  path: string;
}

export function usePublishPage(orgId: string, noteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<PublishResult>(orgPath(orgId, `/notes/${noteId}/publish`)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["orgs", orgId, "notes", noteId] }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useUnpublishPage(orgId: string, noteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<null>(orgPath(orgId, `/notes/${noteId}/publish`)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["orgs", orgId, "notes", noteId] });
      toast.success("Page unpublished");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
