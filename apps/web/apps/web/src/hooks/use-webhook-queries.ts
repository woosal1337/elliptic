"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";
import type { Webhook, WebhookCatalog, WebhookCreated, WebhookTestResult } from "@/lib/types";
import { projectKeys } from "./use-project-queries";

export const webhookKeys = {
  all: (orgId: string, projectId: string) =>
    [...projectKeys.detail(orgId, projectId), "webhooks"] as const,
  catalog: (orgId: string, projectId: string) =>
    [...projectKeys.detail(orgId, projectId), "webhook-catalog"] as const,
};

interface WebhookInput {
  url: string;
  name?: string | null;
  events: string[];
  enabled: boolean;
}

export function useProjectWebhooks(orgId: string, projectId: string) {
  return useQuery({
    queryKey: webhookKeys.all(orgId, projectId),
    queryFn: ({ signal }) =>
      api.get<Webhook[]>(orgPath(orgId, `/projects/${projectId}/webhooks`), signal),
  });
}

export function useWebhookCatalog(orgId: string, projectId: string) {
  return useQuery({
    queryKey: webhookKeys.catalog(orgId, projectId),
    queryFn: ({ signal }) =>
      api.get<WebhookCatalog>(orgPath(orgId, `/projects/${projectId}/webhooks/catalog`), signal),
    staleTime: Infinity,
  });
}

export function useCreateWebhook(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WebhookInput) =>
      api.post<WebhookCreated>(orgPath(orgId, `/projects/${projectId}/webhooks`), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: webhookKeys.all(orgId, projectId) });
      toast.success("Webhook created");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useUpdateWebhook(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<WebhookInput> }) =>
      api.patch<Webhook>(orgPath(orgId, `/projects/${projectId}/webhooks/${id}`), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: webhookKeys.all(orgId, projectId) });
      toast.success("Webhook updated");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useDeleteWebhook(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<null>(orgPath(orgId, `/projects/${projectId}/webhooks/${id}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: webhookKeys.all(orgId, projectId) });
      toast.success("Webhook deleted");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useTestWebhook(orgId: string, projectId: string) {
  return useMutation({
    mutationFn: (id: string) =>
      api.post<WebhookTestResult>(orgPath(orgId, `/projects/${projectId}/webhooks/${id}/test`)),
    onSuccess: (result) => {
      toast.success(result.ok ? "Test event sent" : (result.detail ?? "Test failed"));
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}
