"use client";

import {
  ArrowUpDown,
  Calendar,
  ChevronDown,
  CircleDashed,
  CircleDot,
  GitBranch,
  Hash,
  Inbox,
  LayoutGrid,
  List,
  ListChecks,
  ListFilter,
  MessageSquare,
  Plus,
  Search,
  Settings2,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Square,
  Triangle,
} from "lucide-react";
import { Avatar, Badge, cn, type BadgeProps } from "@companyos/ui";

type Priority = "urgent" | "high" | "medium" | "low" | "none";

interface MockLabel {
  text: string;
  variant: BadgeProps["variant"];
}

interface MockMeta {
  due?: string;
  subtasks?: string;
  comments?: number;
  branch?: boolean;
}

interface MockCard {
  id: string;
  title: string;
  priority: Priority;
  assignee: string;
  labels?: MockLabel[];
  meta?: MockMeta;
  selected?: boolean;
}

interface MockColumn {
  status: string;
  icon: typeof CircleDashed;
  dot: string;
  cards: MockCard[];
}

interface MockNavItem {
  label: string;
  icon: typeof CircleDashed;
  count?: string;
}

const NAV_ITEMS: MockNavItem[] = [
  { label: "Inbox", icon: Inbox, count: "3" },
  { label: "My issues", icon: ListChecks },
  { label: "Roadmap", icon: GitBranch },
];

function PriorityGlyph({ priority }: { priority: Priority }) {
  if (priority === "urgent") {
    return <Triangle aria-hidden="true" className="size-3 fill-danger text-danger" />;
  }
  if (priority === "high") {
    return <SignalHigh aria-hidden="true" className="size-3.5 text-warning" />;
  }
  if (priority === "medium") {
    return <SignalMedium aria-hidden="true" className="size-3.5 text-foreground/70" />;
  }
  if (priority === "low") {
    return <SignalLow aria-hidden="true" className="size-3.5 text-muted-foreground" />;
  }
  return <Square aria-hidden="true" className="size-3 text-muted-foreground/50" />;
}

const COLUMNS: MockColumn[] = [
  {
    status: "Backlog",
    icon: CircleDashed,
    dot: "bg-muted-foreground/40",
    cards: [
      {
        id: "Q3-58",
        title: "Draft the Q3 platform launch announcement",
        priority: "low",
        assignee: "Mara Quinn",
        labels: [{ text: "content", variant: "neutral" }],
      },
      {
        id: "Q3-61",
        title: "Audit onboarding email cadence",
        priority: "medium",
        assignee: "Theo Vance",
        labels: [{ text: "growth", variant: "success" }],
        meta: { comments: 2 },
      },
      {
        id: "Q3-64",
        title: "Spike: realtime presence on the board",
        priority: "none",
        assignee: "Leo Mård",
        meta: { branch: true },
      },
    ],
  },
  {
    status: "In Progress",
    icon: CircleDot,
    dot: "bg-warning",
    cards: [
      {
        id: "Q3-42",
        title: "Wire transcript import from Folio",
        priority: "urgent",
        assignee: "Ada Cole",
        labels: [
          { text: "meetings", variant: "accent" },
          { text: "backend", variant: "neutral" },
        ],
        meta: { due: "Jun 14", subtasks: "3/5", comments: 4 },
        selected: true,
      },
      {
        id: "Q3-47",
        title: "BYOK key rotation flow",
        priority: "high",
        assignee: "Ines Park",
        labels: [{ text: "security", variant: "danger" }],
        meta: { due: "Jun 16", subtasks: "1/4" },
      },
      {
        id: "Q3-50",
        title: "Activity feed pagination",
        priority: "medium",
        assignee: "Leo Mård",
        meta: { branch: true, comments: 1 },
      },
    ],
  },
  {
    status: "In Review",
    icon: CircleDot,
    dot: "bg-accent",
    cards: [
      {
        id: "Q3-39",
        title: "AI meeting summary prompt v2",
        priority: "high",
        assignee: "Ada Cole",
        labels: [{ text: "ai", variant: "accent" }],
        meta: { branch: true, comments: 6 },
      },
      {
        id: "Q3-44",
        title: "Roles and permissions matrix",
        priority: "medium",
        assignee: "Theo Vance",
        labels: [{ text: "platform", variant: "warning" }],
        meta: { subtasks: "5/5" },
      },
    ],
  },
  {
    status: "Done",
    icon: CircleDot,
    dot: "bg-success",
    cards: [
      {
        id: "Q3-31",
        title: "Project key generator",
        priority: "low",
        assignee: "Ines Park",
        meta: { comments: 2 },
      },
      {
        id: "Q3-35",
        title: "Notes autosave and history",
        priority: "medium",
        assignee: "Mara Quinn",
        labels: [{ text: "notes", variant: "success" }],
      },
      {
        id: "Q3-28",
        title: "Board column drag reorder",
        priority: "high",
        assignee: "Ada Cole",
      },
    ],
  },
];

function CardMeta({ meta }: { meta: MockMeta }) {
  return (
    <div className="flex items-center gap-3 text-muted-foreground">
      {meta.due ? (
        <span className="inline-flex items-center gap-1 text-caption tabular-nums">
          <Calendar aria-hidden="true" className="size-3" />
          {meta.due}
        </span>
      ) : null}
      {meta.subtasks ? (
        <span className="inline-flex items-center gap-1 text-caption tabular-nums">
          <ListChecks aria-hidden="true" className="size-3" />
          {meta.subtasks}
        </span>
      ) : null}
      {meta.branch ? <GitBranch aria-hidden="true" className="size-3" /> : null}
      {meta.comments ? (
        <span className="inline-flex items-center gap-1 text-caption tabular-nums">
          <MessageSquare aria-hidden="true" className="size-3" />
          {meta.comments}
        </span>
      ) : null}
    </div>
  );
}

