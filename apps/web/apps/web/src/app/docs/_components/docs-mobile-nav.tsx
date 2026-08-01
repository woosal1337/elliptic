"use client";

import { usePathname } from "next/navigation";
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

export function DocsMobileNav({ basePath }: { basePath: string }) {
  const pathname = usePathname();
  const active = currentSlug(basePath, pathname);
  const items = DOCS_NAV.flatMap((group) => group.items);

  return (
    <div className="sticky top-14 z-20 border-b border-border bg-canvas/80 backdrop-blur-xl md:hidden">
      <div className="flex gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const isActive = item.slug === active;
          return (
            <a
              key={item.slug}
              href={hrefFor(basePath, item.slug)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-small font-medium transition-colors duration-150",
                isActive
                  ? "bg-accent-muted text-accent"
                  : "text-nav-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </a>
          );
        })}
        <a
          href="/llms-full.txt"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-small font-medium text-nav-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
        >
          llms-full.txt
        </a>
      </div>
    </div>
  );
}
