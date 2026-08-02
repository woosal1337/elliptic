"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { Activity, ArrowUpRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import {
  Avatar,
  Card,
  EmptyState,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from "@elliptic/ui";
import type { ActivityEvent } from "@/lib/types";
import {
  ENTITY_DND_MIME,
  serializeEntityRef,
  type EntityRef,
  type EntityRefKind,
} from "@/lib/dnd";
import { relativeTime } from "@/lib/format";
import {
  ACTIVITY_TAXONOMY,
  TONE_ICON_CLASSES,
  activityMeta,
  type ActivityKind,
} from "./activity-taxonomy";
import { ActivityTag } from "./activity-tag";
import {
  groupActivity,
  type AggregateEntry,
  type DayGroup,
  type SingleEntry,
} from "./activity-grouping";

type ActorNames = ReadonlyMap<string, string>;
type EntityHref = (event: ActivityEvent) => string | null;

function actorName(event: ActivityEvent, actors?: ActorNames): string {
  if (event.actor_id && actors?.has(event.actor_id)) {
    return actors.get(event.actor_id) as string;
  }
  return "Someone";
}

function actionPhrase(event: ActivityEvent): string {
  const readable = event.event_type.replace(/[._]/g, " ");
  const noun = entityNoun(event);
  const verb = event.event_type.split(/[._]/).pop() ?? "";
  const payload = event.payload;
  const from = payload && typeof payload.from === "string" ? payload.from : null;
  const to = payload && typeof payload.to === "string" ? payload.to : null;

  if (from && to) return `${readable}: ${from} → ${to}`;

  if (/status/.test(verb) || /status/.test(event.event_type)) {
    const status = payloadString(event, ["status", "to_status", "state"]);
    if (status) return `changed status to ${status}`;
  }
  if (/priorit/.test(event.event_type)) {
    const priority = payloadString(event, ["priority", "to_priority"]);
    if (priority) return `changed priority to ${priority}`;
  }
  if (/assign/.test(event.event_type)) {
    const assignee = payloadString(event, ["assignee", "assignee_name", "to_assignee"]);
    return assignee ? `assigned ${noun} to ${assignee}` : `changed the assignee`;
  }
  if (/renam/.test(event.event_type) || /title/.test(event.event_type)) {
    const title = payloadString(event, ["title", "to_title", "name"]);
    return title ? `renamed ${noun} to ${title}` : `renamed ${noun}`;
  }

  const status = payloadString(event, ["status", "to_status", "state"]);
  if (status) return `changed status to ${status}`;
  const priority = payloadString(event, ["priority", "to_priority"]);
  if (priority) return `changed priority to ${priority}`;
  const assignee = payloadString(event, ["assignee", "assignee_name", "to_assignee"]);
  if (assignee) return `assigned ${noun} to ${assignee}`;

  if (/^(updated|edited|changed|modified)$/.test(verb)) return `updated ${noun}`;
  if (/^(created|added|posted)$/.test(verb)) return `created ${noun}`;
  if (/^(deleted|removed|archived)$/.test(verb)) {
    return `${verb} ${noun}`;
  }

  return readable;
}

function entityNoun(event: ActivityEvent): string {
  return event.entity_type.split(/[._]/)[0] ?? "item";
}

function pluralEntityNoun(events: readonly ActivityEvent[]): string {
  const nouns = new Set(events.map((event) => entityNoun(event)));
  const noun = nouns.size === 1 ? ([...nouns][0] ?? "item") : "item";
  return `${noun}s`;
}

