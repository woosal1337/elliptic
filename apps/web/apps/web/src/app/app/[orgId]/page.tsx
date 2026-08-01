"use client";

import { useParams } from "next/navigation";
import { GetStartedChecklist } from "@/components/onboarding/get-started-checklist";
import Link from "next/link";
import {
  Activity as ActivityIcon,
  Badge as BadgeIcon,
  FolderKanban,
  Star,
  StickyNote,
} from "lucide-react";
import { Badge, Skeleton } from "@elliptic/ui";
import { useMe } from "@/hooks/use-auth-queries";
import { useProjects } from "@/hooks/use-project-queries";
import { useFavorites } from "@/hooks/use-favorite-queries";
import { useStickies } from "@/hooks/use-sticky-queries";
import { useActivity } from "@/hooks/use-activity-queries";
import { useActiveCycles } from "@/hooks/use-cycle-queries";
import { ActivityList } from "@/components/activity/activity-list";

const STICKY_BG: Record<string, string> = {
  yellow: "bg-amber-100 dark:bg-amber-500/15",
  green: "bg-emerald-100 dark:bg-emerald-500/15",
  blue: "bg-sky-100 dark:bg-sky-500/15",
  pink: "bg-pink-100 dark:bg-pink-500/15",
  purple: "bg-violet-100 dark:bg-violet-500/15",
  orange: "bg-orange-100 dark:bg-orange-500/15",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function StatCard({
  href,
  icon,
  value,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
    >
      <span className="flex size-9 items-center justify-center rounded-md bg-subtle text-muted-foreground">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-h4 font-semibold tabular text-foreground">{value}</span>
        <span className="text-caption text-muted-foreground">{label}</span>
      </span>
    </Link>
  );
}

export default function HomePage() {
  const { orgId } = useParams<{ orgId: string }>();
  const me = useMe();
  const projects = useProjects(orgId);
  const favorites = useFavorites(orgId);
  const stickies = useStickies(orgId);
  const activity = useActivity(orgId);
  const activeCycles = useActiveCycles(orgId);

  const activeProjects = (projects.data ?? []).filter((project) => project.status === "active");
  const cycles = activeCycles.data ?? [];
  const favoriteProjects = (favorites.data ?? []).filter((fav) => fav.entity_type === "project");
  const firstName = me.data?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-h3 font-semibold tracking-[-0.02em] text-foreground">
          {greeting()}, {firstName}
        </h1>
        <p className="text-small text-muted-foreground">Here&apos;s what&apos;s happening today.</p>
      </div>

      <GetStartedChecklist orgId={orgId} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          href={`/app/${orgId}/projects`}
          icon={<FolderKanban className="size-4" />}
          value={activeProjects.length}
          label={activeProjects.length === 1 ? "Active project" : "Active projects"}
        />
        <StatCard
          href={`/app/${orgId}/stickies`}
          icon={<StickyNote className="size-4" />}
          value={(stickies.data ?? []).length}
          label="Stickies"
        />
        <StatCard
          href={`/app/${orgId}/projects`}
          icon={<Star className="size-4" />}
          value={favoriteProjects.length}
          label="Favorites"
        />
      </div>

      {cycles.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
            <BadgeIcon className="size-4 text-muted-foreground" />
            Active cycles
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cycles.map((cycle) => {
              const total = cycle.task_total || 1;
              const pct = Math.round((cycle.task_done / total) * 100);
              return (
                <Link
                  key={cycle.id}
                  href={`/app/${orgId}/projects/${cycle.project_id}?tab=cycles`}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-border-strong"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {cycle.project_key}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-small font-medium text-foreground">
                      {cycle.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-caption text-muted-foreground">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-success" style={{ width: `${pct}%` }} aria-hidden />
                    </div>
                    <span className="tabular">{pct}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="flex flex-col gap-3 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
            <ActivityIcon className="size-4 text-muted-foreground" />
            Recent activity
          </h2>
          {activity.isPending ? (
            <Skeleton className="h-48 w-full rounded-lg" />
          ) : (activity.data ?? []).length === 0 ? (
            <p className="rounded-lg border border-border bg-surface p-4 text-small text-muted-foreground">
              No activity yet — create a project or task to get started.
            </p>
          ) : (
            <div className="rounded-lg border border-border bg-surface p-2">
              <ActivityList events={(activity.data ?? []).slice(0, 12)} compact />
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
              <Star className="size-4 text-muted-foreground" />
              Favorites
            </h2>
            {favoriteProjects.length === 0 ? (
              <p className="text-caption text-muted-foreground">
                Star a project to pin it here.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {favoriteProjects.map((fav) => (
                  <Link
                    key={fav.id}
                    href={`/app/${orgId}/projects/${fav.entity_id}`}
                    className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-small text-foreground transition-colors hover:border-border-strong"
                  >
                    <Star className="size-3.5 shrink-0 fill-warning text-warning" aria-hidden />
                    <span className="truncate">{fav.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
              <StickyNote className="size-4 text-muted-foreground" />
              Stickies
            </h2>
            {(stickies.data ?? []).length === 0 ? (
              <Link
                href={`/app/${orgId}/stickies`}
                className="text-caption text-accent hover:underline"
              >
                Add your first sticky →
              </Link>
            ) : (
              <div className="flex flex-col gap-1.5">
                {(stickies.data ?? []).slice(0, 4).map((sticky) => (
                  <Link
                    key={sticky.id}
                    href={`/app/${orgId}/stickies`}
                    className={`line-clamp-2 rounded-md border border-border px-3 py-2 text-caption text-foreground ${
                      STICKY_BG[sticky.color] ?? STICKY_BG.yellow
                    }`}
                  >
                    {sticky.content || "Empty sticky"}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
