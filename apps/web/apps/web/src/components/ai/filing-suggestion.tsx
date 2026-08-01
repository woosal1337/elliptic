"use client";

import { useMemo, useState } from "react";
import { FolderInput, X } from "lucide-react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@elliptic/ui";
import { resolveRouting } from "@/lib/routing";
import { CONFIDENCE_LABELS } from "@/lib/confidence";
import { ConfidenceBadge } from "./coverage-note";
import type { Project, RouteSuggestion } from "@/lib/types";

export function FilingSuggestion({
  suggestion,
  projects,
  onFile,
  onDismiss,
  isPending,
  className,
}: {
  suggestion: RouteSuggestion | null | undefined;
  projects: Project[];
  onFile: (projectId: string) => void;
  onDismiss: () => void;
  isPending?: boolean;
  className?: string;
}) {
  const resolved = useMemo(() => resolveRouting(suggestion), [suggestion]);
  const suggested = useMemo(
    () => projects.find((project) => project.id === resolved.projectId) ?? null,
    [projects, resolved.projectId]
  );
  const [picking, setPicking] = useState(resolved.mode === "pick");
  const [picked, setPicked] = useState<string>("");

  const showPicker = picking || resolved.mode === "pick" || suggested === null;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-3",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-small text-foreground">
          <FolderInput className="size-4 text-muted-foreground" />
          {showPicker ? "File this meeting in a project" : `File in ${suggested?.name}?`}
        </div>
        <button
          type="button"
          aria-label="Dismiss filing suggestion"
          className="text-muted-foreground transition-colors hover:text-foreground"
          onClick={onDismiss}
        >
          <X className="size-4" />
        </button>
      </div>

      <ConfidenceBadge
        band={resolved.band}
        label={
          showPicker
            ? "Not enough signal to guess — choose a project"
            : CONFIDENCE_LABELS[resolved.band]
        }
      />

      {showPicker ? (
        <div className="flex items-center gap-2">
          <Select value={picked} onValueChange={setPicked}>
            <SelectTrigger className="w-60" aria-label="Choose a project">
              <SelectValue placeholder="Pick a project…" />
            </SelectTrigger>
            <SelectContent>
              {projects.length === 0 ? (
                <SelectItem value="none" disabled>
                  No projects
                </SelectItem>
              ) : (
                projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={picked.length === 0 || isPending}
            onClick={() => onFile(picked)}
          >
            File
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => suggested && onFile(suggested.id)}
          >
            Accept
          </Button>
          <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setPicking(true)}>
            Choose another
          </Button>
        </div>
      )}
    </div>
  );
}
