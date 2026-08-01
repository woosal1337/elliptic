"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export type WorkItemKind = "task" | "bug" | "story" | "epic";

export interface TypeLevel {
  kind: WorkItemKind;
  level: number;
}

const typeLevelsKey = (orgId: string) => ["orgs", orgId, "work-item-type-levels"] as const;

export function useTypeLevels(orgId: string) {
  return useQuery({
    queryKey: typeLevelsKey(orgId),
    queryFn: ({ signal }) =>
      api.get<TypeLevel[]>(orgPath(orgId, "/work-item-type-levels"), signal),
  });
}

export function useSetTypeLevels(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (levels: TypeLevel[]) =>
      api.put<TypeLevel[]>(orgPath(orgId, "/work-item-type-levels"), { levels }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: typeLevelsKey(orgId) });
      toast.success("Type hierarchy updated");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