function payloadString(event: ActivityEvent, keys: readonly string[]): string | null {
  const payload = event.payload;
  if (!payload) return null;
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

function commentBody(event: ActivityEvent): string | null {
  return payloadString(event, ["body", "text", "content", "message"]);
}

function editorialHeadline(event: ActivityEvent): string | null {
  return payloadString(event, ["title", "headline", "subject", "name", "summary"]);
}

function editorialExcerpt(event: ActivityEvent): string | null {
  return payloadString(event, [
    "excerpt",
    "snippet",
    "preview",
    "body",
    "text",
    "content",
    "message",
    "description",
  ]);
}

const EDITORIAL_KINDS = new Set<ActivityKind>([
  "decision",
  "blocker",
  "approval",
  "member-added",
  "commented",
  "note",
]);

function isEditorial(entry: SingleEntry): boolean {
  if (entry.signal !== "high") return false;
  if (!EDITORIAL_KINDS.has(entry.kind)) return false;
  return editorialHeadline(entry.event) !== null || editorialExcerpt(entry.event) !== null;
}

function Time({ iso }: { iso: string }) {
  const { relative, title } = relativeTime(iso);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time
          dateTime={iso}
          className="tabular cursor-default text-caption text-muted-foreground"
        >
          {relative}
        </time>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}

function IconBubble({
  kind,
  compact,
}: {
  kind: ActivityKind;
  compact: boolean;
}) {
  const meta = ACTIVITY_TAXONOMY[kind] ?? ACTIVITY_TAXONOMY.system;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        TONE_ICON_CLASSES[meta.tone],
        compact ? "size-6 [&_svg]:size-3" : "size-7 [&_svg]:size-3.5"
      )}
    >
      <Icon aria-hidden="true" />
    </span>
  );
}

function dragHandlers(dragRef: EntityRef | null) {
  if (!dragRef) return {};
  return {
    draggable: true,
    onDragStart: (event: React.DragEvent) => {
      event.dataTransfer.setData(ENTITY_DND_MIME, serializeEntityRef(dragRef));
      event.dataTransfer.effectAllowed = "copy";
    },
  };
}

function dragRefFor(event: ActivityEvent, href: string | null): EntityRef | null {
  if (!event.entity_id) return null;
  const base = event.entity_type.split(/[._]/)[0];
  const kind: EntityRefKind =
    base === "meeting" || base === "note" || base === "task" || base === "decision" ? base : "task";
  return { kind, id: event.entity_id, title: editorialHeadline(event) ?? entityNoun(event), href };
}

function RowShell({
  children,
  href,
  dragRef = null,
}: {
  children: ReactNode;
  href: string | null;
  dragRef?: EntityRef | null;
}) {
  const drag = dragHandlers(dragRef);
  if (href) {
    return (
      <Link
        href={href}
        {...drag}
        className="-mx-2 flex items-start gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
      >
        {children}
      </Link>
    );
  }
  return (
    <div {...drag} className="-mx-2 flex items-start gap-3 px-2 py-1.5">
      {children}
    </div>
  );
}

function SingleRow({
  entry,
  actors,
  compact,
  getHref,
}: {
  entry: SingleEntry;
  actors?: ActorNames;
  compact: boolean;
  getHref?: EntityHref;
}) {
  const { event, kind, signal } = entry;
  const high = signal === "high";
  const comment = high ? commentBody(event) : null;
  const href = getHref?.(event) ?? null;

  return (
    <RowShell href={href} dragRef={dragRefFor(event, href)}>
      <IconBubble kind={kind} compact={compact} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <ActivityTag kind={kind} />
          <span
            className={cn(
              "min-w-0 truncate",
              high ? "text-small text-foreground" : "text-small text-muted-foreground"
            )}
          >
            <span className="font-medium text-foreground">{actorName(event, actors)}</span>{" "}
            {high ? (
              <span>on {entityNoun(event)}</span>
            ) : (
              <span>{actionPhrase(event)}</span>
            )}
          </span>
          <Time iso={event.created_at} />
        </div>
        {comment ? (
          <p className="line-clamp-3 whitespace-pre-line text-small text-foreground/90">
            {comment}
          </p>
        ) : null}
      </div>
    </RowShell>
  );
}

function EditorialRow({
  entry,
  actors,
  getHref,
}: {
  entry: SingleEntry;
  actors?: ActorNames;
  getHref?: EntityHref;
}) {
  const { event, kind } = entry;
  const who = actorName(event, actors);
  const headline = editorialHeadline(event);
  const excerpt = editorialExcerpt(event);
  const href = getHref?.(event) ?? null;

  return (
    <Card
      {...dragHandlers(dragRefFor(event, href))}
      className="-mx-1 flex items-start gap-3 border-border/80 bg-surface/60 p-3 shadow-xs transition-colors hover:border-border hover:bg-surface"
    >
      <Avatar name={who} size="sm" className="mt-0.5" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <ActivityTag kind={kind} />
          <span className="min-w-0 truncate text-small text-muted-foreground">
            <span className="font-medium text-foreground">{who}</span> on {entityNoun(event)}
          </span>
          <Time iso={event.created_at} />
        </div>
        {headline ? (
          <p className="line-clamp-1 text-small font-semibold leading-tight text-foreground">
            {headline}
          </p>
        ) : null}
        {excerpt && excerpt !== headline ? (
          <p className="line-clamp-2 whitespace-pre-line text-small text-foreground/80">
            {excerpt}
          </p>
        ) : null}
        {href ? (
          <Link
            href={href}
            className="inline-flex w-fit items-center gap-1 rounded-sm text-caption font-medium text-accent transition-colors hover:text-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            Open {entityNoun(event)}
            <ArrowUpRight aria-hidden="true" className="size-3" />
          </Link>
        ) : null}
      </div>
    </Card>
  );
}

