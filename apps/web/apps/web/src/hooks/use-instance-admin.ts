"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage } from "@/lib/api";

export interface InstanceSettings {
  instance_name: string;
  telemetry_enabled: boolean;
  allow_workspace_creation: boolean;
  air_gapped: boolean;
  email_from: string | null;
}

export interface InstanceUser {
  id: string;
  email: string;
  full_name: string;
  is_instance_admin: boolean;
  suspended: boolean;
  org_count: number;
  created_at: string;
}

export function useInstanceSettings() {
  return useQuery({
    queryKey: ["instance", "settings"],
    queryFn: ({ signal }) => api.get<InstanceSettings>("/api/v1/instance/settings", signal),
    retry: false,
  });
}

export function useUpdateInstanceSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<InstanceSettings>) =>
      api.patch<InstanceSettings>("/api/v1/instance/settings", patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["instance", "settings"] });
      toast.success("Instance settings updated");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useInstanceUsers() {
  return useQuery({
    queryKey: ["instance", "users"],
    queryFn: ({ signal }) => api.get<InstanceUser[]>("/api/v1/instance/users", signal),
  });
}

function useUserAction(path: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post<null>(`/api/v1/instance/users/${userId}/${path}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["instance", "users"] }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export const useSuspendUser = () => useUserAction("suspend");
export const useUnsuspendUser = () => useUserAction("unsuspend");
export const useGrantAdmin = () => useUserAction("grant-admin");
export const useRevokeAdmin = () => useUserAction("revoke-admin");

export interface InstanceLicense {
  plan: string;
  seats: number;
  licensee: string | null;
  expires_at: string | null;
  active: boolean;
}

export function useInstanceLicense() {
  return useQuery({
    queryKey: ["instance", "license"],
    queryFn: ({ signal }) => api.get<InstanceLicense | null>("/api/v1/instance/license", signal),
  });
}

export function useActivateLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      api.post<InstanceLicense>("/api/v1/instance/license/activate", { token }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["instance", "license"] });
      toast.success("License activated");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useDelinkLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<null>("/api/v1/instance/license"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["instance", "license"] });
      toast.success("License delinked");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