function MockCardTile({ card }: { card: MockCard }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-surface p-3 shadow-xs transition-colors",
        card.selected
          ? "border-accent/40 ring-1 ring-accent ring-offset-1 ring-offset-background"
          : "border-border hover:border-border-strong"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-caption tracking-tight text-muted-foreground">{card.id}</span>
        <PriorityGlyph priority={card.priority} />
      </div>
      <p className="text-small font-medium leading-snug text-foreground">{card.title}</p>
      {card.labels?.length ? (
        <div className="flex flex-wrap items-center gap-1">
          {card.labels.map((label) => (
            <Badge key={label.text} variant={label.variant} size="sm" dot>
              {label.text}
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {card.meta ? <CardMeta meta={card.meta} /> : <span className="size-3" />}
        <Avatar name={card.assignee} size="xs" tone="auto" />
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="hidden w-44 shrink-0 flex-col gap-5 border-r border-border bg-background px-3 py-4 md:flex">
      <div className="flex items-center gap-2 px-1">
        <span aria-hidden="true" className="grid size-6 place-items-center rounded-md bg-foreground text-background">
          <Hash className="size-3.5" />
        </span>
        <span className="text-small font-semibold tracking-tight text-foreground">Elliptic</span>
        <ChevronDown aria-hidden="true" className="ml-auto size-3.5 text-muted-foreground" />
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <span
            key={item.label}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-small text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
          >
            <item.icon aria-hidden="true" className="size-4" />
            {item.label}
            {item.count ? <span className="ml-auto text-caption tabular-nums text-muted-foreground/70">{item.count}</span> : null}
          </span>
        ))}
      </nav>

      <div className="flex flex-col gap-1">
        <span className="px-2 font-mono text-mono-label uppercase text-muted-foreground/60">Projects</span>
        <span className="relative flex items-center gap-2 rounded-md bg-subtle px-2 py-1.5 text-small font-medium text-foreground">
          <span aria-hidden="true" className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-accent" />
          <LayoutGrid aria-hidden="true" className="size-4 text-accent" />
          Q3 Platform
        </span>
        <span className="flex items-center gap-2 rounded-md px-2 py-1.5 text-small text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground">
          <GitBranch aria-hidden="true" className="size-4" />
          Infra
        </span>
      </div>
    </aside>
  );
}

function BoardHeader() {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="grid size-5 place-items-center rounded-md bg-accent-muted text-accent">
          <LayoutGrid className="size-3" />
        </span>
        <span className="text-small font-semibold tracking-tight text-foreground">Q3 Platform</span>
        <span className="rounded border border-border bg-subtle px-1.5 py-0.5 font-mono text-mono-label uppercase text-muted-foreground">
          Q3
        </span>
        <Badge variant="warning" size="sm" dot>
          Active
        </Badge>
      </div>
      <div className="hidden items-center -space-x-1.5 sm:flex">
        <Avatar name="Ada Cole" size="xs" className="ring-2 ring-surface" />
        <Avatar name="Ines Park" size="xs" className="ring-2 ring-surface" />
        <Avatar name="Theo Vance" size="xs" className="ring-2 ring-surface" />
        <span className="grid size-5 place-items-center rounded-full bg-subtle text-caption font-semibold text-muted-foreground ring-2 ring-surface">
          +4
        </span>
      </div>
    </div>
  );
}

function Toolbar() {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-md border border-border bg-surface p-0.5">
          <span className="inline-flex items-center gap-1.5 rounded bg-subtle px-2 py-1 text-caption font-medium text-foreground">
            <LayoutGrid aria-hidden="true" className="size-3" />
            Board
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 text-caption text-muted-foreground">
            <List aria-hidden="true" className="size-3" />
            List
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-caption text-muted-foreground">
          <ListFilter aria-hidden="true" className="size-3" />
          Filter
        </span>
        <span className="hidden items-center gap-1.5 rounded-md px-2 py-1 text-caption text-muted-foreground lg:inline-flex">
          <ArrowUpDown aria-hidden="true" className="size-3" />
          Priority
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-2 rounded-md border border-border bg-surface px-2 py-1 text-caption text-muted-foreground/70 lg:inline-flex">
          <Search aria-hidden="true" className="size-3" />
          Search
        </span>
        <span aria-hidden="true" className="grid size-6 place-items-center rounded-md border border-border bg-surface text-muted-foreground">
          <Settings2 className="size-3" />
        </span>
      </div>
    </div>
  );
}

export function ProductMockup() {
  return (
    <div className="flex bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <BoardHeader />
        <Toolbar />
        <div className="grid grid-cols-2 gap-4 bg-canvas p-4 lg:grid-cols-4">
          {COLUMNS.map((column) => (
            <section key={column.status} className="flex min-w-0 flex-col gap-3">
              <div className="flex items-center gap-2 px-0.5">
                <span aria-hidden="true" className={cn("size-2 rounded-full", column.dot)} />
                <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                  {column.status}
                </span>
                <span className="text-caption font-medium tabular-nums text-muted-foreground/60">
                  {column.cards.length}
                </span>
                <Plus aria-hidden="true" className="ml-auto size-3.5 text-muted-foreground/60" />
              </div>
              <div className="flex flex-col gap-2.5">
                {column.cards.map((card) => (
                  <MockCardTile key={card.id} card={card} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
