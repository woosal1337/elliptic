"use client";

import { useEffect, useState } from "react";
import { Button, Input } from "@elliptic/ui";
import type { Project } from "@/lib/types";
import { useUpdateProject } from "@/hooks/use-project-queries";

export function ProjectEstimateSettings({
  orgId,
  project,
  canManage,
}: {
  orgId: string;
  project: Project;
  canManage: boolean;
}) {
  const updateProject = useUpdateProject(orgId, project.id);
  const [value, setValue] = useState(project.estimate_scale.join(", "));
  useEffect(() => setValue(project.estimate_scale.join(", ")), [project.estimate_scale]);

  const save = () => {
    const scale = value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    updateProject.mutate({ estimate_scale: scale });
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-small font-semibold text-foreground">Estimates</h2>
        <p className="text-caption text-muted-foreground">
          Sizing scale (comma-separated), e.g. 1, 2, 3, 5, 8 or XS, S, M, L, XL.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="1, 2, 3, 5, 8"
          aria-label="Estimate scale"
          disabled={!canManage}
        />
        {canManage ? (
          <Button size="sm" onClick={save} loading={updateProject.isPending}>
            Save
          </Button>
        ) : null}
      </div>
    </section>
  );
}
