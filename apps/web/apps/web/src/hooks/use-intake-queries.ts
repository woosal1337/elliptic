"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";
import { projectKeys } from "@/hooks/use-project-queries";

export interface IntakeFormInfo {
  project_name: string;
  org_name: string;
}

export interface IntakeState {
  intake_enabled: boolean;
  intake_token: string | null;
}

export interface IntakeSubmitInput {
  title: string;
  description?: string | null;
  submitter_name?: string | null;
  submitter_email?: string | null;
}

export interface IntakeSubmitResult {
  reference: string;
  message: string;
}

function intakeApiPath(token: string): string {
  return `/api/v1/intake/${token}`;
}

export function usePublicIntakeForm(token: string) {
  return useQuery({
    queryKey: ["intake", token] as const,
    queryFn: ({ signal }) => api.get<IntakeFormInfo>(intakeApiPath(token), signal),
    enabled: token.length > 0,
    retry: false,
  });
}

export function useSubmitIntake(token: string) {
  return useMutation({
    mutationFn: (input: IntakeSubmitInput) =>
      api.post<IntakeSubmitResult>(intakeApiPath(token), input),
  });
}

function adminPath(orgId: string, projectId: string, suffix: string): string {
  return orgPath(orgId, `/projects/${projectId}/intake${suffix}`);
}

export function useSetIntakeEnabled(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) =>
      api.post<IntakeState>(adminPath(orgId, projectId, enabled ? "/enable" : "/disable"), {}),
    onSuccess: (_data, enabled) => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(orgId, projectId) });
      toast.success(enabled ? "Intake form enabled" : "Intake form disabled");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useSetInappIntakeEnabled(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) =>
      api.post<IntakeState>(
        adminPath(orgId, projectId, enabled ? "/inapp/enable" : "/inapp/disable"),
        {}
      ),
    onSuccess: (_data, enabled) => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(orgId, projectId) });
      toast.success(enabled ? "In-app intake enabled" : "In-app intake disabled");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
