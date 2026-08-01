"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elliptic/ui";
import type { Project } from "@/lib/types";
import { useUpdateProject } from "@/hooks/use-project-queries";
import { useProjectStates } from "@/hooks/use-project-state-queries";

const NONE = "__none__";

export function ProjectStatePicker({
  orgId,
  project,
  canManage,
}: {
  orgId: string;
  project: Project;
  canManage: boolean;
}) {
  const states = useProjectStates(orgId);
  const updateProject = useUpdateProject(orgId, project.id);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-small font-semibold text-foreground">Portfolio state</h2>
        <p className="text-caption text-muted-foreground">
          Where this project sits in its lifecycle, for portfolio grouping.
        </p>
      </div>
      <Select
        value={project.state_id ?? NONE}
        disabled={!canManage || states.isPending}
        onValueChange={(value) =>
          updateProject.mutate(value === NONE ? { clear_state: true } : { state_id: value })
        }
      >
        <SelectTrigger className="w-64" aria-label="Portfolio state">
          <SelectValue placeholder="No state" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No state</SelectItem>
          {(states.data ?? []).map((state) => (
            <SelectItem key={state.id} value={state.id}>
              <span className="inline-flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ backgroundColor: state.color }} />
                {state.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </section>
  );
}
