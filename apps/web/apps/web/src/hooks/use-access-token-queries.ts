"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import type { PersonalAccessToken, PersonalAccessTokenCreated } from "@/lib/types";
import { api, errorMessage } from "@/lib/api";

const TOKENS_PATH = "/api/v1/users/me/tokens";
export const accessTokenKeys = { all: () => ["personal-access-tokens"] as const };

export function usePersonalTokens() {
  return useQuery({
    queryKey: accessTokenKeys.all(),
    queryFn: ({ signal }) => api.get<PersonalAccessToken[]>(TOKENS_PATH, signal),
  });
}

export function useCreatePersonalToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string | null; expires_in_days?: number | null }) =>
      api.post<PersonalAccessTokenCreated>(TOKENS_PATH, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accessTokenKeys.all() });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRegeneratePersonalToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: string) =>
      api.post<PersonalAccessTokenCreated>(`${TOKENS_PATH}/${tokenId}/regenerate`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accessTokenKeys.all() });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRevokePersonalToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: string) => api.delete(`${TOKENS_PATH}/${tokenId}`),
    onSuccess: () => {
      toast.success("Token revoked");
      void queryClient.invalidateQueries({ queryKey: accessTokenKeys.all() });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
