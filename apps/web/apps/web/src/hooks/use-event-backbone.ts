"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface OrgWebhookEndpoint {
  id: string;
  url: string;
  event_types: string[];
  enabled: boolean;
  created_at: string;
}

export interface OutboxEvent {
  id: string;
  entity_type: string;
  entity_id: string | null;
  event_type: string;
  initiator_type: string;
  delivered_at: string | null;
  delivery_error: string | null;
  attempts: number;
  failed: boolean;
  next_attempt_at: string | null;
  created_at: string;
}

const hooksKey = (orgId: string) => ["orgs", orgId, "org-webhooks"] as const;
const eventsKey = (orgId: string) => ["orgs", orgId, "outbox-events"] as const;

export function useOrgWebhooks(orgId: string) {
  return useQuery({
    queryKey: hooksKey(orgId),
    queryFn: ({ signal }) => api.get<OrgWebhookEndpoint[]>(orgPath(orgId, "/webhooks"), signal),
  });
}

export function useOutboxEvents(orgId: string) {
  return useQuery({
    queryKey: eventsKey(orgId),
    queryFn: ({ signal }) => api.get<OutboxEvent[]>(orgPath(orgId, "/webhooks/events"), signal),
  });
}

export function useCreateOrgWebhook(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { url: string; event_types: string[] }) =>
      api.post<OrgWebhookEndpoint>(orgPath(orgId, "/webhooks"), input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: hooksKey(orgId) }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useDeleteOrgWebhook(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(orgPath(orgId, `/webhooks/${id}`)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: hooksKey(orgId) }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useRetryEvent(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) =>
      api.post<OutboxEvent>(orgPath(orgId, `/webhooks/events/${eventId}/retry`)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["orgs", orgId, "outbox-events"] });
      toast.success("Event requeued");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useDispatchEvents(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ delivered: number }>(orgPath(orgId, "/webhooks/events/dispatch")),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: eventsKey(orgId) });
      toast.success(`Dispatched ${result.delivered} event${result.delivered === 1 ? "" : "s"}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
