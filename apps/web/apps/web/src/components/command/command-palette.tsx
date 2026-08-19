"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BookText,
  CheckSquare,
  FileText,
  FilePlus,
  FolderKanban,
  FolderPlus,
  Search,
  Settings,
  UserCircle,
  Upload,
  Users,
  Video,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Kbd,
} from "@elliptic/ui";
import type { LucideIcon } from "lucide-react";
import { formatKeysForDisplay, useKeyboard, useShortcut } from "@/lib/keyboard";
import { getRecentCommandIds, pushRecentCommandId } from "@/lib/storage";
import { useCommandScopes } from "./command-registry";
import { projectKeys } from "@/hooks/use-project-queries";
import { useGlobalSearch, type SearchResult } from "@/hooks/use-search-queries";
import { meetingKeys } from "@/hooks/use-meeting-queries";
import { noteKeys } from "@/hooks/use-note-queries";
import { taskKeys } from "@/hooks/use-task-queries";
import type { Meeting, Note, Project, Task } from "@/lib/types";

type CommandKind = "scoped" | "navigation" | "open" | "action" | "search";

interface PaletteCommand {
  id: string;
  label: string;
  keywords?: string[];
  icon: LucideIcon;
  kind: CommandKind;
  shortcut?: string;
  hint?: string;
  perform: () => void;
}

const NAV_SEGMENTS = [
  { id: "nav-search", label: "Go to Search", segment: "search", icon: Search, keys: "g /" },
  { id: "nav-projects", label: "Go to Projects", segment: "projects", icon: FolderKanban, keys: "g p" },
  { id: "nav-meetings", label: "Go to Meetings", segment: "meetings", icon: Video, keys: "g m" },
  { id: "nav-notes", label: "Go to Notes", segment: "notes", icon: FileText, keys: "g n" },
  { id: "nav-wiki", label: "Go to Wiki", segment: "wiki", icon: BookText, keys: "g w" },
  { id: "nav-activity", label: "Go to Activity", segment: "activity", icon: Activity, keys: "g a" },
  { id: "nav-settings", label: "Go to Settings", segment: "settings", icon: Settings, keys: "g s" },
] as const;

const OPEN_ENTITIES = [
  { id: "open-project", label: "Open project…", segment: "projects", icon: FolderKanban, keys: "o p" },
  { id: "open-team", label: "Open team…", segment: "settings", icon: Users, keys: "o t" },
  { id: "open-profile", label: "Open my profile", segment: "settings", icon: UserCircle, keys: "o m" },
] as const;

function collectCacheEntities(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string,
  go: (path: string) => void
): PaletteCommand[] {
  const results: PaletteCommand[] = [];
  const seen = new Set<string>();

  const push = (command: PaletteCommand) => {
    if (seen.has(command.id)) return;
    seen.add(command.id);
    results.push(command);
  };

  for (const [, data] of queryClient.getQueriesData<Project[]>({
    queryKey: projectKeys.lists(orgId),
  })) {
    for (const project of data ?? []) {
      push({
        id: `search-project-${project.id}`,
        label: project.name,
        keywords: [project.key, "project"],
        icon: FolderKanban,
        kind: "search",
        hint: project.key,
        perform: () => go(`/projects/${project.id}`),
      });
    }
  }

  for (const [, data] of queryClient.getQueriesData<Meeting[]>({
    queryKey: meetingKeys.all(orgId),
  })) {
    for (const meeting of data ?? []) {
      push({
        id: `search-meeting-${meeting.id}`,
        label: meeting.title,
        keywords: ["meeting"],
        icon: Video,
        kind: "search",
        hint: "Meeting",
        perform: () => go(`/meetings/${meeting.id}`),
      });
    }
  }

  for (const [, data] of queryClient.getQueriesData<Note[]>({
    queryKey: noteKeys.all(orgId),
  })) {
    for (const note of data ?? []) {
      push({
        id: `search-note-${note.id}`,
        label: note.title,
        keywords: ["note"],
        icon: FileText,
        kind: "search",
        hint: "Note",
        perform: () => go(`/notes/${note.id}`),
      });
    }
  }

  for (const [, data] of queryClient.getQueriesData<Task[]>({
    queryKey: taskKeys.all(orgId),
  })) {
    for (const task of data ?? []) {
      push({
        id: `search-task-${task.id}`,
        label: task.title,
        keywords: [task.identifier, "task"],
        icon: CheckSquare,
        kind: "search",
        hint: task.identifier,
        perform: () => go(`/projects/${task.project_id}?task=${task.id}`),
      });
    }
  }

  return results;
}

