"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, LogIn, Lock, Plus, Star, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  cn,
} from "@elliptic/ui";
import { ArrowRight } from "lucide-react";
import { useOrg, useTeams, useUpdateOrg } from "@/hooks/use-org-queries";
import {
  type ConditionType,
  useCreateTransitionCondition,
  useCreateWorkflowStatus,
  useCreateWorkflowTransition,
  useDeleteTransitionCondition,
  useDeleteWorkflowStatus,
  useDeleteWorkflowTransition,
  useStatusItemCount,
  useTransitionConditions,
  useUpdateWorkflowStatus,
  useWorkflowStatuses,
  useWorkflowTransitions,
} from "@/hooks/use-workflow-queries";
import {
  STATUS_COLORS,
  defaultWorkflow,
  groupByCategory,
  moveWithinCategory,
  type WorkflowStatus,
} from "@/lib/workflow";
import type { StatusCategory } from "@/lib/task-meta";

const ORG_SCOPE = "org";

const COLOR_CLASS: Record<string, string> = {
  "muted-foreground": "bg-muted-foreground",
  accent: "bg-accent",
  warning: "bg-warning",
  success: "bg-success",
  danger: "bg-danger",
  info: "bg-info",
  teal: "bg-teal",
};

function ColorDot({ color }: { color: string }) {
  return (
    <span
      className={cn("size-2.5 shrink-0 rounded-full", COLOR_CLASS[color] ?? "bg-muted-foreground")}
      aria-hidden
    />
  );
}

