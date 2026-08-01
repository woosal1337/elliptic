"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface GroupMapping {
  id: string;
  idp_group: string;
  project_id: string;
  role: string;
}

const key = (orgId: string) => ["orgs", orgId, "idp-sync", "mappings"] as const;

export function useGroupMappings(orgId: string) {
  return useQuery({
    queryKey: key(orgId),
    queryFn: ({ signal }) =>
      api.get<GroupMapping[]>(orgPath(orgId, "/idp-sync/mappings"), signal),
  });
}

export function useCreateMapping(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { idp_group: string; project_id: string; role: string }) =>
      api.post<GroupMapping>(orgPath(orgId, "/idp-sync/mappings"), input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(orgId) }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useDeleteMapping(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(orgPath(orgId, `/idp-sync/mappings/${id}`)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(orgId) }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}
