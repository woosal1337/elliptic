"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from "@elliptic/ui";
import { useShortcut } from "@/lib/keyboard";
import { useUnreadCount } from "@/hooks/use-notification-queries";
import { InboxContent } from "./inbox-content";

function formatBadge(count: number): string {
  return count > 9 ? "9+" : String(count);
}

export function NotificationBell({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount(orgId);
  const count = unread.data ?? 0;

  useShortcut(
    { id: "nav-inbox", keys: "g i", label: "Go to Inbox", scope: "navigation" },
    () => router.push(`/app/${orgId}/inbox`)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={count > 0 ? `Inbox, ${count} unread` : "Inbox"}
        className={cn(
          "group relative flex size-8 items-center justify-center rounded-md text-nav-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          open && "bg-muted text-foreground"
        )}
      >
        <Bell className="size-4" />
        {count > 0 ? (
          <span
            aria-hidden="true"
            className="tabular absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] font-semibold leading-none text-accent-foreground ring-2 ring-surface"
          >
            {formatBadge(count)}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[22rem] p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <InboxContent
          orgId={orgId}
          active={open}
          status="all"
          compact
          onNavigate={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
