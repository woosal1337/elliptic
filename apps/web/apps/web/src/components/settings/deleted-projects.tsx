"use client";

import { ArchiveRestore, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
} from "@elliptic/ui";
import { relativeTime } from "@/lib/format";
import { useDeletedProjects, useRestoreProject } from "@/hooks/use-project-queries";
import { ErrorState } from "@/components/error-state";

export function DeletedProjects({ orgId }: { orgId: string }) {
  const deleted = useDeletedProjects(orgId);
  const restore = useRestoreProject(orgId);

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>Deleted projects</CardTitle>
        <CardDescription>
          Restore a soft-deleted project within 30 days. After that, it is permanently removed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-5">
        {deleted.isPending ? (
          <>
            <Skeleton className="h-13 w-full" />
            <Skeleton className="h-13 w-full" />
          </>
        ) : deleted.isError ? (
          <ErrorState error={deleted.error} onRetry={() => void deleted.refetch()} />
        ) : deleted.data.length === 0 ? (
          <EmptyState
            icon={<Trash2 />}
            title="No deleted projects"
            description="Projects you delete show up here for 30 days."
          />
        ) : (
          deleted.data.map((project) => {
            const when = project.deleted_at ? relativeTime(project.deleted_at) : null;
            return (
              <div
                key={project.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5 shadow-xs"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Badge variant="outline" className="font-mono">
                    {project.key}
                  </Badge>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-small font-medium text-foreground">
                      {project.name}
                    </span>
                    {when ? (
                      <span className="truncate text-caption text-muted-foreground" title={when.title}>
                        Deleted {when.relative}
                      </span>
                    ) : null}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={restore.isPending && restore.variables === project.id}
                  onClick={() => restore.mutate(project.id)}
                >
                  <ArchiveRestore className="size-4" />
                  Restore
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
