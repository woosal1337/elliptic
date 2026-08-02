"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Logo, Sheet, SheetContent, SheetTitle, Skeleton, TooltipProvider } from "@elliptic/ui";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { CommandMenuProvider } from "@/components/command/command-menu-provider";
import { SettingsCommands } from "@/components/command/settings-commands";
import { ErrorState } from "@/components/error-state";
import { useActivityStream } from "@/hooks/use-activity-stream";
import { useOrgs } from "@/hooks/use-org-queries";
import { StickyDock } from "@/components/stickies/sticky-dock";
import { clearLastOrgId, setLastOrgId } from "@/lib/storage";
import { isUuid } from "@/lib/uuid";

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ orgId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const orgs = useOrgs();
  const [navOpen, setNavOpen] = useState(false);

  const validFormat = isUuid(params.orgId);
  const isMember = orgs.isSuccess && orgs.data.some((org) => org.id === params.orgId);
  const rejected = !validFormat || (orgs.isSuccess && !isMember);

  useActivityStream(isMember ? params.orgId : "");

  useEffect(() => {
    if (rejected) {
      clearLastOrgId();
      router.replace("/app");
    } else if (isMember) {
      setLastOrgId(params.orgId);
    }
  }, [rejected, isMember, params.orgId, router]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  if (!isMember) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-dot-grid mask-fade-radial opacity-60"
        />
        <div className="relative flex w-full max-w-sm flex-col items-center gap-6 text-center">
          <Logo />
          {validFormat && orgs.isError ? (
            <ErrorState error={orgs.error} onRetry={() => void orgs.refetch()} />
          ) : (
            <div className="flex w-full flex-col items-center gap-3">
              <Skeleton className="h-4 w-44" />
              <p className="text-small text-muted-foreground">
                {rejected ? "Taking you to your workspace…" : "Loading your workspace…"}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <CommandMenuProvider orgId={params.orgId}>
        <SettingsCommands orgId={params.orgId} />
        <div className="flex h-dvh overflow-hidden bg-shell">
          <Sidebar orgId={params.orgId} className="hidden md:flex" collapsible />
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetContent>
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Sidebar orgId={params.orgId} className="w-full border-r-0" />
            </SheetContent>
          </Sheet>
          <div className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pr-2">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-container lg:rounded-md lg:border lg:border-border">
              <Topbar orgId={params.orgId} onMenuClick={() => setNavOpen(true)} />
              <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
          <StickyDock orgId={params.orgId} />
        </div>
      </CommandMenuProvider>
    </TooltipProvider>
  );
}
