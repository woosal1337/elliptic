"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Kanban } from "lucide-react";
import { Badge, Skeleton } from "@elliptic/ui";
import { api } from "@/lib/api";
import { plainText } from "@/components/notes/markdown";

interface PublicTask {
  identifier: string;
  title: string;
  priority?: string;
  has_assignee?: boolean;
  due_date?: string | null;
  labels?: string[];
}

interface PublicColumn {
  status: string;
  category: string;
  tasks: PublicTask[];
}

interface PublicBoard {
  name: string;
  key: string;
  description: string | null;
  attributes: string[];
  columns: PublicColumn[];
}

const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
  cancelled: "Cancelled",
};

export default function PublicBoardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const board = useQuery({
    queryKey: ["public-board", token],
    queryFn: ({ signal }) => api.get<PublicBoard>(`/api/v1/public/boards/${token}`, signal),
    retry: false,
  });

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center gap-2 text-muted-foreground">
        <Kanban className="size-4" />
        <span className="text-caption">Public board · read-only</span>
      </header>

      {board.isPending ? (
        <Skeleton className="h-80 w-full rounded-xl" />
      ) : board.isError ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <h1 className="text-h4 font-semibold text-foreground">Board not found</h1>
          <p className="mt-1 text-small text-muted-foreground">
            This public link has been unpublished or doesn&apos;t exist.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-h2 font-semibold text-foreground">{board.data.name}</h1>
            {board.data.description ? (
              <p className="text-small text-muted-foreground">{plainText(board.data.description)}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {board.data.columns
              .filter((column) => column.tasks.length > 0)
              .map((column) => (
                <div key={column.status} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-small font-medium text-foreground">
                      {STATUS_LABEL[column.status] ?? column.status}
                    </span>
                    <span className="text-caption text-muted-foreground">{column.tasks.length}</span>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {column.tasks.map((task) => (
                      <li
                        key={task.identifier}
                        className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-3"
                      >
                        <span className="font-mono text-caption text-muted-foreground">
                          {task.identifier}
                        </span>
                        <span className="text-small text-foreground">{task.title}</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {task.priority && task.priority !== "none" ? (
                            <Badge variant="outline" size="sm" className="capitalize">
                              {task.priority}
                            </Badge>
                          ) : null}
                          {task.due_date ? (
                            <Badge variant="neutral" size="sm">
                              {task.due_date}
                            </Badge>
                          ) : null}
                          {task.has_assignee ? (
                            <Badge variant="neutral" size="sm">
                              assigned
                            </Badge>
                          ) : null}
                          {(task.labels ?? []).map((label) => (
                            <Badge key={label} variant="outline" size="sm">
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
          <footer className="mt-auto pt-6 text-center text-caption text-muted-foreground">
            Powered by Elliptic
          </footer>
        </>
      )}
    </div>
  );
}
