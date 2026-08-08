"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";
import { markOptimistic, optimisticMutation, tempId } from "@/lib/optimistic";
import type { Note, NoteShare, NoteShareAccess, Page } from "@/lib/types";

export const noteKeys = {
  all: (orgId: string) => ["orgs", orgId, "notes"] as const,
  list: (orgId: string, projectId?: string) =>
    [...noteKeys.all(orgId), "list", projectId ?? "org"] as const,
  detail: (orgId: string, noteId: string) => [...noteKeys.all(orgId), noteId] as const,
};

export function useNotes(orgId: string, projectId?: string) {
  const suffix = projectId ? `/notes?project_id=${projectId}` : "/notes";
  return useQuery({
    queryKey: noteKeys.list(orgId, projectId),
    queryFn: async ({ signal }) => {
      const page = await api.get<Page<Note>>(orgPath(orgId, suffix), signal);
      return page.items;
    },
  });
}

export function useTeamNotes(orgId: string, teamId: string) {
  return useQuery({
    queryKey: ["orgs", orgId, "teams", teamId, "notes"] as const,
    queryFn: async ({ signal }) => {
      const page = await api.get<Page<Note>>(
        orgPath(orgId, `/notes?team_id=${teamId}`),
        signal
      );
      return page.items;
    },
  });
}

export function useNote(orgId: string, noteId: string) {
  return useQuery({
    queryKey: noteKeys.detail(orgId, noteId),
    queryFn: ({ signal }) => api.get<Note>(orgPath(orgId, `/notes/${noteId}`), signal),
  });
}

export interface NoteVersion {
  id: string;
  note_id: string;
  title: string;
  content: string;
  edited_by: string | null;
  created_at: string;
}

export function useNoteVersions(orgId: string, noteId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...noteKeys.detail(orgId, noteId), "versions"] as const,
    enabled,
    queryFn: ({ signal }) =>
      api.get<NoteVersion[]>(orgPath(orgId, `/notes/${noteId}/versions`), signal),
  });
}

export function useSetNoteLifecycle(orgId: string, noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      visibility?: "public" | "private" | "shared";
      locked?: boolean;
      archived?: boolean;
    }) => api.patch<Note>(orgPath(orgId, `/notes/${noteId}/lifecycle`), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: noteKeys.detail(orgId, noteId) });
      void queryClient.invalidateQueries({ queryKey: noteKeys.all(orgId) });
      toast.success("Page updated");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useNoteShares(orgId: string, noteId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...noteKeys.detail(orgId, noteId), "shares"] as const,
    enabled,
    queryFn: ({ signal }) =>
      api.get<NoteShare[]>(orgPath(orgId, `/notes/${noteId}/shares`), signal),
  });
}

