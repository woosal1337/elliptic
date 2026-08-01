"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  type ButtonProps,
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
  DialogTrigger,
  EmptyState,
  Input,
  IsoCubes,
  Label,
  Logo,
  Skeleton,
} from "@elliptic/ui";
import { useCreateOrg, useOrgs } from "@/hooks/use-org-queries";
import { clearLastOrgId, getLastOrgId, setLastOrgId } from "@/lib/storage";
import { ErrorState } from "@/components/error-state";

const orgSchema = z.object({
  name: z.string().min(2, "Name is too short"),
});

type OrgValues = z.infer<typeof orgSchema>;

function CreateOrgDialog({
  variant = "outline",
  label = "New organization",
}: {
  variant?: ButtonProps["variant"];
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const createOrg = useCreateOrg();
  const form = useForm<OrgValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    createOrg.mutate(values, {
      onSuccess: (org) => {
        setOpen(false);
        setLastOrgId(org.id);
        router.push(`/app/${org.id}/projects?new=1`);
      },
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <Plus className="size-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>
            A shared workspace for your team. We&apos;ll take you straight to your first project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-name">Name</Label>
            <Input id="org-name" placeholder="Acme Inc" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-caption text-danger">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="submit" loading={createOrg.isPending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function OrgPickerPage() {
  const router = useRouter();
  const orgs = useOrgs();
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    if (!orgs.isSuccess) return;
    const lastOrgId = getLastOrgId();
    const target = orgs.data.find((org) => org.id === lastOrgId);
    if (target) {
      router.replace(`/app/${target.id}/projects`);
      return;
    }
    if (lastOrgId) clearLastOrgId();
    if (orgs.data.length === 1 && orgs.data[0]) {
      setLastOrgId(orgs.data[0].id);
      router.replace(`/app/${orgs.data[0].id}/projects`);
      return;
    }
    setRedirecting(false);
  }, [orgs.isSuccess, orgs.data, router]);

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-dot-grid mask-fade-radial opacity-60"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Logo />
          <div className="flex flex-col gap-1">
            <h1 className="text-h3 font-semibold tracking-[-0.02em] text-foreground">
              Choose a workspace
            </h1>
            <p className="text-small text-muted-foreground">
              Pick an organization to continue, or create a new one.
            </p>
          </div>
        </div>
        <Card className="shadow-md">
          <CardHeader className="flex-row items-center justify-between border-b border-border">
            <div className="flex flex-col gap-0.5">
              <CardTitle>Your organizations</CardTitle>
              <CardDescription className="text-small">
                {orgs.isSuccess ? `${orgs.data.length} available` : "Loading…"}
              </CardDescription>
            </div>
            <CreateOrgDialog />
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 pt-5">
            {orgs.isPending || (orgs.isSuccess && redirecting) ? (
              <>
                <Skeleton className="h-13 w-full" />
                <Skeleton className="h-13 w-full" />
              </>
            ) : orgs.isError ? (
              <ErrorState error={orgs.error} onRetry={() => void orgs.refetch()} />
            ) : orgs.data.length === 0 ? (
              <EmptyState
                illustration={<IsoCubes />}
                title="Create your first organization"
                description="An organization is the home for your projects, meetings, and people. Set one up and we'll take you straight to creating your first project."
                action={<CreateOrgDialog variant="primary" label="Create organization" />}
              />
            ) : (
              orgs.data.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => {
                    setLastOrgId(org.id);
                    router.push(`/app/${org.id}/projects`);
                  }}
                  className="group flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2.5 text-left transition-colors duration-150 hover:border-input hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-small font-semibold text-primary-foreground shadow-xs">
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-small font-medium text-foreground">
                      {org.name}
                    </span>
                    <span className="truncate text-caption text-muted-foreground">{org.slug}</span>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
