"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LayoutDashboard, Plus, Trash2 } from "lucide-react";
import { Button, IconButton, Input, Skeleton } from "@elliptic/ui";
import {
  useCreateDashboard,
  useDashboards,
  useDeleteDashboard,
} from "@/hooks/use-dashboard-queries";

export default function DashboardsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const dashboards = useDashboards(orgId);
  const create = useCreateDashboard(orgId);
  const remove = useDeleteDashboard(orgId);
  const [name, setName] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    create.mutate({ name: name.trim() }, { onSuccess: () => setName("") });
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-h3 font-semibold text-foreground">
          <LayoutDashboard className="size-5 text-accent" />
          Dashboards
        </h1>
        <p className="text-small text-muted-foreground">
          Build a grid of chart widgets over your workspace metrics.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder="New dashboard name"
          className="max-w-xs"
        />
        <Button onClick={submit} loading={create.isPending} disabled={!name.trim()}>
          <Plus className="size-4" />
          Create
        </Button>
      </div>

      {dashboards.isPending ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : (dashboards.data ?? []).length === 0 ? (
        <p className="text-small text-muted-foreground">No dashboards yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(dashboards.data ?? []).map((dashboard) => (
            <li
              key={dashboard.id}
              className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
            >
              <Link
                href={`/app/${orgId}/dashboards/${dashboard.id}`}
                className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
              >
                <LayoutDashboard className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-small font-medium text-foreground">
                  {dashboard.name}
                </span>
              </Link>
              <IconButton
                aria-label={`Delete ${dashboard.name}`}
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => remove.mutate(dashboard.id)}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
