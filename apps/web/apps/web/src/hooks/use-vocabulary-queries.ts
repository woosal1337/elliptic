"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";
import type { VocabularyTerm } from "@/lib/types";

export const vocabularyKeys = {
  all: (orgId: string) => ["orgs", orgId, "vocabulary"] as const,
};

export function useVocabulary(orgId: string) {
  return useQuery({
    queryKey: vocabularyKeys.all(orgId),
    queryFn: ({ signal }) => api.get<VocabularyTerm[]>(orgPath(orgId, "/vocabulary"), signal),
  });
}

export function useCreateTerm(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { term: string; definition: string }) =>
      api.post<VocabularyTerm>(orgPath(orgId, "/vocabulary"), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vocabularyKeys.all(orgId) });
      toast.success("Term added");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateTerm(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; term?: string; definition?: string }) =>
      api.patch<VocabularyTerm>(orgPath(orgId, `/vocabulary/${input.id}`), {
        term: input.term,
        definition: input.definition,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vocabularyKeys.all(orgId) });
      toast.success("Term updated");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteTerm(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (termId: string) => api.delete<null>(orgPath(orgId, `/vocabulary/${termId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vocabularyKeys.all(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
