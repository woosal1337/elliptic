"use client";

import { useState } from "react";
import { Copy, Inbox } from "lucide-react";
import { Button, IconButton, Input, Switch, toast } from "@elliptic/ui";
import type { Project } from "@/lib/types";
import { useSetInappIntakeEnabled, useSetIntakeEnabled } from "@/hooks/use-intake-queries";

export function ProjectIntakeForm({
  orgId,
  project,
  canManage,
}: {
  orgId: string;
  project: Project;
  canManage: boolean;
}) {
  const setEnabled = useSetIntakeEnabled(orgId, project.id);
  const setInapp = useSetInappIntakeEnabled(orgId, project.id);
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));
  if (!canManage) return null;

  const link = project.intake_token ? `${origin}/intake/${project.intake_token}` : "";

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
            <Inbox className="size-4 text-muted-foreground" />
            Public intake form
          </h2>
          <p className="text-caption text-muted-foreground">
            Share a link so anyone — no account needed — can submit a request. Submissions land in
            this project&apos;s triage queue.
          </p>
        </div>
        <Switch
          checked={project.intake_enabled}
          disabled={setEnabled.isPending}
          onCheckedChange={(checked) => setEnabled.mutate(checked)}
          aria-label="Enable public intake form"
        />
      </div>

      <div className="flex items-start justify-between gap-4 border-t border-border pt-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-small font-semibold text-foreground">In-app requests</h2>
          <p className="text-caption text-muted-foreground">
            Let members (including guests) file a request from inside the app. These also land in
            triage, tagged as in-app.
          </p>
        </div>
        <Switch
          checked={project.intake_inapp_enabled}
          disabled={setInapp.isPending}
          onCheckedChange={(checked) => setInapp.mutate(checked)}
          aria-label="Enable in-app intake"
        />
      </div>

      {project.intake_enabled && link ? (
        <div className="flex items-center gap-2">
          <Input readOnly value={link} className="font-mono text-caption" aria-label="Intake link" />
          <IconButton
            aria-label="Copy intake link"
            variant="ghost"
            size="sm"
            onClick={() => {
              void navigator.clipboard
                .writeText(link)
                .then(() => toast.success("Intake link copied"))
                .catch(() => toast.error("Could not copy"));
            }}
          >
            <Copy className="size-4" />
          </IconButton>
          <Button asChild variant="outline" size="sm">
            <a href={link} target="_blank" rel="noreferrer">
              Open
            </a>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
