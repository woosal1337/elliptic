"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ListTodo, Wand2 } from "lucide-react";
import {
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@elliptic/ui";
import { useConvertSticky } from "@/hooks/use-sticky-queries";
import { useProjects } from "@/hooks/use-project-queries";

export function StickyConvertMenu({ orgId, stickyId }: { orgId: string; stickyId: string }) {
  const convert = useConvertSticky(orgId);
  const projects = useProjects(orgId);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  const run = (target: "task" | "note", project_id: string | null) => {
    convert.mutate(
      { stickyId, target, project_id },
      {
        onSuccess: (result) => {
          setOpen(false);
          toast.success(`Converted to ${target}`);
          if (result.target === "task" && result.project_id) {
            router.push(`/app/${orgId}/projects/${result.project_id}?task=${result.entity_id}`);
          } else if (result.target === "note") {
            router.push(`/app/${orgId}/notes/${result.entity_id}`);
          }
        },
      }
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <IconButton aria-label="Convert sticky" variant="ghost" size="sm">
          <Wand2 className="size-3.5" />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-56 flex-col gap-2 p-2">
        <button
          type="button"
          className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-small hover:bg-muted"
          onClick={() => run("note", null)}
        >
          <FileText className="size-4 text-muted-foreground" />
          Convert to note
        </button>
        <div className="flex flex-col gap-1.5 border-t border-border pt-2">
          <span className="px-2 text-caption text-muted-foreground">Convert to task in…</span>
          <Select value={projectId ?? ""} onValueChange={setProjectId}>
            <SelectTrigger aria-label="Project" className="w-full">
              <SelectValue placeholder="Pick a project" />
            </SelectTrigger>
            <SelectContent>
              {(projects.data ?? []).map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            disabled={!projectId || convert.isPending}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-small hover:bg-muted disabled:opacity-50"
            onClick={() => projectId && run("task", projectId)}
          >
            <ListTodo className="size-4 text-muted-foreground" />
            Convert to task
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
