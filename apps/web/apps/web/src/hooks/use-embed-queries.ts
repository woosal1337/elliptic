"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";
import type { Attachment } from "@/lib/types";

export interface NoteEmbed {
  id: string;
  note_id: string;
  url: string;
  provider: string;
  kind: "iframe" | "link";
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  iframe_url: string | null;
  created_at: string;
}

const embedsKey = (orgId: string, noteId: string) =>
  ["orgs", orgId, "notes", noteId, "embeds"] as const;
const attachKey = (orgId: string, noteId: string) =>
  ["orgs", orgId, "storage", "note", noteId] as const;

export function useNoteEmbeds(orgId: string, noteId: string) {
  return useQuery({
    queryKey: embedsKey(orgId, noteId),
    queryFn: ({ signal }) =>
      api.get<NoteEmbed[]>(orgPath(orgId, `/notes/${noteId}/embeds`), signal),
  });
}

export function useCreateEmbed(orgId: string, noteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) =>
      api.post<NoteEmbed>(orgPath(orgId, `/notes/${noteId}/embeds`), { url }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: embedsKey(orgId, noteId) });
      toast.success("Embed added");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useDeleteEmbed(orgId: string, noteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (embedId: string) =>
      api.delete<null>(orgPath(orgId, `/notes/${noteId}/embeds/${embedId}`)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: embedsKey(orgId, noteId) }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useNoteAttachments(orgId: string, noteId: string) {
  return useQuery({
    queryKey: attachKey(orgId, noteId),
    queryFn: ({ signal }) =>
      api.get<Attachment[]>(
        orgPath(orgId, `/storage/objects?entity_type=note&entity_id=${noteId}`),
        signal
      ),
  });
}
