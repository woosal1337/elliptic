"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@elliptic/ui";

/**
 * The file table both libraries share. Semantic `<table>` markup, because the
 * rows are records with named columns — screen readers announce the header for
 * each cell, which a div grid never gives them.
 *
 * The whole row acts as the open control. A `<tr>` cannot be a `<button>`, so
 * the row takes the click and the name cell holds the real focusable button
 * that the keyboard reaches.
 */
export function LibraryTable({
  columns,
  children,
  "aria-label": ariaLabel,
}: {
  columns: { label: string; className?: string }[];
  children: React.ReactNode;
  "aria-label": string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
      <table aria-label={ariaLabel} className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={cn(
                  "px-4 py-2.5 text-caption font-medium text-muted-foreground",
                  column.className
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function LibraryRow({
  onOpen,
  children,
}: {
  onOpen?: () => void;
  children: React.ReactNode;
}) {
  return (
    <tr
      onClick={onOpen}
      className={cn(
        "border-b border-border transition-colors duration-150 last:border-b-0",
        onOpen && "cursor-pointer hover:bg-muted/60"
      )}
    >
      {children}
    </tr>
  );
}

export function LibraryCell({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

/**
 * The name cell: icon tile, name, and an optional second line. Holds the real
 * button for the row so the keyboard can do what the row click does.
 */
export function LibraryNameCell({
  icon,
  name,
  detail,
  onOpen,
  href,
}: {
  icon: React.ReactNode;
  name: string;
  detail?: string | null;
  onOpen?: () => void;
  href?: string;
}) {
  const body = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-subtle text-muted-foreground">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-small font-medium text-foreground">{name}</span>
        {detail ? (
          <span className="truncate text-caption text-muted-foreground">{detail}</span>
        ) : null}
      </span>
    </>
  );
  const shell =
    "flex min-w-0 items-center gap-3 text-left focus-visible:outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring/40";
  return (
    <LibraryCell>
      {href ? (
        <Link href={href} onClick={(event) => event.stopPropagation()} className={shell}>
          {body}
        </Link>
      ) : onOpen ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          className={cn(shell, "w-full")}
        >
          {body}
        </button>
      ) : (
        <span className={shell}>{body}</span>
      )}
    </LibraryCell>
  );
}
