"use client";

import * as React from "react";
import { Folder, FolderOpen, type LucideIcon } from "lucide-react";
import { cn } from "@elliptic/ui";

export interface FolderTreeNode {
  /** Stable key — a Drive path or a note id. */
  id: string;
  label: string;
  depth: number;
  /** Direct content count shown as a badge. Hidden when undefined or zero. */
  count?: number;
}

/**
 * The left rail both libraries share: one root row and a flat list of folder
 * rows already ordered and carrying their depth. The tree stays fully open —
 * the workspaces this serves hold tens of folders, not thousands, and a
 * disclosure toggle would cost a click on every visit to save none.
 */
export function FolderTree({
  rootLabel,
  rootIcon: RootIcon,
  nodes,
  selectedId,
  onSelectRoot,
  onSelect,
  label,
}: {
  rootLabel: string;
  rootIcon: LucideIcon;
  nodes: FolderTreeNode[];
  /** null means the root is open. */
  selectedId: string | null;
  onSelectRoot: () => void;
  onSelect: (id: string) => void;
  label: string;
}) {
  return (
    <nav aria-label={label} className="flex flex-col gap-0.5">
      <TreeRow
        icon={RootIcon}
        label={rootLabel}
        depth={0}
        selected={selectedId === null}
        onClick={onSelectRoot}
      />
      {nodes.map((node) => (
        <TreeRow
          key={node.id}
          icon={selectedId === node.id ? FolderOpen : Folder}
          label={node.label}
          depth={node.depth + 1}
          count={node.count}
          selected={selectedId === node.id}
          onClick={() => onSelect(node.id)}
        />
      ))}
    </nav>
  );
}

function TreeRow({
  icon: Icon,
  label,
  depth,
  count,
  selected,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  depth: number;
  count?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected || undefined}
      style={{ paddingLeft: `${0.5 + depth * 0.875}rem` }}
      className={cn(
        "flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-small transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        selected
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count ? (
        <span className="tabular shrink-0 rounded-full bg-subtle px-1.5 py-0.5 text-caption text-muted-foreground">
          {count}
        </span>
      ) : null}
    </button>
  );
}
