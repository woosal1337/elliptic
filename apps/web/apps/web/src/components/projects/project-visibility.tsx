"use client";

import { Globe, Lock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@elliptic/ui";
import type { Project } from "@/lib/types";
import { useUpdateProject } from "@/hooks/use-project-queries";

export function ProjectVisibility({
  orgId,
  project,
  canManage,
}: {
  orgId: string;
  project: Project;
  canManage: boolean;
}) {
  const updateProject = useUpdateProject(orgId, project.id);
  if (!canManage) return null;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-small font-semibold text-foreground">Visibility</h2>
        <p className="text-caption text-muted-foreground">
          Public projects appear in Browse and any workspace member can join. Private projects are
          invite-only.
        </p>
      </div>
      <Select
        value={project.network}
        onValueChange={(value) =>
          updateProject.mutate({ network: value as "private" | "public" })
        }
      >
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="private">
            <span className="flex items-center gap-2">
              <Lock className="size-3.5 text-muted-foreground" />
              Private — invite only
            </span>
          </SelectItem>
          <SelectItem value="public">
            <span className="flex items-center gap-2">
              <Globe className="size-3.5 text-muted-foreground" />
              Public — anyone can join
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </section>
  );
}
