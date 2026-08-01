"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export type ChatMode = "ask" | "build";

export interface Conversation {
  id: string;
  title: string;
  mode: ChatMode;
  pinned: boolean;
  auto_run: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  feedback: number;
  created_at: string;
}

const convoKey = (orgId: string) => ["orgs", orgId, "ai", "conversations"] as const;
const msgKey = (orgId: string, cid: string) =>
  ["orgs", orgId, "ai", "conversations", cid, "messages"] as const;

export function useConversations(orgId: string, search = "") {
  return useQuery({
    queryKey: [...convoKey(orgId), search] as const,
    queryFn: ({ signal }) =>
      api.get<Conversation[]>(
        orgPath(orgId, `/ai/conversations${search ? `?q=${encodeURIComponent(search)}` : ""}`),
        signal
      ),
  });
}

export function useUpdateConversation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; title?: string; mode?: ChatMode; pinned?: boolean; auto_run?: boolean }) =>
      api.patch<Conversation>(orgPath(orgId, `/ai/conversations/${id}`), patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: convoKey(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useMessageFeedback(orgId: string, conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, value }: { messageId: string; value: number }) =>
      api.post<ChatMessage>(
        orgPath(orgId, `/ai/conversations/${conversationId}/messages/${messageId}/feedback`),
        { value }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: msgKey(orgId, conversationId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useCreateConversation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mode: ChatMode) =>
      api.post<Conversation>(orgPath(orgId, "/ai/conversations"), { mode }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: convoKey(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useChatMessages(orgId: string, conversationId: string | null) {
  return useQuery({
    queryKey: msgKey(orgId, conversationId ?? "none"),
    enabled: conversationId !== null,
    queryFn: ({ signal }) =>
      api.get<ChatMessage[]>(
        orgPath(orgId, `/ai/conversations/${conversationId}/messages`),
        signal
      ),
  });
}

export interface ChatMention {
  type: "task" | "project";
  id: string;
}

export function useSendChatMessage(orgId: string, conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ content, mentions }: { content: string; mentions: ChatMention[] }) =>
      api.post<ChatMessage>(
        orgPath(orgId, `/ai/conversations/${conversationId}/messages`),
        { content, mentions }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: msgKey(orgId, conversationId) });
      void queryClient.invalidateQueries({ queryKey: convoKey(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteConversation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      api.delete<null>(orgPath(orgId, `/ai/conversations/${conversationId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: convoKey(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
