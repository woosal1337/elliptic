"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface PermissionDef {
  key: string;
  label: string;
}

export interface MatrixResource {
  resource: string;
  label: string;
  actions: string[];
}

export interface Permissions {
  catalog: PermissionDef[];
  granted: string[];
  matrix_schema: MatrixResource[];
  matrix_cells: string[];
}

export interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  matrix: Record<string, Record<string, string>>;
}

const rolesKey = (orgId: string) => ["orgs", orgId, "roles"] as const;

export function usePermissionCatalog(orgId: string) {
  return useQuery({
    queryKey: ["orgs", orgId, "roles", "permissions"],
    queryFn: ({ signal }) => api.get<Permissions>(orgPath(orgId, "/roles/permissions"), signal),
  });
}

export function useCustomRoles(orgId: string) {
  return useQuery({
    queryKey: rolesKey(orgId),
    queryFn: ({ signal }) => api.get<CustomRole[]>(orgPath(orgId, "/roles"), signal),
  });
}

export function useCreateRole(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string | null; permissions: string[]; matrix?: Record<string, Record<string, string>> }) =>
      api.post<CustomRole>(orgPath(orgId, "/roles"), input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: rolesKey(orgId) }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useDeleteRole(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => api.delete<null>(orgPath(orgId, `/roles/${roleId}`)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: rolesKey(orgId) }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}
