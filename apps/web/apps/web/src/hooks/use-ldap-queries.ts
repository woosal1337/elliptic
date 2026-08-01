"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface LDAPConnection {
  id: string;
  server_uri: string;
  use_tls: boolean;
  bind_dn: string;
  search_base: string;
  search_filter: string;
  attr_email: string;
  attr_first: string;
  attr_last: string;
  enabled: boolean;
}

export interface LDAPConnectionInput {
  server_uri: string;
  use_tls: boolean;
  bind_dn: string;
  bind_password?: string | null;
  search_base: string;
  search_filter: string;
  attr_email: string;
  attr_first: string;
  attr_last: string;
  enabled: boolean;
}

const key = (orgId: string) => ["orgs", orgId, "ldap"] as const;

export function useLDAPConnection(orgId: string) {
  return useQuery({
    queryKey: key(orgId),
    queryFn: ({ signal }) => api.get<LDAPConnection | null>(orgPath(orgId, "/ldap"), signal),
  });
}

export function useUpsertLDAP(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LDAPConnectionInput) =>
      api.put<LDAPConnection>(orgPath(orgId, "/ldap"), input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(orgId) });
      toast.success("LDAP saved");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useDeleteLDAP(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<null>(orgPath(orgId, "/ldap")),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(orgId) });
      toast.success("LDAP removed");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useTestLDAP(orgId: string) {
  return useMutation({
    mutationFn: () => api.post<{ ok: boolean; message: string }>(orgPath(orgId, "/ldap/test-bind")),
    onError: (e) => toast.error(errorMessage(e)),
  });
}
