"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@elliptic/ui";
import type { Task } from "@/lib/types";
import {
  useAssignTaskToRelease,
  useReleases,
  useUnassignTaskFromRelease,
} from "@/hooks/use-release-queries";

const NONE = "__none__";

export function TaskReleaseField({ orgId, task }: { orgId: string; task: Task }) {
  const releases = useReleases(orgId);
  const assign = useAssignTaskToRelease(orgId);
  const unassign = useUnassignTaskFromRelease(orgId);
  const current = task.release_id ?? NONE;

  const onChange = (value: string) => {
    if (value === current) return;
    if (value === NONE) {
      if (task.release_id) unassign.mutate({ releaseId: task.release_id, taskId: task.id });
    } else {
      assign.mutate({ releaseId: value, taskId: task.id });
    }
  };

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger aria-label="Release">
        <SelectValue placeholder="No release" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>No release</SelectItem>
        {(releases.data ?? []).map((release) => (
          <SelectItem key={release.id} value={release.id}>
            {release.version ? `${release.name} (${release.version})` : release.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
