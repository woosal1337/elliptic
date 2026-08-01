"use client";

import { useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import {
  type ChangelogCategory,
  useChangelog,
  useCreateChangelogEntry,
  useDeleteChangelogEntry,
} from "@/hooks/use-release-queries";

const CATEGORIES: ChangelogCategory[] = [
  "added",
  "changed",
  "fixed",
  "removed",
  "security",
  "deprecated",
];

const CATEGORY_VARIANT: Record<ChangelogCategory, "success" | "neutral" | "warning" | "danger"> = {
  added: "success",
  changed: "neutral",
  fixed: "warning",
  removed: "neutral",
  security: "danger",
  deprecated: "neutral",
};

export function ChangelogManager({ orgId, releaseId }: { orgId: string; releaseId: string }) {
  const changelog = useChangelog(orgId, releaseId);
  const create = useCreateChangelogEntry(orgId, releaseId);
  const remove = useDeleteChangelogEntry(orgId, releaseId);
  const [category, setCategory] = useState<ChangelogCategory>("added");
  const [title, setTitle] = useState("");
  const [pr, setPr] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    create.mutate(
      { category, title: title.trim(), pr_url: pr.trim() || undefined },
      {
        onSuccess: () => {
          setTitle("");
          setPr("");
        },
      }
    );
  };

  const entries = changelog.data ?? [];

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <h3 className="text-small font-semibold text-foreground">Release notes</h3>

      <div className="flex flex-wrap items-end gap-2">
        <Select value={category} onValueChange={(value) => setCategory(value as ChangelogCategory)}>
          <SelectTrigger className="w-32 capitalize" aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat} className="capitalize">
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="What changed?"
          value={title}
          className="min-w-48 flex-1"
          onChange={(event) => setTitle(event.target.value)}
        />
        <Input placeholder="PR URL (optional)" value={pr} className="w-44" onChange={(event) => setPr(event.target.value)} />
        <Button size="sm" onClick={submit} loading={create.isPending} disabled={!title.trim()}>
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      {changelog.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : entries.length === 0 ? (
        <p className="text-caption text-muted-foreground/70">No release notes yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {CATEGORIES.filter((cat) => entries.some((entry) => entry.category === cat)).map((cat) => (
            <div key={cat} className="flex flex-col gap-1.5">
              <Badge variant={CATEGORY_VARIANT[cat]} size="sm" className="self-start capitalize">
                {cat}
              </Badge>
              <ul className="flex flex-col gap-1">
                {entries
                  .filter((entry) => entry.category === cat)
                  .map((entry) => (
                    <li
                      key={entry.id}
                      className="group flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-small"
                    >
                      <span className="min-w-0 flex-1 truncate text-foreground">{entry.title}</span>
                      {entry.pr_url ? (
                        <a
                          href={entry.pr_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Open PR"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      ) : null}
                      <IconButton
                        aria-label="Delete entry"
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={() => remove.mutate(entry.id)}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
