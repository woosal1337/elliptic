import type { ReactNode } from "react";
import { Logo } from "@elliptic/ui";
import { getDocsBasePath } from "./_lib/base-path";
import { DocsSidebar } from "./_components/docs-sidebar";
import { DocsMobileNav } from "./_components/docs-mobile-nav";

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const basePath = await getDocsBasePath();
  const home = basePath || "/";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-canvas px-4 supports-[backdrop-filter]:bg-canvas/70 supports-[backdrop-filter]:backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3">
          <a href={home} aria-label="Elliptic docs home" className="flex items-center">
            <Logo />
          </a>
          <span className="text-mono-label font-mono uppercase tracking-wide text-muted-foreground">
            Docs
          </span>
        </div>
        <a
          href="https://elliptic.sh/app"
          className="text-small text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          Open app →
        </a>
      </header>

      <DocsMobileNav basePath={basePath} />

      <div className="flex flex-1">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-border bg-surface md:block">
          <DocsSidebar basePath={basePath} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
