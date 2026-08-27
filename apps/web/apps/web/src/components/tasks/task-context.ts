import { plainText } from "@/components/notes/markdown";
import type { Task } from "@/lib/types";

interface SubtaskCounts {
  completed: number;
  total: number;
}

interface LatestComment {
  content?: string | null;
  author_name?: string | null;
}

interface TaskExtras {
  subtask_counts?: SubtaskCounts | null;
  subtasks?: { completed?: number | null; total?: number | null } | null;
  latest_comment?: LatestComment | string | null;
  comment_count?: number | null;
  context_line?: string | null;
}

function extras(task: Task): TaskExtras {
  return task as Task & TaskExtras;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export interface SubtaskProgress {
  completed: number;
  total: number;
}

export function taskSubtaskProgress(task: Task): SubtaskProgress | null {
  const data = extras(task);
  const counts = data.subtask_counts ?? data.subtasks ?? null;
  if (!counts) return null;
  const total = readNumber(counts.total);
  if (total === null || total <= 0) return null;
  const completed = Math.min(Math.max(0, readNumber(counts.completed) ?? 0), total);
  return { completed, total };
}

export function taskCardContext(task: Task, assigneeName: string | null): string | null {
  const data = extras(task);

  if (typeof data.context_line === "string") {
    const line = plainText(data.context_line);
    if (line.length > 0) return line;
  }

  const comment = data.latest_comment;
  if (typeof comment === "string") {
    const line = plainText(comment);
    if (line.length > 0) return line;
  }
  if (comment && typeof comment === "object") {
    const content = typeof comment.content === "string" ? plainText(comment.content) : "";
    if (content.length > 0) {
      const author = comment.author_name?.trim();
      return author ? `${content} — ${author}` : content;
    }
  }

  const commentCount = readNumber(data.comment_count);
  if (commentCount !== null && commentCount > 0) {
    const noun = commentCount === 1 ? "comment" : "comments";
    return assigneeName
      ? `${commentCount} ${noun} · ${assigneeName}`
      : `${commentCount} ${noun}`;
  }

  return null;
}
