"use client";

import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from "@elliptic/ui";
import type { OrgMember, TaskPriority, TaskStatus } from "@/lib/types";
import {
  PRIORITY_LABELS,
  PRIORITY_SORT,
  STATUS_DOT_CLASSES,
  STATUS_LABELS,
  STATUS_ORDER,
} from "@/lib/task-meta";
import { PriorityGlyph } from "../tasks/task-bits";

export interface PropertyPaletteOption<T> {
  value: T;
  label: string;
  keywords?: string[];
  leading?: ReactNode;
}

export interface PropertyPaletteProps<T> {
  options: PropertyPaletteOption<T>[];
  value: T;
  onChange: (value: T) => void;
  trigger: ReactNode;
  ariaLabel: string;
  placeholder?: string;
  emptyText?: string;
  heading?: string;
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

function optionKey<T>(value: T): string {
  return typeof value === "string" ? value : String(value);
}

export function PropertyPalette<T>({
  options,
  value,
  onChange,
  trigger,
  ariaLabel,
  placeholder = "Search…",
  emptyText = "No matches.",
  heading,
  align = "start",
  open: controlledOpen,
  onOpenChange,
  className,
}: PropertyPaletteProps<T>) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const select = (next: T) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} sideOffset={6} aria-label={ariaLabel} className={cn("w-60", className)}>
        <Command
          loop
          label={ariaLabel}
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70 [&_[cmdk-group]]:px-2"
        >
          <CommandInput placeholder={placeholder} autoFocus />
          <CommandList className="max-h-64">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup heading={heading}>
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <CommandItem
                    key={optionKey(option.value)}
                    value={`${option.label} ${(option.keywords ?? []).join(" ")}`}
                    onSelect={() => select(option.value)}
                  >
                    {option.leading ? (
                      <span className="flex shrink-0 items-center">{option.leading}</span>
                    ) : null}
                    <span className="flex-1 truncate text-foreground/90">{option.label}</span>
                    {selected ? (
                      <Check className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Dot({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
    />
  );
}

const STATUS_OPTIONS: PropertyPaletteOption<TaskStatus>[] = STATUS_ORDER.map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
  keywords: ["status", "state"],
  leading: <Dot className={STATUS_DOT_CLASSES[status]} />,
}));

const PRIORITY_OPTIONS: PropertyPaletteOption<TaskPriority>[] = PRIORITY_SORT.map((priority) => ({
  value: priority,
  label: PRIORITY_LABELS[priority],
  keywords: ["priority"],
  leading: <PriorityGlyph priority={priority} />,
}));

export function StatusPalette({
  value,
  onChange,
  trigger,
  align,
  open,
  onOpenChange,
}: {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
  trigger: ReactNode;
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <PropertyPalette
      options={STATUS_OPTIONS}
      value={value}
      onChange={onChange}
      trigger={trigger}
      ariaLabel="Set status"
      placeholder="Set status…"
      heading="Status"
      align={align}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}

export function PriorityPalette({
  value,
  onChange,
  trigger,
  align,
  open,
  onOpenChange,
}: {
  value: TaskPriority;
  onChange: (priority: TaskPriority) => void;
  trigger: ReactNode;
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <PropertyPalette
      options={PRIORITY_OPTIONS}
      value={value}
      onChange={onChange}
      trigger={trigger}
      ariaLabel="Set priority"
      placeholder="Set priority…"
      heading="Priority"
      align={align}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}

const UNASSIGNED = "__unassigned__";

export function AssigneePalette({
  value,
  members,
  onChange,
  trigger,
  align,
  open,
  onOpenChange,
}: {
  value: string | null;
  members: OrgMember[];
  onChange: (userId: string | null) => void;
  trigger: ReactNode;
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const options: PropertyPaletteOption<string>[] = [
    {
      value: UNASSIGNED,
      label: "Unassigned",
      keywords: ["clear", "none", "no one"],
      leading: <Dot className="bg-muted-foreground/30" />,
    },
    ...members.map<PropertyPaletteOption<string>>((member) => ({
      value: member.user_id,
      label: member.full_name,
      keywords: [member.email, "assignee", "owner"],
      leading: (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-mono-label font-mono uppercase text-muted-foreground">
          {member.full_name.charAt(0)}
        </span>
      ),
    })),
  ];

  return (
    <PropertyPalette
      options={options}
      value={value ?? UNASSIGNED}
      onChange={(next) => onChange(next === UNASSIGNED ? null : next)}
      trigger={trigger}
      ariaLabel="Assign member"
      placeholder="Assign to…"
      emptyText="No members found."
      heading="Assignee"
      align={align}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
