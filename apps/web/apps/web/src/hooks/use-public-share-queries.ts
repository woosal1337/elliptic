"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { shareApiPath } from "@/lib/share";
import type { PublicMeetingShare } from "@/lib/types";

export function usePublicMeetingShare(token: string) {
  return useQuery({
    queryKey: ["share", "meetings", token] as const,
    queryFn: ({ signal }) => api.get<PublicMeetingShare>(shareApiPath(token), signal),
    enabled: token.length > 0,
    retry: false,
  });
}
