"use client";

import { useState } from "react";
import { Table2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import { usePivotTable } from "@/hooks/use-analytics-queries";

const DIMENSIONS = [
  { value: "assignee", label: "Assignee" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "kind", label: "Type" },
];

function label(value: string): string {
  return value.replace(/_/g, " ");
}

export function PivotTable({ orgId, projectId }: { orgId: string; projectId: string }) {
  const [row, setRow] = useState("priority");
  const [col, setCol] = useState("status");
  const pivot = usePivotTable(orgId, { row, col, projectId });
  const data = pivot.data;

  const rowTotal = (rowKey: string) =>
    Object.values(data?.cells[rowKey] ?? {}).reduce((acc, n) => acc + n, 0);
  const colTotal = (colKey: string) =>
    (data?.row_keys ?? []).reduce((acc, rk) => acc + (data?.cells[rk]?.[colKey] ?? 0), 0);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <Table2 className="size-4 text-muted-foreground" />
          Pivot table
        </h3>
        <div className="flex items-center gap-2">
          <Select value={row} onValueChange={setRow}>
            <SelectTrigger aria-label="Rows" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIMENSIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-caption text-muted-foreground">×</span>
          <Select value={col} onValueChange={setCol}>
            <SelectTrigger aria-label="Columns" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIMENSIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {pivot.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : !data || data.row_keys.length === 0 ? (
        <p className="py-8 text-center text-small text-muted-foreground">No data for this view.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-caption">
            <thead>
              <tr>
                <th className="border-b border-border p-2 text-left text-muted-foreground" />
                {data.col_keys.map((ck) => (
                  <th key={ck} className="border-b border-border p-2 text-right font-medium capitalize text-muted-foreground">
                    {label(ck)}
                  </th>
                ))}
                <th className="border-b border-border p-2 text-right font-semibold text-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.row_keys.map((rk) => (
                <tr key={rk}>
                  <td className="border-b border-border/60 p-2 font-medium capitalize text-foreground">
                    {label(rk)}
                  </td>
                  {data.col_keys.map((ck) => (
                    <td key={ck} className="border-b border-border/60 p-2 text-right tabular-nums text-muted-foreground">
                      {data.cells[rk]?.[ck] ?? 0}
                    </td>
                  ))}
                  <td className="border-b border-border/60 p-2 text-right font-semibold tabular-nums text-foreground">
                    {rowTotal(rk)}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="p-2 font-semibold text-foreground">Total</td>
                {data.col_keys.map((ck) => (
                  <td key={ck} className="p-2 text-right font-semibold tabular-nums text-foreground">
                    {colTotal(ck)}
                  </td>
                ))}
                <td className="p-2" />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
