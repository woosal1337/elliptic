"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface NoteTemplate {
  id: string;
  project_id: string | null;
  name: string;
  title: string;
  content: string;
}

const templatesKey = (orgId: string, projectId?: string) =>
  ["orgs", orgId, "note-templates", projectId ?? "org"] as const;

export function useNoteTemplates(orgId: string, projectId?: string) {
  return useQuery({
    queryKey: templatesKey(orgId, projectId),
    queryFn: ({ signal }) =>
      api.get<NoteTemplate[]>(
        orgPath(orgId, `/note-templates${projectId ? `?project_id=${projectId}` : ""}`),
        signal
      ),
  });
}

export function useSaveNoteAsTemplate(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { noteId: string; name: string }) =>
      api.post<NoteTemplate>(orgPath(orgId, `/note-templates/from-note/${input.noteId}`), {
        name: input.name,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orgs", orgId, "note-templates"] });
      toast.success("Saved as template");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteNoteTemplate(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      api.delete<null>(orgPath(orgId, `/note-templates/${templateId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orgs", orgId, "note-templates"] });
      toast.success("Template deleted");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
