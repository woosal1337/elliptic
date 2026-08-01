"use client";

import { useState } from "react";
import { ExternalLink, Link2, Plus, X } from "lucide-react";
import { Button, IconButton, Input, Skeleton } from "@elliptic/ui";
import { useAddTaskLink, useDeleteTaskLink, useTaskLinks } from "@/hooks/use-task-queries";

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function linkHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function faviconUrl(host: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
}

export function TaskLinksSection({ orgId, taskId }: { orgId: string; taskId: string }) {
  const links = useTaskLinks(orgId, taskId);
  const addLink = useAddTaskLink(orgId, taskId);
  const deleteLink = useDeleteTaskLink(orgId, taskId);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const submit = () => {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    addLink.mutate(
      { url: normalized, title: title.trim() || null },
      {
        onSuccess: () => {
          setUrl("");
          setTitle("");
          setAdding(false);
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {links.isPending ? (
        <Skeleton className="h-12 w-full rounded-lg" />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {(links.data ?? []).map((link) => {
            const host = linkHost(link.url);
            return (
              <li key={link.id} className="flex items-center gap-1.5">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-border bg-surface px-2.5 py-2 transition-colors hover:border-border-strong hover:bg-muted/40"
                >
                  <span
                    aria-hidden
                    className="size-6 shrink-0 rounded bg-muted bg-cover bg-center"
                    style={{ backgroundImage: `url(${faviconUrl(host)})` }}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-small font-medium text-foreground">
                      {link.title || host}
                    </span>
                    <span className="truncate text-caption text-muted-foreground">{host}</span>
                  </span>
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
                <IconButton
                  aria-label="Remove link"
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteLink.mutate(link.id)}
                >
                  <X className="size-4" />
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2">
          <Input
            autoFocus
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="https://…"
            aria-label="Link URL"
          />
          <div className="flex items-center gap-2">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Title (optional)"
              aria-label="Link title"
              className="flex-1"
            />
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              loading={addLink.isPending}
              disabled={url.trim().length === 0}
            >
              Add
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 self-start rounded-md px-1 py-1 text-caption text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="size-3.5" aria-hidden />
          <Link2 className="size-3.5" aria-hidden />
          Add link
        </button>
      )}
    </div>
  );
}
