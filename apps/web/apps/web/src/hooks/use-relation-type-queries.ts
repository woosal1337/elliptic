"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface RelationTypeDef {
  id: string;
  name: string;
  outward_label: string;
  inward_label: string;
}

const key = (orgId: string) => ["orgs", orgId, "relation-types"] as const;

export function useRelationTypes(orgId: string) {
  return useQuery({
    queryKey: key(orgId),
    queryFn: ({ signal }) => api.get<RelationTypeDef[]>(orgPath(orgId, "/relation-types"), signal),
  });
}

export function useCreateRelationType(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; outward_label: string; inward_label: string }) =>
      api.post<RelationTypeDef>(orgPath(orgId, "/relation-types"), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId) });
      toast.success("Relation type created");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteRelationType(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (typeId: string) => api.delete<null>(orgPath(orgId, `/relation-types/${typeId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId) });
      toast.success("Relation type deleted");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
