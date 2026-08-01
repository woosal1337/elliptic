"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  Skeleton,
  cn,
} from "@elliptic/ui";
import { useCreateOrg, useDeleteOrg, useOrgs } from "@/hooks/use-org-queries";
import { clearLastOrgId, setLastOrgId } from "@/lib/storage";

export function OrgSwitcher({ orgId, collapsed = false }: { orgId: string; collapsed?: boolean }) {
  const router = useRouter();
  const orgs = useOrgs();
  const createOrg = useCreateOrg();
  const deleteOrg = useDeleteOrg();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [name, setName] = useState("");

  if (orgs.isPending) {
    return <Skeleton className="h-11 w-full rounded-md" />;
  }

  if (orgs.isError) {
    return (
      <div className="rounded-md border border-border px-3 py-2 text-caption text-muted-foreground">
        Failed to load organizations
      </div>
    );
  }

  const current = orgs.data.find((org) => org.id === orgId);

  const submitCreate = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || createOrg.isPending) return;
    createOrg.mutate(
      { name: trimmed },
      {
        onSuccess: (org) => {
          setCreateOpen(false);
          setName("");
          setLastOrgId(org.id);
          router.push(`/app/${org.id}/projects?new=1`);
        },
      },
    );
  };

  const confirmDelete = () => {
    deleteOrg.mutate(orgId, {
      onSuccess: () => {
        setConfirmOpen(false);
        const next = orgs.data.find((org) => org.id !== orgId);
        if (next) {
          setLastOrgId(next.id);
          router.replace(`/app/${next.id}/projects`);
        } else {
          clearLastOrgId();
          router.replace("/app");
        }
      },
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          title={collapsed ? current?.name ?? "Organization" : undefined}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            collapsed && "justify-center px-0"
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-small font-semibold text-primary-foreground shadow-xs">
            {(current?.name ?? "?").charAt(0).toUpperCase()}
          </div>
          {collapsed ? null : (
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-small font-semibold leading-tight text-foreground">
              {current?.name ?? "Unknown org"}
            </span>
            {current?.slug ? (
              <span className="truncate text-caption leading-tight text-muted-foreground">
                {current.slug}
              </span>
            ) : null}
          </div>
          )}
          {collapsed ? null : (
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[13.5rem]">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          {orgs.data.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onSelect={() => {
                setLastOrgId(org.id);
                router.push(`/app/${org.id}/projects`);
              }}
            >
              <div className="flex size-5 shrink-0 items-center justify-center rounded bg-subtle text-[10px] font-semibold text-muted-foreground">
                {org.name.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 truncate">{org.name}</span>
              {org.id === orgId ? <Check className="text-accent" /> : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setName("");
              setCreateOpen(true);
            }}
          >
            <Plus />
            New organization
          </DropdownMenuItem>
          {current ? (
            <DropdownMenuItem
              className="text-danger focus:bg-danger-muted focus:text-danger"
              onSelect={() => setConfirmOpen(true)}
            >
              <Trash2 />
              Delete organization
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={(open) => (!open ? setCreateOpen(false) : undefined)}>
        <DialogContent size="sm">
          <DialogTitle>Create organization</DialogTitle>
          <p className="text-small leading-relaxed text-muted-foreground">
            A shared workspace for your team. We&apos;ll take you straight to your first project.
          </p>
          <form
            className="mt-2 flex flex-col gap-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              submitCreate();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-org-name">Name</Label>
              <Input
                id="new-org-name"
                autoFocus
                placeholder="Acme Inc"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createOrg.isPending} disabled={name.trim().length < 2}>
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={(open) => (!open ? setConfirmOpen(false) : undefined)}>
        <DialogContent size="sm">
          <DialogTitle>Delete organization</DialogTitle>
          <p className="text-small leading-relaxed text-muted-foreground">
            This permanently deletes <strong className="text-foreground">{current?.name}</strong>{" "}
            and everything in it — projects, tasks, notes, meetings, and members. This can&apos;t be
            undone. Only the owner can do this.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleteOrg.isPending} onClick={confirmDelete}>
              Delete organization
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
