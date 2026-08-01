"use client";

import { Sparkles } from "lucide-react";
import {
  IconButton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@elliptic/ui";
import type { Task } from "@/lib/types";
import { useProject } from "@/hooks/use-project-queries";
import { useUpdateTask } from "@/hooks/use-task-queries";
import { useSuggestEstimate } from "@/hooks/use-ai-estimate";

const NONE = "__none__";

export function TaskEstimateField({
  orgId,
  projectId,
  task,
}: {
  orgId: string;
  projectId: string;
  task: Task;
}) {
  const project = useProject(orgId, projectId);
  const updateTask = useUpdateTask(orgId, projectId);
  const suggest = useSuggestEstimate(orgId);
  const scale = project.data?.estimate_scale ?? [];

  if (scale.length === 0) return null;

  const askAi = () => {
    suggest.mutate(task.id, {
      onSuccess: (result) => {
        if (result.suggestion) {
          updateTask.mutate({ taskId: task.id, estimate: result.suggestion });
          toast.success(`AI suggested ${result.suggestion}`);
        } else {
          toast.info(`AI couldn't map "${result.raw}" to this scale`);
        }
      },
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption text-muted-foreground">Estimate</span>
      <div className="flex items-center gap-1">
        <Select
          value={task.estimate ?? NONE}
          onValueChange={(value) =>
            updateTask.mutate({ taskId: task.id, estimate: value === NONE ? "" : value })
          }
        >
          <SelectTrigger aria-label="Estimate" className="flex-1">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No estimate</SelectItem>
            {scale.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <IconButton
          aria-label="Suggest estimate with AI"
          variant="ghost"
          size="sm"
          disabled={suggest.isPending}
          onClick={askAi}
        >
          <Sparkles className={`size-4 text-accent ${suggest.isPending ? "animate-pulse" : ""}`} />
        </IconButton>
      </div>
    </div>
  );
}
