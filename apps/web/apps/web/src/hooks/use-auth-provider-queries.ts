"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface PublicProviders {
  password: boolean;
  magic_code: boolean;
  google: boolean;
  github: boolean;
}

export interface AuthProviderConfig {
  magic_code_enabled: boolean;
  password_enabled: boolean;
  google_enabled: boolean;
  github_enabled: boolean;
  allow_self_signup: boolean;
  restrict_oauth_to_verified_domains: boolean;
}

export function usePublicProviders() {
  return useQuery({
    queryKey: ["auth", "providers"],
    queryFn: ({ signal }) => api.get<PublicProviders>("/api/v1/auth/providers", signal),
    retry: false,
    staleTime: 60_000,
  });
}

export function useAuthProviderConfig(orgId: string) {
  return useQuery({
    queryKey: ["orgs", orgId, "auth-providers"],
    queryFn: ({ signal }) =>
      api.get<AuthProviderConfig>(orgPath(orgId, "/auth-providers"), signal),
  });
}

export function useUpdateAuthProviders(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AuthProviderConfig>) =>
      api.put<AuthProviderConfig>(orgPath(orgId, "/auth-providers"), patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["orgs", orgId, "auth-providers"] });
      toast.success("Sign-in providers updated");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
