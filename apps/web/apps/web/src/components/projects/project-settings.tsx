"use client";

import { Skeleton, Switch } from "@elliptic/ui";
import { useMe } from "@/hooks/use-auth-queries";
import { useOrgMembers } from "@/hooks/use-org-queries";
import { useProject, useUpdateProject } from "@/hooks/use-project-queries";
import { ErrorState } from "@/components/error-state";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { WebhooksSettings } from "@/components/projects/webhooks-settings";
import { ProjectCustomProperties } from "@/components/projects/project-custom-properties";
import { ProjectTemplatesSettings } from "@/components/projects/project-templates-settings";
import { ProjectEstimateSettings } from "@/components/projects/project-estimate-settings";
import { ProjectLifecycleSettings } from "@/components/projects/project-lifecycle-settings";
import { ProjectSaveTemplate } from "@/components/projects/project-save-template";
import { ProjectStatePicker } from "@/components/projects/project-state-picker";
import { ProjectWorklogApprovals } from "@/components/projects/project-worklog-approvals";
import { ProjectDefaultAssignee } from "@/components/projects/project-default-assignee";
import { ProjectRecurringTasks } from "@/components/projects/project-recurring-tasks";
import { ProjectRetrospectives } from "@/components/projects/project-retrospectives";
import { ProjectSentryIntake } from "@/components/projects/project-sentry-intake";
import { ProjectEmailIntake } from "@/components/projects/project-email-intake";
import { ProjectGitConnection } from "@/components/projects/project-git-connection";
import { ProjectImport } from "@/components/projects/project-import";
import { ProjectBoardPublish } from "@/components/projects/project-board-publish";
import { ProjectVisibility } from "@/components/projects/project-visibility";
import { ProjectIdentitySettings } from "@/components/projects/project-identity-settings";

const PROJECT_FEATURES = [
  { key: "meetings", label: "Meetings", description: "Meeting list and imports for this project." },
  { key: "notes", label: "Notes", description: "Project pages and notes." },
] as const;

export function ProjectSettings({ orgId, projectId }: { orgId: string; projectId: string }) {
  const project = useProject(orgId, projectId);
  const orgMembers = useOrgMembers(orgId);
  const me = useMe();
  const updateProject = useUpdateProject(orgId, projectId);

  if (project.isPending) {
    return <Skeleton className="h-40 w-full max-w-xl" />;
  }
  if (project.isError) {
    return <ErrorState error={project.error} onRetry={() => void project.refetch()} />;
  }

  const myRole = orgMembers.data?.find((member) => member.user_id === me.data?.id)?.role;
  const canManage = myRole === "owner" || myRole === "admin";

  const features = project.data.features;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-small font-semibold text-foreground">Features</h2>
          <p className="text-caption text-muted-foreground">
            Enable or disable surfaces for this project. Disabled tabs are hidden for everyone.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {PROJECT_FEATURES.map((feature) => (
            <label key={feature.key} className="flex items-center justify-between gap-4">
              <span className="flex min-w-0 flex-col">
                <span className="text-small font-medium text-foreground">{feature.label}</span>
                <span className="text-caption text-muted-foreground">{feature.description}</span>
              </span>
              <Switch
                checked={features[feature.key] !== false}
                disabled={!canManage || updateProject.isPending}
                aria-label={`Toggle ${feature.label}`}
                onCheckedChange={(next) =>
                  updateProject.mutate({ features: { ...features, [feature.key]: next } })
                }
              />
            </label>
          ))}
        </div>
        {!canManage ? (
          <p className="text-caption text-muted-foreground">
            Only an organization owner or admin can change features.
          </p>
        ) : null}
      </section>
      <ProjectIdentitySettings orgId={orgId} project={project.data} canManage={canManage} />
      <ProjectVisibility orgId={orgId} project={project.data} canManage={canManage} />
      <ProjectDefaultAssignee orgId={orgId} project={project.data} canManage={canManage} />
      <ProjectRecurringTasks orgId={orgId} projectId={project.data.id} canManage={canManage} />
      <ProjectRetrospectives orgId={orgId} projectId={project.data.id} canManage={canManage} />
      <ProjectSentryIntake orgId={orgId} projectId={project.data.id} canManage={canManage} />
      <ProjectEmailIntake orgId={orgId} projectId={project.data.id} canManage={canManage} />
      <ProjectGitConnection orgId={orgId} projectId={project.data.id} canManage={canManage} />
      <ProjectImport orgId={orgId} projectId={project.data.id} canManage={canManage} />
      <ProjectBoardPublish orgId={orgId} projectId={project.data.id} canManage={canManage} />
      <ProjectEstimateSettings orgId={orgId} project={project.data} canManage={canManage} />

      <ProjectStatePicker orgId={orgId} project={project.data} canManage={canManage} />

      <ProjectWorklogApprovals orgId={orgId} project={project.data} canManage={canManage} />

      <ProjectLifecycleSettings orgId={orgId} project={project.data} canManage={canManage} />

      <ProjectSaveTemplate orgId={orgId} projectId={projectId} canManage={canManage} />
      <ProjectCustomProperties orgId={orgId} projectId={projectId} canManage={canManage} />
      <ProjectTemplatesSettings orgId={orgId} projectId={projectId} canManage={canManage} />
      {canManage ? <WebhooksSettings orgId={orgId} projectId={projectId} /> : null}
      <section className="flex flex-col gap-4 rounded-lg border border-danger/40 bg-danger-muted/20 p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-small font-semibold text-foreground">Danger zone</h2>
          <p className="text-caption text-muted-foreground">
            Delete this project and everything in it — tasks, notes, and meetings. It is a soft
            delete, recoverable for 30 days from Settings → General → Deleted projects.
          </p>
        </div>
        {canManage ? (
          <DeleteProjectDialog
            orgId={orgId}
            projectId={projectId}
            projectName={project.data.name}
            projectKey={project.data.key}
          />
        ) : (
          <p className="text-caption text-muted-foreground">
            Only an organization owner or admin can delete this project.
          </p>
        )}
      </section>
    </div>
  );
}
