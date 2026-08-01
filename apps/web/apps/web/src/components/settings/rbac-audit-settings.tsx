"use client";

import { useState } from "react";
import { ArrowRight, Download, UserCog } from "lucide-react";
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
  downloadRbacAuditCsv,
  useRbacAuditLog,
  type RbacAuditFilters,
} from "@/hooks/use-rbac-audit-queries";
import { ErrorState } from "@/components/error-state";

const ACTIONS = [
  "member_invited",
  "member_added",
  "member_removed",
  "org_role_changed",
  "project_role_changed",
  "team_member_added",
  "team_member_removed",
];

const SCOPES = ["org", "project", "team"];

const ALL = "__all__";

function humanize(value: string): string {
  return value.replace(/[._-]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function RbacAuditSettings({ orgId }: { orgId: string }) {
  const [action, setAction] = useState(ALL);
  const [scope, setScope] = useState(ALL);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [exporting, setExporting] = useState(false);

  const filters: RbacAuditFilters = {
    action: action === ALL ? undefined : action,
    resource_scope: scope === ALL ? undefined : scope,
    start_date: start || undefined,
    end_date: end || undefined,
  };
  const audit = useRbacAuditLog(orgId, filters);
  const items = audit.data?.items ?? [];

  const onExport = () => {
    setExporting(true);
    downloadRbacAuditCsv(orgId, filters)
      .catch(() => toast.error("Could not export the role audit log"))
      .finally(() => setExporting(false));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <UserCog className="size-4 text-muted-foreground" />
          Role &amp; permission audit
        </h2>
        <p className="text-caption text-muted-foreground">
          Every membership and role change with actor, subject, and before/after values. Admin-only.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-48" aria-label="Action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All actions</SelectItem>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {humanize(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="w-36" aria-label="Scope">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All scopes</SelectItem>
            {SCOPES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DatePicker
          value={start}
          onChange={(v) => setStart(v ?? "")}
          placeholder="From"
          className="w-40"
        />
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
          illustration={<UserCog className="size-10 text-muted-foreground" />}
          title="No role changes"
          description="No role or permission changes match these filters."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-small">
            <thead className="bg-surface text-caption text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">When</th>
                <th className="px-3 py-2 text-left font-medium">Actor</th>
                <th className="px-3 py-2 text-left font-medium">Action</th>
                <th className="px-3 py-2 text-left font-medium">Subject</th>
                <th className="px-3 py-2 text-left font-medium">Scope</th>
                <th className="px-3 py-2 text-left font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => (
                <tr key={entry.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {formatRelative(entry.created_at)}
                  </td>
                  <td className="px-3 py-2 text-foreground">{entry.actor_name}</td>
                  <td className="px-3 py-2 text-foreground">{humanize(entry.action)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {entry.subject_name ??
                      (entry.detail && typeof entry.detail.email === "string"
                        ? (entry.detail.email as string)
                        : "—")}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="neutral" className="capitalize">
                      {entry.resource_scope}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    {entry.role_before || entry.role_after ? (
                      <span className="flex items-center gap-1 text-caption">
                        <span className="text-muted-foreground">{entry.role_before ?? "—"}</span>
                        <ArrowRight className="size-3 text-muted-foreground/60" />
                        <span className="text-foreground">{entry.role_after ?? "—"}</span>
                      </span>
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
