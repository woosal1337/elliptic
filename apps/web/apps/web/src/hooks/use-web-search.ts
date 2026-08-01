"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface WebSource {
  title: string;
  snippet: string;
  url: string;
}

export interface WebSearchResult {
  query: string;
  answer: string;
  sources: WebSource[];
}

export function useWebSearch(orgId: string) {
  return useMutation({
    mutationFn: (query: string) =>
      api.post<WebSearchResult>(orgPath(orgId, "/ai/web-search"), { query }),
    onError: (error) => toast.error(errorMessage(error)),
  });
}
