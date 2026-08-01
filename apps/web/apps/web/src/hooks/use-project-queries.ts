"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";
import { markOptimistic, optimisticMutation, tempId } from "@/lib/optimistic";
import type { Project, ProjectBrowseEntry, ProjectMember, TaskStatus } from "@/lib/types";

export const projectKeys = {
  all: (orgId: string) => ["orgs", orgId, "projects"] as const,
  lists: (orgId: string) => [...projectKeys.all(orgId), "list"] as const,
  browse: (orgId: string) => [...projectKeys.all(orgId), "browse"] as const,
  deleted: (orgId: string) => [...projectKeys.all(orgId), "deleted"] as const,
  detail: (orgId: string, projectId: string) => [...projectKeys.all(orgId), projectId] as const,
  members: (orgId: string, projectId: string) =>
    [...projectKeys.detail(orgId, projectId), "members"] as const,
  subscription: (orgId: string, projectId: string) =>
    [...projectKeys.detail(orgId, projectId), "subscription"] as const,
};

export function useProjects(orgId: string) {
  return useQuery({
    queryKey: projectKeys.lists(orgId),
    queryFn: ({ signal }) => api.get<Project[]>(orgPath(orgId, "/projects"), signal),
  });
}

export function useBrowseProjects(orgId: string) {
  return useQuery({
    queryKey: projectKeys.browse(orgId),
    queryFn: ({ signal }) =>
      api.get<ProjectBrowseEntry[]>(orgPath(orgId, "/projects/browse"), signal),
  });
}

export function useJoinProject(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      api.post<ProjectMember>(orgPath(orgId, `/projects/${projectId}/join`), {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.browse(orgId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists(orgId) });
      toast.success("Joined project");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useProject(orgId: string, projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(orgId, projectId),
    queryFn: ({ signal }) => api.get<Project>(orgPath(orgId, `/projects/${projectId}`), signal),
  });
}

export function useCreateProject(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; key: string; description?: string }) =>
      api.post<Project>(orgPath(orgId, "/projects"), input),
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists(orgId) });
      toast.success(`Created ${project.name}`);
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useUpdateProject(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name?: string;
      description?: string | null;
      icon?: string | null;
      status?: Project["status"];
      features?: Record<string, boolean>;
      estimate_scale?: string[];
      labels?: string[];
      default_assignee_id?: string | null;
      intake_owner_id?: string | null;
      clear_intake_owner?: boolean;
      network?: "private" | "public";
      auto_archive_days?: number | null;
      clear_auto_archive?: boolean;
      auto_close_days?: number | null;
      auto_close_status?: TaskStatus;
      clear_auto_close?: boolean;
      state_id?: string | null;
      clear_state?: boolean;
      worklog_approval_required?: boolean;
    }) => api.patch<Project>(orgPath(orgId, `/projects/${projectId}`), input),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(orgId, projectId), project);
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists(orgId) });
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useProjectMembers(orgId: string, projectId: string) {
  return useQuery({
    queryKey: projectKeys.members(orgId, projectId),
    queryFn: ({ signal }) =>
      api.get<ProjectMember[]>(orgPath(orgId, `/projects/${projectId}/members`), signal),
  });
}

export function useAddProjectMember(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  const membersKey = projectKeys.members(orgId, projectId);
  const optimistic = optimisticMutation<string>({
    queryClient,
    targets: (userId) => [
      {
        queryKey: membersKey,
        updater: (current) => {
          const list = (current as ProjectMember[] | undefined) ?? [];
          if (list.some((member) => member.user_id === userId)) return list;
          const draft: ProjectMember = markOptimistic({
            id: tempId(),
            project_id: projectId,
            user_id: userId,
            role: "member",
            created_at: new Date().toISOString(),
          });
          return [...list, draft];
        },
      },
    ],
    invalidateKeys: () => [membersKey],
    errorMessage: () => "Could not add member",
  });

  return useMutation({
    mutationFn: (userId: string) =>
      api.post<ProjectMember>(orgPath(orgId, `/projects/${projectId}/members`), {
        user_id: userId,
      }),
    onMutate: optimistic.onMutate,
    onError: optimistic.onError,
    onSuccess: () => {
      toast.success("Member added");
    },
    onSettled: optimistic.onSettled,
  });
}

export function useSetProjectMemberRole(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: "admin" | "member" | "commenter" | "viewer";
    }) =>
      api.patch<ProjectMember>(orgPath(orgId, `/projects/${projectId}/members/${userId}`), {
        role,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.members(orgId, projectId) });
      toast.success("Role updated");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRemoveProjectMember(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  const membersKey = projectKeys.members(orgId, projectId);
  const optimistic = optimisticMutation<string>({
    queryClient,
    targets: (userId) => [
      {
        queryKey: membersKey,
        updater: (current) =>
          (current as ProjectMember[] | undefined)?.filter(
            (member) => member.user_id !== userId
          ),
      },
    ],
    invalidateKeys: () => [membersKey],
    errorMessage: () => "Could not remove member",
  });

  return useMutation({
    mutationFn: (userId: string) =>
      api.delete<null>(orgPath(orgId, `/projects/${projectId}/members/${userId}`)),
    onMutate: optimistic.onMutate,
    onError: optimistic.onError,
    onSuccess: () => {
      toast.success("Member removed");
    },
    onSettled: optimistic.onSettled,
  });
}

export function useDeletedProjects(orgId: string) {
  return useQuery({
    queryKey: projectKeys.deleted(orgId),
    queryFn: ({ signal }) =>
      api.get<Project[]>(orgPath(orgId, "/projects/deleted"), signal),
  });
}

export function useRestoreProject(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      api.post<Project>(orgPath(orgId, `/projects/${projectId}/restore`)),
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists(orgId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.deleted(orgId) });
      toast.success(`Restored ${project.name}`);
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useDeleteProject(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      api.delete<null>(orgPath(orgId, `/projects/${projectId}`)),
    onSuccess: (_data, projectId) => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists(orgId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.deleted(orgId) });
      queryClient.removeQueries({ queryKey: projectKeys.detail(orgId, projectId) });
      toast.success("Project deleted");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useProjectSubscription(orgId: string, projectId: string) {
  return useQuery({
    queryKey: projectKeys.subscription(orgId, projectId),
    queryFn: ({ signal }) =>
      api.get<{ subscribed: boolean }>(
        orgPath(orgId, `/projects/${projectId}/subscription`),
        signal
      ),
  });
}

export function useSetProjectSubscription(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subscribed: boolean) =>
      api.post<{ subscribed: boolean }>(
        orgPath(orgId, `/projects/${projectId}/${subscribed ? "subscribe" : "unsubscribe"}`)
      ),
    onSuccess: (result) => {
      queryClient.setQueryData(projectKeys.subscription(orgId, projectId), result);
      void queryClient.invalidateQueries({
        queryKey: projectKeys.subscription(orgId, projectId),
      });
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}
