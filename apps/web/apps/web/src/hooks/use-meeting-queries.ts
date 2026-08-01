"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";
import type {
  Meeting,
  MeetingChatResult,
  MeetingShare,
  MeetingSummary,
  OrgMeetingChatResult,
  Page,
  RouteSuggestion,
  TranscriptChapter,
  TranscriptSegment,
} from "@/lib/types";

export const meetingKeys = {
  all: (orgId: string) => ["orgs", orgId, "meetings"] as const,
  list: (orgId: string, projectId?: string) =>
    [...meetingKeys.all(orgId), "list", projectId ?? "org"] as const,
  detail: (orgId: string, meetingId: string) => [...meetingKeys.all(orgId), meetingId] as const,
  transcript: (orgId: string, meetingId: string) =>
    [...meetingKeys.detail(orgId, meetingId), "transcript"] as const,
  summaries: (orgId: string, meetingId: string) =>
    [...meetingKeys.detail(orgId, meetingId), "summaries"] as const,
};

export function useMeetings(orgId: string, projectId?: string) {
  return useQuery({
    queryKey: meetingKeys.list(orgId, projectId),
    queryFn: async ({ signal }) => {
      const page = await api.get<Page<Meeting>>(orgPath(orgId, "/meetings"), signal);
      if (projectId) {
        return page.items.filter((meeting) => meeting.project_id === projectId);
      }
      return page.items;
    },
  });
}

export function useMeeting(orgId: string, meetingId: string) {
  return useQuery({
    queryKey: meetingKeys.detail(orgId, meetingId),
    queryFn: ({ signal }) => api.get<Meeting>(orgPath(orgId, `/meetings/${meetingId}`), signal),
  });
}

export function useTranscript(orgId: string, meetingId: string) {
  return useQuery({
    queryKey: meetingKeys.transcript(orgId, meetingId),
    queryFn: async ({ signal }) => {
      const page = await api.get<Page<TranscriptSegment>>(
        orgPath(orgId, `/meetings/${meetingId}/segments`),
        signal
      );
      return page.items;
    },
  });
}

export function useSummaries(orgId: string, meetingId: string) {
  return useQuery({
    queryKey: meetingKeys.summaries(orgId, meetingId),
    queryFn: ({ signal }) =>
      api.get<MeetingSummary[]>(orgPath(orgId, `/meetings/${meetingId}/summaries`), signal),
  });
}

export interface SummarizeInput {
  template_id?: string;
  preserve_human?: boolean;
}

export function useSummarizeMeeting(orgId: string, meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input?: SummarizeInput) =>
      api.post<MeetingSummary>(orgPath(orgId, `/meetings/${meetingId}/summarize`), input ?? {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.summaries(orgId, meetingId) });
      toast.success("Summary generated");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export interface MeetingUpdateInput {
  title?: string;
  raw_markdown?: string | null;
}

export function useUpdateMeeting(orgId: string, meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MeetingUpdateInput) =>
      api.patch<Meeting>(orgPath(orgId, `/meetings/${meetingId}`), input),
    onSuccess: (meeting) => {
      queryClient.setQueryData(meetingKeys.detail(orgId, meetingId), meeting);
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all(orgId) });
      toast.success("Saved");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useImportMeeting(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => api.post<Meeting>(orgPath(orgId, "/meetings/import"), payload),
    onSuccess: (meeting) => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all(orgId) });
      toast.success(`Imported ${meeting.title}`);
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useSendMeetingChat(orgId: string, meetingId: string) {
  return useMutation({
    mutationFn: (messages: { role: "user" | "assistant"; content: string }[]) =>
      api.post<MeetingChatResult>(orgPath(orgId, `/meetings/${meetingId}/chat`), { messages }),
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useMeetingChapters(orgId: string, meetingId: string) {
  return useQuery({
    queryKey: [...meetingKeys.detail(orgId, meetingId), "chapters"] as const,
    queryFn: ({ signal }) =>
      api.get<TranscriptChapter[]>(orgPath(orgId, `/meetings/${meetingId}/chapters`), signal),
    enabled: meetingId.length > 0,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export interface OrgChatScope {
  project_id?: string;
  from?: string;
  to?: string;
  pinned?: string[];
}

export function useSendOrgMeetingChat(orgId: string) {
  return useMutation({
    mutationFn: (input: {
      messages: { role: "user" | "assistant"; content: string }[];
      scope?: OrgChatScope;
    }) => api.post<OrgMeetingChatResult>(orgPath(orgId, "/meetings/chat"), input),
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useMeetingShare(orgId: string, meetingId: string) {
  return useQuery({
    queryKey: [...meetingKeys.detail(orgId, meetingId), "share"] as const,
    queryFn: ({ signal }) =>
      api.get<MeetingShare | null>(orgPath(orgId, `/meetings/${meetingId}/share`), signal),
    enabled: meetingId.length > 0,
    retry: false,
  });
}

export function useCreateMeetingShare(orgId: string, meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { include_transcript: boolean }) =>
      api.post<MeetingShare>(orgPath(orgId, `/meetings/${meetingId}/share`), input),
    onSuccess: (share) => {
      queryClient.setQueryData([...meetingKeys.detail(orgId, meetingId), "share"], share);
      toast.success("Share link created");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateMeetingShare(orgId: string, meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { include_transcript?: boolean; revoked?: boolean }) =>
      api.patch<MeetingShare>(orgPath(orgId, `/meetings/${meetingId}/share`), input),
    onSuccess: (share) => {
      queryClient.setQueryData([...meetingKeys.detail(orgId, meetingId), "share"], share);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useCreateMeeting(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string }) =>
      api.post<Meeting>(orgPath(orgId, "/meetings"), {
        title: input.title,
        source: "manual",
        started_at: new Date().toISOString(),
      }),
    onSuccess: (meeting) => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all(orgId) });
      toast.success(`Created ${meeting.title}`);
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useSuggestMeetingProject(orgId: string, meetingId: string) {
  return useQuery({
    queryKey: [...meetingKeys.detail(orgId, meetingId), "suggest-project"] as const,
    queryFn: ({ signal }) =>
      api.get<RouteSuggestion>(orgPath(orgId, `/meetings/${meetingId}/suggest-project`), signal),
    enabled: meetingId.length > 0,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useSetMeetingProject(orgId: string, meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      api.patch<Meeting>(orgPath(orgId, `/meetings/${meetingId}`), { project_id: projectId }),
    onSuccess: (meeting) => {
      queryClient.setQueryData(meetingKeys.detail(orgId, meetingId), meeting);
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all(orgId) });
      toast.success("Meeting filed");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}
