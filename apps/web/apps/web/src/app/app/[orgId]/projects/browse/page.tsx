"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Compass, Globe, Users } from "lucide-react";
import { Badge, Button, Card, EmptyState, Skeleton } from "@elliptic/ui";
import { useBrowseProjects, useJoinProject } from "@/hooks/use-project-queries";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/error-state";

export default function BrowseProjectsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const browse = useBrowseProjects(orgId);
  const joinProject = useJoinProject(orgId);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
      <PageHeader
        eyebrow="Discover"
        title="Browse projects"
        description="Public projects anyone in the workspace can join."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={`/app/${orgId}/projects`}>All projects</Link>
          </Button>
        }
      />
      {browse.isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : browse.isError ? (
        <ErrorState error={browse.error} onRetry={() => void browse.refetch()} />
      ) : browse.data.length === 0 ? (
        <EmptyState
          illustration={<Compass className="size-10 text-muted-foreground" />}
          title="No public projects yet"
          description="When a project's visibility is set to Public, it shows up here for anyone in the workspace to join."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {browse.data.map((project) => (
            <Card key={project.id} className="flex h-full flex-col p-5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="font-mono text-caption">
                  {project.key}
                </Badge>
                <Badge variant="neutral" className="gap-1">
                  <Globe className="size-3" />
                  Public
                </Badge>
              </div>
              <h3 className="mt-3 text-h4 font-semibold tracking-[-0.01em] text-foreground">
                {project.name}
              </h3>
              <p className="mt-1 line-clamp-2 flex-1 text-small text-muted-foreground">
                {project.description ?? "No description"}
              </p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
                  <Users className="size-3.5" />
                  {project.member_count} {project.member_count === 1 ? "member" : "members"}
                </span>
                {project.is_member ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/app/${orgId}/projects/${project.id}`}>
                      <Check className="size-4" />
                      Joined
                    </Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={joinProject.isPending}
                    onClick={() => joinProject.mutate(project.id)}
                  >
                    Join
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
