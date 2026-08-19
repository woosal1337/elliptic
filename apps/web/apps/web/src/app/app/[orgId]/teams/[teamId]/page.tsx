"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FolderGit2,
  Link2Off,
  Plus,
  Share2,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from "@elliptic/ui";
import {
  useAddTeamMember,
  useLinkTeamProjects,
  useOrgMembers,
  useRemoveTeamMember,
  useTeam,
  useTeamMembers,
  useTeamProjects,
  useUnlinkTeamProject,
  useUpdateTeam,
} from "@/hooks/use-org-queries";
import { useProjects } from "@/hooks/use-project-queries";
import {
  useCreateTeamspaceView,
  useDeleteServerView,
  usePublishView,
  useUnpublishView,
  useTeamViewTasks,
  useTeamspaceViews,
} from "@/hooks/use-team-view-queries";
import { ErrorState } from "@/components/error-state";
import { TeamPages } from "@/components/teams/team-pages";

const NONE = "__none__";

function OverviewTab({ orgId, teamId }: { orgId: string; teamId: string }) {
  const team = useTeam(orgId, teamId);
  const orgMembers = useOrgMembers(orgId);
  const updateTeam = useUpdateTeam(orgId);
  const [charter, setCharter] = useState("");

  useEffect(() => {
    if (team.data) setCharter(team.data.charter ?? "");
  }, [team.data?.charter]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!team.data) return <Skeleton className="h-48 w-full rounded-xl" />;
  const charterDirty = charter !== (team.data.charter ?? "");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-caption font-medium text-muted-foreground">Lead</span>
        <Select
          value={team.data.lead_id ?? NONE}
          onValueChange={(value) =>
            updateTeam.mutate({ teamId, lead_id: value === NONE ? null : value })
          }
        >
          <SelectTrigger className="w-64" aria-label="Team lead">
            <SelectValue placeholder="No lead" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No lead</SelectItem>
            {(orgMembers.data ?? []).map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-caption font-medium text-muted-foreground">Charter</span>
        <Textarea
          value={charter}
          onChange={(event) => setCharter(event.target.value)}
          placeholder="What this teamspace owns, its mission and scope…"
          rows={8}
        />
        <div>
          <Button
            size="sm"
            disabled={!charterDirty || updateTeam.isPending}
            onClick={() => updateTeam.mutate({ teamId, charter })}
          >
            Save charter
          </Button>
        </div>
      </div>
    </div>
  );
}

