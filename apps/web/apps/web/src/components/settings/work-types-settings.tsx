"use client";

import { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import { Button, Input, Skeleton } from "@elliptic/ui";
import { useSetTypeLevels, useTypeLevels, type TypeLevel } from "@/hooks/use-type-level-queries";
import { ErrorState } from "@/components/error-state";

const KIND_LABELS: Record<string, string> = {
  epic: "Epic",
  story: "Story",
  task: "Task",
  bug: "Bug",
};

export function WorkTypesSettings({ orgId }: { orgId: string }) {
  const levels = useTypeLevels(orgId);
  const save = useSetTypeLevels(orgId);
  const [draft, setDraft] = useState<TypeLevel[]>([]);

  useEffect(() => {
    if (levels.data) setDraft(levels.data);
  }, [levels.data]);

  if (levels.isError) {
    return <ErrorState error={levels.error} onRetry={() => void levels.refetch()} />;
  }

  const setLevel = (kind: string, value: number) =>
    setDraft((current) =>
      current.map((entry) => (entry.kind === kind ? { ...entry, level: value } : entry))
    );

  const ordered = [...draft].sort((a, b) => b.level - a.level);

  return (
    <section className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <Layers className="size-4 text-muted-foreground" />
          Work-item type hierarchy
        </h2>
        <p className="text-caption text-muted-foreground">
          Higher-level types sit above lower ones. A higher-level item can&apos;t be nested under a
          lower-level one; same-level nesting is allowed.
        </p>
      </div>

      {levels.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {ordered.map((entry) => (
              <li
                key={entry.kind}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <span className="flex-1 text-small text-foreground">
                  {KIND_LABELS[entry.kind] ?? entry.kind}
                </span>
                <label className="text-caption text-muted-foreground" htmlFor={`lvl-${entry.kind}`}>
                  Level
                </label>
                <Input
                  id={`lvl-${entry.kind}`}
                  type="number"
                  min={1}
                  max={10}
                  value={entry.level}
                  className="w-20"
                  onChange={(event) =>
                    setLevel(entry.kind, Math.max(1, Number(event.target.value) || 1))
                  }
                />
              </li>
            ))}
          </ul>
          <div>
            <Button size="sm" loading={save.isPending} onClick={() => save.mutate(draft)}>
              Save hierarchy
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
