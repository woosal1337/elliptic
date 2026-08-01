"use client";

import { UserPlus, X } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  IconButton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import { useState } from "react";
import { useMe } from "@/hooks/use-auth-queries";
import { useOrgMembers } from "@/hooks/use-org-queries";
import {
  useAddProjectMember,
  useProjectMembers,
  useRemoveProjectMember,
  useSetProjectMemberRole,
} from "@/hooks/use-project-queries";
import type { ProjectRole } from "@/lib/types";
import { ErrorState } from "@/components/error-state";

const PROJECT_ROLES: ProjectRole[] = ["admin", "member", "commenter", "viewer"];
const GUEST_PROJECT_ROLES: ProjectRole[] = ["commenter", "viewer"];

export function ProjectMembers({ orgId, projectId }: { orgId: string; projectId: string }) {
  const me = useMe();
  const orgMembers = useOrgMembers(orgId);
  const projectMembers = useProjectMembers(orgId, projectId);
  const addMember = useAddProjectMember(orgId, projectId);
  const removeMember = useRemoveProjectMember(orgId, projectId);
  const setMemberRole = useSetProjectMemberRole(orgId, projectId);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  if (projectMembers.isPending || orgMembers.isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (projectMembers.isError) {
    return (
      <ErrorState error={projectMembers.error} onRetry={() => void projectMembers.refetch()} />
    );
  }
  if (orgMembers.isError) {
    return <ErrorState error={orgMembers.error} onRetry={() => void orgMembers.refetch()} />;
  }

  const memberUserIds = new Set(projectMembers.data.map((member) => member.user_id));
  const available = orgMembers.data.filter((member) => !memberUserIds.has(member.user_id));
  const orgMemberByUserId = new Map(orgMembers.data.map((member) => [member.user_id, member]));
  const myRole = orgMembers.data.find((member) => member.user_id === me.data?.id)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  return (
    <div className="flex flex-col gap-4">
      {canManage ? (
        <div className="flex items-center gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="w-64" aria-label="Add a member">
            <SelectValue placeholder="Pick an org member…" />
          </SelectTrigger>
          <SelectContent>
            {available.length === 0 ? (
              <SelectItem value="none" disabled>
                Everyone is already in this project
              </SelectItem>
            ) : (
              available.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.full_name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          disabled={selectedUserId.length === 0}
          loading={addMember.isPending}
          onClick={() =>
            addMember.mutate(selectedUserId, {
              onSuccess: () => {
                setSelectedUserId("");
              },
            })
          }
        >
          <UserPlus className="size-4" />
          Add
        </Button>
        </div>
      ) : null}
      {projectMembers.data.length === 0 ? (
        <EmptyState
          icon={<UserPlus />}
          title="No members yet"
          description="Add org members to give them access to this project."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {projectMembers.data.map((member) => {
            const orgMember = orgMemberByUserId.get(member.user_id);
            const displayName = orgMember?.full_name ?? "Unknown member";
            return (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 shadow-xs"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={displayName} size="md" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-small font-medium text-foreground">
                      {displayName}
                    </span>
                    {orgMember ? (
                      <span className="truncate text-caption text-muted-foreground">
                        {orgMember.email}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {canManage ? (
                    <Select
                      value={member.role}
                      onValueChange={(role) =>
                        setMemberRole.mutate({
                          userId: member.user_id,
                          role: role as ProjectRole,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-28" aria-label={`Role for ${displayName}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(orgMember?.role === "guest" ? GUEST_PROJECT_ROLES : PROJECT_ROLES).map(
                          (role) => (
                            <SelectItem key={role} value={role} className="capitalize">
                              {role}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" size="sm" className="capitalize">
                      {member.role}
                    </Badge>
                  )}
                  {canManage && member.user_id !== me.data?.id ? (
                    <IconButton
                      aria-label={`Remove ${displayName}`}
                      variant="danger"
                      size="sm"
                      onClick={() => removeMember.mutate(member.user_id)}
                    >
                      <X />
                    </IconButton>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
