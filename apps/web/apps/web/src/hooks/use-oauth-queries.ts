"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage } from "@/lib/api";

export interface ConsentScope {
  scope: string;
  domain: string;
  label: string;
  elevated: boolean;
  baseline: boolean;
  requested: boolean;
}

export interface ConsentOrg {
  id: string;
  name: string;
  role: string;
}

export interface ConsentContext {
  request_id: string;
  client_name: string;
  client_unverified: boolean;
  orgs: ConsentOrg[];
  scopes: ConsentScope[];
  can_grant_all_orgs: boolean;
}

export interface DecisionResult {
  redirect_to: string;
}

export interface DecisionInput {
  request_id: string;
  decision: "allow" | "deny";
  org_id?: string;
  all_orgs?: boolean;
  scopes: string[];
}

export const oauthKeys = {
  consent: (requestId: string) => ["oauth", "consent", requestId] as const,
};

export function useConsentContext(requestId: string) {
  return useQuery({
    queryKey: oauthKeys.consent(requestId),
    queryFn: ({ signal }) =>
      api.get<ConsentContext>(
        `/api/v1/oauth/consent?request_id=${encodeURIComponent(requestId)}`,
        signal,
      ),
    enabled: requestId.length > 0,
    retry: false,
  });
}

export function useConsentDecision() {
  return useMutation({
    mutationFn: (input: DecisionInput) =>
      api.post<DecisionResult>("/api/v1/oauth/authorize/decision", input),
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export interface Grant {
  grant_id: string;
  client_name: string;
  org_id: string;
  org_name: string;
  scopes: string[];
  status: string;
  created_at: string;
}

export const grantKeys = {
  all: ["oauth", "grants"] as const,
};

export function useGrants() {
  return useQuery({
    queryKey: grantKeys.all,
    queryFn: ({ signal }) => api.get<Grant[]>("/api/v1/oauth/grants", signal),
  });
}

export function useRevokeGrant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (grantId: string) => api.delete<null>(`/api/v1/oauth/grants/${grantId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: grantKeys.all });
      toast.success("Access revoked");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}
