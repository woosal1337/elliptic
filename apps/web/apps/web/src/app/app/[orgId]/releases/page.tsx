"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Rocket, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  DatePicker,
  EmptyState,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import type { Release, ReleaseStatus } from "@/lib/types";
import { formatDate } from "@/lib/format";
import {
  useCreateRelease,
  useDeleteRelease,
  useReleases,
  useUpdateRelease,
} from "@/hooks/use-release-queries";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/error-state";

const STATUS_META: Record<
  ReleaseStatus,
  { label: string; variant: "neutral" | "success" | "warning" }
> = {
  planned: { label: "Planned", variant: "warning" },
  released: { label: "Released", variant: "success" },
  archived: { label: "Archived", variant: "neutral" },
};

const STATUS_ORDER: ReleaseStatus[] = ["planned", "released", "archived"];

function ReleaseCard({ orgId, release }: { orgId: string; release: Release }) {
  const updateRelease = useUpdateRelease(orgId);
  const deleteRelease = useDeleteRelease(orgId);
  const total = release.task_total || 1;
  const pct = Math.round((release.task_done / total) * 100);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Rocket className="size-4 text-muted-foreground" />
          <Link
            href={`/app/${orgId}/releases/${release.id}`}
            className="text-small font-semibold text-foreground hover:text-accent hover:underline"
          >
            {release.name}
          </Link>
          {release.version ? (
            <Badge variant="outline" className="font-mono">
              {release.version}
            </Badge>
          ) : null}
          <Badge variant={STATUS_META[release.status].variant}>
            {STATUS_META[release.status].label}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Select
            value={release.status}
            onValueChange={(value) =>
              updateRelease.mutate({ releaseId: release.id, status: value as ReleaseStatus })
            }
          >
            <SelectTrigger className="h-8 w-32" aria-label="Release status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_META[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <IconButton
            aria-label={`Delete ${release.name}`}
            variant="ghost"
            size="sm"
            onClick={() => deleteRelease.mutate(release.id)}
          >
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>
      <div className="flex items-center gap-2 text-caption text-muted-foreground">
        <span className="tabular">
          {release.task_done}/{release.task_total} done
        </span>
        {release.released_at ? (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span>Target {formatDate(release.released_at)}</span>
          </>
        ) : null}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-success" style={{ width: `${pct}%` }} aria-hidden />
      </div>
    </li>
  );
}

export default function ReleasesPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const releases = useReleases(orgId);
  const createRelease = useCreateRelease(orgId);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [target, setTarget] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    createRelease.mutate(
      { name: name.trim(), version: version.trim() || null, released_at: target || null },
      {
        onSuccess: () => {
          setName("");
          setVersion("");
          setTarget("");
          setAdding(false);
        },
      }
    );
  };

  const rows = releases.data ?? [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
      <PageHeader
        eyebrow="Ship it"
        title="Releases"
        description="Versioned deliverables that bundle work items across projects."
        actions={
          !adding ? <Button onClick={() => setAdding(true)}>New release</Button> : undefined
        }
      />

      {adding ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <Input
            placeholder="Release name (e.g. Summer launch)"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Release name"
            className="min-w-48 flex-1"
          />
          <Input
            placeholder="v1.2.0"
            value={version}
            onChange={(event) => setVersion(event.target.value)}
            aria-label="Version"
            className="w-28"
          />
          <DatePicker
            value={target}
            onChange={(value) => setTarget(value ?? "")}
            placeholder="Release date"
            aria-label="Release date"
            className="w-44"
          />
          <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={submit}
            loading={createRelease.isPending}
            disabled={name.trim().length === 0}
          >
            Create
          </Button>
        </div>
      ) : null}

      {releases.isPending ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : releases.isError ? (
        <ErrorState error={releases.error} onRetry={() => void releases.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          illustration={<Rocket className="size-10 text-muted-foreground" />}
          title="No releases yet"
          description="Create a release to bundle the work items shipping together into a versioned deliverable."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((release) => (
            <ReleaseCard key={release.id} orgId={orgId} release={release} />
          ))}
        </ul>
      )}
    </div>
  );
}
