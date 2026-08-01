"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface OrgDomain {
  id: string;
  domain: string;
  status: "pending" | "verified";
  txt_name: string;
  txt_record: string;
  verified_at: string | null;
}

const key = (orgId: string) => ["orgs", orgId, "domains"] as const;

export function useDomains(orgId: string) {
  return useQuery({
    queryKey: key(orgId),
    queryFn: ({ signal }) => api.get<OrgDomain[]>(orgPath(orgId, "/domains"), signal),
  });
}

export function useAddDomain(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (domain: string) => api.post<OrgDomain>(orgPath(orgId, "/domains"), { domain }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useVerifyDomain(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (domainId: string) =>
      api.post<OrgDomain>(orgPath(orgId, `/domains/${domainId}/verify`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId) });
      toast.success("Domain verified");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteDomain(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (domainId: string) => api.delete<null>(orgPath(orgId, `/domains/${domainId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId) });
      toast.success("Domain removed");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