export function useShareNote(orgId: string, noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { user_id: string; access: NoteShareAccess }) =>
      api.put<NoteShare>(orgPath(orgId, `/notes/${noteId}/shares`), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...noteKeys.detail(orgId, noteId), "shares"],
      });
      toast.success("Shared");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUnshareNote(orgId: string, noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete<null>(orgPath(orgId, `/notes/${noteId}/shares/${userId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...noteKeys.detail(orgId, noteId), "shares"],
      });
      toast.success("Unshared");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRestoreNoteVersion(orgId: string, noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) =>
      api.post<Note>(orgPath(orgId, `/notes/${noteId}/versions/${versionId}/restore`), {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: noteKeys.detail(orgId, noteId) });
      void queryClient.invalidateQueries({
        queryKey: [...noteKeys.detail(orgId, noteId), "versions"],
      });
      toast.success("Page restored");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

interface CreateNoteInput {
  title: string;
  content?: string;
  icon?: string | null;
  project_id?: string | null;
  team_id?: string | null;
  parent_id?: string | null;
  is_folder?: boolean;
}

function draftNote(orgId: string, id: string, input: CreateNoteInput): Note {
  const now = new Date().toISOString();
  return markOptimistic({
    id,
    org_id: orgId,
    project_id: input.project_id ?? null,
    team_id: input.team_id ?? null,
    parent_id: input.parent_id ?? null,
    is_folder: input.is_folder ?? false,
    title: input.title,
    content: input.content ?? "",
    icon: input.icon ?? null,
    visibility: "public",
    locked: false,
    archived_at: null,
    created_by: "",
    updated_by: "",
    created_at: now,
    updated_at: now,
  });
}

export function useCreateNote(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteInput) => api.post<Note>(orgPath(orgId, "/notes"), input),
    onMutate: async (input) => {
      const draftId = tempId();
      const listKey = noteKeys.list(orgId, input.project_id ?? undefined);
      const orgListKey = noteKeys.list(orgId);
      const keys = input.project_id ? [listKey, orgListKey] : [listKey];
      await Promise.all(keys.map((queryKey) => queryClient.cancelQueries({ queryKey })));
      const snapshots = keys.map((queryKey) => ({
        queryKey,
        previous: queryClient.getQueryData(queryKey),
      }));
      const draft = draftNote(orgId, draftId, input);
      for (const queryKey of keys) {
        queryClient.setQueryData(queryKey, (current: Note[] | undefined) => [
          draft,
          ...(current ?? []),
        ]);
      }
      return { snapshots };
    },
    onError: (error, _input, context) => {
      for (const snapshot of context?.snapshots ?? []) {
        queryClient.setQueryData(snapshot.queryKey, snapshot.previous);
      }
      toast.error(errorMessage(error));
    },
    onSuccess: (note) => {
      toast.success(`Created ${note.title}`);
      if (note.team_id) {
        void queryClient.invalidateQueries({
          queryKey: ["orgs", orgId, "teams", note.team_id, "notes"],
        });
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: noteKeys.all(orgId) });
    },
  });
}

type UpdateNoteVariables = {
  noteId: string;
  title?: string;
  content?: string;
  icon?: string | null;
  // null is a real value here — it moves the note back to the root — so the
  // patch has to distinguish "not given" from "given as null".
  parent_id?: string | null;
};

function applyNotePatch(note: Note, variables: UpdateNoteVariables): Note {
  const next: Note = { ...note };
  if (variables.title !== undefined) next.title = variables.title;
  if (variables.content !== undefined) next.content = variables.content;
  if (variables.icon !== undefined) next.icon = variables.icon;
  if (variables.parent_id !== undefined) next.parent_id = variables.parent_id;
  return next;
}

export function useUpdateNote(orgId: string) {
  const queryClient = useQueryClient();
  const optimistic = optimisticMutation<UpdateNoteVariables>({
    queryClient,
    targets: (variables) => [
      {
        queryKey: noteKeys.detail(orgId, variables.noteId),
        updater: (current) =>
          current ? applyNotePatch(current as Note, variables) : current,
      },
      {
        queryKey: noteKeys.list(orgId),
        updater: (current) =>
          (current as Note[] | undefined)?.map((note) =>
            note.id === variables.noteId ? applyNotePatch(note, variables) : note
          ),
      },
    ],
    invalidateKeys: (variables) => [
      noteKeys.all(orgId),
      noteKeys.detail(orgId, variables.noteId),
    ],
    errorMessage: () => "Could not save note",
  });

  return useMutation({
    mutationFn: ({ noteId, ...body }: UpdateNoteVariables) =>
      api.patch<Note>(orgPath(orgId, `/notes/${noteId}`), body),
    onMutate: optimistic.onMutate,
    onError: optimistic.onError,
    onSuccess: (note) => {
      queryClient.setQueryData(noteKeys.detail(orgId, note.id), note);
      toast.success("Note saved");
    },
    onSettled: optimistic.onSettled,
  });
}

export function useDuplicateNote(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) =>
      api.post<Note>(orgPath(orgId, `/notes/${noteId}/duplicate`)),
    onSuccess: (note) => {
      toast.success("Page duplicated");
      void queryClient.invalidateQueries({ queryKey: noteKeys.all(orgId) });
      if (note.project_id) {
        void queryClient.invalidateQueries({
          queryKey: noteKeys.list(orgId, note.project_id),
        });
      }
    },
    onError: () => toast.error("Could not duplicate page"),
  });
}

export function useDeleteNote(orgId: string) {
  const queryClient = useQueryClient();
  const optimistic = optimisticMutation<string>({
    queryClient,
    targets: (noteId) => [
      {
        queryKey: noteKeys.list(orgId),
        updater: (current) =>
          (current as Note[] | undefined)?.filter((note) => note.id !== noteId),
      },
    ],
    invalidateKeys: () => [noteKeys.all(orgId)],
    errorMessage: () => "Could not delete note",
  });

  return useMutation({
    mutationFn: (noteId: string) => api.delete<null>(orgPath(orgId, `/notes/${noteId}`)),
    onMutate: optimistic.onMutate,
    onError: optimistic.onError,
    onSuccess: () => {
      toast.success("Note deleted");
    },
    onSettled: optimistic.onSettled,
  });
}
