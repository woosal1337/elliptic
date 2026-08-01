"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface SlackConnection {
  connected: boolean;
  team_name: string | null;
}

export interface SlackChannel {
  id: string;
  name: string;
}

export const integrationKeys = {
  slack: (orgId: string) => ["orgs", orgId, "integrations", "slack"] as const,
  slackChannels: (orgId: string) => ["orgs", orgId, "integrations", "slack", "channels"] as const,
};

export function useSlackConnection(orgId: string) {
  return useQuery({
    queryKey: integrationKeys.slack(orgId),
    queryFn: ({ signal }) => api.get<SlackConnection>(orgPath(orgId, "/integrations/slack"), signal),
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useSlackChannels(orgId: string, enabled: boolean) {
  return useQuery({
    queryKey: integrationKeys.slackChannels(orgId),
    queryFn: ({ signal }) =>
      api.get<SlackChannel[]>(orgPath(orgId, "/integrations/slack/channels"), signal),
    enabled,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useSendMeetingToSlack(orgId: string, meetingId: string) {
  return useMutation({
    mutationFn: (input: { channel_id: string }) =>
      api.post<{ ok: boolean }>(orgPath(orgId, `/meetings/${meetingId}/slack`), input),
    onSuccess: () => toast.success("Posted to Slack"),
    onError: (error) => toast.error(errorMessage(error)),
  });
}
