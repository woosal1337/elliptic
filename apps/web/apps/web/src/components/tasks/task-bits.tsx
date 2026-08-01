"use client";

import {
  AlertOctagon,
  Ban,
  Bug,
  MoreHorizontal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  type LucideIcon,
} from "lucide-react";
import {
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from "@elliptic/ui";
import type { BugSeverity, OrgMember, TaskPriority, TaskStatus } from "@/lib/types";
import {
  CATEGORY_DOT_CLASSES,
  CATEGORY_LABELS,
  PRIORITY_DOT_CLASSES,
  PRIORITY_LABELS,
  PRIORITY_SORT,
  STATUS_LABELS,
  STATUS_ORDER,
  parsePriority,
  statusCategory,
  type StatusCategory,
} from "@/lib/task-meta";

export function StatusDot({
  status,
  className,
  title,
}: {
  status: TaskStatus;
  className?: string;
  title?: string;
}) {
  return (
    <span
      aria-hidden="true"
      title={title}
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        CATEGORY_DOT_CLASSES[statusCategory(status)],
        className
      )}
    />
  );
}

const STATUS_ICON_COLORS: Record<TaskStatus, string> = {
  backlog: "text-muted-foreground/60",
  todo: "text-muted-foreground",
  in_progress: "text-warning",
  in_review: "text-accent",
  done: "text-success",
  cancelled: "text-muted-foreground",
};

/** Linear-style status glyph: a progress ring that fills as the task moves through its lifecycle. */
export function StatusIcon({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  const filled = status === "done" || status === "cancelled";
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0", STATUS_ICON_COLORS[status], className)}
    >
      <svg viewBox="0 0 14 14" className="size-3.5" fill="none">
        {filled ? (
          <>
            <circle cx="7" cy="7" r="7" fill="currentColor" />
            {status === "done" ? (
              <path
                d="M4.3 7.1l1.9 1.9 3.5-3.9"
                fill="none"
                stroke="#fff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M5 5l4 4M9 5l-4 4"
                fill="none"
                stroke="#fff"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            )}
          </>
        ) : (
          <>
            <circle
              cx="7"
              cy="7"
              r="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray={status === "backlog" ? "2.6 2.4" : undefined}
            />
            {status === "in_progress" || status === "in_review" ? (
              <circle
                cx="7"
                cy="7"
                r="3"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                pathLength={100}
                strokeDasharray={status === "in_progress" ? "50 100" : "66 100"}
                transform="rotate(-90 7 7)"
              />
            ) : null}
          </>
        )}
      </svg>
    </span>
  );
}

export function CategoryDot({
  category,
  className,
}: {
  category: StatusCategory;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2 shrink-0 rounded-full", CATEGORY_DOT_CLASSES[category], className)}
    />
  );
}

export function CategoryLabel({ category }: { category: StatusCategory }) {
  return <>{CATEGORY_LABELS[category]}</>;
}

export function PriorityDot({ priority }: { priority: TaskPriority }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn("inline-block size-2 shrink-0 rounded-full", PRIORITY_DOT_CLASSES[priority])}
        />
      </TooltipTrigger>
      <TooltipContent>{PRIORITY_LABELS[priority]}</TooltipContent>
    </Tooltip>
  );
}

export const PRIORITY_ICONS: Record<TaskPriority, LucideIcon> = {
  none: MoreHorizontal,
  low: SignalLow,
  medium: SignalMedium,
  high: SignalHigh,
  urgent: AlertOctagon,
};

export const PRIORITY_ICON_CLASSES: Record<TaskPriority, string> = {
  none: "text-muted-foreground/50",
  low: "text-muted-foreground",
  medium: "text-accent",
  high: "text-warning",
  urgent: "text-danger",
};

