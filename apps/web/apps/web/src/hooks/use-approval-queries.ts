"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import type { TaskApproval, TaskStatus } from "@/lib/types";
import { api, errorMessage, orgPath } from "@/lib/api";
import { taskKeys } from "@/hooks/use-task-queries";

const approvalKey = (orgId: string, taskId: string) =>
  ["orgs", orgId, "tasks", taskId, "approvals"] as const;

function approvalsPath(orgId: string, taskId: string, suffix = ""): string {
  return orgPath(orgId, `/tasks/${taskId}/approvals${suffix}`);
}

export function useTaskApprovals(orgId: string, taskId: string) {
  return useQuery({
    queryKey: approvalKey(orgId, taskId),
    queryFn: ({ signal }) => api.get<TaskApproval[]>(approvalsPath(orgId, taskId), signal),
  });
}

export function useRequestApproval(orgId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { target_status: TaskStatus; note?: string | null }) =>
      api.post<TaskApproval>(approvalsPath(orgId, taskId), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: approvalKey(orgId, taskId) });
      toast.success("Approval requested");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

function useDecision(orgId: string, taskId: string, decision: "approve" | "reject") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (approvalId: string) =>
      api.post<TaskApproval>(approvalsPath(orgId, taskId, `/${approvalId}/${decision}`), {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: approvalKey(orgId, taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(orgId, taskId) });
      toast.success(decision === "approve" ? "Approved" : "Rejected");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useApproveApproval(orgId: string, taskId: string) {
  return useDecision(orgId, taskId, "approve");
}

export function useRejectApproval(orgId: string, taskId: string) {
  return useDecision(orgId, taskId, "reject");
}
