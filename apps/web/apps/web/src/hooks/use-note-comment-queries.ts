"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import type { Comment } from "@/lib/types";
import { api, errorMessage, orgPath } from "@/lib/api";

const noteCommentsKey = (orgId: string, noteId: string) =>
  ["orgs", orgId, "notes", noteId, "comments"] as const;

export function useNoteComments(orgId: string, noteId: string) {
  return useQuery({
    queryKey: noteCommentsKey(orgId, noteId),
    queryFn: ({ signal }) =>
      api.get<{ items: Comment[] }>(
        orgPath(orgId, `/comments?entity_type=note&entity_id=${noteId}`),
        signal
      ).then((page) => page.items),
  });
}

export function useAddNoteComment(orgId: string, noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { content: string; anchor?: string | null; attachmentIds?: string[] }) =>
      api.post<Comment>(orgPath(orgId, "/comments"), {
        entity_type: "note",
        entity_id: noteId,
        content: input.content,
        anchor: input.anchor ?? null,
        attachment_ids: input.attachmentIds ?? [],
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: noteCommentsKey(orgId, noteId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useResolveNoteComment(orgId: string, noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { commentId: string; resolved: boolean }) =>
      api.post<Comment>(orgPath(orgId, `/comments/${input.commentId}/resolve`), {
        resolved: input.resolved,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: noteCommentsKey(orgId, noteId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteNoteComment(orgId: string, noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      api.delete<null>(orgPath(orgId, `/comments/${commentId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: noteCommentsKey(orgId, noteId) });
      toast.success("Comment deleted");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
