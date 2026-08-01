"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface IntakeFormField {
  key?: string;
  label: string;
  type: "text" | "textarea" | "select";
  required: boolean;
  options: string[];
}

export interface IntakeForm {
  id: string;
  project_id: string;
  name: string;
  token: string;
  enabled: boolean;
  fields: IntakeFormField[];
}

export interface PublicIntakeForm {
  name: string;
  fields: IntakeFormField[];
}

const key = (orgId: string, projectId: string) =>
  ["orgs", orgId, "projects", projectId, "intake-forms"] as const;

function adminPath(orgId: string, projectId: string, suffix = ""): string {
  return orgPath(orgId, `/projects/${projectId}/intake-forms${suffix}`);
}

export function useIntakeForms(orgId: string, projectId: string) {
  return useQuery({
    queryKey: key(orgId, projectId),
    queryFn: ({ signal }) => api.get<IntakeForm[]>(adminPath(orgId, projectId), signal),
  });
}

export function useCreateIntakeForm(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; fields: IntakeFormField[] }) =>
      api.post<IntakeForm>(adminPath(orgId, projectId), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId, projectId) });
      toast.success("Form created");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateIntakeForm(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      formId,
      ...input
    }: {
      formId: string;
      name?: string;
      fields?: IntakeFormField[];
      enabled?: boolean;
    }) => api.patch<IntakeForm>(adminPath(orgId, projectId, `/${formId}`), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteIntakeForm(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formId: string) =>
      api.delete<null>(adminPath(orgId, projectId, `/${formId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId, projectId) });
      toast.success("Form deleted");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function usePublicIntakeForm(token: string) {
  return useQuery({
    queryKey: ["public-intake-form", token] as const,
    queryFn: ({ signal }) =>
      api.get<PublicIntakeForm>(`/api/v1/intake-forms/${token}`, signal),
    retry: false,
  });
}

export function useSubmitIntakeForm(token: string) {
  return useMutation({
    mutationFn: (input: { title: string; answers: Record<string, string> }) =>
      api.post<{ reference: string }>(`/api/v1/intake-forms/${token}`, input),
  });
}
