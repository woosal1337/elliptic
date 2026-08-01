"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from "@elliptic/ui";
import { useDeleteProject } from "@/hooks/use-project-queries";

export function DeleteProjectDialog({
  orgId,
  projectId,
  projectName,
  projectKey,
}: {
  orgId: string;
  projectId: string;
  projectName: string;
  projectKey: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const deleteProject = useDeleteProject(orgId);
  const confirmed = confirmText.trim() === projectKey;

  const submit = () => {
    if (!confirmed) return;
    deleteProject.mutate(projectId, {
      onSuccess: () => {
        setOpen(false);
        setConfirmText("");
        router.push(`/app/${orgId}/projects`);
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmText("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="danger" size="sm">
          <Trash2 className="size-4" />
          Delete project
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Delete {projectName}?</DialogTitle>
          <DialogDescription>
            This hides the project and its tasks, notes, and meetings from the active workspace.
            An admin can restore it within 30 days from Settings → General → Deleted projects;
            after that it is permanently removed.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-project-confirm">
              Type{" "}
              <span className="font-mono font-medium text-foreground">{projectKey}</span>{" "}
              to confirm
            </Label>
            <Input
              id="delete-project-confirm"
              autoComplete="off"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={projectKey}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={deleteProject.isPending}
              disabled={!confirmed}
            >
              Delete project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
