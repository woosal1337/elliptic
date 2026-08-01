"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";
import { markOptimistic, tempId } from "@/lib/optimistic";
import type { Event, EventScope, MeetingBrief } from "@/lib/types";

export const eventKeys = {
  all: (orgId: string) => ["orgs", orgId, "events"] as const,
  list: (orgId: string, fromISO: string, toISO: string, scope: EventScope | "all") =>
    [...eventKeys.all(orgId), "list", fromISO, toISO, scope] as const,
  detail: (orgId: string, eventId: string) => [...eventKeys.all(orgId), eventId] as const,
  brief: (orgId: string, eventId: string) =>
    [...eventKeys.detail(orgId, eventId), "brief"] as const,
};

export function useMeetingBrief(orgId: string, eventId: string, enabled = true) {
  return useQuery({
    queryKey: eventKeys.brief(orgId, eventId),
    queryFn: ({ signal }) =>
      api.get<MeetingBrief>(orgPath(orgId, `/events/${eventId}/brief`), signal),
    enabled: enabled && eventId.length > 0,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export interface CreateEventInput {
  title: string;
  description?: string | null;
  location?: string | null;
  starts_at: string;
  ends_at: string;
  all_day?: boolean;
  visibility: EventScope;
  meeting_id?: string | null;
}

export interface UpdateEventInput {
  title?: string;
  description?: string | null;
  location?: string | null;
  starts_at?: string;
  ends_at?: string;
  all_day?: boolean;
  visibility?: EventScope;
  meeting_id?: string | null;
}

interface EventSnapshots {
  snapshots: Array<{ queryKey: readonly unknown[]; previous: Event[] | undefined }>;
}

async function snapshotEventLists(
  queryClient: QueryClient,
  orgId: string
): Promise<EventSnapshots> {
  const listFilter = { queryKey: eventKeys.all(orgId) } as const;
  await queryClient.cancelQueries(listFilter);
  const entries = queryClient.getQueriesData<Event[]>(listFilter);
  const snapshots = entries
    .filter(([key]) => Array.isArray(key) && key.includes("list"))
    .map(([queryKey, previous]) => ({ queryKey, previous }));
  return { snapshots };
}

function rollbackEventLists(queryClient: QueryClient, context: EventSnapshots | undefined) {
  for (const snapshot of context?.snapshots ?? []) {
    queryClient.setQueryData(snapshot.queryKey, snapshot.previous);
  }
}

function eventInRange(event: Event, key: readonly unknown[]): boolean {
  const fromISO = key[4];
  const toISO = key[5];
  const scope = key[6];
  if (typeof fromISO !== "string" || typeof toISO !== "string") return true;
  if (scope !== "all" && scope !== event.scope) return false;
  const starts = new Date(event.starts_at).getTime();
  return starts >= new Date(fromISO).getTime() && starts < new Date(toISO).getTime();
}

function applyEventPatch(event: Event, input: UpdateEventInput): Event {
  const next: Event = { ...event };
  if (input.title !== undefined) next.title = input.title;
  if (input.description !== undefined) next.description = input.description;
  if (input.location !== undefined) next.location = input.location;
  if (input.starts_at !== undefined) next.starts_at = input.starts_at;
  if (input.ends_at !== undefined) next.ends_at = input.ends_at;
  if (input.all_day !== undefined) next.all_day = input.all_day;
  if (input.visibility !== undefined) next.scope = input.visibility;
  if (input.meeting_id !== undefined) next.meeting_id = input.meeting_id;
  return next;
}

export function useEvents(
  orgId: string,
  fromISO: string,
  toISO: string,
  scope: EventScope | "all"
) {
  return useQuery({
    queryKey: eventKeys.list(orgId, fromISO, toISO, scope),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ from: fromISO, to: toISO, scope });
      return api.get<Event[]>(orgPath(orgId, `/events?${params.toString()}`), signal);
    },
  });
}

export function useCreateEvent(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) => api.post<Event>(orgPath(orgId, "/events"), input),
    onMutate: async (input) => {
      const context = await snapshotEventLists(queryClient, orgId);
      const now = new Date().toISOString();
      const draft: Event = markOptimistic({
        id: tempId(),
        org_id: orgId,
        owner_id: null,
        scope: input.visibility,
        title: input.title,
        description: input.description ?? null,
        location: input.location ?? null,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        all_day: input.all_day ?? false,
        meeting_id: input.meeting_id ?? null,
        created_by: "",
        created_at: now,
        updated_at: now,
      });
      for (const snapshot of context.snapshots) {
        if (!eventInRange(draft, snapshot.queryKey)) continue;
        queryClient.setQueryData(snapshot.queryKey, [...(snapshot.previous ?? []), draft]);
      }
      return context;
    },
    onError: (error, _input, context) => {
      rollbackEventLists(queryClient, context);
      toast.error(errorMessage(error));
    },
    onSuccess: (event) => {
      toast.success(`Created ${event.title}`);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all(orgId) });
    },
  });
}

export function useUpdateEvent(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { eventId: string } & UpdateEventInput) => {
      const { eventId, ...rest } = input;
      return api.patch<Event>(orgPath(orgId, `/events/${eventId}`), rest);
    },
    onMutate: async (input) => {
      const context = await snapshotEventLists(queryClient, orgId);
      const { eventId, ...rest } = input;
      for (const snapshot of context.snapshots) {
        queryClient.setQueryData(
          snapshot.queryKey,
          (snapshot.previous ?? []).map((event) =>
            event.id === eventId ? applyEventPatch(event, rest) : event
          )
        );
      }
      const detail = queryClient.getQueryData<Event>(eventKeys.detail(orgId, eventId));
      if (detail) {
        queryClient.setQueryData(eventKeys.detail(orgId, eventId), applyEventPatch(detail, rest));
      }
      return context;
    },
    onError: (error, _input, context) => {
      rollbackEventLists(queryClient, context);
      toast.error(errorMessage(error));
    },
    onSuccess: (event) => {
      queryClient.setQueryData(eventKeys.detail(orgId, event.id), event);
      toast.success(`Updated ${event.title}`);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all(orgId) });
    },
  });
}

export function useDeleteEvent(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => api.delete<null>(orgPath(orgId, `/events/${eventId}`)),
    onMutate: async (eventId) => {
      const context = await snapshotEventLists(queryClient, orgId);
      for (const snapshot of context.snapshots) {
        queryClient.setQueryData(
          snapshot.queryKey,
          (snapshot.previous ?? []).filter((event) => event.id !== eventId)
        );
      }
      return context;
    },
    onError: (error, _eventId, context) => {
      rollbackEventLists(queryClient, context);
      toast.error(errorMessage(error));
    },
    onSuccess: () => {
      toast.success("Event deleted");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all(orgId) });
    },
  });
}
