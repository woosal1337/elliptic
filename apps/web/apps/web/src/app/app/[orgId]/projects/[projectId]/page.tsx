"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, LayoutGrid, List, Users } from "lucide-react";
import {
  Badge,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@elliptic/ui";
import { useProject } from "@/hooks/use-project-queries";
import { useProjectPageCommands } from "@/components/command/use-host-commands";
import { useShortcut } from "@/lib/keyboard";
import { ErrorState } from "@/components/error-state";
import { Board } from "@/components/tasks/board";
import { TasksTable } from "@/components/tasks/tasks-table";
import { ProjectAnalytics } from "@/components/projects/project-analytics";
import { ThroughputChart } from "@/components/projects/throughput-chart";
import { ProjectEpics } from "@/components/tasks/project-epics";
import { FavoriteToggle } from "@/components/favorites/favorite-toggle";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SegmentedToggle } from "@/components/tasks/task-view-toolbar";
import { useTaskViewPrefs, type Swimlane } from "@/components/tasks/task-view-prefs";
import { MeetingList } from "@/components/meetings/meeting-list";
import { ImportMeetingDialog } from "@/components/meetings/import-meeting-dialog";
import { NoteList } from "@/components/notes/note-list";
import { CreateNoteDialog } from "@/components/notes/create-note-dialog";
import { ProjectMembers } from "@/components/projects/project-members";
import { ProjectBrief } from "@/components/projects/project-brief";
import { ProjectOverviewStats } from "@/components/projects/project-overview-stats";
import { ProjectSettings } from "@/components/projects/project-settings";

const VIEW_OPTIONS = [
  { value: "board" as const, label: "Board", icon: <LayoutGrid className="size-3.5" /> },
  { value: "list" as const, label: "List", icon: <List className="size-3.5" /> },
];

const SWIMLANE_LABELS: Record<Swimlane, string> = {
  none: "No grouping",
  assignee: "Group by assignee",
  priority: "Group by priority",
};

const TAB_VALUES = [
  "overview",
  "board",
  "tasks",
  "epics",
  "insights",
  "meetings",
  "notes",
  "members",
  "settings",
];

// Board is the primary working surface, so a project opens on it by default
// (and Board owns the param-less URL). Overview stays reachable via ?tab=overview.
const DEFAULT_TAB = "board";

