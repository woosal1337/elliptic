"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface Retrospective {
  id: string;
  project_id: string;
  title: string;
  went_well: string | null;
  to_improve: string | null;
  action_items: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const key = (orgId: string, projectId: string) =>
  ["orgs", orgId, "projects", projectId, "retrospectives"] as const;

export function useRetrospectives(orgId: string, projectId: string) {
  return useQuery({
    queryKey: key(orgId, projectId),
    queryFn: ({ signal }) =>
      api.get<Retrospective[]>(orgPath(orgId, `/projects/${projectId}/retrospectives`), signal),
  });
}

export function useCreateRetrospective(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string }) =>
      api.post<Retrospective>(orgPath(orgId, `/projects/${projectId}/retrospectives`), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId, projectId) });
      toast.success("Retrospective created");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateRetrospective(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      retroId,
      ...body
    }: {
      retroId: string;
      title?: string;
      went_well?: string;
      to_improve?: string;
      action_items?: string;
    }) => api.patch<Retrospective>(orgPath(orgId, `/retrospectives/${retroId}`), body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteRetrospective(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (retroId: string) =>
      api.delete<null>(orgPath(orgId, `/retrospectives/${retroId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId, projectId) });
      toast.success("Retrospective deleted");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
