"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface SSOConnection {
  id: string;
  domain: string;
  issuer: string;
  client_id: string;
  redirect_uri: string;
  enabled: boolean;
}

export interface SSOConnectionInput {
  domain: string;
  issuer: string;
  client_id: string;
  client_secret?: string | null;
  redirect_uri: string;
  enabled: boolean;
}

const key = (orgId: string) => ["orgs", orgId, "sso"] as const;

export function useSSOConnection(orgId: string) {
  return useQuery({
    queryKey: key(orgId),
    queryFn: ({ signal }) => api.get<SSOConnection | null>(orgPath(orgId, "/sso"), signal),
  });
}

export function useUpsertSSO(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SSOConnectionInput) => api.put<SSOConnection>(orgPath(orgId, "/sso"), input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(orgId) });
      toast.success("SSO saved");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useDeleteSSO(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<null>(orgPath(orgId, "/sso")),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(orgId) });
      toast.success("SSO removed");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
