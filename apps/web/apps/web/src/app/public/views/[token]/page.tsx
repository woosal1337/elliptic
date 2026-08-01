"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { Badge, Skeleton } from "@companyos/ui";
import { api } from "@/lib/api";

interface PublicViewTask {
  identifier: string;
  title: string;
  status: string;
  priority: string;
}

interface PublicView {
  name: string;
  tasks: PublicViewTask[];
}

const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
  canceled: "Canceled",
};

export default function PublicViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const view = useQuery({
    queryKey: ["public-view", token],
    queryFn: ({ signal }) => api.get<PublicView>(`/api/v1/public/views/${token}`, signal),
    retry: false,
  });

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="flex items-center gap-2 text-muted-foreground">
        <Eye className="size-4" />
        <span className="text-caption">Public view · read-only</span>
      </header>

      {view.isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : view.isError ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <h1 className="text-h4 font-semibold text-foreground">View not found</h1>
          <p className="mt-1 text-small text-muted-foreground">
            This public link has been unpublished or doesn&apos;t exist.
          </p>
        </div>
      ) : (
        <>
          <h1 className="text-h2 font-semibold text-foreground">{view.data.name}</h1>
          <p className="text-caption text-muted-foreground">
            {view.data.tasks.length} {view.data.tasks.length === 1 ? "item" : "items"}
          </p>
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
            {view.data.tasks.map((task) => (
              <li
                key={task.identifier}
                className="flex items-center gap-3 bg-surface px-4 py-2.5 text-small"
              >
                <span className="shrink-0 font-mono text-caption text-muted-foreground">
                  {task.identifier}
                </span>
                <span className="min-w-0 flex-1 truncate text-foreground">{task.title}</span>
                {task.priority !== "none" ? (
                  <Badge variant="outline" size="sm" className="capitalize">
                    {task.priority}
                  </Badge>
                ) : null}
                <Badge variant="neutral" size="sm">
                  {STATUS_LABEL[task.status] ?? task.status}
                </Badge>
              </li>
            ))}
          </ul>
          {view.data.tasks.length === 0 ? (
            <p className="text-center text-small text-muted-foreground">No items in this view.</p>
          ) : null}
          <footer className="mt-auto pt-8 text-center text-caption text-muted-foreground">
            Powered by Elliptic
          </footer>
        </>
      )}
    </div>
  );
}
