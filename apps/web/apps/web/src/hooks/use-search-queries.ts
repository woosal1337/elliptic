"use client";

import { useQuery } from "@tanstack/react-query";
import { api, orgPath } from "@/lib/api";

export type SearchEntityType = "task" | "note" | "project" | "meeting";

export interface SearchResult {
  type: SearchEntityType;
  id: string;
  title: string;
  snippet: string | null;
  project_id: string | null;
  identifier: string | null;
  score: number;
}

export interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
}

export function useGlobalSearch(orgId: string, term: string, enabled: boolean) {
  const trimmed = term.trim();
  return useQuery({
    queryKey: ["orgs", orgId, "search", trimmed],
    enabled: enabled && trimmed.length >= 2,
    staleTime: 15_000,
    queryFn: ({ signal }) =>
      api.get<SearchResponse>(
        orgPath(orgId, `/search?q=${encodeURIComponent(trimmed)}&limit=20`),
        signal
      ),
  });
}
