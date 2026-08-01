"use client";

import { useEffect } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogTitle,
  cn,
} from "@elliptic/ui";
import type { OrgMember, TaskPriority, TaskStatus } from "@/lib/types";
import {
  PRIORITY_DOT_CLASSES,
  PRIORITY_LABELS,
  PRIORITY_SORT,
  STATUS_LABELS,
  STATUS_ORDER,
} from "@/lib/task-meta";
import { useKeyboard } from "@/lib/keyboard";
import { StatusDot } from "./task-bits";

export type PickerKind = "status" | "priority" | "assignee";

interface PickerBase {
  kind: PickerKind;
  count: number;
}

interface PickerShellProps {
  open: boolean;
  title: string;
  count: number;
  onClose: () => void;
  children: React.ReactNode;
}

function PickerShell({ open, title, count, onClose, children }: PickerShellProps) {
  const { setSuppressed } = useKeyboard();

  useEffect(() => {
    setSuppressed(open);
    return () => setSuppressed(false);
  }, [open, setSuppressed]);

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent
        size="sm"
        className="overflow-hidden p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">
          {title}
          {count > 1 ? ` for ${count} tasks` : ""}
        </DialogTitle>
        <Command loop>{children}</Command>
      </DialogContent>
    </Dialog>
  );
}

export interface StatusPickerProps extends PickerBase {
  kind: "status";
  open: boolean;
  current: TaskStatus | null;
  onSelect: (status: TaskStatus) => void;
  onClose: () => void;
}

export function StatusPicker({ open, current, count, onSelect, onClose }: StatusPickerProps) {
  return (
    <PickerShell open={open} title="Set status" count={count} onClose={onClose}>
      <CommandInput placeholder="Set status…" />
      <CommandList>
        <CommandEmpty>No status</CommandEmpty>
        <CommandGroup>
          {STATUS_ORDER.map((status) => (
            <CommandItem
              key={status}
              value={STATUS_LABELS[status]}
              onSelect={() => onSelect(status)}
            >
              <StatusDot status={status} />
              <span className="flex-1">{STATUS_LABELS[status]}</span>
              {current === status ? (
                <span className="text-caption text-muted-foreground">current</span>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </PickerShell>
  );
}

export interface PriorityPickerProps extends PickerBase {
  kind: "priority";
  open: boolean;
  current: TaskPriority | null;
  onSelect: (priority: TaskPriority) => void;
  onClose: () => void;
}

export function PriorityPicker({ open, current, count, onSelect, onClose }: PriorityPickerProps) {
  return (
    <PickerShell open={open} title="Set priority" count={count} onClose={onClose}>
      <CommandInput placeholder="Set priority…" />
      <CommandList>
        <CommandEmpty>No priority</CommandEmpty>
        <CommandGroup>
          {PRIORITY_SORT.map((priority) => (
            <CommandItem
              key={priority}
              value={PRIORITY_LABELS[priority]}
              onSelect={() => onSelect(priority)}
            >
              <span
                className={cn("inline-block size-2 shrink-0 rounded-full", PRIORITY_DOT_CLASSES[priority])}
                aria-hidden="true"
              />
              <span className="flex-1">{PRIORITY_LABELS[priority]}</span>
              {current === priority ? (
                <span className="text-caption text-muted-foreground">current</span>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </PickerShell>
  );
}

export interface AssigneePickerProps extends PickerBase {
  kind: "assignee";
  open: boolean;
  current: string | null;
  members: OrgMember[];
  onSelect: (userId: string | null) => void;
  onClose: () => void;
}

export function AssigneePicker({
  open,
  current,
  count,
  members,
  onSelect,
  onClose,
}: AssigneePickerProps) {
  return (
    <PickerShell open={open} title="Assign" count={count} onClose={onClose}>
      <CommandInput placeholder="Assign to…" />
      <CommandList>
        <CommandEmpty>No members</CommandEmpty>
        <CommandGroup>
          <CommandItem value="Unassigned" onSelect={() => onSelect(null)}>
            <span
              className="size-4 rounded-full border border-dashed border-border"
              aria-hidden="true"
            />
            <span className="flex-1">Unassigned</span>
            {current === null ? (
              <span className="text-caption text-muted-foreground">current</span>
            ) : null}
          </CommandItem>
          {members.map((member) => (
            <CommandItem
              key={member.user_id}
              value={member.full_name}
              onSelect={() => onSelect(member.user_id)}
            >
              <span className="flex-1">{member.full_name}</span>
              {current === member.user_id ? (
                <span className="text-caption text-muted-foreground">current</span>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </PickerShell>
  );
}
