"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elliptic/ui";
import { useProjects } from "@/hooks/use-project-queries";
import { useCreateTask } from "@/hooks/use-task-queries";

export function GlobalQuickAdd({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const projects = useProjects(orgId);
  const activeProjects = (projects.data ?? []).filter((project) => project.status === "active");
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const createTask = useCreateTask(orgId, projectId);

  useEffect(() => {
    const first = activeProjects[0];
    if (!projectId && first) setProjectId(first.id);
  }, [activeProjects, projectId]);

  const submit = () => {
    if (!projectId || !title.trim()) return;
    createTask.mutate(
      { title: title.trim(), status: "backlog", priority: "none" },
      {
        onSuccess: () => {
          setTitle("");
          setOpen(false);
        },
      }
    );
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1.5"
        aria-label="New task"
      >
        <Plus className="size-3.5" />
        <span className="hidden sm:inline">New</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger aria-label="Project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {activeProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quick-add-title">Title</Label>
              <Input
                id="quick-add-title"
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submit();
                  }
                }}
                placeholder="What needs to be done?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              loading={createTask.isPending}
              disabled={!projectId || title.trim().length === 0}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