function AggregateRow({
  entry,
  actors,
  compact,
}: {
  entry: AggregateEntry;
  actors?: ActorNames;
  compact: boolean;
}) {
  const [open, setOpen] = useState(false);
  const meta = activityMeta(entry.latest);
  const uniqueActors = new Set(
    entry.events.map((event) => actorName(event, actors))
  );
  const who =
    uniqueActors.size === 1
      ? [...uniqueActors][0]
      : `${uniqueActors.size} people`;

  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="-mx-2 flex items-start gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
      >
        <IconBubble kind={entry.kind} compact={compact} />
        <div className="flex min-w-0 flex-1 items-center gap-x-2">
          <ActivityTag kind={entry.kind} />
          <span className="min-w-0 truncate text-small text-muted-foreground">
            <span className="font-medium text-foreground">{who}</span>{" "}
            {meta.label.toLowerCase()} {entry.events.length}{" "}
            {pluralEntityNoun(entry.events)}
          </span>
          <Time iso={entry.latest.created_at} />
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </div>
      </button>
      {open ? (
        <ol className="ml-[2.625rem] flex flex-col gap-0.5 border-l border-border pl-3 pt-1">
          {entry.events.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap items-center gap-x-2 gap-y-0.5"
            >
              <span className="min-w-0 truncate text-caption text-muted-foreground">
                <span className="text-foreground/80">{actorName(event, actors)}</span>{" "}
                {actionPhrase(event)}
              </span>
              <Time iso={event.created_at} />
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

export function ActivityList({
  events,
  compact = false,
  actors,
  lastSeen = null,
  getEntityHref,
}: {
  events: ActivityEvent[];
  compact?: boolean;
  actors?: ActorNames;
  lastSeen?: number | null;
  getEntityHref?: EntityHref;
}) {
  const groups = useMemo(() => groupActivity(events), [events]);
  const dividerAt = useMemo(
    () => firstStaleEntryId(groups, lastSeen),
    [groups, lastSeen]
  );

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Activity />}
        title="No activity yet"
        description="Changes will show up here as they happen."
        className={compact ? "py-8" : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col">
          <div className="sticky top-0 z-10 -mx-2 mb-2 flex items-baseline gap-2 bg-surface/85 px-2 py-1 backdrop-blur">
            <h3 className="text-mono-label font-mono text-muted-foreground">
              {group.label}
            </h3>
            <span className="tabular text-caption text-muted-foreground/70">
              {group.count}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {group.entries.map((entry) => (
              <Fragment key={entry.id}>
                {dividerAt === entry.id ? <SinceDivider /> : null}
                {entry.type === "single" ? (
                  isEditorial(entry) ? (
                    <EditorialRow
                      entry={entry}
                      actors={actors}
                      getHref={getEntityHref}
                    />
                  ) : (
                    <SingleRow
                      entry={entry}
                      actors={actors}
                      compact={compact}
                      getHref={getEntityHref}
                    />
                  )
                ) : (
                  <AggregateRow entry={entry} actors={actors} compact={compact} />
                )}
              </Fragment>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SinceDivider() {
  return (
    <div className="my-2 flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-accent/40" />
      <span className="text-mono-label font-mono text-accent">
        Since your last visit
      </span>
      <span className="h-px flex-1 bg-accent/40" />
    </div>
  );
}

function firstStaleEntryId(groups: DayGroup[], lastSeen: number | null): string | null {
  if (lastSeen === null) return null;
  for (const group of groups) {
    for (const entry of group.entries) {
      const iso =
        entry.type === "single" ? entry.event.created_at : entry.latest.created_at;
      if (new Date(iso).getTime() <= lastSeen) {
        return entry.id;
      }
    }
  }
  return null;
}