function MembersTab({ orgId, teamId }: { orgId: string; teamId: string }) {
  const members = useTeamMembers(orgId, teamId);
  const orgMembers = useOrgMembers(orgId);
  const addMember = useAddTeamMember(orgId, teamId);
  const removeMember = useRemoveTeamMember(orgId, teamId);
  const [selected, setSelected] = useState("");

  const nameOf = useMemo(() => {
    const map = new Map((orgMembers.data ?? []).map((m) => [m.user_id, m.full_name]));
    return (id: string) => map.get(id) ?? "Unknown";
  }, [orgMembers.data]);

  if (members.isPending) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (members.isError) return <ErrorState error={members.error} onRetry={() => void members.refetch()} />;

  const memberIds = new Set((members.data ?? []).map((m) => m.user_id));
  const available = (orgMembers.data ?? []).filter((m) => !memberIds.has(m.user_id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-64" aria-label="Add member">
            <SelectValue placeholder="Add a member…" />
          </SelectTrigger>
          <SelectContent>
            {available.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          disabled={!selected || addMember.isPending}
          onClick={() => addMember.mutate(selected, { onSuccess: () => setSelected("") })}
        >
          <Plus className="size-4" />
          Add
        </Button>
      </div>
      <ul className="flex flex-col gap-1.5">
        {(members.data ?? []).map((member) => (
          <li
            key={member.id}
            className="group flex items-center gap-3 rounded-lg border border-border px-3 py-2"
          >
            <Avatar name={nameOf(member.user_id)} size="sm" />
            <span className="flex-1 text-small text-foreground">{nameOf(member.user_id)}</span>
            <IconButton
              aria-label="Remove member"
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100"
              onClick={() => removeMember.mutate(member.user_id)}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProjectsTab({ orgId, teamId }: { orgId: string; teamId: string }) {
  const linked = useTeamProjects(orgId, teamId);
  const allProjects = useProjects(orgId);
  const link = useLinkTeamProjects(orgId, teamId);
  const unlink = useUnlinkTeamProject(orgId, teamId);
  const [selected, setSelected] = useState("");

  if (linked.isPending) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (linked.isError) return <ErrorState error={linked.error} onRetry={() => void linked.refetch()} />;

  const linkedIds = new Set((linked.data ?? []).map((p) => p.id));
  const available = (allProjects.data ?? []).filter((p) => !linkedIds.has(p.id));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-caption text-muted-foreground">
        Linking a project grants every team member access to it.
      </p>
      <div className="flex items-center gap-2">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-64" aria-label="Link project">
            <SelectValue placeholder="Link a project…" />
          </SelectTrigger>
          <SelectContent>
            {available.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          disabled={!selected || link.isPending}
          onClick={() => link.mutate([selected], { onSuccess: () => setSelected("") })}
        >
          <Plus className="size-4" />
          Link
        </Button>
      </div>
      <ul className="flex flex-col gap-1.5">
        {(linked.data ?? []).map((project) => (
          <li
            key={project.id}
            className="group flex items-center gap-3 rounded-lg border border-border px-3 py-2"
          >
            <FolderGit2 className="size-4 text-muted-foreground" />
            <Link
              href={`/app/${orgId}/projects/${project.id}`}
              className="flex-1 text-small text-foreground hover:underline"
            >
              {project.name}
            </Link>
            <Badge variant="outline" size="sm">
              {project.key}
            </Badge>
            <IconButton
              aria-label="Unlink project"
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100"
              onClick={() => unlink.mutate(project.id)}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ViewsTab({ orgId, teamId }: { orgId: string; teamId: string }) {
  const views = useTeamspaceViews(orgId, teamId);
  const createView = useCreateTeamspaceView(orgId, teamId);
  const deleteView = useDeleteServerView(orgId, teamId);
  const publishView = usePublishView(orgId, teamId);
  const unpublishView = useUnpublishView(orgId, teamId);
  const [name, setName] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const tasks = useTeamViewTasks(orgId, openId);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-caption text-muted-foreground">
        Team views query across every project linked to this teamspace.
      </p>
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="View name (e.g. All blocked)"
          className="w-64"
        />
        <Button
          size="sm"
          disabled={!name.trim() || createView.isPending}
          onClick={() => createView.mutate({ name: name.trim() }, { onSuccess: () => setName("") })}
        >
          <Plus className="size-4" />
          Create
        </Button>
      </div>
      {views.isPending ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : (views.data ?? []).length === 0 ? (
        <p className="text-caption text-muted-foreground">No team views yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {(views.data ?? []).map((view) => (
            <li
              key={view.id}
              className="group flex flex-col gap-1 rounded-lg border border-border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex-1 text-left text-small font-medium text-foreground hover:underline"
                  onClick={() => setOpenId(openId === view.id ? null : view.id)}
                >
                  {view.name}
                </button>
                <IconButton
                  aria-label="Publish view to a public link"
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() =>
                    publishView.mutate(view.id, {
                      onSuccess: (result) => {
                        const url =
                          typeof window === "undefined"
                            ? result.path
                            : `${window.location.origin}${result.path}`;
                        void navigator.clipboard.writeText(url);
                        toast.success("Public link copied");
                      },
                    })
                  }
                >
                  <Share2 className="size-4" />
                </IconButton>
                <IconButton
                  aria-label="Unpublish view"
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => unpublishView.mutate(view.id)}
                >
                  <Link2Off className="size-4" />
                </IconButton>
                <IconButton
                  aria-label="Delete view"
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => deleteView.mutate(view.id)}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
              {openId === view.id ? (
                <div className="text-caption text-muted-foreground">
                  {tasks.isPending ? (
                    "Loading…"
                  ) : (
                    <span className="tabular">{(tasks.data ?? []).length}</span>
                  )}{" "}
                  work items across the team&apos;s projects
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TeamDetailPage() {
  const { orgId, teamId } = useParams<{ orgId: string; teamId: string }>();
  const team = useTeam(orgId, teamId);

  if (team.isPending) return <Skeleton className="m-6 h-64 rounded-xl" />;
  if (team.isError || !team.data) {
    return (
      <div className="p-6">
        <ErrorState error={team.error} onRetry={() => void team.refetch()} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <Link
        href={`/app/${orgId}/settings?tab=teams`}
        className="flex w-fit items-center gap-1 text-caption text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Teams
      </Link>
      <div className="flex items-center gap-3">
        <Users className="size-6 text-muted-foreground" />
        <h1 className="text-h2 font-semibold text-foreground">{team.data.name}</h1>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <UserCog className="size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="views">Views</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab orgId={orgId} teamId={teamId} />
        </TabsContent>
        <TabsContent value="members">
          <MembersTab orgId={orgId} teamId={teamId} />
        </TabsContent>
        <TabsContent value="projects">
          <ProjectsTab orgId={orgId} teamId={teamId} />
        </TabsContent>
        <TabsContent value="views">
          <ViewsTab orgId={orgId} teamId={teamId} />
        </TabsContent>
        <TabsContent value="pages">
          <TeamPages orgId={orgId} teamId={teamId} canManage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
