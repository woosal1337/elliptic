"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";
import type {
  Invite,
  Org,
  OrgMember,
  OrgRole,
  Project,
  Team,
  TeamMember,
  TeamStats,
} from "@/lib/types";

export const orgKeys = {
  all: ["orgs"] as const,
  lists: () => [...orgKeys.all, "list"] as const,
  detail: (orgId: string) => [...orgKeys.all, orgId] as const,
  members: (orgId: string) => [...orgKeys.detail(orgId), "members"] as const,
  invites: (orgId: string) => [...orgKeys.detail(orgId), "invites"] as const,
  teams: (orgId: string) => [...orgKeys.detail(orgId), "teams"] as const,
};

export function useOrgs() {
  return useQuery({
    queryKey: orgKeys.lists(),
    queryFn: ({ signal }) => api.get<Org[]>("/api/v1/orgs", signal),
  });
}

export function useOrg(orgId: string) {
  return useQuery({
    queryKey: orgKeys.detail(orgId),
    queryFn: ({ signal }) => api.get<Org>(orgPath(orgId), signal),
  });
}

export function useCreateOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string | null }) =>
      api.post<Org>("/api/v1/orgs", input),
    onSuccess: (org) => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.lists() });
      toast.success(`Created ${org.name}`);
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useUpdateOrg(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name?: string;
      description?: string | null;
      ai_enabled?: boolean;
      block_backward_transitions?: boolean;
      residency_region?: string | null;
      compliance_frameworks?: string[];
      data_controller?: string | null;
      dpo_contact?: string | null;
    }) => api.patch<Org>(orgPath(orgId), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.all });
      toast.success("Organization updated");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useDeleteOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) => api.delete<null>(orgPath(orgId)),
    onSuccess: (_data, orgId) => {
      queryClient.setQueryData<Org[]>(orgKeys.lists(), (prev) =>
        prev ? prev.filter((org) => org.id !== orgId) : prev
      );
      queryClient.removeQueries({ queryKey: orgKeys.detail(orgId) });
      void queryClient.invalidateQueries({ queryKey: orgKeys.lists() });
      toast.success("Organization deleted");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useOrgMembers(orgId: string) {
  return useQuery({
    queryKey: orgKeys.members(orgId),
    queryFn: ({ signal }) => api.get<OrgMember[]>(orgPath(orgId, "/members"), signal),
  });
}

export function useUpdateMemberRole(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; role: OrgRole }) =>
      api.patch<null>(orgPath(orgId, `/members/${input.userId}`), { role: input.role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.members(orgId) });
      toast.success("Role updated");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useRemoveMember(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete<null>(orgPath(orgId, `/members/${userId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.members(orgId) });
      toast.success("Member removed");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useInvites(orgId: string) {
  return useQuery({
    queryKey: orgKeys.invites(orgId),
    queryFn: ({ signal }) => api.get<Invite[]>(orgPath(orgId, "/invites"), signal),
  });
}

export function useCreateInvite(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; role: OrgRole; project_id?: string | null }) =>
      api.post<Invite>(orgPath(orgId, "/invites"), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.invites(orgId) });
      toast.success("Invitation sent");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useRevokeInvite(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => api.delete<null>(orgPath(orgId, `/invites/${inviteId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.invites(orgId) });
      toast.success("Invite revoked");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useTeams(orgId: string) {
  return useQuery({
    queryKey: orgKeys.teams(orgId),
    queryFn: ({ signal }) => api.get<Team[]>(orgPath(orgId, "/teams"), signal),
  });
}

export function useTeamStats(orgId: string, teamId: string) {
  return useQuery({
    queryKey: [...orgKeys.teams(orgId), teamId, "stats"] as const,
    queryFn: ({ signal }) => api.get<TeamStats>(orgPath(orgId, `/teams/${teamId}/stats`), signal),
  });
}

export function useCreateTeam(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string | null }) =>
      api.post<Team>(orgPath(orgId, "/teams"), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.teams(orgId) });
      toast.success("Team created");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useTeam(orgId: string, teamId: string) {
  return useQuery({
    queryKey: [...orgKeys.teams(orgId), teamId] as const,
    queryFn: ({ signal }) => api.get<Team>(orgPath(orgId, `/teams/${teamId}`), signal),
  });
}

