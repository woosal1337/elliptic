"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Compass, LayoutGrid, Table2 } from "lucide-react";
import {
  IsoStack,
  Badge,
  Button,
  Card,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import { useProjects } from "@/hooks/use-project-queries";
import { plainText } from "@/components/notes/markdown";
import { useProjectStates, type ProjectState } from "@/hooks/use-project-state-queries";
import { useNewParam } from "@/lib/use-new-param";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/error-state";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import type { Project } from "@/lib/types";

const UNSET = "__unset__";
type Layout = "gallery" | "table";
type GroupBy = "none" | "state" | "label";
type SortBy = "name" | "newest" | "key";

function StateChip({ state }: { state?: ProjectState }) {
  if (!state) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
      <span className="size-2 rounded-full" style={{ backgroundColor: state.color }} />
      {state.name}
    </span>
  );
}

function StatusBadge({ status }: { status: Project["status"] }) {
  return status === "archived" ? (
    <Badge variant="neutral">Archived</Badge>
  ) : (
    <Badge variant="success" dot>
      Active
    </Badge>
  );
}

function GalleryCard({ orgId, project, state }: { orgId: string; project: Project; state?: ProjectState }) {
  return (
    <Link
      href={`/app/${orgId}/projects/${project.id}`}
      className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <Card className="flex h-full flex-col p-5 shadow-xs transition-all duration-150 group-hover:-translate-y-0.5 group-hover:border-input group-hover:shadow-md">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="font-mono text-caption">
            {project.key}
          </Badge>
          <div className="flex items-center gap-1.5">
            <StateChip state={state} />
            <StatusBadge status={project.status} />
          </div>
        </div>
        <h3 className="mt-3 text-h4 font-semibold tracking-[-0.01em] text-foreground">
          {project.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-small text-muted-foreground">
          {project.description ? plainText(project.description) : "No description"}
        </p>
      </Card>
    </Link>
  );
}

function ProjectTable({
  orgId,
  items,
  stateById,
}: {
  orgId: string;
  items: Project[];
  stateById: Map<string, ProjectState>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-small">
        <tbody className="divide-y divide-border">
          {items.map((project) => (
            <tr key={project.id} className="hover:bg-muted/40">
              <td className="w-16 px-3 py-2">
                <Badge variant="outline" className="font-mono text-caption">
                  {project.key}
                </Badge>
              </td>
              <td className="px-3 py-2">
                <Link
                  href={`/app/${orgId}/projects/${project.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {project.name}
                </Link>
              </td>
              <td className="px-3 py-2">
                <StateChip state={project.state_id ? stateById.get(project.state_id) : undefined} />
              </td>
              <td className="w-24 px-3 py-2 text-right">
                <StatusBadge status={project.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProjectsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const projects = useProjects(orgId);
  const states = useProjectStates(orgId);
  const [layout, setLayout] = useState<Layout>("gallery");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [createOpen, setCreateOpen] = useNewParam();

  const stateById = useMemo(
    () => new Map((states.data ?? []).map((s) => [s.id, s])),
    [states.data]
  );

  const sorted = useMemo(() => {
    const list = [...(projects.data ?? [])];
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "key") return a.key.localeCompare(b.key);
      return b.created_at.localeCompare(a.created_at);
    });
    return list;
  }, [projects.data, sortBy]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ id: "all", label: "", color: "", items: sorted }];
    if (groupBy === "state") {
      const ordered = states.data ?? [];
      const sections = [
        ...ordered.map((s) => ({ id: s.id, label: s.name, color: s.color })),
        { id: UNSET, label: "No state", color: "#F5F5F5" },
      ];
      return sections
        .map((section) => ({
          ...section,
          items: sorted.filter((p) =>
            section.id === UNSET ? !p.state_id || !stateById.has(p.state_id) : p.state_id === section.id
          ),
        }))
        .filter((section) => section.items.length > 0);
    }
    const labels = [...new Set(sorted.flatMap((p) => p.labels))].sort((a, b) => a.localeCompare(b));
    const sections = [
      ...labels.map((label) => ({ id: label, label, color: "#C4C4C4" })),
      { id: UNSET, label: "No label", color: "#9A9A9A" },
    ];
    return sections
      .map((section) => ({
        ...section,
        items: sorted.filter((p) =>
          section.id === UNSET ? p.labels.length === 0 : p.labels.includes(section.id)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [groupBy, sorted, states.data, stateById]);

  const renderItems = (items: Project[]) =>
    layout === "table" ? (
      <ProjectTable orgId={orgId} items={items} stateById={stateById} />
    ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((project) => (
          <GalleryCard
            key={project.id}
            orgId={orgId}
            project={project}
            state={project.state_id ? stateById.get(project.state_id) : undefined}
          />
        ))}
      </div>
    );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Projects"
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/${orgId}/projects/browse`}>
                <Compass className="size-4" />
                Browse
              </Link>
            </Button>
            <CreateProjectDialog orgId={orgId} open={createOpen} onOpenChange={setCreateOpen} />
          </div>
        }
      />

      {projects.isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : projects.isError ? (
        <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
      ) : projects.data.length === 0 ? (
        <EmptyState
          illustration={<IsoStack />}
          title="Turn scattered work into shipped outcomes"
          description="A project gives your team one place to plan tasks, track progress, and see what ships next. Start with the work that matters most this week."
          action={<CreateProjectDialog orgId={orgId} />}
          secondaryAction={
            <Button asChild variant="ghost" size="sm">
              <Link href={`/app/${orgId}/meetings?new=1`}>Import from a meeting</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger className="w-40" aria-label="Group by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No grouping</SelectItem>
                <SelectItem value="state">Group by state</SelectItem>
                <SelectItem value="label">Group by label</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger className="w-40" aria-label="Sort by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="key">Key</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-1">
              <Button
                size="sm"
                variant={layout === "gallery" ? "secondary" : "ghost"}
                onClick={() => setLayout("gallery")}
                aria-label="Gallery layout"
                aria-pressed={layout === "gallery"}
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                size="sm"
                variant={layout === "table" ? "secondary" : "ghost"}
                onClick={() => setLayout("table")}
                aria-label="Table layout"
                aria-pressed={layout === "table"}
              >
                <Table2 className="size-4" />
              </Button>
            </div>
          </div>

          {groupBy === "none" ? (
            renderItems(sorted)
          ) : (
            <div className="flex flex-col gap-8">
              {groups.map((section) => (
                <section key={section.id} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: section.color }} />
                    <h2 className="text-small font-semibold text-foreground">{section.label}</h2>
                    <span className="text-caption text-muted-foreground">{section.items.length}</span>
                  </div>
                  {renderItems(section.items)}
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
