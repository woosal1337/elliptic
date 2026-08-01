"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import type { Release, ReleaseStatus, Task } from "@/lib/types";
import { api, errorMessage, orgPath } from "@/lib/api";
import { taskKeys } from "@/hooks/use-task-queries";

export const releaseKeys = {
  all: (orgId: string) => ["orgs", orgId, "releases"] as const,
};

function releasesPath(orgId: string, suffix = ""): string {
  return orgPath(orgId, `/releases${suffix}`);
}

export function useReleases(orgId: string) {
  return useQuery({
    queryKey: releaseKeys.all(orgId),
    queryFn: ({ signal }) => api.get<Release[]>(releasesPath(orgId), signal),
  });
}

export function useRelease(orgId: string, releaseId: string) {
  return useQuery({
    queryKey: [...releaseKeys.all(orgId), releaseId] as const,
    queryFn: ({ signal }) => api.get<Release>(releasesPath(orgId, `/${releaseId}`), signal),
  });
}

export function useReleaseTasks(orgId: string, releaseId: string) {
  return useQuery({
    queryKey: [...releaseKeys.all(orgId), releaseId, "tasks"] as const,
    queryFn: ({ signal }) => api.get<Task[]>(releasesPath(orgId, `/${releaseId}/tasks`), signal),
  });
}

export function useCreateRelease(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      version?: string | null;
      description?: string | null;
      released_at?: string | null;
    }) => api.post<Release>(releasesPath(orgId), input),
    onSuccess: () => {
      toast.success("Release created");
      void queryClient.invalidateQueries({ queryKey: releaseKeys.all(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateRelease(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      releaseId: string;
      name?: string;
      version?: string | null;
      description?: string | null;
      changelog?: string | null;
      status?: ReleaseStatus;
      released_at?: string | null;
    }) => {
      const { releaseId, ...body } = input;
      return api.patch<Release>(releasesPath(orgId, `/${releaseId}`), body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: releaseKeys.all(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteRelease(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (releaseId: string) => api.delete(releasesPath(orgId, `/${releaseId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: releaseKeys.all(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useAssignTaskToRelease(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { releaseId: string; taskId: string }) =>
      api.post(releasesPath(orgId, `/${variables.releaseId}/tasks/${variables.taskId}`)),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: releaseKeys.all(orgId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(orgId, variables.taskId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUnassignTaskFromRelease(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { releaseId: string; taskId: string }) =>
      api.delete(releasesPath(orgId, `/${variables.releaseId}/tasks/${variables.taskId}`)),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: releaseKeys.all(orgId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(orgId, variables.taskId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export type ChangelogCategory =
  | "added"
  | "changed"
  | "fixed"
  | "removed"
  | "security"
  | "deprecated";

export interface ChangelogEntry {
  id: string;
  release_id: string;
  category: ChangelogCategory;
  title: string;
  body: string | null;
  pr_url: string | null;
  sort_order: number;
}

const changelogKey = (orgId: string, releaseId: string) =>
  ["orgs", orgId, "releases", releaseId, "changelog"] as const;

export function useChangelog(orgId: string, releaseId: string) {
  return useQuery({
    queryKey: changelogKey(orgId, releaseId),
    queryFn: ({ signal }) =>
      api.get<ChangelogEntry[]>(releasesPath(orgId, `/${releaseId}/changelog`), signal),
  });
}

export function useCreateChangelogEntry(orgId: string, releaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { category: ChangelogCategory; title: string; pr_url?: string }) =>
      api.post<ChangelogEntry>(releasesPath(orgId, `/${releaseId}/changelog`), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: changelogKey(orgId, releaseId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteChangelogEntry(orgId: string, releaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) =>
      api.delete<null>(releasesPath(orgId, `/changelog/${entryId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: changelogKey(orgId, releaseId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