function ProjectDetailContent() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const project = useProject(orgId, projectId);
  const prefs = useTaskViewPrefs(orgId, projectId);

  const initialTab = (() => {
    const t = searchParams.get("tab");
    return t && TAB_VALUES.includes(t) ? t : DEFAULT_TAB;
  })();
  const [activeTab, setActiveTabState] = useState(initialTab);

  const setActiveTab = useCallback((value: string) => {
    setActiveTabState(value);
    const url = new URL(window.location.href);
    if (value === DEFAULT_TAB) url.searchParams.delete("tab");
    else url.searchParams.set("tab", value);
    window.history.pushState(window.history.state, "", url);
  }, []);

  useEffect(() => {
    const syncFromUrl = () => {
      const t = new URLSearchParams(window.location.search).get("tab");
      setActiveTabState(t && TAB_VALUES.includes(t) ? t : DEFAULT_TAB);
    };
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const go = useCallback(
    (segment: string) => router.push(`/app/${orgId}${segment}`),
    [router, orgId]
  );

  useProjectPageCommands(orgId, projectId, project.data?.name ?? "", go);

  const onTaskTab = activeTab === "board" || activeTab === "tasks";
  const features = project.data?.features ?? {};
  const showMeetings = features.meetings !== false;
  const showNotes = features.notes !== false;

  // Only the most-used views stay pinned in the tab bar; the rest live behind a
  // "More" overflow menu to cut visual noise for people (agents/deep-links reach
  // every view regardless, since content renders off the controlled `tab` value).
  const primaryTabs = [
    { value: "overview", label: "Overview", show: true },
    { value: "board", label: "Board", show: true },
    { value: "tasks", label: "Tasks", show: true },
    { value: "insights", label: "Insights", show: true },
    { value: "notes", label: "Notes", show: showNotes },
    { value: "settings", label: "Settings", show: true },
  ].filter((tab) => tab.show);
  const moreTabs = [
    { value: "epics", label: "Epics", show: true },
    { value: "meetings", label: "Meetings", show: showMeetings },
    { value: "members", label: "Members", show: true },
  ].filter((tab) => tab.show);
  const activeMoreTab = moreTabs.find((tab) => tab.value === activeTab);

  useShortcut(
    {
      id: "tasks-toggle-view",
      keys: "mod+b",
      label: "Toggle board / list view",
      scope: "global",
      enabled: onTaskTab,
    },
    () => {
      const next = activeTab === "board" ? "tasks" : "board";
      setActiveTab(next);
      prefs.setView(next === "board" ? "board" : "list");
    }
  );

  const setView = useCallback(
    (view: "board" | "list") => {
      prefs.setView(view);
      setActiveTab(view === "board" ? "board" : "tasks");
    },
    [prefs, setActiveTab]
  );

  if (project.isError) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
        <ErrorState error={project.error} onRetry={() => void project.refetch()} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
      {project.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Breadcrumbs
            items={[
              { label: "Projects", href: `/app/${orgId}/projects` },
              { label: project.data.name },
            ]}
          />
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="flex items-center gap-2 text-h3 font-semibold tracking-[-0.02em] text-foreground">
              {project.data.icon ? <span aria-hidden>{project.data.icon}</span> : null}
              {project.data.name}
            </h1>
            <FavoriteToggle
              orgId={orgId}
              entityType="project"
              entityId={project.data.id}
              label={project.data.name}
            />
            <Badge variant="outline" className="font-mono">
              {project.data.key}
            </Badge>
            {project.data.labels.map((label) => (
              <Badge key={label} variant="neutral">
                {label}
              </Badge>
            ))}
            {project.data.status === "archived" ? (
              <Badge variant="neutral">Archived</Badge>
            ) : (
              <Badge variant="success" dot>
                Active
              </Badge>
            )}
          </div>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          if (value === "board") prefs.setView("board");
          else if (value === "tasks") prefs.setView("list");
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <TabsList>
              {primaryTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
              {/* Promote the active overflow view into the tablist as a real tab so
                  the mounted panel keeps a matching role="tab" (labelled + selected). */}
              {activeMoreTab ? (
                <TabsTrigger key={activeMoreTab.value} value={activeMoreTab.value}>
                  {activeMoreTab.label}
                </TabsTrigger>
              ) : null}
            </TabsList>
            {moreTabs.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="More project views"
                    className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-full border border-transparent px-2.5 text-caption font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 [&_svg]:size-3.5"
                  >
                    More
                    <ChevronDown className="opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {moreTabs.map((tab) => (
                    <DropdownMenuItem
                      key={tab.value}
                      onSelect={() => setActiveTab(tab.value)}
                      aria-current={activeTab === tab.value ? "true" : undefined}
                      className={cn(activeTab === tab.value && "text-foreground")}
                    >
                      {tab.label}
                      {activeTab === tab.value ? <Check className="ml-auto" aria-hidden /> : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          {onTaskTab ? (
            <div className="flex items-center gap-2 pb-1">
              {activeTab === "board" ? (
                <Select
                  value={prefs.swimlane}
                  onValueChange={(value) => prefs.setSwimlane(value as Swimlane)}
                >
                  <SelectTrigger className="h-8 w-44" aria-label="Swimlane grouping">
                    <Users className="size-3.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SWIMLANE_LABELS) as Swimlane[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {SWIMLANE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <SegmentedToggle
                ariaLabel="Task view"
                value={prefs.view}
                options={VIEW_OPTIONS}
                onChange={setView}
              />
            </div>
          ) : null}
        </div>
        <TabsContent value="overview">
          <div className="flex flex-col gap-6">
            <ProjectOverviewStats orgId={orgId} projectId={projectId} />
            <ThroughputChart orgId={orgId} projectId={projectId} />
            <ProjectBrief orgId={orgId} projectId={projectId} />
          </div>
        </TabsContent>
        <TabsContent value="board">
          <Board orgId={orgId} projectId={projectId} swimlane={prefs.swimlane} />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksTable
            orgId={orgId}
            projectId={projectId}
            density={prefs.density}
            onDensityChange={prefs.setDensity}
          />
        </TabsContent>
        <TabsContent value="epics">
          <ProjectEpics orgId={orgId} projectId={projectId} />
        </TabsContent>
        <TabsContent value="insights">
          <ProjectAnalytics orgId={orgId} projectId={projectId} onDrill={setActiveTab} />
        </TabsContent>
        {showMeetings ? (
          <TabsContent value="meetings">
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <ImportMeetingDialog orgId={orgId} />
              </div>
              <MeetingList
                orgId={orgId}
                projectId={projectId}
                emptyAction={<ImportMeetingDialog orgId={orgId} />}
              />
            </div>
          </TabsContent>
        ) : null}
        {showNotes ? (
          <TabsContent value="notes">
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <CreateNoteDialog orgId={orgId} projectId={projectId} />
              </div>
              <NoteList
                orgId={orgId}
                projectId={projectId}
                emptyAction={<CreateNoteDialog orgId={orgId} projectId={projectId} />}
              />
            </div>
          </TabsContent>
        ) : null}
        <TabsContent value="members">
          <ProjectMembers orgId={orgId} projectId={projectId} />
        </TabsContent>
        <TabsContent value="settings">
          <ProjectSettings orgId={orgId} projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense>
      <ProjectDetailContent />
    </Suspense>
  );
}
