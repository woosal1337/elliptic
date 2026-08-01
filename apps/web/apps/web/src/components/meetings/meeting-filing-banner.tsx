"use client";

import { useState } from "react";
import { useProjects } from "@/hooks/use-project-queries";
import { useSetMeetingProject, useSuggestMeetingProject } from "@/hooks/use-meeting-queries";
import { FilingSuggestion } from "@/components/ai/filing-suggestion";
import type { Meeting } from "@/lib/types";

const DISMISS_KEY = "elliptic:meeting-filing-dismissed";

function dismissedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function persistDismissed(meetingId: string) {
  if (typeof window === "undefined") return;
  const next = dismissedSet();
  next.add(meetingId);
  window.localStorage.setItem(DISMISS_KEY, JSON.stringify([...next]));
}

export function MeetingFilingBanner({ orgId, meeting }: { orgId: string; meeting: Meeting }) {
  const [dismissed, setDismissed] = useState(() => dismissedSet().has(meeting.id));
  const suggestion = useSuggestMeetingProject(orgId, meeting.id);
  const projects = useProjects(orgId);
  const setProject = useSetMeetingProject(orgId, meeting.id);

  if (meeting.project_id !== null || dismissed) return null;
  if (suggestion.isPending || projects.isPending) return null;

  return (
    <FilingSuggestion
      suggestion={suggestion.data ?? null}
      projects={(projects.data ?? []).filter((project) => project.status === "active")}
      isPending={setProject.isPending}
      onFile={(projectId) =>
        setProject.mutate(projectId, {
          onSuccess: () => {
            persistDismissed(meeting.id);
            setDismissed(true);
          },
        })
      }
      onDismiss={() => {
        persistDismissed(meeting.id);
        setDismissed(true);
      }}
    />
  );
}
