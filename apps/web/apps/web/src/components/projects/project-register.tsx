"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import {
  useCreateRegisterEntry,
  useDeleteRegisterEntry,
  useRegisterEntries,
  useUpdateRegisterEntry,
  type RegisterEntry,
  type RegisterKind,
  type RegisterStatus,
} from "@/hooks/use-register-queries";
import { ErrorState } from "@/components/error-state";

const KINDS: { key: RegisterKind; label: string }[] = [
  { key: "risk", label: "Risks" },
  { key: "assumption", label: "Assumptions" },
  { key: "issue", label: "Issues" },
  { key: "dependency", label: "Dependencies" },
  { key: "decision", label: "Decisions" },
];

const STATUSES: RegisterStatus[] = [
  "open",
  "in_progress",
  "mitigated",
  "resolved",
  "accepted",
  "closed",
];

const SCORES = [1, 2, 3, 4, 5];

function riskTone(score: number | null): "danger" | "warning" | "neutral" {
  if (score === null) return "neutral";
  if (score >= 15) return "danger";
  if (score >= 8) return "warning";
  return "neutral";
}

export function ProjectRegister({ orgId, projectId }: { orgId: string; projectId: string }) {
  const entries = useRegisterEntries(orgId, projectId);
  const create = useCreateRegisterEntry(orgId, projectId);
  const update = useUpdateRegisterEntry(orgId, projectId);
  const remove = useDeleteRegisterEntry(orgId, projectId);
  const [activeKind, setActiveKind] = useState<RegisterKind>("risk");
  const [title, setTitle] = useState("");
  const [probability, setProbability] = useState(3);
  const [impact, setImpact] = useState(3);

  const submit = () => {
    if (!title.trim()) return;
    create.mutate(
      {
        kind: activeKind,
        title: title.trim(),
        ...(activeKind === "risk" ? { probability, impact } : {}),
      },
      { onSuccess: () => setTitle("") }
    );
  };

  if (entries.isError) {
    return <ErrorState error={entries.error} onRetry={() => void entries.refetch()} />;
  }

  const rows = (entries.data ?? []).filter((entry) => entry.kind === activeKind);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((kind) => {
          const count = (entries.data ?? []).filter((entry) => entry.kind === kind.key).length;
          return (
            <Button
              key={kind.key}
              size="sm"
              variant={activeKind === kind.key ? "secondary" : "ghost"}
              onClick={() => setActiveKind(kind.key)}
            >
              {kind.label}
              {count > 0 ? <span className="ml-1.5 text-caption text-muted-foreground">{count}</span> : null}
            </Button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={title}
          placeholder={`Add a ${activeKind}…`}
          className="min-w-48 flex-1"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
        />
        {activeKind === "risk" ? (
          <>
            <ScoreSelect label="P" value={probability} onChange={setProbability} />
            <ScoreSelect label="I" value={impact} onChange={setImpact} />
          </>
        ) : null}
        <Button size="sm" onClick={submit} disabled={!title.trim() || create.isPending}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {entries.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-small text-muted-foreground">
          No {activeKind} entries yet.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {rows.map((entry) => (
            <RegisterRow
              key={entry.id}
              entry={entry}
              onStatus={(status) => update.mutate({ entryId: entry.id, status })}
              onDelete={() => remove.mutate(entry.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ScoreSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
      <SelectTrigger className="w-16" aria-label={label === "P" ? "Probability" : "Impact"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SCORES.map((score) => (
          <SelectItem key={score} value={String(score)}>
            {label}
            {score}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RegisterRow({
  entry,
  onStatus,
  onDelete,
}: {
  entry: RegisterEntry;
  onStatus: (status: RegisterStatus) => void;
  onDelete: () => void;
}) {
  return (
    <li className="group flex items-center gap-3 px-3 py-2">
      <span className="flex-1 truncate text-small text-foreground">{entry.title}</span>
      {entry.risk_score !== null ? (
        <Badge variant={riskTone(entry.risk_score)}>Score {entry.risk_score}</Badge>
      ) : null}
      <Select value={entry.status} onValueChange={(next) => onStatus(next as RegisterStatus)}>
        <SelectTrigger className="w-36 capitalize" aria-label="Status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((status) => (
            <SelectItem key={status} value={status} className="capitalize">
              {status.replace("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <IconButton
        aria-label="Delete entry"
        variant="ghost"
        size="sm"
        className="opacity-0 group-hover:opacity-100"
        onClick={onDelete}
      >
        <Trash2 className="size-4" />
      </IconButton>
    </li>
  );
}
