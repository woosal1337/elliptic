"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@elliptic/ui";
import { PageHeader } from "@/components/page-header";
import { InboxContent } from "@/components/notifications/inbox-content";
import { HomePreferenceControl } from "@/components/notifications/home-preference-control";
import { CatchUpPanel } from "@/components/inbox/catch-up-panel";
import type { NotificationStatus } from "@/hooks/use-notification-queries";

const TABS: { value: NotificationStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "archived", label: "Archived" },
];

export default function InboxPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [status, setStatus] = useState<NotificationStatus>("all");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Inbox"
        actions={<HomePreferenceControl />}
      />
      <CatchUpPanel orgId={orgId} />
      <Tabs value={status} onValueChange={(value) => setStatus(value as NotificationStatus)}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
        <InboxContent orgId={orgId} active status={status} />
      </div>
    </div>
  );
}
