"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface AIChartPoint {
  key: string;
  value: number;
}

export interface AIChart {
  title: string;
  metric: string;
  dimension: string;
  points: AIChartPoint[];
  ai_run_id: string;
}

export function useAIChart(orgId: string) {
  return useMutation({
    mutationFn: (prompt: string) => api.post<AIChart>(orgPath(orgId, "/ai/chart"), { prompt }),
    onError: (error) => toast.error(errorMessage(error)),
  });
}
