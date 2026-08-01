"use client";

import { usePathname } from "next/navigation";
import { FileText } from "lucide-react";
import { cn } from "@elliptic/ui";
import { DOCS_NAV, FIRST_SLUG } from "../_content/nav";

function hrefFor(basePath: string, slug: string): string {
  if (slug === FIRST_SLUG) return basePath || "/";
  return `${basePath}/${slug}`;
}

function currentSlug(basePath: string, pathname: string): string {
  let path = pathname;
  if (basePath && path.startsWith(basePath)) path = path.slice(basePath.length) || "/";
  if (path === "/" || path === "") return FIRST_SLUG;
  return path.replace(/^\//, "");
}

export function DocsSidebar({ basePath }: { basePath: string }) {
  const pathname = usePathname();
  const active = currentSlug(basePath, pathname);

  return (
    <nav className="flex flex-col px-3 pb-12 pt-2" aria-label="Documentation">
      {DOCS_NAV.map((group) => (
        <div key={group.heading}>
          <div className="px-2.5 pb-1 pt-5 text-caption font-medium uppercase tracking-wider text-muted-foreground/70">
            {group.heading}
          </div>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const isActive = item.slug === active;
              return (
                <a
                  key={item.slug}
                  href={hrefFor(basePath, item.slug)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-md py-2 pl-2.5 pr-3 text-small font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    isActive
                      ? "bg-accent-muted text-accent"
                      : "text-nav-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {isActive ? (
                    <span
                      aria-hidden
                      className="absolute -left-3 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                    />
                  ) : null}
                  {item.label}
                </a>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-6 border-t border-border pt-4">
        <a
          href="/llms-full.txt"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 rounded-md py-2 pl-2.5 pr-3 text-small font-medium text-nav-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <FileText className="size-3.5 shrink-0" aria-hidden />
          llms-full.txt
        </a>
        <p className="px-2.5 pt-1 text-caption leading-relaxed text-muted-foreground/70">
          The entire docs as one Markdown file for AI agents.
        </p>
      </div>
    </nav>
  );
}
