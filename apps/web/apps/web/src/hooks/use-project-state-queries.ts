"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export type ProjectStateGroup =
  | "draft"
  | "planning"
  | "execution"
  | "monitoring"
  | "completed"
  | "cancelled";

export interface ProjectState {
  id: string;
  name: string;
  color: string;
  group: ProjectStateGroup;
  sort_order: number;
}

const statesKey = (orgId: string) => ["orgs", orgId, "project-states"] as const;

export function useProjectStates(orgId: string) {
  return useQuery({
    queryKey: statesKey(orgId),
    queryFn: ({ signal }) => api.get<ProjectState[]>(orgPath(orgId, "/project-states"), signal),
  });
}

export function useCreateProjectState(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; color?: string; group?: ProjectStateGroup }) =>
      api.post<ProjectState>(orgPath(orgId, "/project-states"), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: statesKey(orgId) });
      toast.success("State created");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteProjectState(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stateId: string) =>
      api.delete<null>(orgPath(orgId, `/project-states/${stateId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: statesKey(orgId) });
      toast.success("State deleted");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
