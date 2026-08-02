"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Inbox,
  ListChecks,
  SkipForward,
} from "lucide-react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  IconButton,
  Skeleton,
  cn,
} from "@elliptic/ui";
import { Wand2 } from "lucide-react";
import { formatRelative } from "@/lib/format";
import { useShortcut } from "@/lib/keyboard";
import { CATEGORY_LABELS } from "@/lib/task-meta";
import { ErrorState } from "@/components/error-state";
import { PriorityIcon, StatusDot } from "@/components/tasks/task-bits";
import { useRunTriageSkill, useTriageRules } from "@/hooks/use-automation-queries";
import { useTriageQueue, type TriageDecision, type TriageTask } from "./use-triage-queue";

function SkillsMenu({ orgId, taskId }: { orgId: string; taskId: string }) {
  const rules = useTriageRules(orgId);
  const runSkill = useRunTriageSkill(orgId);
  const skills = (rules.data ?? []).filter((rule) => rule.is_skill && rule.enabled);

  if (skills.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="ghost" disabled={runSkill.isPending}>
          <Wand2 className="size-4" />
          Skills
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {skills.map((skill) => (
          <DropdownMenuItem
            key={skill.id}
            onSelect={() => runSkill.mutate({ rule_id: skill.id, task_id: taskId })}
          >
            {skill.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface TriageActionDef {
  decision: TriageDecision;
  label: string;
  hint: string;
  icon: typeof CheckCircle2;
  keyCap: string;
  variant: "accent" | "outline" | "ghost";
}

const ACTIONS: readonly TriageActionDef[] = [
  {
    decision: "accept",
    label: "Accept",
    hint: "Move into the board at To do",
    icon: CheckCircle2,
    keyCap: "1",
    variant: "accent",
  },
  {
    decision: "duplicate",
    label: "Duplicate",
    hint: "Resolve as a duplicate",
    icon: Copy,
    keyCap: "2",
    variant: "outline",
  },
  {
    decision: "decline",
    label: "Decline",
    hint: "Decline, not actionable",
    icon: Ban,
    keyCap: "3",
    variant: "outline",
  },
  {
    decision: "snooze",
    label: "Snooze",
    hint: "Snooze for a day",
    icon: SkipForward,
    keyCap: "S",
    variant: "ghost",
  },
] as const;

function ActionBar({
  onProcess,
  disabled,
}: {
  onProcess: (decision: TriageDecision) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ACTIONS.map((action) => (
        <Button
          key={action.decision}
          type="button"
          size="sm"
          variant={action.variant}
          disabled={disabled}
          onClick={() => onProcess(action.decision)}
          title={action.hint}
        >
          <action.icon aria-hidden="true" />
          {action.label}
          <kbd className="ml-1 rounded border border-border/70 bg-surface/60 px-1 font-mono text-caption text-muted-foreground">
            {action.keyCap}
          </kbd>
        </Button>
      ))}
    </div>
  );
}

function FocusedCard({
  orgId,
  task,
  position,
  total,
  onProcess,
  onOpen,
  onPrev,
  onNext,
  disabled,
}: {
  orgId: string;
  task: TriageTask;
  position: number;
  total: number;
  onProcess: (decision: TriageDecision) => void;
  onOpen: () => void;
  onPrev: () => void;
  onNext: () => void;
  disabled: boolean;
}) {
  return (
    <article className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-6 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusDot status={task.status} />
          <span className="text-caption font-medium text-muted-foreground">
            {CATEGORY_LABELS.backlog}
          </span>
          <Badge variant="outline" className="font-mono">
            {task.__projectKey}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton
            aria-label="Previous item"
            variant="ghost"
            size="sm"
            disabled={position <= 1}
            onClick={onPrev}
          >
            <ChevronUp className="size-4" />
          </IconButton>
          <span className="text-caption text-muted-foreground tabular">
            {position} of {total}
          </span>
          <IconButton
            aria-label="Next item"
            variant="ghost"
            size="sm"
            disabled={position >= total}
            onClick={onNext}
          >
            <ChevronDown className="size-4" />
          </IconButton>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2.5">
          <span className="shrink-0 font-mono text-caption text-muted-foreground">
            {task.identifier}
          </span>
          <h2 className="text-h3 font-semibold text-foreground">{task.title}</h2>
          {task.intake_channel ? (
            <Badge variant="neutral" size="sm" className="shrink-0 capitalize">
              {task.intake_channel.replace("_", "-")}
            </Badge>
          ) : null}
        </div>
        {task.description ? (
          <p className="line-clamp-4 whitespace-pre-line text-body text-muted-foreground">
            {task.description}
          </p>
        ) : (
          <p className="text-small italic text-muted-foreground/70">No description</p>
        )}
      </div>

      <div className="flex items-center gap-4 text-caption text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <PriorityIcon priority={task.priority} />
          {task.__projectName}
        </span>
        <span className="tabular">Created {formatRelative(task.created_at)}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <ActionBar onProcess={onProcess} disabled={disabled} />
        <div className="flex items-center gap-1">
        <SkillsMenu orgId={orgId} taskId={task.id} />
        <Button type="button" size="sm" variant="ghost" onClick={onOpen}>
          Open
          <ArrowRight aria-hidden="true" />
          <kbd className="ml-1 rounded border border-border/70 bg-surface/60 px-1 font-mono text-caption text-muted-foreground">
            ↵
          </kbd>
        </Button>
        </div>
      </div>
    </article>
  );
}

function QueueRow({
  task,
  active,
  onFocus,
  onOpen,
}: {
  task: TriageTask;
  active: boolean;
  onFocus: () => void;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        data-triage-item={task.id}
        aria-current={active ? "true" : undefined}
        onClick={onFocus}
        onDoubleClick={onOpen}
        className={cn(
          "group flex w-full items-center gap-3 border-b border-border px-4 py-2.5 text-left transition-colors duration-150 last:border-b-0",
          active ? "bg-accent-muted" : "hover:bg-muted/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        )}
      >
        <StatusDot status={task.status} className="shrink-0" />
        <PriorityIcon priority={task.priority} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <span className="shrink-0 font-mono text-caption text-muted-foreground">
              {task.identifier}
            </span>
            <span
              className={cn(
                "truncate text-small font-medium",
                active ? "text-accent" : "text-foreground"
              )}
            >
              {task.title}
            </span>
          </div>
        </div>
        <Badge variant="outline" className="hidden shrink-0 font-mono sm:inline-flex">
          {task.__projectKey}
        </Badge>
        <span className="shrink-0 whitespace-nowrap text-caption text-muted-foreground tabular">
          {formatRelative(task.created_at)}
        </span>
      </button>
    </li>
  );
}

export function TriageQueue({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [view, setView] = useState<"open" | "closed">("open");
  const queue = useTriageQueue(orgId, view === "closed");
  const { tasks, process, processingId } = queue;
  const [focusIndex, setFocusIndex] = useState(0);

  useEffect(() => {
    setFocusIndex((current) => {
      if (tasks.length === 0) return 0;
      return Math.min(current, tasks.length - 1);
    });
  }, [tasks.length]);

  const focused = tasks[focusIndex] ?? null;

  useEffect(() => {
    if (!focused) return;
    const element = document.querySelector<HTMLElement>(`[data-triage-item="${focused.id}"]`);
    element?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [focused]);

  const moveFocus = useCallback(
    (delta: number) => {
      setFocusIndex((current) => {
        if (tasks.length === 0) return 0;
        const next = current + delta;
        return Math.max(0, Math.min(next, tasks.length - 1));
      });
    },
    [tasks.length]
  );

  const openFocused = useCallback(() => {
    if (!focused) return;
    router.push(`/app/${orgId}/projects/${focused.project_id}?task=${focused.id}`);
  }, [focused, orgId, router]);

  const handleProcess = useCallback(
    (decision: TriageDecision) => {
      if (!focused) return;
      process(focused, decision);
    },
    [focused, process]
  );

  const keysEnabled = focused !== null && processingId === null;

  useShortcut(
    { id: "triage-focus-next", keys: "arrowdown", label: "Next item", scope: "navigation", enabled: tasks.length > 0 },
    () => moveFocus(1)
  );
  useShortcut(
    { id: "triage-focus-prev", keys: "arrowup", label: "Previous item", scope: "navigation", enabled: tasks.length > 0 },
    () => moveFocus(-1)
  );
  useShortcut(
    { id: "triage-open", keys: "enter", label: "Open task", scope: "action", enabled: keysEnabled },
    openFocused
  );
  useShortcut(
    { id: "triage-accept-1", keys: "1", label: "Accept", scope: "action", enabled: keysEnabled },
    () => handleProcess("accept")
  );
  useShortcut(
    { id: "triage-accept-a", keys: "a", label: "Accept", scope: "action", enabled: keysEnabled },
    () => handleProcess("accept")
  );
  useShortcut(
    { id: "triage-duplicate", keys: "2", label: "Mark duplicate", scope: "action", enabled: keysEnabled },
    () => handleProcess("duplicate")
  );
  useShortcut(
    { id: "triage-decline-3", keys: "3", label: "Decline", scope: "action", enabled: keysEnabled },
    () => handleProcess("decline")
  );
  useShortcut(
    { id: "triage-decline-x", keys: "x", label: "Decline", scope: "action", enabled: keysEnabled },
    () => handleProcess("decline")
  );
  useShortcut(
    { id: "triage-snooze", keys: "s", label: "Snooze", scope: "action", enabled: keysEnabled },
    () => handleProcess("snooze")
  );

  const remaining = tasks.length;
  const countLabel = useMemo(() => {
    if (remaining === 0) return "Inbox zero";
    return `${remaining} ${remaining === 1 ? "item" : "items"} to triage`;
  }, [remaining]);

  if (queue.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="flex flex-col gap-px rounded-lg border border-border">
          {Array.from({ length: 4 }, (_, row) => (
            <Skeleton key={row} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (queue.isError) {
    return (
      <ErrorState
        error={queue.errorMessage ?? "Could not load the triage queue"}
        onRetry={queue.refetch}
      />
    );
  }

  const viewTabs = (
    <div className="flex items-center rounded-md border border-border p-0.5">
      {(["open", "closed"] as const).map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => setView(tab)}
          className={`rounded px-3 py-1 text-caption font-medium capitalize transition-colors ${
            view === tab ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  if (remaining === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-end">{viewTabs}</div>
        <EmptyState
          icon={<Inbox />}
          title={view === "closed" ? "No closed items" : "Triage zero"}
          description={
            view === "closed"
              ? "Declined triage items will appear here."
              : "No items in the triage queue right now. Work flagged for triage (from intake, AI, or forms) lands here, newest first."
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <ListChecks aria-hidden="true" className="size-4 text-muted-foreground" />
        <p className="text-small text-muted-foreground">
          <span className="tabular font-medium text-foreground">{remaining}</span>{" "}
          {remaining === 1 ? "item" : "items"} to triage across{" "}
          <span className="tabular font-medium text-foreground">{queue.activeProjectCount}</span>{" "}
          {queue.activeProjectCount === 1 ? "project" : "projects"}
          <span className="sr-only">. {countLabel}</span>
        </p>
      </div>
        {viewTabs}
      </div>

      {focused ? (
        <FocusedCard
          orgId={orgId}
          task={focused}
          position={focusIndex + 1}
          total={remaining}
          onProcess={handleProcess}
          onOpen={openFocused}
          onPrev={() => moveFocus(-1)}
          onNext={() => moveFocus(1)}
          disabled={processingId !== null}
        />
      ) : null}

      <section aria-label="Triage queue" className="flex flex-col gap-1.5">
        <h2 className="px-0.5 text-h4 font-semibold text-foreground">Queue</h2>
        <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
          {tasks.map((task, index) => (
            <QueueRow
              key={task.id}
              task={task}
              active={index === focusIndex}
              onFocus={() => setFocusIndex(index)}
              onOpen={() =>
                router.push(`/app/${orgId}/projects/${task.project_id}?task=${task.id}`)
              }
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