export function CommandPalette({
  orgId,
  open,
  onOpenChange,
}: {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { register, setSuppressed } = useKeyboard();
  const scopes = useCommandScopes();
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    setSuppressed(open);
    if (open) setRecentIds(getRecentCommandIds());
  }, [open, setSuppressed]);

  const go = useCallback(
    (path: string) => {
      router.push(`/app/${orgId}${path}`);
    },
    [router, orgId]
  );

  useShortcut(
    { id: "kbd-open-palette", keys: "mod+k", label: "Open command palette", scope: "global" },
    () => onOpenChange(!open)
  );

  useEffect(() => {
    const disposers = NAV_SEGMENTS.map((item) =>
      register({
        id: `kbd-${item.id}`,
        keys: item.keys,
        label: item.label,
        scope: "navigation",
        run: () => go(`/${item.segment}`),
      })
    );
    return () => {
      for (const dispose of disposers) dispose();
    };
  }, [register, go]);

  const baseCommands = useMemo<PaletteCommand[]>(() => {
    const navigation: PaletteCommand[] = NAV_SEGMENTS.map((item) => ({
      id: item.id,
      label: item.label,
      keywords: [item.segment],
      icon: item.icon,
      kind: "navigation",
      shortcut: item.keys,
      perform: () => go(`/${item.segment}`),
    }));

    const openEntities: PaletteCommand[] = OPEN_ENTITIES.map((item) => ({
      id: item.id,
      label: item.label,
      keywords: ["open", "jump", item.segment],
      icon: item.icon,
      kind: "open",
      shortcut: item.keys,
      perform: () => go(`/${item.segment}`),
    }));

    const actions: PaletteCommand[] = [
      {
        id: "action-new-project",
        label: "New project",
        keywords: ["create", "add", "project"],
        icon: FolderPlus,
        kind: "action",
        perform: () => go("/projects?new=1"),
      },
      {
        id: "action-new-task",
        label: "New task",
        keywords: ["create", "add", "task", "issue"],
        icon: CheckSquare,
        kind: "action",
        perform: () => go("/projects"),
      },
      {
        id: "action-new-meeting",
        label: "New meeting import",
        keywords: ["create", "add", "import", "transcript", "meeting"],
        icon: Upload,
        kind: "action",
        perform: () => go("/meetings?new=1"),
      },
      {
        id: "action-new-note",
        label: "New note",
        keywords: ["create", "add", "note"],
        icon: FilePlus,
        kind: "action",
        perform: () => go("/notes?new=1"),
      },
    ];

    return [...navigation, ...openEntities, ...actions];
  }, [go]);

  const searchCommands = useMemo<PaletteCommand[]>(() => {
    if (!open) return [];
    return collectCacheEntities(queryClient, orgId, go);
  }, [open, queryClient, orgId, go]);

  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(term), 180);
    return () => clearTimeout(handle);
  }, [term]);
  useEffect(() => {
    if (!open) setTerm("");
  }, [open]);
  const serverSearch = useGlobalSearch(orgId, debounced, open);

  const serverCommands = useMemo<PaletteCommand[]>(() => {
    const data = serverSearch.data;
    if (!data) return [];
    const routeFor = (r: SearchResult): string => {
      switch (r.type) {
        case "task":
          return `/projects/${r.project_id}?task=${r.id}`;
        case "project":
          return `/projects/${r.id}`;
        case "note":
          return `/notes/${r.id}`;
        case "meeting":
          return `/meetings/${r.id}`;
        default:
          return "/";
      }
    };
    const iconFor: Record<SearchResult["type"], PaletteCommand["icon"]> = {
      task: CheckSquare,
      project: FolderKanban,
      note: FileText,
      meeting: Video,
    };
    return data.results.map((r) => ({
      id: `gsearch-${r.type}-${r.id}`,
      label: r.title,
      keywords: [debounced, r.type, r.identifier ?? ""].filter(Boolean),
      icon: iconFor[r.type],
      kind: "search" as const,
      hint: r.identifier ?? r.type,
      perform: () => go(routeFor(r)),
    }));
  }, [serverSearch.data, debounced, go]);

  const scopeSections = useMemo(
    () =>
      scopes.map((scope) => ({
        id: scope.id,
        heading: scope.heading,
        commands: scope.commands.map<PaletteCommand>((command) => ({
          id: command.id,
          label: command.label,
          keywords: command.keywords,
          icon: command.icon,
          kind: "scoped",
          hint: command.hint,
          perform: command.perform,
        })),
      })),
    [scopes]
  );

  const scopedCommands = useMemo(
    () => scopeSections.flatMap((section) => section.commands),
    [scopeSections]
  );

  const dedupedCacheCommands = useMemo(() => {
    const serverKeys = new Set(serverCommands.map((c) => c.id.replace(/^gsearch-/, "")));
    return searchCommands.filter((c) => !serverKeys.has(c.id.replace(/^search-/, "")));
  }, [searchCommands, serverCommands]);

  const allById = useMemo(() => {
    const map = new Map<string, PaletteCommand>();
    for (const command of [...scopedCommands, ...baseCommands, ...serverCommands, ...searchCommands])
      map.set(command.id, command);
    return map;
  }, [scopedCommands, baseCommands, serverCommands, searchCommands]);

  const recentCommands = useMemo(
    () => recentIds.map((id) => allById.get(id)).filter((c): c is PaletteCommand => Boolean(c)),
    [recentIds, allById]
  );

  const run = useCallback(
    (command: PaletteCommand) => {
      setRecentIds(pushRecentCommandId(command.id));
      onOpenChange(false);
      command.perform();
    },
    [onOpenChange]
  );

  const navigationCommands = baseCommands.filter((c) => c.kind === "navigation");
  const openCommands = baseCommands.filter((c) => c.kind === "open");
  const actionCommands = baseCommands.filter((c) => c.kind === "action");

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} label="Command palette">
      <CommandInput
        placeholder="Type a command or search..."
        autoFocus
        value={term}
        onValueChange={setTerm}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {recentCommands.length > 0 ? (
          <>
            <CommandGroup heading="Recent">
              {recentCommands.map((command) => (
                <CommandRow key={`recent-${command.id}`} command={command} onRun={run} />
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        ) : null}

        {scopeSections.map((section) =>
          section.commands.length > 0 ? (
            <CommandGroup key={section.id} heading={section.heading}>
              {section.commands.map((command) => (
                <CommandRow key={command.id} command={command} onRun={run} />
              ))}
            </CommandGroup>
          ) : null
        )}

        <CommandGroup heading="Navigation">
          {navigationCommands.map((command) => (
            <CommandRow key={command.id} command={command} onRun={run} />
          ))}
        </CommandGroup>

        <CommandGroup heading="Jump to">
          {openCommands.map((command) => (
            <CommandRow key={command.id} command={command} onRun={run} />
          ))}
        </CommandGroup>

        <CommandGroup heading="Actions">
          {actionCommands.map((command) => (
            <CommandRow key={command.id} command={command} onRun={run} />
          ))}
        </CommandGroup>

        {serverCommands.length > 0 ? (
          <CommandGroup heading="Search results">
            {serverCommands.map((command) => (
              <CommandRow key={command.id} command={command} onRun={run} />
            ))}
          </CommandGroup>
        ) : null}

        {dedupedCacheCommands.length > 0 ? (
          <CommandGroup heading="Recently loaded">
            {dedupedCacheCommands.map((command) => (
              <CommandRow key={command.id} command={command} onRun={run} />
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}

function CommandRow({
  command,
  onRun,
}: {
  command: PaletteCommand;
  onRun: (command: PaletteCommand) => void;
}) {
  const Icon = command.icon;
  return (
    <CommandItem
      value={`${command.label} ${(command.keywords ?? []).join(" ")}`}
      onSelect={() => onRun(command)}
    >
      <Icon className="text-muted-foreground" />
      <span className="flex-1 truncate text-foreground/90">{command.label}</span>
      {command.hint ? (
        <span className="shrink-0 font-mono text-caption text-muted-foreground">{command.hint}</span>
      ) : null}
      {command.shortcut ? (
        <span className="flex shrink-0 items-center gap-1">
          {formatKeysForDisplay(command.shortcut).map((token, index) => (
            <Kbd key={`${command.id}-key-${index}`}>{token}</Kbd>
          ))}
        </span>
      ) : null}
    </CommandItem>
  );
}
