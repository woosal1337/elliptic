"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export interface RunnerScript {
  id: string;
  name: string;
  description: string | null;
  language: string;
  code: string;
  cron_schedule: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface RunnerExecution {
  id: string;
  script_id: string;
  status: string;
  trigger: string;
  output: string | null;
  error: string | null;
  created_at: string;
}

const key = (orgId: string) => ["orgs", orgId, "runner", "scripts"] as const;

export function useRunnerScripts(orgId: string) {
  return useQuery({
    queryKey: key(orgId),
    queryFn: ({ signal }) => api.get<RunnerScript[]>(orgPath(orgId, "/runner/scripts"), signal),
  });
}

export function useRunnerExecutions(orgId: string, scriptId: string | null) {
  return useQuery({
    queryKey: ["orgs", orgId, "runner", "scripts", scriptId, "executions"],
    enabled: scriptId !== null,
    queryFn: ({ signal }) =>
      api.get<RunnerExecution[]>(orgPath(orgId, `/runner/scripts/${scriptId}/executions`), signal),
  });
}

export function useCreateScript(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; language: string; code: string; cron_schedule: string | null }) =>
      api.post<RunnerScript>(orgPath(orgId, "/runner/scripts"), input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(orgId) }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useDeleteScript(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scriptId: string) => api.delete<null>(orgPath(orgId, `/runner/scripts/${scriptId}`)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(orgId) }),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useRunScript(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scriptId: string) =>
      api.post<RunnerExecution>(orgPath(orgId, `/runner/scripts/${scriptId}/run`)),
    onSuccess: (_e, scriptId) => {
      void qc.invalidateQueries({
        queryKey: ["orgs", orgId, "runner", "scripts", scriptId, "executions"],
      });
      toast.success("Execution queued");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
