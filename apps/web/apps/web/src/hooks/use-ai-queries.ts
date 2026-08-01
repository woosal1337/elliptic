"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";
import type {
  AIProvider,
  AIProviderKey,
  AIUser,
  ContextAggregation,
  RouteSuggestion,
} from "@/lib/types";

export const aiKeys = {
  all: (orgId: string) => ["orgs", orgId, "ai"] as const,
  providerKeys: (orgId: string) => [...aiKeys.all(orgId), "keys"] as const,
  users: (orgId: string) => [...aiKeys.all(orgId), "users"] as const,
};

export function useAIProviderKeys(orgId: string) {
  return useQuery({
    queryKey: aiKeys.providerKeys(orgId),
    queryFn: ({ signal }) => api.get<AIProviderKey[]>(orgPath(orgId, "/ai/keys"), signal),
  });
}

export function useAddAIProviderKey(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      provider: AIProvider;
      name: string;
      api_key: string;
      base_url?: string | null;
      region?: string | null;
      chat_model?: string | null;
      embedding_model?: string | null;
      embedding_dimensions?: number | null;
    }) => api.post<AIProviderKey>(orgPath(orgId, "/ai/keys"), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiKeys.providerKeys(orgId) });
      toast.success("Key added");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useSetDefaultAIProviderKey(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { keyId: string; isDefault: boolean }) =>
      api.patch<AIProviderKey>(orgPath(orgId, `/ai/keys/${input.keyId}`), {
        is_default: input.isDefault,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiKeys.providerKeys(orgId) });
      toast.success("Default key updated");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useDeleteAIProviderKey(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => api.delete<null>(orgPath(orgId, `/ai/keys/${keyId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiKeys.providerKeys(orgId) });
      toast.success("Key deleted");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export interface AIUserInput {
  name: string;
  provider: AIProvider;
  model: string;
  system_prompt: string;
}

export function useAIUsers(orgId: string) {
  return useQuery({
    queryKey: aiKeys.users(orgId),
    queryFn: ({ signal }) => api.get<AIUser[]>(orgPath(orgId, "/ai/users"), signal),
  });
}

export function useCreateAIUser(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AIUserInput) => api.post<AIUser>(orgPath(orgId, "/ai/users"), input),
    onSuccess: (aiUser) => {
      void queryClient.invalidateQueries({ queryKey: aiKeys.users(orgId) });
      toast.success(`Created ${aiUser.name}`);
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useUpdateAIUser(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { aiUserId: string } & AIUserInput) => {
      const { aiUserId, ...body } = input;
      return api.patch<AIUser>(orgPath(orgId, `/ai/users/${aiUserId}`), body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiKeys.users(orgId) });
      toast.success("AI user updated");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useDeleteAIUser(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (aiUserId: string) => api.delete<null>(orgPath(orgId, `/ai/users/${aiUserId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiKeys.users(orgId) });
      toast.success("AI user deleted");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export interface RoutingItem {
  kind: "task" | "meeting";
  id: string;
}

export function useSuggestRoute(orgId: string) {
  return useMutation({
    mutationFn: (item: RoutingItem) =>
      api.post<RouteSuggestion>(orgPath(orgId, "/ai/route"), item),
  });
}

export interface ContextQuery {
  kind: "task" | "triage";
  id: string;
}

export function useAggregateContext(orgId: string, item: ContextQuery, enabled = true) {
  return useQuery({
    queryKey: [...aiKeys.all(orgId), "context", item.kind, item.id] as const,
    queryFn: ({ signal }) =>
      api.get<ContextAggregation>(
        orgPath(orgId, `/ai/context?kind=${item.kind}&id=${item.id}`),
        signal
      ),
    enabled: enabled && item.id.length > 0,
    retry: false,
    staleTime: 60_000,
  });
}

export interface DocAssistResult {
  answer: string;
  ai_run_id: string;
}

export function useDocAssist(orgId: string) {
  return useMutation({
    mutationFn: (input: {
      note_id: string;
      content: string;
      question: string;
      selection?: string | null;
    }) => api.post<DocAssistResult>(orgPath(orgId, "/ai/doc-assist"), input),
    onError: (error) => toast.error(errorMessage(error)),
  });
}
