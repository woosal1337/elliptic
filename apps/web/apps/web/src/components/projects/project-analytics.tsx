"use client";

import { Clock, Download } from "lucide-react";
import { Badge, Button, Card, Skeleton } from "@elliptic/ui";
import {
  downloadAnalyticsCsv,
  useAnalyticsOverview,
  useFlowAnalytics,
} from "@/hooks/use-analytics-queries";
import { downloadProjectWorklogsCsv } from "@/hooks/use-worklog-queries";
import { ErrorState } from "@/components/error-state";
import { ChartBuilder } from "@/components/projects/chart-builder";
import { PivotTable } from "@/components/projects/pivot-table";
import { WorkloadTable } from "@/components/projects/workload-table";
import { ForecastCard } from "@/components/projects/forecast-card";
import { AIChartPanel } from "@/components/ai/ai-chart-panel";
import { ScatterChart } from "@/components/projects/scatter-chart";

const CATEGORY_LABELS_FLOW: Record<string, string> = {
  backlog: "Backlog",
  unstarted: "To do",
  started: "In progress",
};

function FlowCard({
  orgId,
  projectId,
  onDrill,
}: {
  orgId: string;
  projectId: string;
  onDrill?: (tab: string) => void;
}) {
  const flow = useFlowAnalytics(orgId, projectId);
  const data = flow.data;
  if (!data || data.total_wip === 0) return null;
  const maxWip = Math.max(1, ...data.statuses.map((s) => s.wip));
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-small font-semibold text-foreground">Flow &amp; bottlenecks</h3>
        <span className="text-caption text-muted-foreground">{data.total_wip} in progress</span>
      </div>
      <ul className="flex flex-col gap-2">
        {data.statuses.map((status) => (
          <li key={status.status}>
            <button
              type="button"
              disabled={!onDrill}
              onClick={() => onDrill?.("board")}
              className="flex w-full items-center gap-2 rounded text-left enabled:hover:bg-muted/50 disabled:cursor-default"
              title={onDrill ? "View these work items" : undefined}
            >
              <span className="w-24 shrink-0 text-caption text-muted-foreground">
                {CATEGORY_LABELS_FLOW[status.status] ?? status.status}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(status.wip / maxWip) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-caption tabular text-foreground">
                {status.wip}
              </span>
              <Badge variant={status.avg_age_days >= 14 ? "warning" : "neutral"}>
                {status.avg_age_days}d avg
              </Badge>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  backlog: "Backlog",
  unstarted: "To do",
  started: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const CATEGORY_COLORS: Record<string, string> = {
  backlog: "#F5F5F5",
  unstarted: "#C4C4C4",
  started: "#9A9A9A",
  completed: "#767676",
  cancelled: "#5A5A5A",
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <span className="text-caption text-muted-foreground">{label}</span>
      <span className="text-h3 font-semibold tracking-[-0.01em] text-foreground">{value}</span>
    </Card>
  );
}

function Breakdown({
  title,
  data,
  labels,
  colors,
  onRowClick,
}: {
  title: string;
  data: Record<string, number>;
  labels?: Record<string, string>;
  colors?: Record<string, string>;
  onRowClick?: (key: string) => void;
}) {
  const entries = Object.entries(data).filter(([, count]) => count > 0);
  const max = Math.max(1, ...entries.map(([, count]) => count));
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h3 className="text-small font-semibold text-foreground">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-caption text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map(([key, count]) => (
            <li key={key}>
              <button
                type="button"
                disabled={!onRowClick}
                onClick={() => onRowClick?.(key)}
                className="flex w-full items-center gap-2 rounded text-left enabled:hover:bg-muted/50 disabled:cursor-default"
                title={onRowClick ? "View these work items" : undefined}
              >
                <span className="w-24 shrink-0 truncate text-caption text-muted-foreground capitalize">
                  {labels?.[key] ?? key.replace("_", " ")}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(count / max) * 100}%`,
                      backgroundColor: colors?.[key] ?? "#8C8C8C",
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-caption tabular text-foreground">
                  {count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function ProjectAnalytics({
  orgId,
  projectId,
  onDrill,
}: {
  orgId: string;
  projectId: string;
  onDrill?: (tab: string) => void;
}) {
  const overview = useAnalyticsOverview(orgId, projectId);

  if (overview.isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (overview.isError) {
    return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />;
  }

  const data = overview.data;
  const completionPct = `${Math.round(data.completion_rate * 100)}%`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => void downloadProjectWorklogsCsv(orgId, projectId)}
        >
          <Clock className="size-4" />
          Time log CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void downloadAnalyticsCsv(orgId, projectId)}
        >
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Work items" value={String(data.total)} />
        <StatCard label="Completed" value={String(data.completed)} />
        <StatCard label="Completion" value={completionPct} />
        <StatCard label="Overdue" value={String(data.overdue)} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Breakdown
          title="By status"
          data={data.by_category}
          labels={CATEGORY_LABELS}
          colors={CATEGORY_COLORS}
          onRowClick={onDrill ? () => onDrill("board") : undefined}
        />
        <Breakdown
          title="By priority"
          data={data.by_priority}
          onRowClick={onDrill ? () => onDrill("tasks") : undefined}
        />
        <Breakdown
          title="By type"
          data={data.by_kind}
          onRowClick={onDrill ? () => onDrill("tasks") : undefined}
        />
      </div>
      <FlowCard orgId={orgId} projectId={projectId} onDrill={onDrill} />
      <AIChartPanel orgId={orgId} />
      <ChartBuilder orgId={orgId} projectId={projectId} />
      <PivotTable orgId={orgId} projectId={projectId} />
      <WorkloadTable orgId={orgId} projectId={projectId} />
      <ForecastCard orgId={orgId} projectId={projectId} />
      <ScatterChart orgId={orgId} projectId={projectId} />
    </div>
  );
}
