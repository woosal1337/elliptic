"use client";

import { FolderOpen } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  Switch,
} from "@elliptic/ui";
import type { Project } from "@/lib/types";
import {
  useProjects,
  useProjectSubscription,
  useSetProjectSubscription,
} from "@/hooks/use-project-queries";
import { ErrorState } from "@/components/error-state";

function ProjectNotificationRow({ orgId, project }: { orgId: string; project: Project }) {
  const subscription = useProjectSubscription(orgId, project.id);
  const setSubscription = useSetProjectSubscription(orgId, project.id);

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5 shadow-xs">
      <div className="flex min-w-0 items-center gap-3">
        <Badge variant="outline" className="font-mono">
          {project.key}
        </Badge>
        <span className="truncate text-small font-medium text-foreground">{project.name}</span>
      </div>
      {subscription.isPending ? (
        <Skeleton className="h-[1.15rem] w-[2rem] rounded-full" />
      ) : (
        <Switch
          checked={subscription.data?.subscribed ?? false}
          disabled={subscription.isError || setSubscription.isPending}
          onCheckedChange={(checked) => setSubscription.mutate(checked)}
          aria-label={`Notifications for ${project.name}`}
        />
      )}
    </div>
  );
}

export function ProjectNotifications({ orgId }: { orgId: string }) {
  const projects = useProjects(orgId);
  const active = projects.data?.filter((project) => project.status === "active");

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>Project notifications</CardTitle>
        <CardDescription>
          Being a member of an organization does not subscribe you to a project&apos;s updates.
          Opt in to the streams you want to follow.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-5">
        {projects.isPending ? (
          <>
            <Skeleton className="h-13 w-full" />
            <Skeleton className="h-13 w-full" />
          </>
        ) : projects.isError ? (
          <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
        ) : !active || active.length === 0 ? (
          <EmptyState
            icon={<FolderOpen />}
            title="No projects"
            description="Create a project to start receiving its updates."
          />
        ) : (
          active.map((project) => (
            <ProjectNotificationRow key={project.id} orgId={orgId} project={project} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
