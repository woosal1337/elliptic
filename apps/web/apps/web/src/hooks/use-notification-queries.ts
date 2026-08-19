"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { ApiError, api, errorMessage, orgPath } from "@/lib/api";

export type NotificationStatus = "unread" | "all" | "archived";

export type NotificationEntityType = "task" | "project" | "meeting" | "note";

export interface Notification {
  id: string;
  org_id: string;
  type: string;
  entity_type: NotificationEntityType | string;
  /** Null for a notification that names no single record, such as an invite. */
  entity_id: string | null;
  /** The project that holds the task. Set only when entity_type is "task". */
  project_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  title: string;
  snippet: string | null;
  read_at: string | null;
  archived_at: string | null;
  snoozed_until: string | null;
  created_at: string;
}

export interface NotificationList {
  items: Notification[];
  unread_count: number;
}

const UNREAD_COUNT_POLL_MS = 30_000;
const DEFAULT_LIMIT = 50;

export const notificationKeys = {
  all: (orgId: string) => ["orgs", orgId, "notifications"] as const,
  list: (orgId: string, status: NotificationStatus) =>
    [...notificationKeys.all(orgId), "list", status] as const,
  unreadCount: (orgId: string) =>
    [...notificationKeys.all(orgId), "unread-count"] as const,
};

function isMissingEndpoint(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function useNotifications(
  orgId: string,
  status: NotificationStatus,
  enabled = true
) {
  return useQuery({
    queryKey: notificationKeys.list(orgId, status),
    enabled,
    queryFn: async ({ signal }) => {
      try {
        return await api.get<NotificationList>(
          orgPath(orgId, `/notifications?status=${status}&limit=${DEFAULT_LIMIT}`),
          signal
        );
      } catch (error) {
        if (isMissingEndpoint(error)) {
          return { items: [], unread_count: 0 } satisfies NotificationList;
        }
        throw error;
      }
    },
  });
}

export function useUnreadCount(orgId: string) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(orgId),
    refetchInterval: UNREAD_COUNT_POLL_MS,
    refetchIntervalInBackground: false,
    queryFn: async ({ signal }) => {
      try {
        const data = await api.get<{ count: number }>(
          orgPath(orgId, "/notifications/unread-count"),
          signal
        );
        return data.count;
      } catch (error) {
        if (isMissingEndpoint(error)) {
          return 0;
        }
        throw error;
      }
    },
  });
}

function invalidateNotifications(queryClient: QueryClient, orgId: string): void {
  void queryClient.invalidateQueries({ queryKey: notificationKeys.all(orgId) });
}

export function useMarkNotificationRead(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      api.post<Notification>(
        orgPath(orgId, `/notifications/${notificationId}/read`)
      ),
    onSettled: () => invalidateNotifications(queryClient, orgId),
  });
}

export function useMarkAllNotificationsRead(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<null>(orgPath(orgId, "/notifications/read-all")),
    onSuccess: () => {
      toast.success("All caught up", { duration: 1500 });
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
    onSettled: () => invalidateNotifications(queryClient, orgId),
  });
}

export function useArchiveNotification(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      api.post<Notification>(
        orgPath(orgId, `/notifications/${notificationId}/archive`)
      ),
    onSuccess: () => {
      toast.success("Archived", { duration: 1500 });
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
    onSettled: () => invalidateNotifications(queryClient, orgId),
  });
}

export function useSnoozeNotification(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, until }: { id: string; until: string }) =>
      api.post<Notification>(orgPath(orgId, `/notifications/${id}/snooze`), {
        until,
      }),
    onSuccess: () => {
      toast.success("Snoozed", { duration: 1500 });
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
    onSettled: () => invalidateNotifications(queryClient, orgId),
  });
}

export interface CatchUpGroup {
  entity_type: string;
  entity_id: string | null;
  title: string;
  count: number;
  latest_at: string;
}

export interface CatchUp {
  total_unread: number;
  by_type: Record<string, number>;
  groups: CatchUpGroup[];
}

export function useCatchUp(orgId: string) {
  return useQuery({
    queryKey: ["orgs", orgId, "notifications", "catch-up"] as const,
    queryFn: ({ signal }) =>
      api.get<CatchUp>(orgPath(orgId, "/notifications/catch-up"), signal),
  });
}

export function useCatchUpMarkSeen(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { entity_type: string; entity_id?: string | null }) =>
      api.post<{ marked: number }>(orgPath(orgId, "/notifications/catch-up/mark-seen"), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["orgs", orgId, "notifications", "catch-up"],
      });
      void queryClient.invalidateQueries({ queryKey: ["orgs", orgId, "notifications"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export interface CatchUpSummary {
  summary: string;
  event_count: number;
}

export function useCatchUpSummary(orgId: string) {
  return useMutation({
    mutationFn: (projectId: string) =>
      api.get<CatchUpSummary>(
        orgPath(orgId, `/notifications/catch-up/summary?project_id=${projectId}`)
      ),
    onError: (error) => toast.error(errorMessage(error)),
  });
}
