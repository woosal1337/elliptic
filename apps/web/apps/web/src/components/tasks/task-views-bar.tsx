"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Lock, LockOpen, Pencil, Pin, Plus, Star, Trash2 } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Input,
  cn,
} from "@elliptic/ui";
import type { SavedView, UseTaskViews, ViewConfig } from "./task-views";

function configsEqual(a: ViewConfig, b: ViewConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function TaskViewsBar<TConfig extends ViewConfig>({
  store,
  activeId,
  current,
  onApply,
  onClearActive,
}: {
  store: UseTaskViews<TConfig>;
  activeId: string | null;
  current: TConfig;
  onApply: (view: SavedView<TConfig>) => void;
  onClearActive: () => void;
}) {
  const { views, defaultId, saveView, updateView, renameView, deleteView, setDefault, toggleLock } =
    store;
  const [naming, setNaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const activeView = views.find((view) => view.id === activeId) ?? null;
  const dirty = activeView ? !configsEqual(activeView.config, current) : false;

  useEffect(() => {
    if (naming) inputRef.current?.focus();
  }, [naming]);

  const commitSave = () => {
    const name = draftName.trim();
    if (!name) return;
    const view = saveView(name, current);
    onApply(view);
    setNaming(false);
    setDraftName("");
  };

  if (views.length === 0 && !naming) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-caption text-muted-foreground"
          onClick={() => setNaming(true)}
        >
          <Plus className="size-3.5" />
          Save view
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        role="tablist"
        aria-label="Saved views"
        className="flex flex-wrap items-center gap-1"
      >
        {views.map((view) => {
          const active = view.id === activeId;
          return (
            <button
              key={view.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onApply(view)}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-caption font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                active
                  ? "border-accent/50 bg-accent/10 text-foreground"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground"
              )}
            >
              {view.id === defaultId ? (
                <Star className="size-3 fill-warning text-warning" aria-label="Default view" />
              ) : null}
              <span className="max-w-40 truncate">{view.name}</span>
              {active && dirty ? (
                <span className="size-1.5 rounded-full bg-accent" aria-label="Unsaved changes" />
              ) : null}
            </button>
          );
        })}
      </span>

      {naming ? (
        <span className="inline-flex items-center gap-1">
          <Input
            ref={inputRef}
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitSave();
              if (event.key === "Escape") {
                setNaming(false);
                setDraftName("");
              }
            }}
            placeholder="View name…"
            aria-label="View name"
            className="h-7 w-36 text-caption"
          />
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={commitSave}>
            <Check className="size-3.5" />
          </Button>
        </span>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-caption text-muted-foreground"
              aria-label="View options"
            >
              Views
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Views</DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={() => {
                setDraftName("");
                setNaming(true);
              }}
            >
              <Plus className="size-3.5" />
              Save current as view…
            </DropdownMenuItem>
            {activeView ? (
              <DropdownMenuItem
                disabled={!dirty || activeView.locked}
                onSelect={() => updateView(activeView.id, current)}
              >
                <Check className="size-3.5" />
                Update “{activeView.name}”
              </DropdownMenuItem>
            ) : null}
            {activeId ? (
              <DropdownMenuItem onSelect={onClearActive}>Clear active view</DropdownMenuItem>
            ) : null}
            {views.length > 0 ? <DropdownMenuSeparator /> : null}
            {views.map((view) => (
              <ViewMenuRow
                key={view.id}
                view={view}
                isDefault={view.id === defaultId}
                onSetDefault={() => setDefault(view.id === defaultId ? null : view.id)}
                onToggleLock={() => toggleLock(view.id)}
                onRename={(name) => renameView(view.id, name)}
                onDelete={() => {
                  if (view.id === activeId) onClearActive();
                  deleteView(view.id);
                }}
              />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function ViewMenuRow<TConfig extends ViewConfig>({
  view,
  isDefault,
  onSetDefault,
  onToggleLock,
  onRename,
  onDelete,
}: {
  view: SavedView<TConfig>;
  isDefault: boolean;
  onSetDefault: () => void;
  onToggleLock: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const locked = view.locked ?? false;
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      <span className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 text-small">
        {isDefault ? (
          <Star className="size-3 shrink-0 fill-warning text-warning" aria-hidden="true" />
        ) : (
          <span className="size-3 shrink-0" aria-hidden="true" />
        )}
        <span className="truncate text-foreground/90">{view.name}</span>
      </span>
      <IconButton
        size="sm"
        aria-label={isDefault ? `Remove ${view.name} as default` : `Set ${view.name} as default`}
        title={isDefault ? "Remove default" : "Set as default"}
        onClick={onSetDefault}
        className={isDefault ? "text-warning" : "text-muted-foreground"}
      >
        <Pin className="size-3.5" />
      </IconButton>
      <IconButton
        size="sm"
        aria-label={locked ? `Unlock ${view.name}` : `Lock ${view.name}`}
        title={locked ? "Unlock view" : "Lock view"}
        onClick={onToggleLock}
        className={locked ? "text-foreground" : "text-muted-foreground"}
      >
        {locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
      </IconButton>
      <IconButton
        size="sm"
        aria-label={`Rename ${view.name}`}
        title={locked ? "Locked" : "Rename"}
        disabled={locked}
        onClick={() => {
          const next = window.prompt("Rename view", view.name);
          if (next !== null) onRename(next);
        }}
        className="text-muted-foreground"
      >
        <Pencil className="size-3.5" />
      </IconButton>
      <IconButton
        size="sm"
        aria-label={`Delete ${view.name}`}
        title={locked ? "Locked" : "Delete"}
        disabled={locked}
        onClick={onDelete}
        className="text-muted-foreground hover:text-danger"
      >
        <Trash2 className="size-3.5" />
      </IconButton>
    </div>
  );
}
