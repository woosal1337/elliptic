"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button, Card, Input } from "@elliptic/ui";
import { useAIChart } from "@/hooks/use-ai-chart";

export function AIChartPanel({ orgId }: { orgId: string }) {
  const chart = useAIChart(orgId);
  const [prompt, setPrompt] = useState("");

  const submit = () => {
    if (!prompt.trim()) return;
    chart.mutate(prompt.trim());
  };

  const data = chart.data;
  const max = data ? Math.max(1, ...data.points.map((p) => p.value)) : 1;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-accent" />
        <h3 className="text-small font-semibold text-foreground">Ask AI for a chart</h3>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder="e.g. break down work items by priority"
          className="flex-1"
        />
        <Button size="sm" onClick={submit} loading={chart.isPending} disabled={!prompt.trim()}>
          Generate
        </Button>
      </div>

      {data ? (
        <div className="flex flex-col gap-2 pt-1">
          <p className="text-caption font-medium text-foreground">{data.title}</p>
          {data.points.length === 0 ? (
            <p className="text-caption text-muted-foreground">No data for this breakdown.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {data.points.map((point) => (
                <li key={point.key} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 truncate text-caption capitalize text-muted-foreground">
                    {point.key.replace(/_/g, " ")}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
                    <div
                      className="h-full rounded bg-accent"
                      style={{ width: `${(point.value / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-caption tabular text-foreground">
                    {point.value}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </Card>
  );
}
