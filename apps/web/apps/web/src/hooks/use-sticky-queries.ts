"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import type { Sticky } from "@/lib/types";
import { api, errorMessage, orgPath } from "@/lib/api";

export const stickyKeys = {
  all: (orgId: string) => ["orgs", orgId, "stickies"] as const,
};

export function useStickies(orgId: string) {
  return useQuery({
    queryKey: stickyKeys.all(orgId),
    queryFn: ({ signal }) => api.get<Sticky[]>(orgPath(orgId, "/stickies"), signal),
  });
}

export function useCreateSticky(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { content?: string; color?: string }) =>
      api.post<Sticky>(orgPath(orgId, "/stickies"), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stickyKeys.all(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateSticky(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { stickyId: string; content?: string; color?: string }) => {
      const { stickyId, ...body } = input;
      return api.patch<Sticky>(orgPath(orgId, `/stickies/${stickyId}`), body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stickyKeys.all(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteSticky(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stickyId: string) => api.delete(orgPath(orgId, `/stickies/${stickyId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stickyKeys.all(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export interface StickyConvertResult {
  target: "task" | "note";
  entity_id: string;
  project_id: string | null;
}

export function useConvertSticky(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      stickyId: string;
      target: "task" | "note";
      project_id?: string | null;
      delete_after?: boolean;
    }) => {
      const { stickyId, ...body } = input;
      return api.post<StickyConvertResult>(orgPath(orgId, `/stickies/${stickyId}/convert`), body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stickyKeys.all(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
