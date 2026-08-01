"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface BoardPublish {
  public_token: string;
  path: string;
  attributes: string[];
}

export function usePublishBoard(orgId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attributes: string[]) =>
      api.post<BoardPublish>(orgPath(orgId, `/projects/${projectId}/publish-board`), { attributes }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["orgs", orgId, "projects", projectId] }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useUpdateBoardPrivacy(orgId: string, projectId: string) {
  return useMutation({
    mutationFn: (attributes: string[]) =>
      api.patch<BoardPublish>(orgPath(orgId, `/projects/${projectId}/publish-board`), { attributes }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useUnpublishBoard(orgId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<null>(orgPath(orgId, `/projects/${projectId}/publish-board`)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["orgs", orgId, "projects", projectId] });
      toast.success("Board unpublished");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
