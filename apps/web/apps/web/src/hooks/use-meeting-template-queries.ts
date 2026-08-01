"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";
import {
  BUILTIN_RECIPES,
  BUILTIN_TEMPLATES,
  mergeTemplates,
} from "@/lib/meeting-templates";
import type { MeetingChatResult, MeetingRecipe, MeetingTemplate } from "@/lib/types";

export const templateKeys = {
  all: (orgId: string) => ["orgs", orgId, "meeting-templates"] as const,
  recipes: (orgId: string) => ["orgs", orgId, "meeting-recipes"] as const,
};

export function useMeetingTemplates(orgId: string) {
  const query = useQuery({
    queryKey: templateKeys.all(orgId),
    queryFn: ({ signal }) =>
      api.get<MeetingTemplate[]>(orgPath(orgId, "/ai/meeting-templates"), signal),
    retry: false,
    staleTime: 5 * 60_000,
  });
  return {
    ...query,
    templates: mergeTemplates(BUILTIN_TEMPLATES, query.data ?? []),
    customTemplates: (query.data ?? []).filter((template) => !template.built_in),
  };
}

export interface MeetingTemplateInput {
  name: string;
  sections: string[];
  prompt_scaffold?: string | null;
}

export function useCreateMeetingTemplate(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MeetingTemplateInput) =>
      api.post<MeetingTemplate>(orgPath(orgId, "/ai/meeting-templates"), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: templateKeys.all(orgId) });
      toast.success("Template created");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateMeetingTemplate(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string } & Partial<MeetingTemplateInput>) => {
      const { id, ...body } = input;
      return api.patch<MeetingTemplate>(orgPath(orgId, `/ai/meeting-templates/${id}`), body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: templateKeys.all(orgId) });
      toast.success("Template updated");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteMeetingTemplate(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(orgPath(orgId, `/ai/meeting-templates/${id}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: templateKeys.all(orgId) });
      toast.success("Template deleted");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useMeetingRecipes(orgId: string) {
  const query = useQuery({
    queryKey: templateKeys.recipes(orgId),
    queryFn: ({ signal }) =>
      api.get<MeetingRecipe[]>(orgPath(orgId, "/ai/meeting-recipes"), signal),
    retry: false,
    staleTime: 5 * 60_000,
  });
  const custom = (query.data ?? []).filter((recipe) => !recipe.built_in);
  return { ...query, recipes: [...BUILTIN_RECIPES, ...custom] };
}

export function useRunRecipe(orgId: string, meetingId: string) {
  return useMutation({
    mutationFn: (input: { prompt: string; recipe_id?: string }) =>
      api.post<MeetingChatResult>(orgPath(orgId, `/meetings/${meetingId}/recipes/run`), input),
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useSaveRecipe(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; prompt: string }) =>
      api.post<MeetingRecipe>(orgPath(orgId, "/ai/meeting-recipes"), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: templateKeys.recipes(orgId) });
      toast.success("Recipe saved");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
