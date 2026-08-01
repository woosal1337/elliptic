"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import type { Favorite } from "@/lib/types";
import { api, errorMessage, orgPath } from "@/lib/api";

export const favoriteKeys = {
  all: (orgId: string) => ["orgs", orgId, "favorites"] as const,
};

export function useFavorites(orgId: string) {
  return useQuery({
    queryKey: favoriteKeys.all(orgId),
    queryFn: ({ signal }) => api.get<Favorite[]>(orgPath(orgId, "/favorites"), signal),
  });
}

export function useAddFavorite(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { entity_type: string; entity_id: string; label: string }) =>
      api.post<Favorite>(orgPath(orgId, "/favorites"), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: favoriteKeys.all(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRemoveFavorite(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { entity_type: string; entity_id: string }) =>
      api.delete(orgPath(orgId, `/favorites/${input.entity_type}/${input.entity_id}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: favoriteKeys.all(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
