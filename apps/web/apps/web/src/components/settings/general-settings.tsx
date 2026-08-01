"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
} from "@elliptic/ui";
import { useOrg, useUpdateOrg } from "@/hooks/use-org-queries";
import { ErrorState } from "@/components/error-state";
import { DeletedProjects } from "@/components/settings/deleted-projects";
import { ProjectNotifications } from "@/components/settings/project-notifications";

function OrganizationCard({ orgId }: { orgId: string }) {
  const org = useOrg(orgId);
  const updateOrg = useUpdateOrg(orgId);
  const [name, setName] = useState("");

  useEffect(() => {
    if (org.isSuccess) {
      setName(org.data.name);
    }
  }, [org.isSuccess, org.data]);

  if (org.isPending) {
    return <Skeleton className="h-44 w-full" />;
  }

  if (org.isError) {
    return <ErrorState error={org.error} onRetry={() => void org.refetch()} />;
  }

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>Organization</CardTitle>
        <CardDescription>Rename your organization. The slug stays stable.</CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim().length >= 2) {
              updateOrg.mutate({ name: name.trim() });
            }
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-rename">Name</Label>
            <Input id="org-rename" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Slug</Label>
            <Input value={org.data.slug} disabled className="font-mono" />
          </div>
          <div>
            <Button
              type="submit"
              size="sm"
              loading={updateOrg.isPending}
              disabled={name.trim().length < 2 || name.trim() === org.data.name}
            >
              Save changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function GeneralSettings({ orgId }: { orgId: string }) {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <OrganizationCard orgId={orgId} />
      <DeletedProjects orgId={orgId} />
      <ProjectNotifications orgId={orgId} />
    </div>
  );
}
