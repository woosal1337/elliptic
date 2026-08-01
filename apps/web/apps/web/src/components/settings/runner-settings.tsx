"use client";

import { useState } from "react";
import { Clock, Play, Terminal, Trash2 } from "lucide-react";
import { Badge, Button, IconButton, Input, Skeleton, Textarea } from "@elliptic/ui";
import {
  type RunnerScript,
  useCreateScript,
  useDeleteScript,
  useRunScript,
  useRunnerExecutions,
  useRunnerScripts,
} from "@/hooks/use-runner-queries";

const STATUS_VARIANT: Record<string, "neutral" | "success" | "danger" | "warning"> = {
  queued: "warning",
  running: "warning",
  succeeded: "success",
  failed: "danger",
};

function ScriptRow({ orgId, script }: { orgId: string; script: RunnerScript }) {
  const run = useRunScript(orgId);
  const remove = useDeleteScript(orgId);
  const [open, setOpen] = useState(false);
  const executions = useRunnerExecutions(orgId, open ? script.id : null);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center gap-2">
        <Terminal className="size-4 shrink-0 text-muted-foreground" />
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-left text-small font-medium text-foreground hover:underline"
          onClick={() => setOpen((v) => !v)}
        >
          {script.name}
        </button>
        {script.cron_schedule ? (
          <Badge variant="outline" size="sm">
            <Clock className="size-3" />
            {script.cron_schedule}
          </Badge>
        ) : null}
        <Badge variant="neutral" size="sm">
          {script.language}
        </Badge>
        <IconButton
          aria-label={`Run ${script.name}`}
          variant="ghost"
          size="sm"
          onClick={() => run.mutate(script.id)}
        >
          <Play className="size-4" />
        </IconButton>
        <IconButton
          aria-label={`Delete ${script.name}`}
          variant="ghost"
          size="sm"
          onClick={() => remove.mutate(script.id)}
        >
          <Trash2 className="size-4" />
        </IconButton>
      </div>
      {open ? (
        <div className="flex flex-col gap-2">
          <pre className="max-h-40 overflow-auto rounded bg-muted/50 p-2 font-mono text-caption text-foreground">
            {script.code || "// empty"}
          </pre>
          <span className="text-caption font-medium text-muted-foreground">Recent runs</span>
          {executions.isPending ? (
            <Skeleton className="h-8 w-full" />
          ) : (executions.data ?? []).length === 0 ? (
            <p className="text-caption text-muted-foreground">No runs yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {(executions.data ?? []).map((exec) => (
                <li key={exec.id} className="flex items-center gap-2 text-caption">
                  <Badge variant={STATUS_VARIANT[exec.status] ?? "neutral"} size="sm">
                    {exec.status}
                  </Badge>
                  <span className="text-muted-foreground">{exec.trigger}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {exec.output ?? exec.error ?? ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function RunnerSettings({ orgId }: { orgId: string }) {
  const scripts = useRunnerScripts(orgId);
  const create = useCreateScript(orgId);
  const [name, setName] = useState("");
  const [cron, setCron] = useState("");
  const [code, setCode] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), language: "javascript", code, cron_schedule: cron.trim() || null },
      {
        onSuccess: () => {
          setName("");
          setCron("");
          setCode("");
        },
      }
    );
  };

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-small font-semibold text-foreground">Runner scripts</h2>
        <p className="text-caption text-muted-foreground">
          Author reusable scripts and schedule them with cron. Execution runs in a sandboxed
          runtime (coming soon); for now, manual runs queue for that worker.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Script name"
            className="flex-1"
          />
          <Input
            value={cron}
            onChange={(event) => setCron(event.target.value)}
            placeholder="Cron (e.g. 0 9 * * 1)"
            className="w-44 font-mono text-caption"
          />
        </div>
        <Textarea
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="// JavaScript — runs in a sandboxed runtime"
          rows={4}
          className="font-mono text-caption"
        />
        <div>
          <Button size="sm" onClick={submit} loading={create.isPending} disabled={!name.trim()}>
            Create script
          </Button>
        </div>
      </div>

      {scripts.isPending ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : (scripts.data ?? []).length === 0 ? (
        <p className="text-small text-muted-foreground">No scripts yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {(scripts.data ?? []).map((script) => (
            <ScriptRow key={script.id} orgId={orgId} script={script} />
          ))}
        </ul>
      )}
    </section>
  );
}
