"use client";

import { useEffect, useState } from "react";
import type { ComponentType, DragEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ChevronRight,
  CircleUser,
  Eye,
  EyeOff,
  FileText,
  FolderKanban,
  GripVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Inbox,
  MoreHorizontal,
  Paperclip,
  Pin,
  Settings,
  Video,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from "@elliptic/ui";
import { OrgSwitcher } from "./org-switcher";
import { SidebarFavorites } from "./sidebar-favorites";
import { SidebarProjects } from "./sidebar-projects";
import { UserMenu } from "./user-menu";
import {
  useSidebarPrefs,
  type ResolvedSidebarItem,
  type SidebarSection,
} from "./sidebar-prefs";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "my-tasks": CircleUser,
  inbox: Inbox,
  notes: FileText,
  drive: Paperclip,
  projects: FolderKanban,
  meetings: Video,
  activity: Activity,
  settings: Settings,
};

const SECTION_LABELS: Record<SidebarSection, string> = {
  personal: "Personal",
  team: "Workspace",
};

const SECTION_ORDER: readonly SidebarSection[] = ["personal", "team"];

const COLLAPSE_KEY = "elliptic:sidebar-collapsed";

export function Sidebar({
  orgId,
  className,
  collapsible = false,
}: {
  orgId: string;
  className?: string;
  collapsible?: boolean;
}) {
  const pathname = usePathname();
  const prefs = useSidebarPrefs();
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsedPref, setCollapsedPref] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCollapsedPref(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  const collapsed = collapsible && collapsedPref;
  const toggleCollapsed = () => {
    setCollapsedPref((value) => {
      const next = !value;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      }
      return next;
    });
  };

  const handleDrop = (targetKey: string | null) => {
    if (dragKey) prefs.reorder(dragKey, targetKey);
    setDragKey(null);
    setOverKey(null);
  };

  const renderItem = (item: ResolvedSidebarItem) => {
    // Projects expands to an inline, highlightable list of every project.
    // Only when visible — a hidden "projects" falls back to the normal row so it
    // keeps its "Show" action and doesn't render the full widget inside "More".
    if (item.key === "projects" && !collapsed && !item.hidden) {
      return <SidebarProjects key={item.key} orgId={orgId} pathname={pathname} />;
    }

    const Icon = ICONS[item.key] ?? FileText;
    const href = `/app/${orgId}/${item.segment}`;
    const active = pathname === href || pathname.startsWith(`${href}/`);
    const dragging = dragKey === item.key;
    const dropTarget = overKey === item.key && dragKey !== null && dragKey !== item.key;

    if (collapsed) {
      return (
        <Link
          key={item.key}
          href={href}
          title={item.label}
          aria-label={item.label}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center justify-center rounded-md py-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            active
              ? "bg-accent-muted text-accent"
              : "text-nav-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Icon className="size-4 shrink-0" />
        </Link>
      );
    }

    return (
      <DropdownMenu
        key={item.key}
        open={menuKey === item.key}
        onOpenChange={(open) => setMenuKey(open ? item.key : null)}
      >
        <div
          draggable
          onDragStart={(event: DragEvent<HTMLDivElement>) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", item.key);
            setDragKey(item.key);
          }}
          onDragEnd={() => {
            setDragKey(null);
            setOverKey(null);
          }}
          onDragOver={(event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setOverKey(item.key);
          }}
          onDrop={(event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            handleDrop(item.key);
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            setMenuKey(item.key);
          }}
          className={cn(
            "group relative rounded-md transition-opacity duration-150",
            dragging && "opacity-40",
            dropTarget && "before:absolute before:-top-0.5 before:left-1 before:right-1 before:h-0.5 before:rounded-full before:bg-accent"
          )}
        >
          <Link
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md py-2 pl-2.5 pr-8 text-small font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              active
                ? "bg-accent-muted text-accent"
                : "text-nav-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute -left-3 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent transition-opacity duration-150",
                active ? "opacity-100" : "opacity-0"
              )}
            />
            <Icon
              className={cn(
                "size-4 shrink-0 transition-colors",
                active ? "text-accent" : "text-nav-foreground group-hover:text-foreground"
              )}
            />
            {item.label}
          </Link>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-1/2 flex -translate-x-3 -translate-y-1/2 items-center text-muted-foreground/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          >
            <GripVertical className="size-3.5" />
          </span>
          <DropdownMenuTrigger
            aria-label={`${item.label} options`}
            title="Options"
            className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-nav-foreground opacity-0 transition-colors duration-150 hover:bg-subtle hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
        </div>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => prefs.pinToTop(item.key)}>
            <Pin />
            Pin to top
          </DropdownMenuItem>
          {item.hidden ? (
            <DropdownMenuItem onSelect={() => prefs.show(item.key)}>
              <Eye />
              Show
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => prefs.hide(item.key)}>
              <EyeOff />
              Move to More
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const renderSection = (section: SidebarSection, first: boolean) => {
    const items = prefs.visible.filter((item) => item.section === section);
    if (items.length === 0) return null;
    return (
      <div key={section}>
        {collapsed ? (
          <div className={cn("h-px bg-border/60", first ? "mt-1 mb-1" : "my-2")} aria-hidden />
        ) : (
          <p
            className={cn(
              "px-2.5 pb-1 text-caption font-medium text-muted-foreground/70",
              first ? "pt-2" : "pt-5"
            )}
          >
            {SECTION_LABELS[section]}
          </p>
        )}
        <div className="flex flex-col gap-0.5">{items.map(renderItem)}</div>
      </div>
    );
  };

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col bg-sidebar transition-[width] duration-150",
        collapsed ? "w-16" : "w-60",
        className
      )}
    >
      <div className="p-3">
        <OrgSwitcher orgId={orgId} collapsed={collapsed} />
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 px-3 pb-3">
        {(() => {
          let firstRendered = true;
          return SECTION_ORDER.map((section) => {
            const hasItems = prefs.visible.some((item) => item.section === section);
            if (!hasItems) return null;
            const node = renderSection(section, firstRendered);
            firstRendered = false;
            return node;
          });
        })()}

        {collapsed ? null : <SidebarFavorites orgId={orgId} />}

        {!collapsed && prefs.hiddenItems.length > 0 && (
          <div
            onDragOver={(event: DragEvent<HTMLDivElement>) => {
              event.preventDefault();
              setOverKey(null);
            }}
            onDrop={(event: DragEvent<HTMLDivElement>) => {
              event.preventDefault();
              handleDrop(null);
            }}
            className="mt-5"
          >
            <button
              type="button"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((open) => !open)}
              className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-caption font-medium text-muted-foreground/70 transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <ChevronRight
                aria-hidden="true"
                className={cn(
                  "size-3.5 transition-transform duration-150",
                  moreOpen && "rotate-90"
                )}
              />
              More
              <span className="text-muted-foreground/50">{prefs.hiddenItems.length}</span>
            </button>
            {moreOpen && (
              <div className="mt-1 flex flex-col gap-0.5">
                {prefs.hiddenItems.map(renderItem)}
              </div>
            )}
          </div>
        )}
      </nav>
      {collapsible ? (
        <div className="px-3 pb-1">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full items-center gap-2 rounded-md py-1.5 text-caption text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground",
              collapsed ? "justify-center" : "px-2.5"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <>
                <PanelLeftClose className="size-4" />
                Collapse
              </>
            )}
          </button>
        </div>
      ) : null}
      <div className="border-t border-border p-2">
        <UserMenu orgId={orgId} collapsed={collapsed} />
      </div>
    </aside>
  );
}
