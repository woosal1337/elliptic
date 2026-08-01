"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage } from "@/lib/api";

export interface OAuthApp {
  client_id: string;
  client_name: string;
  created_at: string;
}

const key = ["oauth", "apps"] as const;

export function useOAuthApps() {
  return useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api.get<OAuthApp[]>("/api/v1/oauth/apps", signal),
  });
}

export function useCreateOAuthApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.post<{ client_id: string; client_secret: string; client_name: string }>(
        "/api/v1/oauth/apps",
        { name }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRevokeOAuthApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clientId: string) =>
      api.delete<null>(`/api/v1/oauth/apps/${encodeURIComponent(clientId)}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      toast.success("App revoked");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
