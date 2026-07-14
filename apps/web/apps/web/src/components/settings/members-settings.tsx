"use client";

import { SeatUsageCard } from "@/components/settings/seat-usage-card";
import { EditionCard } from "@/components/settings/edition-card";
import { useState } from "react";
import { Copy, Mail, Trash2, UserX, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast,
} from "@companyos/ui";
import type { OrgRole } from "@/lib/types";
import {
  useCreateInvite,
  useInvites,
  useOrgMembers,
  useRemoveMember,
  useRevokeInvite,
  useUpdateMemberRole,
} from "@/hooks/use-org-queries";
import { useProjects } from "@/hooks/use-project-queries";
import { useMe } from "@/hooks/use-auth-queries";
import { ErrorState } from "@/components/error-state";

const NO_PROJECT = "none";

const ROLES: readonly OrgRole[] = ["owner", "admin", "member", "guest"];

function inviteUrlFromToken(token: string): string {
  if (typeof window === "undefined") return `/invite/${token}`;
  return `${window.location.origin}/invite/${token}`;
}

const inviteSchema = z.object({
  email: z.email("Enter a valid email"),
});

type InviteValues = z.infer<typeof inviteSchema>;

function InviteForm({ orgId }: { orgId: string }) {
  const createInvite = useCreateInvite(orgId);
  const projects = useProjects(orgId);
  const [role, setRole] = useState<OrgRole>("member");
  const [projectId, setProjectId] = useState<string>(NO_PROJECT);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    createInvite.mutate(
      {
        email: values.email,
        role,
        ...(projectId !== NO_PROJECT ? { project_id: projectId } : {}),
      },
      {
        onSuccess: (invite) => {
          form.reset();
          setProjectId(NO_PROJECT);
          setInviteUrl(invite.token ? inviteUrlFromToken(invite.token) : null);
          toast.success(`Invitation sent to ${values.email}`);
        },
      }
    );
  });

  const projectOptions = projects.data ?? [];
  const hasProjects = projectOptions.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={onSubmit} className="flex flex-wrap items-start gap-2" noValidate>
        <div className="flex min-w-56 flex-1 flex-col gap-1">
          <Input
            type="email"
            placeholder="teammate@company.com"
            aria-label="Invite email"
            aria-invalid={form.formState.errors.email ? true : undefined}
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p className="text-caption text-danger">{form.formState.errors.email.message}</p>
          ) : null}
        </div>
        <Select value={role} onValueChange={(next) => setRole(next as OrgRole)}>
          <SelectTrigger className="w-32 capitalize" aria-label="Invite role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.filter((value) => value !== "owner").map((value) => (
              <SelectItem key={value} value={value} className="capitalize">
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Select value={projectId} onValueChange={setProjectId} disabled={!hasProjects}>
            <SelectTrigger className="w-48" aria-label="Add to project (optional)">
              <SelectValue
                placeholder={hasProjects ? "Add to project (optional)" : "No projects yet"}
              />
            </SelectTrigger>
            <SelectContent>
              {projectOptions.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {projectId !== NO_PROJECT ? (
            <IconButton
              type="button"
              aria-label="Clear project"
              size="sm"
              variant="ghost"
              onClick={() => setProjectId(NO_PROJECT)}
            >
              <X />
            </IconButton>
          ) : null}
        </div>
        <Button type="submit" loading={createInvite.isPending}>
          <Mail className="size-4" />
          Invite
        </Button>
      </form>
      {inviteUrl ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/60 px-3 py-2">
          <span className="min-w-0 flex-1 truncate font-mono text-caption text-muted-foreground">
            {inviteUrl}
          </span>
          <IconButton
            aria-label="Copy invite link"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(inviteUrl);
              toast.success("Invite link copied");
            }}
          >
            <Copy />
          </IconButton>
        </div>
      ) : null}
    </div>
  );
}

function PendingInvites({ orgId }: { orgId: string }) {
  const invites = useInvites(orgId);
  const revokeInvite = useRevokeInvite(orgId);

  if (invites.isPending) {
    return <Skeleton className="h-12 w-full" />;
  }
  if (invites.isError) {
    return <ErrorState error={invites.error} onRetry={() => void invites.refetch()} />;
  }

  const pending = invites.data.filter((invite) => invite.status === "pending");
  if (pending.length === 0) {
    return <p className="text-small text-muted-foreground">No pending invites.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {pending.map((invite) => (
        <li
          key={invite.id}
          className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 shadow-xs"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-subtle text-muted-foreground">
              <Mail className="size-3.5" />
            </span>
            <span className="truncate text-small text-foreground">{invite.email}</span>
            <Badge variant="outline" className="capitalize">
              {invite.role}
            </Badge>
          </div>
          <IconButton
            aria-label={`Revoke invite for ${invite.email}`}
            variant="danger"
            size="sm"
            onClick={() => revokeInvite.mutate(invite.id)}
          >
            <Trash2 />
          </IconButton>
        </li>
      ))}
    </ul>
  );
}

export function MembersSettings({ orgId }: { orgId: string }) {
  const members = useOrgMembers(orgId);
  const updateRole = useUpdateMemberRole(orgId);
  const removeMember = useRemoveMember(orgId);
  const me = useMe();

  const myRole = members.data?.find((member) => member.user_id === me.data?.id)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <EditionCard orgId={orgId} />
      <SeatUsageCard orgId={orgId} />
      {canManage ? (
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>Invite people</CardTitle>
            <CardDescription>
              We email an invitation link to each person. Optionally add them to a project.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-5">
            <InviteForm orgId={orgId} />
            <PendingInvites orgId={orgId} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>Members</CardTitle>
          <CardDescription>Everyone with access to this organization.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 pt-5">
          {members.isPending ? (
            <>
              <Skeleton className="h-13 w-full" />
              <Skeleton className="h-13 w-full" />
            </>
          ) : members.isError ? (
            <ErrorState error={members.error} onRetry={() => void members.refetch()} />
          ) : members.data.length === 0 ? (
            <EmptyState icon={<UserX />} title="No members" description="Invite someone above." />
          ) : (
            members.data.map((member) => {
              const isSelf = me.data?.id === member.user_id;
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5 shadow-xs"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={member.full_name} size="md" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-small font-medium text-foreground">
                        {member.full_name}
                        {isSelf ? <span className="text-muted-foreground"> (you)</span> : null}
                      </span>
                      <span className="truncate text-caption text-muted-foreground">
                        {member.email}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage ? (
                      <Select
                        value={member.role}
                        onValueChange={(next) =>
                          updateRole.mutate({ userId: member.user_id, role: next as OrgRole })
                        }
                      >
                        <SelectTrigger
                          className="w-28 capitalize"
                          aria-label={`Role for ${member.full_name}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((value) => (
                            <SelectItem key={value} value={value} className="capitalize">
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="capitalize">
                        {member.role}
                      </Badge>
                    )}
                    {canManage ? (
                      <IconButton
                        aria-label={`Remove ${member.full_name}`}
                        variant="danger"
                        size="sm"
                        disabled={isSelf}
                        onClick={() => removeMember.mutate(member.user_id)}
                      >
                        <Trash2 />
                      </IconButton>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
