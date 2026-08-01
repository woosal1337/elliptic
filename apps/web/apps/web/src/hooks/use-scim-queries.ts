"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface ScimStatus {
  configured: boolean;
  prefix: string | null;
  last_used_at: string | null;
  base_url: string;
}

const key = (orgId: string) => ["orgs", orgId, "scim", "token"] as const;

export function useScimStatus(orgId: string) {
  return useQuery({
    queryKey: key(orgId),
    queryFn: ({ signal }) => api.get<ScimStatus>(orgPath(orgId, "/scim/token"), signal),
  });
}

export function useMintScimToken(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ token: string }>(orgPath(orgId, "/scim/token")),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(orgId) }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useRevokeScimToken(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<null>(orgPath(orgId, "/scim/token")),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(orgId) });
      toast.success("SCIM token revoked");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
