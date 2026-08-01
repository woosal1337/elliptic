"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface GitConnection {
  id: string;
  project_id: string;
  provider: string;
  owner: string;
  repo: string;
  token: string;
  enabled: boolean;
}

const key = (orgId: string, projectId: string) =>
  ["orgs", orgId, "projects", projectId, "git"] as const;

export function useGitConnections(orgId: string, projectId: string) {
  return useQuery({
    queryKey: key(orgId, projectId),
    queryFn: ({ signal }) =>
      api.get<GitConnection[]>(orgPath(orgId, `/projects/${projectId}/git`), signal),
  });
}

export function useCreateGitConnection(orgId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { owner: string; repo: string }) =>
      api.post<GitConnection>(orgPath(orgId, `/projects/${projectId}/git`), input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(orgId, projectId) });
      toast.success("Repository connected");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useDeleteGitConnection(orgId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<null>(orgPath(orgId, `/projects/${projectId}/git/${id}`)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(orgId, projectId) }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}
