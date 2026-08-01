"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Database, Play, Sparkles, TriangleAlert } from "lucide-react";
import { Badge, Button, Input, Skeleton, Textarea } from "@elliptic/ui";
import { useExecutePql, useTextToPql } from "@/hooks/use-pql-queries";

const EXAMPLES = [
  'status = "todo" and priority in ["high", "urgent"]',
  "is_overdue() and has_no_assignee()",
  'label in ["bug"] and is_open()',
  'title ~ "payment" or number > 100',
];

const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
  cancelled: "Cancelled",
};

export default function QueryPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const execute = useExecutePql(orgId);
  const textToPql = useTextToPql(orgId);
  const [query, setQuery] = useState('status = "todo" and priority in ["high", "urgent"]');
  const [nl, setNl] = useState("");

  const run = () => {
    if (!query.trim()) return;
    execute.mutate(query.trim());
  };

  const generate = () => {
    if (!nl.trim()) return;
    textToPql.mutate(nl.trim(), {
      onSuccess: (result) => {
        setQuery(result.query);
        execute.reset();
      },
    });
  };

  const generated = textToPql.data;

  const error =
    execute.error instanceof Error ? execute.error.message : execute.isError ? "Query failed" : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-h3 font-semibold text-foreground">
          <Database className="size-5 text-accent" />
          Query
        </h1>
        <p className="text-small text-muted-foreground">
          Filter work items with the Elliptic Query Language — fields, comparisons,{" "}
          <code className="rounded bg-muted px-1 font-mono text-caption">and/or/not</code>, lists,
          and functions like{" "}
          <code className="rounded bg-muted px-1 font-mono text-caption">is_overdue()</code>.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-accent/30 bg-accent-muted/20 p-3">
        <span className="flex items-center gap-1.5 text-caption font-medium text-foreground">
          <Sparkles className="size-3.5 text-accent" />
          Ask in plain English
        </span>
        <div className="flex items-center gap-2">
          <Input
            value={nl}
            onChange={(event) => setNl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") generate();
            }}
            placeholder="e.g. overdue bugs nobody is working on"
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={generate}
            loading={textToPql.isPending}
            disabled={!nl.trim()}
          >
            <Sparkles className="size-4" />
            Generate
          </Button>
        </div>
        {textToPql.isError ? (
          <span className="text-caption text-danger">
            {textToPql.error instanceof Error ? textToPql.error.message : "Couldn't generate a query"}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              run();
            }
          }}
          rows={3}
          className="font-mono text-small"
          placeholder='status = "in_progress" and not has_no_assignee()'
        />
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuery(example)}
                className="rounded-full border border-border px-2 py-0.5 text-caption text-muted-foreground transition-colors hover:border-input hover:text-foreground"
              >
                {example.length > 36 ? `${example.slice(0, 36)}…` : example}
              </button>
            ))}
          </div>
          <Button onClick={run} loading={execute.isPending} disabled={!query.trim()}>
            <Play className="size-4" />
            Run
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-danger/40 bg-danger-muted/30 px-3 py-2 text-small text-danger">
          <TriangleAlert className="size-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {execute.isPending || textToPql.isPending ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : (execute.data ?? generated) ? (
        <div className="flex flex-col gap-2">
          <p className="text-caption text-muted-foreground">
            {(execute.data ?? generated)!.count}{" "}
            {(execute.data ?? generated)!.count === 1 ? "result" : "results"}
          </p>
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
            {(execute.data ?? generated)!.results.map((task) => (
              <li key={task.id} className="flex items-center gap-3 bg-surface px-3 py-2 text-small">
                <Link
                  href={`/app/${orgId}/projects/${task.project_id}?task=${task.id}`}
                  className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
                >
                  {task.identifier ? (
                    <span className="shrink-0 font-mono text-caption text-muted-foreground">
                      {task.identifier}
                    </span>
                  ) : null}
                  <span className="min-w-0 truncate text-foreground">{task.title}</span>
                </Link>
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
          {(execute.data ?? generated)!.count === 0 ? (
            <p className="text-center text-small text-muted-foreground">No work items match.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