export function PriorityGlyph({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  const Icon = PRIORITY_ICONS[priority];
  const isUrgent = priority === "urgent";
  return (
    <span className={cn("inline-flex shrink-0", PRIORITY_ICON_CLASSES[priority], className)}>
      <Icon
        className={cn("size-3.5", isUrgent && "fill-danger/15")}
        strokeWidth={isUrgent ? 2.25 : 2}
        aria-hidden="true"
      />
    </span>
  );
}

export function PriorityIcon({ priority, className }: { priority: TaskPriority; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0">
          <PriorityGlyph priority={priority} className={className} />
          <span className="sr-only">{PRIORITY_LABELS[priority]} priority</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{PRIORITY_LABELS[priority]}</TooltipContent>
    </Tooltip>
  );
}

export function StatusSelect({
  value,
  onChange,
  className,
}: {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as TaskStatus)}>
      <SelectTrigger className={className} aria-label="Status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_ORDER.map((status) => (
          <SelectItem key={status} value={status}>
            <span className="flex items-center gap-2">
              <StatusDot status={status} />
              {STATUS_LABELS[status]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function PrioritySelect({
  value,
  onChange,
  className,
}: {
  value: TaskPriority;
  onChange: (priority: TaskPriority) => void;
  className?: string;
}) {
  return (
    <Select value={String(value)} onValueChange={(next) => onChange(parsePriority(next))}>
      <SelectTrigger className={className} aria-label="Priority">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRIORITY_SORT.map((priority) => (
          <SelectItem key={priority} value={String(priority)}>
            <span className="flex items-center gap-2">
              <PriorityGlyph priority={priority} />
              {PRIORITY_LABELS[priority]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const SEVERITY_LABELS: Record<BugSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const SEVERITY_ORDER: BugSeverity[] = ["critical", "high", "medium", "low"];

const SEVERITY_DOT_CLASSES: Record<BugSeverity, string> = {
  low: "bg-muted-foreground",
  medium: "bg-accent",
  high: "bg-warning",
  critical: "bg-danger",
};

export function BugGlyph({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0 text-danger">
          <Bug className={cn("size-3.5", className)} aria-hidden="true" />
          <span className="sr-only">Bug</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>Bug</TooltipContent>
    </Tooltip>
  );
}

export function SeverityBadge({ severity }: { severity: BugSeverity }) {
  return (
    <Badge variant="outline" className="gap-1.5">
      <span className={cn("inline-block size-1.5 rounded-full", SEVERITY_DOT_CLASSES[severity])} />
      {SEVERITY_LABELS[severity]}
    </Badge>
  );
}

export function BlockedBadge({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full bg-danger/10 px-1.5 py-0.5 text-caption font-medium text-danger",
            className
          )}
        >
          <Ban className="size-3" aria-hidden="true" />
          Blocked
        </span>
      </TooltipTrigger>
      <TooltipContent>Blocked by an open task</TooltipContent>
    </Tooltip>
  );
}

export function SubtaskProgressPill({
  done,
  total,
  className,
}: {
  done: number;
  total: number;
  className?: string;
}) {
  if (total === 0) return null;
  const complete = done === total;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-caption tabular-nums",
            complete ? "text-success" : "text-muted-foreground",
            className
          )}
        >
          <span
            aria-hidden="true"
            className={cn("inline-block size-1.5 rounded-full", complete ? "bg-success" : "bg-muted-foreground")}
          />
          {done}/{total}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {done} of {total} sub-tasks done
      </TooltipContent>
    </Tooltip>
  );
}

export function SeveritySelect({
  value,
  onChange,
  className,
}: {
  value: BugSeverity;
  onChange: (severity: BugSeverity) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as BugSeverity)}>
      <SelectTrigger className={className} aria-label="Severity">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SEVERITY_ORDER.map((severity) => (
          <SelectItem key={severity} value={severity}>
            <span className="flex items-center gap-2">
              <span className={cn("inline-block size-2 rounded-full", SEVERITY_DOT_CLASSES[severity])} />
              {SEVERITY_LABELS[severity]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const UNASSIGNED = "unassigned";

export function AssigneeSelect({
  value,
  members,
  onChange,
  className,
}: {
  value: string | null;
  members: OrgMember[];
  onChange: (userId: string | null) => void;
  className?: string;
}) {
  return (
    <Select
      value={value ?? UNASSIGNED}
      onValueChange={(next) => onChange(next === UNASSIGNED ? null : next)}
    >
      <SelectTrigger className={className} aria-label="Assignee">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
        {members.map((member) => (
          <SelectItem key={member.user_id} value={member.user_id}>
            {member.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
