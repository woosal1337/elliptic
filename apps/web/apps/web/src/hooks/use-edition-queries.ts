"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface PlanOption {
  plan: string;
  label: string;
  seat_limit: number;
  ai_credits_per_seat: number;
}

export interface Edition {
  plan: string;
  label: string;
  seat_limit: number;
  billable_seats: number;
  bot_users: number;
  over_seat_limit: boolean;
  seats_remaining: number;
  ai_credits_per_seat: number;
  features: string[];
  available_plans: PlanOption[];
}

const key = (orgId: string) => ["orgs", orgId, "edition"] as const;

export function useEdition(orgId: string) {
  return useQuery({
    queryKey: key(orgId),
    queryFn: ({ signal }) => api.get<Edition>(orgPath(orgId, "/billing/edition"), signal),
  });
}

export function useSetPlan(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: string) => api.put<Edition>(orgPath(orgId, "/billing/plan"), { plan }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(orgId) });
      toast.success("Plan updated");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
