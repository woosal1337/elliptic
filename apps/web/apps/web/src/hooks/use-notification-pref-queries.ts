"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface NotificationPrefs {
  project_id: string | null;
  notify_property_change: boolean;
  notify_state_change: boolean;
  notify_completed: boolean;
  notify_comments: boolean;
  notify_mentions: boolean;
}

export type NotificationPrefField = Exclude<keyof NotificationPrefs, "project_id">;

const prefsKey = (orgId: string) => ["orgs", orgId, "notification-prefs"] as const;

export function useNotificationPrefs(orgId: string) {
  return useQuery({
    queryKey: prefsKey(orgId),
    queryFn: ({ signal }) =>
      api.get<NotificationPrefs[]>(orgPath(orgId, "/notifications/preferences"), signal),
  });
}

export function useSetNotificationPrefs(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<NotificationPrefs> & { project_id?: string | null }) =>
      api.put<NotificationPrefs>(orgPath(orgId, "/notifications/preferences"), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: prefsKey(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
