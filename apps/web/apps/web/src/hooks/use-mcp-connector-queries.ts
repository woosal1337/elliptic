"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface CatalogEntry {
  key: string;
  name: string;
  transport: string;
  endpoint_url: string;
  auth_type: string;
  docs_url: string;
  description: string;
}

export interface Connector {
  id: string;
  catalog_key: string;
  display_name: string;
  transport: string;
  endpoint_url: string;
  auth_type: string;
  enabled: boolean;
  created_at: string;
}

export interface RemoteTool {
  name: string;
  description: string;
}

const key = (orgId: string) => ["orgs", orgId, "mcp-connectors"] as const;

export function useConnectorCatalog(orgId: string) {
  return useQuery({
    queryKey: ["orgs", orgId, "mcp-connectors", "catalog"],
    queryFn: ({ signal }) =>
      api.get<CatalogEntry[]>(orgPath(orgId, "/mcp-connectors/catalog"), signal),
    staleTime: 300_000,
  });
}

export function useConnectors(orgId: string) {
  return useQuery({
    queryKey: key(orgId),
    queryFn: ({ signal }) => api.get<Connector[]>(orgPath(orgId, "/mcp-connectors"), signal),
  });
}

export function useAddConnector(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { catalog_key: string; endpoint_url?: string; credential?: string; header_name?: string }) =>
      api.post<Connector>(orgPath(orgId, "/mcp-connectors"), input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(orgId) }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useSetConnectorEnabled(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; enabled: boolean }) =>
      api.patch<Connector>(orgPath(orgId, `/mcp-connectors/${input.id}`), { enabled: input.enabled }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(orgId) }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useDeleteConnector(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(orgPath(orgId, `/mcp-connectors/${id}`)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(orgId) }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useTestConnector(orgId: string) {
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ ok: boolean; tools: RemoteTool[]; error: string | null }>(
        orgPath(orgId, `/mcp-connectors/${id}/test`)
      ),
    onError: (e) => toast.error(errorMessage(e)),
  });
}
