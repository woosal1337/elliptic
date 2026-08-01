"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { EmptyState, Skeleton } from "@elliptic/ui";
import { useMe } from "@/hooks/use-auth-queries";
import { useProjects } from "@/hooks/use-project-queries";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import type { TaskPriority } from "@/lib/types";

const PRIORITIES: TaskPriority[] = ["none", "low", "medium", "high", "urgent"];

export default function NewWorkItemPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const me = useMe();
  const projects = useProjects(orgId);
  const [open, setOpen] = useState(true);

  const projectParam = params.get("project");
  const projects_ = projects.data ?? [];
  const project =
    projects_.find((p) => p.id === projectParam || p.key === projectParam) ?? projects_[0];

  const priorityParam = params.get("priority");
  const priority = priorityParam && PRIORITIES.includes(priorityParam as TaskPriority)
    ? (priorityParam as TaskPriority)
    : "none";
  const assigneeParam = params.get("assignee");
  const assigneeId = assigneeParam === "me" ? (me.data?.id ?? null) : assigneeParam;

  const close = () => {
    setOpen(false);
    router.push(project ? `/app/${orgId}/projects/${project.id}` : `/app/${orgId}/projects`);
  };

  if (projects.isPending) {
    return (
      <div className="mx-auto max-w-xl px-6 py-8">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-xl px-6 py-8">
        <EmptyState
          title="No project to create in"
          description="Create a project first, then deep-link a new work item into it."
        />
      </div>
    );
  }

  return (
    <CreateTaskDialog
      orgId={orgId}
      projectId={project.id}
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else setOpen(true);
      }}
      defaultTitle={params.get("title") ?? ""}
      defaultDescription={params.get("description") ?? ""}
      defaultPriority={priority}
      defaultAssigneeId={assigneeId}
    />
  );
}
