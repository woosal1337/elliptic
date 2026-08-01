"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ChevronRight, FolderKanban } from "lucide-react";
import { cn } from "@elliptic/ui";
import { useProjects } from "@/hooks/use-project-queries";

/**
 * Projects nav item that expands to list every project inline, highlighting the
 * one currently open. Auto-expands whenever the user is on a projects route.
 */
export function SidebarProjects({ orgId, pathname }: { orgId: string; pathname: string }) {
  const listHref = `/app/${orgId}/projects`;
  const onProjectsRoute = pathname === listHref || pathname.startsWith(`${listHref}/`);
  // The parent row highlights on the projects index / browse; a specific project
  // is owned by its own child row.
  const listActive = pathname === listHref || pathname.startsWith(`${listHref}/browse`);
  const [expanded, setExpanded] = useState(onProjectsRoute);
  const listId = useId();

  useEffect(() => {
    if (onProjectsRoute) setExpanded(true);
  }, [onProjectsRoute]);

  const projects = useProjects(orgId);
  const items = [...(projects.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const hasProjects = items.length > 0;

  return (
    <div>
      <div className="group relative rounded-md">
        <Link
          href={listHref}
          aria-current={listActive ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-md py-2 pl-2.5 text-small font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            hasProjects ? "pr-8" : "pr-2.5",
            listActive
              ? "bg-accent-muted text-accent"
              : "text-nav-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute -left-3 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent transition-opacity duration-150",
              listActive ? "opacity-100" : "opacity-0"
            )}
          />
          <FolderKanban
            className={cn(
              "size-4 shrink-0 transition-colors",
              listActive ? "text-accent" : "text-nav-foreground group-hover:text-foreground"
            )}
          />
          Projects
        </Link>
        {hasProjects ? (
          <button
            type="button"
            aria-label={expanded ? "Collapse projects" : "Expand projects"}
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded((value) => !value)}
            className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-nav-foreground transition-colors duration-150 hover:bg-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <ChevronRight
              aria-hidden="true"
              className={cn("size-4 transition-transform duration-150", expanded && "rotate-90")}
            />
          </button>
        ) : null}
      </div>
      <div
        id={listId}
        hidden={!expanded || !hasProjects}
        className="mt-0.5 flex flex-col gap-0.5"
      >
        {items.map((project) => {
          const href = `${listHref}/${project.id}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={project.id}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md py-1.5 pl-9 pr-2.5 text-small transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                active
                  ? "bg-accent-muted font-medium text-accent"
                  : "text-nav-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span
                aria-hidden="true"
                className="flex size-4 shrink-0 items-center justify-center text-caption leading-none"
              >
                {project.icon ? (
                  project.icon
                ) : (
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      active ? "bg-accent" : "bg-muted-foreground/50"
                    )}
                  />
                )}
              </span>
              <span className="truncate">{project.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
