"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  IconButton,
  Input,
  Skeleton,
} from "@elliptic/ui";
import type { Team } from "@/lib/types";
import {
  useCreateTeam,
  useDeleteTeam,
  useOrgMembers,
  useTeams,
  useTeamStats,
  useUpdateTeam,
} from "@/hooks/use-org-queries";
import { useMe } from "@/hooks/use-auth-queries";
import { ErrorState } from "@/components/error-state";

function TeamStatsInline({ orgId, teamId }: { orgId: string; teamId: string }) {
  const stats = useTeamStats(orgId, teamId);
  if (!stats.data) return null;
  const { project_count, task_total, task_done, overdue } = stats.data;
  if (project_count === 0) return null;
  const pct = task_total > 0 ? Math.round((task_done / task_total) * 100) : 0;

  return (
    <div className="hidden shrink-0 items-center gap-3 sm:flex">
      <div className="flex flex-col items-end gap-1">
        <span className="text-caption text-muted-foreground tabular">
          {project_count} {project_count === 1 ? "project" : "projects"} · {pct}%
        </span>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-success" style={{ width: `${pct}%` }} aria-hidden />
        </div>
      </div>
      {overdue > 0 ? <Badge variant="danger">{overdue} overdue</Badge> : null}
    </div>
  );
}

function TeamRow({
  orgId,
  team,
  canManage,
}: {
  orgId: string;
  team: Team;
  canManage: boolean;
}) {
  const updateTeam = useUpdateTeam(orgId);
  const deleteTeam = useDeleteTeam(orgId);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [name, setName] = useState(team.name);

  const commit = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed === team.name) {
      setName(team.name);
      setEditing(false);
      return;
    }
    updateTeam.mutate(
      { teamId: team.id, name: trimmed },
      {
        onSuccess: () => {
          setEditing(false);
        },
      }
    );
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5 shadow-xs">
      {editing ? (
        <div className="flex flex-1 items-center gap-2">
          <Input
            aria-label="Team name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-8"
          />
          <IconButton aria-label="Save team name" size="sm" onClick={commit}>
            <Check />
          </IconButton>
          <IconButton
            aria-label="Cancel"
            size="sm"
            onClick={() => {
              setName(team.name);
              setEditing(false);
            }}
          >
            <X />
          </IconButton>
        </div>
      ) : (
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-subtle text-muted-foreground">
            <Users className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-small font-medium text-foreground">{team.name}</span>
            {team.description ? (
              <span className="truncate text-caption text-muted-foreground">
                {team.description}
              </span>
            ) : null}
          </div>
        </div>
      )}
      {!editing ? <TeamStatsInline orgId={orgId} teamId={team.id} /> : null}
      {!editing ? (
        <Link href={`/app/${orgId}/teams/${team.id}`}>
          <Button variant="outline" size="sm">
            Open
          </Button>
        </Link>
      ) : null}
      {!editing && canManage ? (
        <div className="flex items-center gap-1">
          <IconButton aria-label={`Rename ${team.name}`} size="sm" onClick={() => setEditing(true)}>
            <Pencil />
          </IconButton>
          <IconButton
            aria-label={`Delete ${team.name}`}
            variant="danger"
            size="sm"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 />
          </IconButton>
        </div>
      ) : null}
      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete {team.name}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the team and cannot be undone. Projects owned by this team
              will lose their team assignment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteTeam.isPending}
              onClick={() =>
                deleteTeam.mutate(team.id, {
                  onSuccess: () => {
                    setConfirmingDelete(false);
                  },
                })
              }
            >
              <Trash2 className="size-4" />
              Delete team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function TeamsSettings({ orgId }: { orgId: string }) {
  const teams = useTeams(orgId);
  const createTeam = useCreateTeam(orgId);
  const members = useOrgMembers(orgId);
  const me = useMe();
  const [newName, setNewName] = useState("");

  const myRole = members.data?.find((member) => member.user_id === me.data?.id)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  return (
    <Card className="max-w-2xl">
      <CardHeader className="border-b border-border">
        <CardTitle>Teams</CardTitle>
        <CardDescription>Group members into teams that own projects.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-5">
        {canManage ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = newName.trim();
              if (trimmed.length < 2) return;
              createTeam.mutate(
                { name: trimmed },
                {
                  onSuccess: () => {
                    setNewName("");
                  },
                }
              );
            }}
          >
            <Input
              aria-label="New team name"
              placeholder="Platform"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              className="max-w-64"
            />
            <Button
              type="submit"
              size="sm"
              loading={createTeam.isPending}
              disabled={newName.trim().length < 2}
            >
              <Plus className="size-4" />
              Add team
            </Button>
          </form>
        ) : null}
        {teams.isPending ? (
          <>
            <Skeleton className="h-13 w-full" />
            <Skeleton className="h-13 w-full" />
          </>
        ) : teams.isError ? (
          <ErrorState error={teams.error} onRetry={() => void teams.refetch()} />
        ) : teams.data.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No teams yet"
            description="Create the first team to organize ownership."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {teams.data.map((team) => (
              <TeamRow key={team.id} orgId={orgId} team={team} canManage={canManage} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
