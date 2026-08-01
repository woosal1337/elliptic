"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export type RegisterKind = "risk" | "assumption" | "issue" | "dependency" | "decision";
export type RegisterStatus =
  | "open"
  | "in_progress"
  | "mitigated"
  | "resolved"
  | "accepted"
  | "closed";

export interface RegisterEntry {
  id: string;
  project_id: string;
  kind: RegisterKind;
  title: string;
  description: string | null;
  status: RegisterStatus;
  owner_id: string | null;
  probability: number | null;
  impact: number | null;
  risk_score: number | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
}

export interface RegisterEntryInput {
  kind: RegisterKind;
  title: string;
  description?: string | null;
  status?: RegisterStatus;
  probability?: number | null;
  impact?: number | null;
  due_date?: string | null;
}

const registerKey = (orgId: string, projectId: string) =>
  ["orgs", orgId, "projects", projectId, "register"] as const;

function registerPath(orgId: string, projectId: string, suffix = ""): string {
  return orgPath(orgId, `/projects/${projectId}/register${suffix}`);
}

export function useRegisterEntries(orgId: string, projectId: string) {
  return useQuery({
    queryKey: registerKey(orgId, projectId),
    queryFn: ({ signal }) => api.get<RegisterEntry[]>(registerPath(orgId, projectId), signal),
  });
}

export function useCreateRegisterEntry(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterEntryInput) =>
      api.post<RegisterEntry>(registerPath(orgId, projectId), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: registerKey(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateRegisterEntry(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, ...input }: { entryId: string } & Partial<RegisterEntry>) =>
      api.patch<RegisterEntry>(registerPath(orgId, projectId, `/${entryId}`), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: registerKey(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteRegisterEntry(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) =>
      api.delete<null>(registerPath(orgId, projectId, `/${entryId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: registerKey(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
