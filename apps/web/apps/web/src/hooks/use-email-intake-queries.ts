"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface EmailIntake {
  id: string;
  project_id: string;
  token: string;
  enabled: boolean;
}

const key = (orgId: string, projectId: string) =>
  ["orgs", orgId, "projects", projectId, "email-intake"] as const;

export function useEmailIntakes(orgId: string, projectId: string) {
  return useQuery({
    queryKey: key(orgId, projectId),
    queryFn: ({ signal }) =>
      api.get<EmailIntake[]>(orgPath(orgId, `/projects/${projectId}/email-intake`), signal),
  });
}

export function useCreateEmailIntake(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<EmailIntake>(orgPath(orgId, `/projects/${projectId}/email-intake`), {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId, projectId) });
      toast.success("Email intake created");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteEmailIntake(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (intakeId: string) =>
      api.delete<null>(orgPath(orgId, `/projects/${projectId}/email-intake/${intakeId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId, projectId) });
      toast.success("Email intake removed");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