function StatusDeleteControl({
  orgId,
  teamId,
  status,
  siblings,
}: {
  orgId: string;
  teamId: string | null;
  status: WorkflowStatus;
  siblings: WorkflowStatus[];
}) {
  const [open, setOpen] = useState(false);
  const itemCount = useStatusItemCount(orgId, status.id, open);
  const remove = useDeleteWorkflowStatus(orgId, teamId);
  const [target, setTarget] = useState("");
  const count = itemCount.data?.count ?? 0;
  const others = siblings.filter((s) => s.id !== status.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton variant="ghost" aria-label={`Delete ${status.name}`}>
          <Trash2 className="size-3.5" />
        </IconButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{status.name}”</DialogTitle>
          <DialogDescription>
            {count > 0
              ? `${count} work item${count === 1 ? "" : "s"} are in this status. Choose a status to move them to.`
              : "This status has no work items and can be removed."}
          </DialogDescription>
        </DialogHeader>
        {count > 0 ? (
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger aria-label="Transfer items to">
              <SelectValue placeholder="Move items to…" />
            </SelectTrigger>
            <SelectContent>
              {others.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            disabled={count > 0 && !target}
            onClick={() =>
              remove.mutate(
                { id: status.id, transferTo: count > 0 ? target : null },
                { onSuccess: () => setOpen(false) }
              )
            }
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusRow({
  orgId,
  teamId,
  status,
  index,
  count,
  siblings,
  onMove,
}: {
  orgId: string;
  teamId: string | null;
  status: WorkflowStatus;
  index: number;
  count: number;
  siblings: WorkflowStatus[];
  onMove: (direction: "up" | "down") => void;
}) {
  const update = useUpdateWorkflowStatus(orgId, teamId);
  const [name, setName] = useState(status.name);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
      <Select value={status.color} onValueChange={(color) => update.mutate({ id: status.id, color })}>
        <SelectTrigger className="h-8 w-12 px-2" aria-label="Status color">
          <ColorDot color={status.color} />
        </SelectTrigger>
        <SelectContent>
          {STATUS_COLORS.map((color) => (
            <SelectItem key={color} value={color}>
              <span className="flex items-center gap-2">
                <ColorDot color={color} />
                {color}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={name}
        aria-label="Status name"
        className="h-8 flex-1"
        onChange={(event) => setName(event.target.value)}
        onBlur={() => {
          if (name.trim().length > 0 && name.trim() !== status.name) {
            update.mutate({ id: status.id, name: name.trim() });
          }
        }}
      />
      {status.is_default ? (
        <Badge variant="outline" size="sm">
          Default
        </Badge>
      ) : (
        <IconButton
          variant="ghost"
          aria-label="Make default backlog status"
          onClick={() => update.mutate({ id: status.id, is_default: true })}
        >
          <Star className="size-3.5" />
        </IconButton>
      )}
      <IconButton
        variant="ghost"
        aria-label={
          status.allow_new_items ? "New items allowed here" : "New items not allowed here"
        }
        title={
          status.allow_new_items
            ? "New items can start in this status"
            : "New items cannot start in this status"
        }
        onClick={() => update.mutate({ id: status.id, allow_new_items: !status.allow_new_items })}
      >
        <LogIn
          className={cn(
            "size-3.5",
            status.allow_new_items ? "text-accent" : "text-muted-foreground/40"
          )}
        />
      </IconButton>
      <IconButton
        variant="ghost"
        aria-label="Move up"
        disabled={index === 0}
        onClick={() => onMove("up")}
      >
        <ChevronUp className="size-3.5" />
      </IconButton>
      <IconButton
        variant="ghost"
        aria-label="Move down"
        disabled={index === count - 1}
        onClick={() => onMove("down")}
      >
        <ChevronDown className="size-3.5" />
      </IconButton>
      <StatusDeleteControl orgId={orgId} teamId={teamId} status={status} siblings={siblings} />
    </div>
  );
}

function AddStatus({
  orgId,
  teamId,
  category,
}: {
  orgId: string;
  teamId: string | null;
  category: StatusCategory;
}) {
  const create = useCreateWorkflowStatus(orgId, teamId);
  const [name, setName] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim().length === 0) return;
        create.mutate(
          { name: name.trim(), category, color: "muted-foreground" },
          { onSuccess: () => setName("") }
        );
      }}
      className="flex items-center gap-2"
    >
      <Input
        value={name}
        placeholder={`Add a ${category} status…`}
        aria-label={`Add status to ${category}`}
        className="h-8"
        onChange={(event) => setName(event.target.value)}
      />
      <Button type="submit" size="sm" variant="ghost" disabled={create.isPending || name.trim().length === 0}>
        <Plus className="size-4" />
        Add
      </Button>
    </form>
  );
}

function WorkflowTransitionsEditor({
  orgId,
  statuses,
}: {
  orgId: string;
  statuses: WorkflowStatus[];
}) {
  const transitions = useWorkflowTransitions(orgId);
  const create = useCreateWorkflowTransition(orgId);
  const remove = useDeleteWorkflowTransition(orgId);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [role, setRole] = useState("any");
  const [kind, setKind] = useState("all");

  const nameOf = (id: string) => statuses.find((s) => s.id === id)?.name ?? "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allowed transitions</CardTitle>
        <CardDescription>
          Restrict which status moves are allowed. A status with no rules allows any move; once you
          add a rule from a status, only the listed targets are permitted.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-2">
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger className="w-44" aria-label="From status">
              <SelectValue placeholder="From status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ArrowRight className="mb-2 size-4 text-muted-foreground" />
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger className="w-44" aria-label="To status">
              <SelectValue placeholder="To status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-36" aria-label="Required role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Anyone</SelectItem>
              <SelectItem value="viewer">Viewer+</SelectItem>
              <SelectItem value="member">Member+</SelectItem>
              <SelectItem value="admin">Admin only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="w-32 capitalize" aria-label="Work item type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="task">Task</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="story">Story</SelectItem>
              <SelectItem value="epic">Epic</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!from || !to || from === to || create.isPending}
            onClick={() =>
              create.mutate(
                {
                  from_status_id: from,
                  to_status_id: to,
                  required_role:
                    role === "any" ? null : (role as "admin" | "member" | "viewer"),
                  kind: kind === "all" ? null : (kind as "task" | "bug" | "story" | "epic"),
                },
                { onSuccess: () => setTo("") }
              )
            }
          >
            <Plus className="size-4" />
            Allow
          </Button>
        </div>

        {(transitions.data ?? []).length === 0 ? (
          <p className="text-caption text-muted-foreground">
            No rules — all status transitions are currently allowed.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {(transitions.data ?? []).map((transition) => (
              <li
                key={transition.id}
                className="group flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-small"
              >
                <span className="text-foreground">{nameOf(transition.from_status_id)}</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
                <span className="flex-1 text-foreground">{nameOf(transition.to_status_id)}</span>
                {transition.kind ? (
                  <Badge variant="neutral" size="sm" className="capitalize">
                    {transition.kind}
                  </Badge>
                ) : null}
                {transition.required_role ? (
                  <Badge variant="outline" size="sm" className="capitalize">
                    {transition.required_role}+
                  </Badge>
                ) : null}
                <IconButton
                  aria-label="Remove transition"
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(transition.id)}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const CONDITION_LABELS: Record<ConditionType, string> = {
  require_assignee: "Require assignee",
  require_estimate: "Require estimate",
  require_due_date: "Require due date",
  require_dod_complete: "Require DoD complete",
};

function TransitionConditionsEditor({
  orgId,
  statuses,
}: {
  orgId: string;
  statuses: WorkflowStatus[];
}) {
  const conditions = useTransitionConditions(orgId);
  const create = useCreateTransitionCondition(orgId);
  const remove = useDeleteTransitionCondition(orgId);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [condition, setCondition] = useState<ConditionType>("require_assignee");

  const nameOf = (id: string) => statuses.find((s) => s.id === id)?.name ?? "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transition conditions</CardTitle>
        <CardDescription>
          Block a move until the item meets a requirement (assignee, estimate, due date, DoD).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-2">
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger className="w-40" aria-label="From status">
              <SelectValue placeholder="From status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ArrowRight className="mb-2 size-4 text-muted-foreground" />
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger className="w-40" aria-label="To status">
              <SelectValue placeholder="To status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={condition} onValueChange={(value) => setCondition(value as ConditionType)}>
            <SelectTrigger className="w-44" aria-label="Condition">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CONDITION_LABELS) as ConditionType[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {CONDITION_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!from || !to || from === to || create.isPending}
            onClick={() =>
              create.mutate(
                { from_status_id: from, to_status_id: to, condition },
                { onSuccess: () => setTo("") }
              )
            }
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>

        {(conditions.data ?? []).length === 0 ? (
          <p className="text-caption text-muted-foreground">No transition conditions set.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {(conditions.data ?? []).map((row) => (
              <li
                key={row.id}
                className="group flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-small"
              >
                <span className="text-foreground">{nameOf(row.from_status_id)}</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
                <span className="text-foreground">{nameOf(row.to_status_id)}</span>
                <Badge variant="outline" size="sm" className="ml-auto">
                  {CONDITION_LABELS[row.condition]}
                </Badge>
                <IconButton
                  aria-label="Remove condition"
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => remove.mutate(row.id)}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function BackwardTransitionToggle({ orgId }: { orgId: string }) {
  const org = useOrg(orgId);
  const updateOrg = useUpdateOrg(orgId);
  if (!org.data) return null;
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="flex flex-col gap-1">
          <span className="text-small font-medium text-foreground">
            Block backward status moves
          </span>
          <span className="text-caption text-muted-foreground">
            When on, work items can&apos;t move back to an earlier stage. When off, backward moves
            are allowed but auto-commented.
          </span>
        </div>
        <Switch
          checked={org.data.block_backward_transitions}
          disabled={updateOrg.isPending}
          onCheckedChange={(checked) => updateOrg.mutate({ block_backward_transitions: checked })}
          aria-label="Block backward status moves"
        />
      </CardContent>
    </Card>
  );
}

export function WorkflowSettings({ orgId }: { orgId: string }) {
  const [scope, setScope] = useState(ORG_SCOPE);
  const teamId = scope === ORG_SCOPE ? null : scope;
  const teams = useTeams(orgId);
  const query = useWorkflowStatuses(orgId, teamId);
  const update = useUpdateWorkflowStatus(orgId, teamId);

  const statuses = useMemo(
    () => (query.data && query.data.length > 0 ? query.data : defaultWorkflow()),
    [query.data]
  );
  const groups = useMemo(() => groupByCategory(statuses), [statuses]);

  const handleMove = (id: string, direction: "up" | "down") => {
    const next = moveWithinCategory(statuses, id, direction);
    for (const status of next) {
      const prev = statuses.find((item) => item.id === status.id);
      if (prev && prev.position !== status.position) {
        update.mutate({ id: status.id, position: status.position });
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
    <Card>
      <CardHeader>
        <CardTitle>Workflow</CardTitle>
        <CardDescription>
          Rename, recolor, reorder, and add statuses within each fixed category. Categories power
          analytics and AI, so they can&rsquo;t be renamed or reordered. Each team can override the
          org workflow.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <span className="text-caption text-muted-foreground">Workflow for</span>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="h-8 w-48" aria-label="Workflow scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ORG_SCOPE}>Organization (default)</SelectItem>
              {(teams.data ?? []).map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {groups.map((group) => (
          <div key={group.category} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Lock className="size-3 text-muted-foreground" />
              <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {group.statuses.map((status, index) => (
                <StatusRow
                  key={status.id}
                  orgId={orgId}
                  teamId={teamId}
                  status={status}
                  index={index}
                  count={group.statuses.length}
                  siblings={statuses}
                  onMove={(direction) => handleMove(status.id, direction)}
                />
              ))}
              <AddStatus orgId={orgId} teamId={teamId} category={group.category} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
    {teamId === null && query.data && query.data.length > 0 ? (
      <WorkflowTransitionsEditor orgId={orgId} statuses={query.data} />
    ) : null}
    {teamId === null && query.data && query.data.length > 0 ? (
      <TransitionConditionsEditor orgId={orgId} statuses={query.data} />
    ) : null}
    {teamId === null ? <BackwardTransitionToggle orgId={orgId} /> : null}
    </div>
  );
}
