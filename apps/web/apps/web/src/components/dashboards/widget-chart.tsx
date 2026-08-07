"use client";

import type { ChartPoint } from "@/hooks/use-dashboard-queries";

const PALETTE = [
  "var(--color-accent, #F5F5F5)",
  "#C4C4C4",
  "#9A9A9A",
  "#767676",
  "#5A5A5A",
  "#8C8C8C",
  "#B0B0B0",
  "#6E6E6E",
];

function labelize(key: string): string {
  return key.replace(/_/g, " ");
}

function BarChart({ points }: { points: ChartPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <ul className="flex flex-col gap-1.5">
      {points.map((point, i) => (
        <li key={point.key} className="flex items-center gap-2">
          <span className="w-24 shrink-0 truncate text-caption capitalize text-muted-foreground">
            {labelize(point.key)}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
            <div
              className="h-full rounded"
              style={{
                width: `${(point.value / max) * 100}%`,
                backgroundColor: PALETTE[i % PALETTE.length],
              }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-caption tabular text-foreground">
            {point.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

function DonutChart({ points }: { points: ChartPoint[] }) {
  const total = points.reduce((sum, p) => sum + p.value, 0) || 1;
  let offset = 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="size-28 shrink-0 -rotate-90">
        {points.map((point, i) => {
          const fraction = point.value / total;
          const dash = fraction * circumference;
          const seg = (
            <circle
              key={point.key}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth="14"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return seg;
        })}
      </svg>
      <ul className="flex flex-col gap-1">
        {points.map((point, i) => (
          <li key={point.key} className="flex items-center gap-1.5 text-caption">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
            />
            <span className="capitalize text-muted-foreground">{labelize(point.key)}</span>
            <span className="tabular text-foreground">{point.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NumberChart({ points }: { points: ChartPoint[] }) {
  const total = points.reduce((sum, p) => sum + p.value, 0);
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <span className="text-h1 font-semibold tabular text-foreground">{total}</span>
      <span className="text-caption text-muted-foreground">total</span>
    </div>
  );
}

function LineChart({ points }: { points: ChartPoint[] }) {
  if (points.length === 0) return null;
  const max = Math.max(1, ...points.map((p) => p.value));
  const step = points.length > 1 ? 100 / (points.length - 1) : 0;
  const coords = points.map((p, i) => `${i * step},${40 - (p.value / max) * 36}`).join(" ");
  return (
    <div className="flex flex-col gap-1">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-24 w-full">
        <polyline points={coords} fill="none" stroke={PALETTE[0]} strokeWidth="1.5" />
      </svg>
      <div className="flex justify-between text-caption capitalize text-muted-foreground">
        {points.map((p) => (
          <span key={p.key} className="truncate">
            {labelize(p.key)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function WidgetChart({ type, points }: { type: string; points: ChartPoint[] }) {
  if (points.length === 0) {
    return <p className="py-6 text-center text-caption text-muted-foreground">No data.</p>;
  }
  if (type === "number") return <NumberChart points={points} />;
  if (type === "donut" || type === "pie") return <DonutChart points={points} />;
  if (type === "line" || type === "area") return <LineChart points={points} />;
  return <BarChart points={points} />;
}
