"use client";

import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { Kbd } from "@elliptic/ui";
import { useCommandMenu } from "@/components/command/command-menu-provider";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HelpMenu } from "@/components/help/help-menu";
import { SyncIndicator } from "@/components/sync-indicator";
import { GlobalQuickAdd } from "@/components/tasks/global-quick-add";

const SEGMENT_LABELS: Record<string, string> = {
  projects: "Projects",
  meetings: "Meetings",
  notes: "Notes",
  calendar: "Calendar",
  activity: "Activity",
  settings: "Settings",
};

function deriveTitle(pathname: string, orgId: string): string {
  const rest = pathname.replace(`/app/${orgId}`, "").split("/").filter(Boolean);
  const segment = rest[0];
  if (!segment) return "Home";
  return SEGMENT_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Topbar({ orgId, onMenuClick }: { orgId: string; onMenuClick?: () => void }) {
  const pathname = usePathname();
  const { open } = useCommandMenu();
  const title = deriveTitle(pathname, orgId);

  return (
    <header className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="-ml-1 flex size-8 shrink-0 items-center justify-center rounded-md text-nav-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 md:hidden"
        >
          <Menu className="size-4" />
        </button>
        <span className="truncate text-small font-medium text-nav-foreground">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <GlobalQuickAdd orgId={orgId} />
        <SyncIndicator />
        <button
          type="button"
          onClick={open}
          className="group flex h-8 items-center gap-2 rounded-md border border-border bg-muted/40 pl-2.5 pr-1.5 text-nav-foreground transition-colors duration-150 hover:border-input hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label="Open command palette"
        >
          <Search className="size-3.5" />
          <span className="hidden text-small sm:inline">Search</span>
          <Kbd className="ml-1 hidden sm:inline-flex">⌘K</Kbd>
        </button>
        <HelpMenu />
        <NotificationBell orgId={orgId} />
      </div>
    </header>
  );
}
