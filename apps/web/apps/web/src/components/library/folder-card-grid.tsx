"use client";

import * as React from "react";
import { Folder } from "lucide-react";
import { cn } from "@elliptic/ui";

export interface FolderCardItem {
  id: string;
  label: string;
  /** "3 files", "1 item" — already worded by the caller. */
  countLabel: string;
  /** An action for the folder itself, shown in the card corner. */
  action?: React.ReactNode;
}

/** The folder tiles that open a level of the library. */
export function FolderCardGrid({
  items,
  onOpen,
  className,
}: {
  items: FolderCardItem[];
  onOpen: (id: string) => void;
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4", className)}>
      {items.map((item) => (
        <li key={item.id} className="relative">
          <button
            type="button"
            onClick={() => onOpen(item.id)}
            className="group flex w-full flex-col items-start gap-3 rounded-lg border border-border bg-surface p-4 text-left shadow-xs transition-[border-color,box-shadow] duration-150 ease-out hover:border-input hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <span className="flex size-11 items-center justify-center rounded-lg bg-subtle text-muted-foreground transition-colors duration-150 group-hover:text-foreground">
              <Folder className="size-5" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="w-full truncate text-small font-medium text-foreground">
                {item.label}
              </span>
              <span className="text-caption text-muted-foreground">{item.countLabel}</span>
            </span>
          </button>
          {item.action ? <span className="absolute right-2 top-2">{item.action}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** The section headings above the folder grid and the file table. */
export function LibrarySectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-small font-semibold text-foreground">{children}</h2>;
}
