"use client";

import { useEffect, useState } from "react";
import { Button, Input } from "@elliptic/ui";
import type { Project } from "@/lib/types";
import { useUpdateProject } from "@/hooks/use-project-queries";

export function ProjectIdentitySettings({
  orgId,
  project,
  canManage,
}: {
  orgId: string;
  project: Project;
  canManage: boolean;
}) {
  const updateProject = useUpdateProject(orgId, project.id);
  const [icon, setIcon] = useState(project.icon ?? "");
  const [labels, setLabels] = useState(project.labels.join(", "));
  useEffect(() => setIcon(project.icon ?? ""), [project.icon]);
  useEffect(() => setLabels(project.labels.join(", ")), [project.labels]);

  const save = () => {
    const parsedLabels = labels
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    updateProject.mutate({ icon: icon.trim(), labels: parsedLabels });
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-small font-semibold text-foreground">Identity</h2>
        <p className="text-caption text-muted-foreground">
          An emoji icon and category labels for this project.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-caption text-muted-foreground">Icon</span>
          <Input
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
            placeholder="🚀"
            aria-label="Project icon"
            maxLength={8}
            disabled={!canManage}
            className="w-20 text-center text-lg"
          />
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <span className="text-caption text-muted-foreground">Labels (comma-separated)</span>
          <Input
            value={labels}
            onChange={(event) => setLabels(event.target.value)}
            placeholder="Internal, Q3"
            aria-label="Project labels"
            disabled={!canManage}
          />
        </div>
        {canManage ? (
          <Button size="sm" onClick={save} loading={updateProject.isPending}>
            Save
          </Button>
        ) : null}
      </div>
    </section>
  );
}
