"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { EmptyState, Skeleton } from "@elliptic/ui";
import { api, orgPath } from "@/lib/api";

interface ResolveResult {
  kind: "task" | "project" | "comment";
  project_id: string | null;
  task_id: string | null;
  note_id: string | null;
  meeting_id: string | null;
  comment_id: string | null;
  entity_type: string | null;
  archived: boolean;
}

export default function BrowsePage() {
  const { orgId, identifier } = useParams<{ orgId: string; identifier: string }>();
  const router = useRouter();

  const resolved = useQuery({
    queryKey: ["resolve", orgId, identifier],
    queryFn: ({ signal }) =>
      api.get<ResolveResult>(orgPath(orgId, `/resolve/${identifier}`), signal),
    retry: false,
  });

  useEffect(() => {
    const data = resolved.data;
    if (!data) return;
    const base = `/app/${orgId}`;
    if (data.kind === "project" && data.project_id) {
      router.replace(`${base}/projects/${data.project_id}`);
    } else if (data.kind === "task" && data.project_id && data.task_id) {
      router.replace(`${base}/projects/${data.project_id}?task=${data.task_id}`);
    } else if (data.kind === "comment") {
      const anchor = data.comment_id ? `comment=${data.comment_id}` : "";
      if (data.entity_type === "task" && data.project_id && data.task_id) {
        router.replace(`${base}/projects/${data.project_id}?task=${data.task_id}&${anchor}`);
      } else if (data.entity_type === "note" && data.note_id) {
        router.replace(`${base}/notes/${data.note_id}?${anchor}`);
      } else if (data.entity_type === "meeting" && data.meeting_id) {
        router.replace(`${base}/meetings/${data.meeting_id}?${anchor}`);
      }
    }
  }, [resolved.data, router, orgId]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-6 py-16">
      {resolved.isError ? (
        <EmptyState
          icon={<Search />}
          title="Not found"
          description={`Nothing matches “${identifier}”. Check the link and try again.`}
        />
      ) : (
        <>
          <p className="text-small text-muted-foreground">Opening {identifier}…</p>
          <Skeleton className="h-8 w-full rounded-md" />
        </>
      )}
    </div>
  );
}
