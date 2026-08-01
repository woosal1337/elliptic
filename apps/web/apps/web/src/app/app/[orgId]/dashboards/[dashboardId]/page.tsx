"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileDown,
  Globe,
  Lock,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
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
  type WidgetConfig,
  useAddWidget,
  useDashboard,
  useDashboardData,
  useUpdateDashboard,
  useSetDashboardVisibility,
  useDeleteWidget,
  useUpdateWidget,
  useWidgets,
} from "@/hooks/use-dashboard-queries";
import {
  useAddFavorite,
  useFavorites,
  useRemoveFavorite,
} from "@/hooks/use-favorite-queries";
import { WidgetChart } from "@/components/dashboards/widget-chart";

const CHART_TYPES = ["bar", "donut", "line", "number"];
const METRICS = [
  { value: "count", label: "All items" },
  { value: "open", label: "Open items" },
  { value: "done", label: "Completed items" },
];
const DIMENSIONS = ["status", "priority", "kind", "assignee", "project"];

function AddWidgetForm({ orgId, dashboardId }: { orgId: string; dashboardId: string }) {
  const add = useAddWidget(orgId, dashboardId);
  const [title, setTitle] = useState("");
  const [config, setConfig] = useState<WidgetConfig>({
    chart_type: "bar",
    metric: "count",
    dimension: "status",
  });

  const submit = () => {
    add.mutate(
      { title: title.trim() || "Chart", config },
      { onSuccess: () => setTitle("") }
    );
  };

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-muted/30 p-3">
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Widget title"
        className="w-44"
      />
      <Select
        value={config.metric}
        onValueChange={(value) => setConfig((c) => ({ ...c, metric: value }))}
      >
        <SelectTrigger className="w-36" aria-label="Metric">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {METRICS.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-caption text-muted-foreground">by</span>
      <Select
        value={config.dimension}
        onValueChange={(value) => setConfig((c) => ({ ...c, dimension: value }))}
      >
        <SelectTrigger className="w-32 capitalize" aria-label="Dimension">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DIMENSIONS.map((d) => (
            <SelectItem key={d} value={d} className="capitalize">
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={config.chart_type}
        onValueChange={(value) => setConfig((c) => ({ ...c, chart_type: value }))}
      >
        <SelectTrigger className="w-28 capitalize" aria-label="Chart type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CHART_TYPES.map((t) => (
            <SelectItem key={t} value={t} className="capitalize">
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={config.filter ?? ""}
        onChange={(event) =>
          setConfig((c) => ({ ...c, filter: event.target.value || null }))
        }
        placeholder="Widget filter (PQL, optional)"
        className="w-52 font-mono text-caption"
        aria-label="Widget PQL filter"
      />
      <Button size="sm" onClick={submit} loading={add.isPending}>
        <Plus className="size-4" />
        Add widget
      </Button>
    </div>
  );
}

export default function DashboardDetailPage() {
  const { orgId, dashboardId } = useParams<{ orgId: string; dashboardId: string }>();
  const dashboard = useDashboard(orgId, dashboardId);
  const widgets = useWidgets(orgId, dashboardId);
  const [headerQuery, setHeaderQuery] = useState("");
  const data = useDashboardData(orgId, dashboardId, headerQuery);
  const updateDashboard = useUpdateDashboard(orgId, dashboardId);
  const setVisibility = useSetDashboardVisibility(orgId, dashboardId);
  const remove = useDeleteWidget(orgId, dashboardId);
  const updateWidget = useUpdateWidget(orgId, dashboardId);
  const favorites = useFavorites(orgId);
  const addFavorite = useAddFavorite(orgId);
  const removeFavorite = useRemoveFavorite(orgId);
  const [editing, setEditing] = useState(false);

  const isFavorite = (favorites.data ?? []).some(
    (f) => f.entity_type === "dashboard" && f.entity_id === dashboardId
  );
  const toggleFavorite = () => {
    if (isFavorite) {
      removeFavorite.mutate({ entity_type: "dashboard", entity_id: dashboardId });
    } else {
      addFavorite.mutate({
        entity_type: "dashboard",
        entity_id: dashboardId,
        label: dashboard.data?.name ?? "Dashboard",
      });
    }
  };

  const ordered = [...(widgets.data ?? [])].sort((a, b) => a.position - b.position);
  const move = (index: number, delta: number) => {
    const target = ordered[index];
    const swap = ordered[index + delta];
    if (!target || !swap) return;
    updateWidget.mutate({ widgetId: target.id, position: swap.position });
    updateWidget.mutate({ widgetId: swap.id, position: target.position });
  };
  const toggleSpan = (widgetId: string, config: WidgetConfig) => {
    updateWidget.mutate({ widgetId, config: { ...config, span: config.span === 2 ? 1 : 2 } });
  };

  const pointsFor = (widgetId: string) =>
    (data.data ?? []).find((d) => d.widget_id === widgetId);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-8">
      <div className="flex flex-col gap-2">
        <Link
          href={`/app/${orgId}/dashboards`}
          className="flex w-fit items-center gap-1 text-caption text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Dashboards
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-h3 font-semibold text-foreground">
            {dashboard.data?.name ?? "Dashboard"}
            {dashboard.data?.visibility === "workspace" ? (
              <Badge variant="accent" size="sm">
                <Globe className="size-3" />
                Workspace
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm">
                <Lock className="size-3" />
                Private
              </Badge>
            )}
          </h1>
          <div className="flex items-center gap-2">
            {dashboard.data ? (
              <Button
                variant="outline"
                size="sm"
                loading={setVisibility.isPending}
                onClick={() =>
                  setVisibility.mutate(
                    dashboard.data!.visibility === "workspace" ? "private" : "workspace"
                  )
                }
              >
                <Globe className="size-4" />
                {dashboard.data.visibility === "workspace" ? "Make private" : "Publish to workspace"}
              </Button>
            ) : null}
            <Button
              variant={isFavorite ? "secondary" : "ghost"}
              size="sm"
              onClick={toggleFavorite}
            >
              <Star className={`size-4 ${isFavorite ? "fill-warning text-warning" : ""}`} />
              {isFavorite ? "Favorited" : "Favorite"}
            </Button>
            <Button
              variant={editing ? "secondary" : "outline"}
              size="sm"
              onClick={() => setEditing((value) => !value)}
            >
              <Pencil className="size-4" />
              {editing ? "Done" : "Edit"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(
                  `/api/v1/orgs/${orgId}/dashboards/${dashboardId}/export.html`,
                  "_blank",
                  "noopener"
                )
              }
            >
              <FileDown className="size-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
        <span className="text-caption font-medium text-muted-foreground">Filters</span>
        <Input
          key={dashboard.data?.filter ?? ""}
          defaultValue={dashboard.data?.filter ?? ""}
          onBlur={(event) => {
            const next = event.target.value.trim();
            if (next === (dashboard.data?.filter ?? "")) return;
            updateDashboard.mutate(
              next ? { filter: next } : { clear_filter: true }
            );
          }}
          placeholder="Dashboard filter (PQL, saved)"
          className="w-60 font-mono text-caption"
          aria-label="Dashboard PQL filter"
        />
        <Input
          value={headerQuery}
          onChange={(event) => setHeaderQuery(event.target.value)}
          placeholder="Quick filter (PQL, this view only)"
          className="w-60 font-mono text-caption"
          aria-label="Header quick filter"
        />
        {headerQuery ? (
          <Button variant="ghost" size="sm" onClick={() => setHeaderQuery("")}>
            Clear
          </Button>
        ) : null}
      </div>

      <AddWidgetForm orgId={orgId} dashboardId={dashboardId} />

      {widgets.isPending ? (
        <Skeleton className="h-48 w-full rounded-lg" />
      ) : (widgets.data ?? []).length === 0 ? (
        <p className="text-small text-muted-foreground">
          No widgets yet — add one above to start visualizing your work.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {ordered.map((widget, index) => {
            const widgetData = pointsFor(widget.id);
            return (
              <div
                key={widget.id}
                className={`group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 ${
                  widget.config.span === 2 ? "lg:col-span-2" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-small font-medium text-foreground">
                      {widget.title}
                    </span>
                    <span className="text-caption capitalize text-muted-foreground">
                      {widget.config.metric} by {widget.config.dimension}
                    </span>
                  </div>
                  {editing ? (
                    <div className="flex items-center gap-1">
                      <IconButton
                        aria-label="Move up"
                        variant="ghost"
                        size="sm"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ChevronUp className="size-4" />
                      </IconButton>
                      <IconButton
                        aria-label="Move down"
                        variant="ghost"
                        size="sm"
                        disabled={index === ordered.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ChevronDown className="size-4" />
                      </IconButton>
                      <IconButton
                        aria-label="Toggle width"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSpan(widget.id, widget.config)}
                      >
                        {widget.config.span === 2 ? (
                          <Minimize2 className="size-4" />
                        ) : (
                          <Maximize2 className="size-4" />
                        )}
                      </IconButton>
                      <IconButton
                        aria-label="Remove widget"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove.mutate(widget.id)}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label="Remove widget"
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                      onClick={() => remove.mutate(widget.id)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                {data.isPending ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <WidgetChart
                    type={widget.config.chart_type}
                    points={widgetData?.points ?? []}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
