"use client";

import { useQuery } from "@tanstack/react-query";
import type { ThroughputPoint } from "@/lib/types";
import { api, orgPath } from "@/lib/api";

export function useThroughput(orgId: string, projectId: string, days = 30, enabled = true) {
  return useQuery({
    queryKey: ["orgs", orgId, "projects", projectId, "throughput", days] as const,
    queryFn: ({ signal }) =>
      api.get<ThroughputPoint[]>(
        orgPath(orgId, `/projects/${projectId}/analytics/throughput?days=${days}`),
        signal
      ),
    enabled,
  });
}

export interface AnalyticsOverview {
  total: number;
  completed: number;
  completion_rate: number;
  overdue: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  by_kind: Record<string, number>;
}

export function useAnalyticsOverview(orgId: string, projectId?: string) {
  return useQuery({
    queryKey: ["orgs", orgId, "analytics", "overview", projectId ?? "all"] as const,
    queryFn: ({ signal }) =>
      api.get<AnalyticsOverview>(
        orgPath(orgId, `/analytics/overview${projectId ? `?project_id=${projectId}` : ""}`),
        signal
      ),
  });
}

export async function downloadAnalyticsCsv(orgId: string, projectId?: string): Promise<void> {
  const response = await fetch(
    orgPath(orgId, `/analytics/export.csv${projectId ? `?project_id=${projectId}` : ""}`),
    { credentials: "include" }
  );
  if (!response.ok) throw new Error("Export failed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "analytics.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export interface FlowStatus {
  status: string;
  wip: number;
  avg_age_days: number;
}

export interface FlowAnalytics {
  statuses: FlowStatus[];
  total_wip: number;
}

export function useFlowAnalytics(orgId: string, projectId?: string) {
  return useQuery({
    queryKey: ["orgs", orgId, "analytics", "flow", projectId ?? "all"] as const,
    queryFn: ({ signal }) =>
      api.get<FlowAnalytics>(
        orgPath(orgId, `/analytics/flow${projectId ? `?project_id=${projectId}` : ""}`),
        signal
      ),
  });
}

export interface CustomChartPoint {
  key: string;
  value: number;
}

export interface CustomChart {
  metric: string;
  dimension: string;
  points: CustomChartPoint[];
}

export function useCustomChart(
  orgId: string,
  params: { metric: string; dimension: string; projectId?: string }
) {
  const query = new URLSearchParams({ metric: params.metric, dimension: params.dimension });
  if (params.projectId) query.set("project_id", params.projectId);
  return useQuery({
    queryKey: ["orgs", orgId, "analytics", "custom", params] as const,
    queryFn: ({ signal }) =>
      api.get<CustomChart>(orgPath(orgId, `/analytics/custom?${query.toString()}`), signal),
  });
}

export interface PivotTable {
  row: string;
  col: string;
  row_keys: string[];
  col_keys: string[];
  cells: Record<string, Record<string, number>>;
}

export function usePivotTable(
  orgId: string,
  params: { row: string; col: string; projectId?: string }
) {
  const query = new URLSearchParams({ row: params.row, col: params.col });
  if (params.projectId) query.set("project_id", params.projectId);
  return useQuery({
    queryKey: ["orgs", orgId, "analytics", "pivot", params] as const,
    queryFn: ({ signal }) =>
      api.get<PivotTable>(orgPath(orgId, `/analytics/pivot?${query.toString()}`), signal),
  });
}

export interface WorkloadRow {
  assignee_id: string;
  open: number;
  in_progress: number;
  completed_30d: number;
}

export function useMemberWorkload(orgId: string, projectId?: string) {
  return useQuery({
    queryKey: ["orgs", orgId, "analytics", "workload", projectId ?? "all"] as const,
    queryFn: ({ signal }) =>
      api.get<{ members: WorkloadRow[] }>(
        orgPath(orgId, `/analytics/workload${projectId ? `?project_id=${projectId}` : ""}`),
        signal
      ),
  });
}

export interface ForecastWeek {
  week_start: string;
  completed: number;
}

export interface ThroughputForecast {
  weekly: ForecastWeek[];
  avg_per_week: number;
  projected_next_week: number;
}

export function useThroughputForecast(orgId: string, projectId?: string, weeks = 8) {
  const query = new URLSearchParams({ weeks: String(weeks) });
  if (projectId) query.set("project_id", projectId);
  return useQuery({
    queryKey: ["orgs", orgId, "analytics", "forecast", projectId ?? "all", weeks] as const,
    queryFn: ({ signal }) =>
      api.get<ThroughputForecast>(orgPath(orgId, `/analytics/forecast?${query.toString()}`), signal),
  });
}