export function useUpdateTeam(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      teamId,
      ...body
    }: {
      teamId: string;
      name?: string;
      description?: string | null;
      lead_id?: string | null;
      charter?: string | null;
      logo_props?: { icon?: string; color?: string };
    }) => api.patch<Team>(orgPath(orgId, `/teams/${teamId}`), body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.teams(orgId) });
      void queryClient.invalidateQueries({
        queryKey: [...orgKeys.teams(orgId), variables.teamId],
      });
      toast.success("Team updated");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useTeamMembers(orgId: string, teamId: string) {
  return useQuery({
    queryKey: [...orgKeys.teams(orgId), teamId, "members"] as const,
    queryFn: ({ signal }) =>
      api.get<TeamMember[]>(orgPath(orgId, `/teams/${teamId}/members`), signal),
  });
}

export function useAddTeamMember(orgId: string, teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.post<TeamMember>(orgPath(orgId, `/teams/${teamId}/members`), { user_id: userId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...orgKeys.teams(orgId), teamId, "members"],
      });
      toast.success("Member added");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRemoveTeamMember(orgId: string, teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete<null>(orgPath(orgId, `/teams/${teamId}/members/${userId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...orgKeys.teams(orgId), teamId, "members"],
      });
      toast.success("Member removed");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useTeamProjects(orgId: string, teamId: string) {
  return useQuery({
    queryKey: [...orgKeys.teams(orgId), teamId, "projects"] as const,
    queryFn: ({ signal }) =>
      api.get<Project[]>(orgPath(orgId, `/teams/${teamId}/projects`), signal),
  });
}

export function useLinkTeamProjects(orgId: string, teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectIds: string[]) =>
      api.put<Team>(orgPath(orgId, `/teams/${teamId}/projects`), { project_ids: projectIds }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...orgKeys.teams(orgId), teamId, "projects"],
      });
      toast.success("Projects linked");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUnlinkTeamProject(orgId: string, teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      api.delete<Team>(orgPath(orgId, `/teams/${teamId}/projects`), {
        project_ids: [projectId],
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...orgKeys.teams(orgId), teamId, "projects"],
      });
      toast.success("Project unlinked");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteTeam(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teamId: string) => api.delete<null>(orgPath(orgId, `/teams/${teamId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.teams(orgId) });
      toast.success("Team deleted");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export interface SeatUsage {
  billable_seats: number;
  free_seats: number;
  total_members: number;
  bot_users: number;
  by_role: Record<string, number>;
  billable_roles: string[];
}

export function useSeatUsage(orgId: string) {
  return useQuery({
    queryKey: ["orgs", orgId, "billing", "seats"] as const,
    queryFn: ({ signal }) => api.get<SeatUsage>(orgPath(orgId, "/billing/seats"), signal),
  });
}

export interface CompliancePosture {
  residency_region: string | null;
  compliance_frameworks: string[];
  data_controller: string | null;
  dpo_contact: string | null;
}

export interface DataSubjectExport {
  subject: Record<string, unknown>;
  content: Record<string, unknown>;
}

export function useDataSubjectExport(orgId: string) {
  return useMutation({
    mutationFn: (userId: string) =>
      api.get<DataSubjectExport>(orgPath(orgId, `/compliance/data-subjects/${userId}/export`)),
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRequestErasure(orgId: string) {
  return useMutation({
    mutationFn: (input: { user_id: string; reason?: string | null }) =>
      api.post<{ subject_id: string; status: string }>(
        orgPath(orgId, "/compliance/erasure-requests"),
        input
      ),
    onSuccess: () => toast.success("Erasure request recorded"),
    onError: (error) => toast.error(errorMessage(error)),
  });
}
