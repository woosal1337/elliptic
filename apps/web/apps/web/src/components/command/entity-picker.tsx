"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@elliptic/ui";
import { useKeyboard } from "@/lib/keyboard";
import { useProjects } from "@/hooks/use-project-queries";
import { useTeams } from "@/hooks/use-org-queries";

export type EntityKind = "project" | "team";

interface EntityRow {
  id: string;
  label: string;
  hint?: string;
  keywords: string[];
}

const ENTITY_META: Record<
  EntityKind,
  { label: string; placeholder: string; empty: string; icon: LucideIcon }
> = {
  project: {
    label: "Open project",
    placeholder: "Jump to a project…",
    empty: "No projects found.",
    icon: FolderKanban,
  },
  team: {
    label: "Open team",
    placeholder: "Jump to a team…",
    empty: "No teams found.",
    icon: Users,
  },
};

export function EntityPicker({
  orgId,
  kind,
  open,
  onOpenChange,
}: {
  orgId: string;
  kind: EntityKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { setSuppressed } = useKeyboard();
  const projects = useProjects(orgId);
  const teams = useTeams(orgId);

  const meta = ENTITY_META[kind];
  const Icon = meta.icon;

  const rows = useMemo<EntityRow[]>(() => {
    if (kind === "project") {
      return (projects.data ?? []).map((project) => ({
        id: project.id,
        label: project.name,
        hint: project.key,
        keywords: [project.key, "project"],
      }));
    }
    return (teams.data ?? []).map((team) => ({
      id: team.id,
      label: team.name,
      keywords: ["team"],
    }));
  }, [kind, projects.data, teams.data]);

  const navigate = (id: string) => {
    onOpenChange(false);
    if (kind === "project") {
      router.push(`/app/${orgId}/projects/${id}`);
      return;
    }
    router.push(`/app/${orgId}/settings`);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        setSuppressed(next);
        onOpenChange(next);
      }}
      label={meta.label}
    >
      <CommandInput placeholder={meta.placeholder} autoFocus />
      <CommandList>
        <CommandEmpty>{meta.empty}</CommandEmpty>
        <CommandGroup heading={meta.label}>
          {rows.map((row) => (
            <CommandItem
              key={row.id}
              value={`${row.label} ${row.keywords.join(" ")}`}
              onSelect={() => navigate(row.id)}
            >
              <Icon className="text-muted-foreground" />
              <span className="flex-1 truncate text-foreground/90">{row.label}</span>
              {row.hint ? (
                <span className="shrink-0 font-mono text-caption text-muted-foreground">
                  {row.hint}
                </span>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
