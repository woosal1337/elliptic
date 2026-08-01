"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface Dashboard {
  id: string;
  name: string;
  filter: string | null;
  visibility: "private" | "workspace";
  created_at: string;
  updated_at: string;
}

export interface WidgetConfig {
  chart_type: string;
  metric: string;
  dimension: string;
  span?: number;
  project_id?: string | null;
  filter?: string | null;
}

export interface Widget {
  id: string;
  dashboard_id: string;
  title: string;
  config: WidgetConfig;
  position: number;
}

export interface ChartPoint {
  key: string;
  value: number;
}

export interface WidgetData {
  widget_id: string;
  chart_type: string;
  points: ChartPoint[];
}

const dashKey = (orgId: string) => ["orgs", orgId, "dashboards"] as const;
const widgetKey = (orgId: string, id: string) => ["orgs", orgId, "dashboards", id, "widgets"] as const;
const dataKey = (orgId: string, id: string) => ["orgs", orgId, "dashboards", id, "data"] as const;

export function useDashboards(orgId: string) {
  return useQuery({
    queryKey: dashKey(orgId),
    queryFn: ({ signal }) => api.get<Dashboard[]>(orgPath(orgId, "/dashboards"), signal),
  });
}

export function useDashboard(orgId: string, id: string) {
  return useQuery({
    queryKey: [...dashKey(orgId), id],
    queryFn: ({ signal }) => api.get<Dashboard>(orgPath(orgId, `/dashboards/${id}`), signal),
  });
}

export function useCreateDashboard(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; filter?: string | null }) =>
      api.post<Dashboard>(orgPath(orgId, "/dashboards"), input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: dashKey(orgId) }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useDeleteDashboard(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(orgPath(orgId, `/dashboards/${id}`)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: dashKey(orgId) }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useWidgets(orgId: string, dashboardId: string) {
  return useQuery({
    queryKey: widgetKey(orgId, dashboardId),
    queryFn: ({ signal }) =>
      api.get<Widget[]>(orgPath(orgId, `/dashboards/${dashboardId}/widgets`), signal),
  });
}

export function useDashboardData(orgId: string, dashboardId: string, headerQuery?: string) {
  const q = headerQuery?.trim() ? `?q=${encodeURIComponent(headerQuery.trim())}` : "";
  return useQuery({
    queryKey: [...dataKey(orgId, dashboardId), headerQuery ?? ""],
    queryFn: ({ signal }) =>
      api.get<WidgetData[]>(orgPath(orgId, `/dashboards/${dashboardId}/data${q}`), signal),
  });
}

export function useSetDashboardVisibility(orgId: string, dashboardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (visibility: "private" | "workspace") =>
      api.patch<Dashboard>(orgPath(orgId, `/dashboards/${dashboardId}/visibility`), { visibility }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: dashKey(orgId) });
      void qc.invalidateQueries({ queryKey: [...dashKey(orgId), dashboardId] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useUpdateDashboard(orgId: string, dashboardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { name?: string; filter?: string | null; clear_filter?: boolean }) =>
      api.patch<Dashboard>(orgPath(orgId, `/dashboards/${dashboardId}`), patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...dashKey(orgId), dashboardId] });
      void qc.invalidateQueries({ queryKey: dataKey(orgId, dashboardId) });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useAddWidget(orgId: string, dashboardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; config: WidgetConfig }) =>
      api.post<Widget>(orgPath(orgId, `/dashboards/${dashboardId}/widgets`), input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: widgetKey(orgId, dashboardId) });
      void qc.invalidateQueries({ queryKey: dataKey(orgId, dashboardId) });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useDeleteWidget(orgId: string, dashboardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (widgetId: string) =>
      api.delete<null>(orgPath(orgId, `/dashboards/${dashboardId}/widgets/${widgetId}`)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: widgetKey(orgId, dashboardId) });
      void qc.invalidateQueries({ queryKey: dataKey(orgId, dashboardId) });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useUpdateWidget(orgId: string, dashboardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ widgetId, ...patch }: { widgetId: string; title?: string; config?: WidgetConfig; position?: number }) =>
      api.patch<Widget>(orgPath(orgId, `/dashboards/${dashboardId}/widgets/${widgetId}`), patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: widgetKey(orgId, dashboardId) });
      void qc.invalidateQueries({ queryKey: dataKey(orgId, dashboardId) });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
