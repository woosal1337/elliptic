"use client";

import { useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import {
  Badge,
  Button,
  DatePicker,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast,
} from "@elliptic/ui";
import { formatRelative } from "@/lib/format";
import {
  downloadAuditCsv,
  useAuditLog,
  type AuditFilters,
} from "@/hooks/use-audit-queries";
import { ErrorState } from "@/components/error-state";

const ENTITY_TYPES = [
  "task",
  "project",
  "organization",
  "note",
  "comment",
];

const ALL = "__all__";

function humanize(value: string): string {
  return value.replace(/[._-]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function AuditLogSettings({ orgId }: { orgId: string }) {
  const [entityType, setEntityType] = useState(ALL);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [exporting, setExporting] = useState(false);

  const filters: AuditFilters = {
    entity_type: entityType === ALL ? undefined : entityType,
    start_date: start || undefined,
    end_date: end || undefined,
  };
  const audit = useAuditLog(orgId, filters);
  const items = audit.data?.items ?? [];

  const onExport = () => {
    setExporting(true);
    downloadAuditCsv(orgId, filters)
      .catch(() => toast.error("Could not export audit log"))
      .finally(() => setExporting(false));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <ShieldCheck className="size-4 text-muted-foreground" />
          Audit log
        </h2>
        <p className="text-caption text-muted-foreground">
          Every recorded change with actor, timestamp, and before/after values. Admin-only.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-44" aria-label="Entity type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All entities</SelectItem>
            {ENTITY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {humanize(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DatePicker value={start} onChange={(v) => setStart(v ?? "")} placeholder="From" className="w-40" />
        <DatePicker value={end} onChange={(v) => setEnd(v ?? "")} placeholder="To" className="w-40" />
        <Button variant="outline" onClick={onExport} loading={exporting}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      {audit.isPending ? (
        <Skeleton className="h-48 w-full rounded-lg" />
      ) : audit.isError ? (
        <ErrorState error={audit.error} onRetry={() => void audit.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          illustration={<ShieldCheck className="size-10 text-muted-foreground" />}
          title="No audit entries"
          description="No recorded changes match these filters."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-small">
            <thead className="bg-surface text-caption text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">When</th>
                <th className="px-3 py-2 text-left font-medium">Actor</th>
                <th className="px-3 py-2 text-left font-medium">Event</th>
                <th className="px-3 py-2 text-left font-medium">Entity</th>
                <th className="px-3 py-2 text-left font-medium">Changes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => (
                <tr key={entry.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {formatRelative(entry.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-foreground">{entry.actor_name}</span>
                    {entry.actor_type === "system" ? (
                      <Badge variant="neutral" className="ml-1.5">
                        system
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-foreground">{humanize(entry.event_type)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{humanize(entry.entity_type)}</td>
                  <td className="px-3 py-2">
                    {Object.keys(entry.changes).length > 0 ? (
                      <code className="block max-w-xs truncate font-mono text-caption text-muted-foreground">
                        {Object.entries(entry.changes)
                          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                          .join(", ")}
                      </code>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
