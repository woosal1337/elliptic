"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elliptic/ui";
import type { Project, TaskStatus } from "@/lib/types";
import { useUpdateProject } from "@/hooks/use-project-queries";

const CLOSE_STATUSES: TaskStatus[] = ["done", "cancelled"];

export function ProjectLifecycleSettings({
  orgId,
  project,
  canManage,
}: {
  orgId: string;
  project: Project;
  canManage: boolean;
}) {
  const updateProject = useUpdateProject(orgId, project.id);
  const [archiveDays, setArchiveDays] = useState(project.auto_archive_days?.toString() ?? "");
  const [closeDays, setCloseDays] = useState(project.auto_close_days?.toString() ?? "");
  const [closeStatus, setCloseStatus] = useState<TaskStatus>(
    project.auto_close_status ?? "cancelled"
  );

  useEffect(() => {
    setArchiveDays(project.auto_archive_days?.toString() ?? "");
    setCloseDays(project.auto_close_days?.toString() ?? "");
    setCloseStatus(project.auto_close_status ?? "cancelled");
  }, [project.auto_archive_days, project.auto_close_days, project.auto_close_status]);

  const saveArchive = () => {
    const n = Number.parseInt(archiveDays, 10);
    updateProject.mutate(
      Number.isFinite(n) && n > 0 ? { auto_archive_days: n } : { clear_auto_archive: true }
    );
  };
  const saveClose = () => {
    const n = Number.parseInt(closeDays, 10);
    updateProject.mutate(
      Number.isFinite(n) && n > 0
        ? { auto_close_days: n, auto_close_status: closeStatus }
        : { clear_auto_close: true }
    );
  };

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-small font-semibold text-foreground">Lifecycle automation</h2>
        <p className="text-caption text-muted-foreground">
          Built-in housekeeping. Leave a field blank to disable it. Items still in a cycle or
          module are skipped when auto-archiving.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-caption font-medium text-foreground">
          Auto-archive completed items after (days)
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            value={archiveDays}
            disabled={!canManage}
            placeholder="Off"
            className="w-28"
            onChange={(event) => setArchiveDays(event.target.value)}
          />
          <Button size="sm" variant="outline" disabled={!canManage} onClick={saveArchive}>
            Save
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-caption font-medium text-foreground">
          Auto-close stale open items after (days)
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            min={1}
            value={closeDays}
            disabled={!canManage}
            placeholder="Off"
            className="w-28"
            onChange={(event) => setCloseDays(event.target.value)}
          />
          <span className="text-caption text-muted-foreground">to</span>
          <Select value={closeStatus} onValueChange={(v) => setCloseStatus(v as TaskStatus)}>
            <SelectTrigger className="w-36 capitalize" aria-label="Close to status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLOSE_STATUSES.map((status) => (
                <SelectItem key={status} value={status} className="capitalize">
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" disabled={!canManage} onClick={saveClose}>
            Save
          </Button>
        </div>
      </div>
    </section>
  );
}
