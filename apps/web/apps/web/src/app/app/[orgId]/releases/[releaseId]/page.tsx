"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Badge,
  Button,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@elliptic/ui";
import { formatDate } from "@/lib/format";
import { useRelease, useReleaseTasks, useUpdateRelease } from "@/hooks/use-release-queries";
import { StatusDot } from "@/components/tasks/task-bits";
import { ChangelogManager } from "@/components/releases/changelog-manager";
import { ErrorState } from "@/components/error-state";

export default function ReleaseDetailPage() {
  const { orgId, releaseId } = useParams<{ orgId: string; releaseId: string }>();
  const release = useRelease(orgId, releaseId);
  const tasks = useReleaseTasks(orgId, releaseId);
  const updateRelease = useUpdateRelease(orgId);
  const [changelog, setChangelog] = useState("");

  useEffect(() => {
    if (release.data) setChangelog(release.data.changelog ?? "");
  }, [release.data?.changelog]); // eslint-disable-line react-hooks/exhaustive-deps

  if (release.isPending) {
    return <Skeleton className="m-6 h-64 rounded-xl" />;
  }
  if (release.isError || !release.data) {
    return (
      <div className="p-6">
        <ErrorState error={release.error} onRetry={() => void release.refetch()} />
      </div>
    );
  }

  const data = release.data;
  const total = data.task_total || 1;
  const pct = Math.round((data.task_done / total) * 100);
  const taskRows = tasks.data ?? [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href={`/app/${orgId}/releases`}>
          <ArrowLeft className="size-4" />
          Releases
        </Link>
      </Button>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-h3 font-semibold text-foreground">{data.name}</h1>
          {data.version ? (
            <Badge variant="outline" className="font-mono">
              {data.version}
            </Badge>
          ) : null}
          <Badge variant={data.status === "released" ? "success" : "neutral"}>{data.status}</Badge>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scope">Scope ({data.task_total})</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-4">
          <div className="flex items-center gap-3 text-caption text-muted-foreground">
            <span className="tabular">
              {data.task_done}/{data.task_total} done · {pct}%
            </span>
            {data.released_at ? <span>Release date {formatDate(data.released_at)}</span> : null}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-success" style={{ width: `${pct}%` }} aria-hidden />
          </div>
          <p className="whitespace-pre-wrap text-small text-foreground">
            {data.description ?? "No description."}
          </p>
        </TabsContent>

        <TabsContent value="scope">
          {tasks.isPending ? (
            <Skeleton className="h-32 w-full rounded-lg" />
          ) : taskRows.length === 0 ? (
            <p className="text-small text-muted-foreground">
              No work items tagged into this release yet. Set the Release field on a task to add it.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {taskRows.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-small"
                >
                  <StatusDot status={task.status} />
                  <span className="shrink-0 font-mono text-caption text-muted-foreground">
                    {task.identifier}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-foreground">{task.title}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="changelog" className="flex flex-col gap-3">
          <ChangelogManager orgId={orgId} releaseId={releaseId} />
          <Textarea
            rows={8}
            value={changelog}
            onChange={(event) => setChangelog(event.target.value)}
            placeholder="Additional notes / summary (Markdown)"
          />
          <Button
            className="self-start"
            loading={updateRelease.isPending}
            disabled={changelog === (data.changelog ?? "")}
            onClick={() => updateRelease.mutate({ releaseId, changelog })}
          >
            Save changelog
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
