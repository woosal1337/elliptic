"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface SentryIntake {
  id: string;
  project_id: string;
  token: string;
  enabled: boolean;
}

const key = (orgId: string, projectId: string) =>
  ["orgs", orgId, "projects", projectId, "sentry"] as const;

export function useSentryIntakes(orgId: string, projectId: string) {
  return useQuery({
    queryKey: key(orgId, projectId),
    queryFn: ({ signal }) =>
      api.get<SentryIntake[]>(orgPath(orgId, `/projects/${projectId}/sentry`), signal),
  });
}

export function useCreateSentryIntake(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<SentryIntake>(orgPath(orgId, `/projects/${projectId}/sentry`), {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId, projectId) });
      toast.success("Sentry webhook created");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteSentryIntake(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (intakeId: string) =>
      api.delete<null>(orgPath(orgId, `/projects/${projectId}/sentry/${intakeId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId, projectId) });
      toast.success("Sentry webhook removed");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
