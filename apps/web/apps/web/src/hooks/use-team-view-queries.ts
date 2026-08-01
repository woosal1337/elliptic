"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import type { Task } from "@/lib/types";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface ServerView {
  id: string;
  name: string;
  config: Record<string, unknown>;
  scope: "personal" | "team" | "teamspace";
  team_id: string | null;
  is_default: boolean;
  owner_id: string | null;
  created_at: string;
}

const viewsKey = (orgId: string) => ["orgs", orgId, "server-views"] as const;

export function useTeamspaceViews(orgId: string, teamId: string) {
  return useQuery({
    queryKey: [...viewsKey(orgId), "team", teamId] as const,
    queryFn: async ({ signal }) => {
      const all = await api.get<ServerView[]>(orgPath(orgId, "/views"), signal);
      return all.filter((view) => view.scope === "teamspace" && view.team_id === teamId);
    },
  });
}

export function useCreateTeamspaceView(orgId: string, teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; config?: Record<string, unknown> }) =>
      api.post<ServerView>(orgPath(orgId, "/views"), {
        name: input.name,
        scope: "teamspace",
        team_id: teamId,
        config: input.config ?? {},
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...viewsKey(orgId), "team", teamId] });
      toast.success("View created");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteServerView(orgId: string, teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (viewId: string) => api.delete<null>(orgPath(orgId, `/views/${viewId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...viewsKey(orgId), "team", teamId] });
      toast.success("View deleted");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useTeamViewTasks(orgId: string, viewId: string | null) {
  return useQuery({
    queryKey: ["orgs", orgId, "server-views", viewId, "tasks"] as const,
    enabled: viewId !== null,
    queryFn: ({ signal }) =>
      api.get<Task[]>(orgPath(orgId, `/views/${viewId}/tasks`), signal),
  });
}

export interface PublishResult {
  public_token: string;
  path: string;
}

export function usePublishView(orgId: string, teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (viewId: string) =>
      api.post<PublishResult>(orgPath(orgId, `/views/${viewId}/publish`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["orgs", orgId, "server-views", "team", teamId],
      });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUnpublishView(orgId: string, teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (viewId: string) =>
      api.delete<null>(orgPath(orgId, `/views/${viewId}/publish`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["orgs", orgId, "server-views", "team", teamId],
      });
      toast.success("View unpublished");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
