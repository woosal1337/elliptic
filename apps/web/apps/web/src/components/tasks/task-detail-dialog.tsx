"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  CopyPlus,
  Bell,
  BellOff,
  BookText,
  Bug,
  Check,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Layers,
  Link as LinkIcon,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  Textarea,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@elliptic/ui";
import type { ActivityEvent, Comment, Task, TaskKind } from "@/lib/types";
import { formatRelative } from "@/lib/format";
import { FileUpload } from "@/components/storage/file-upload";
import { AttachmentList, PendingAttachmentChips } from "@/components/storage/attachment-list";
import type { UploadResult } from "@/hooks/use-storage-queries";
import {
  useAddTaskComment,
  useArchiveTask,
  useConvertTask,
  useDuplicateTask,
  useCommentVersions,
  useReactToComment,
  useResolveComment,
  useSetTaskSubscription,
  useTask,
  useTaskActivity,
  useTaskComments,
  useTasks,
  useUpdateTask,
} from "@/hooks/use-task-queries";
import { TaskDescriptionEditor } from "./task-description-editor";
import { TaskDescriptionHistory } from "./task-description-history";
import type { MentionConfig, MentionItem } from "@/components/notes/editor-extensions";
import { useOrgMembers } from "@/hooks/use-org-queries";
import { useAIUsers } from "@/hooks/use-ai-queries";
import { useMe } from "@/hooks/use-auth-queries";
import { useNotes } from "@/hooks/use-note-queries";
import { useProjectMembers } from "@/hooks/use-project-queries";
import { ErrorState } from "@/components/error-state";
import { useTaskDetailCommands } from "@/components/command/use-host-commands";
import { AssigneeSelect, BugGlyph, PrioritySelect, SeveritySelect, StatusSelect } from "./task-bits";
import { TaskSubtasksPanel } from "./task-subtasks-panel";
import { TaskRelationsPanel } from "./task-relations-panel";
import { TaskSchedulePanel } from "./task-schedule-panel";
import { TaskDodSection } from "./task-dod-section";
import { TaskUpdatesSection } from "./task-updates-section";
import { TaskWorklogSection } from "./task-worklog-section";
import { TaskTransitions } from "./task-transitions";
import { TaskApprovalsSection } from "./task-approvals-section";
import { TaskLinksSection } from "./task-links-section";
import { TaskNoteLinksSection } from "./task-note-links-section";
import { TaskSubscribers } from "./task-subscribers";
import { TaskCycleField } from "./task-cycle-field";
import { TaskMilestoneField } from "./task-milestone-field";
import { TaskModuleField } from "./task-module-field";
import { TaskReleaseField } from "./task-release-field";
import { TaskCustomFields } from "./task-custom-fields";
import { TaskEstimateField } from "./task-estimate-field";
import { Markdown } from "@/components/notes/markdown";

const REACTION_EMOJIS = ["👍", "❤️", "🎉", "🚀", "👀", "✅"] as const;

function SubscriptionToggle({ orgId, taskId }: { orgId: string; taskId: string }) {
  const setSubscription = useSetTaskSubscription(orgId, taskId);
  const [subscribed, setSubscribed] = useState(true);

  const toggle = () => {
    const next = !subscribed;
    setSubscribed(next);
    setSubscription.mutate(next);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <IconButton
          aria-label={subscribed ? "Unsubscribe from task" : "Subscribe to task"}
          variant="ghost"
          size="sm"
          disabled={setSubscription.isPending}
          onClick={toggle}
        >
          {subscribed ? <Bell /> : <BellOff />}
        </IconButton>
      </TooltipTrigger>
      <TooltipContent>{subscribed ? "Unsubscribe" : "Subscribe"}</TooltipContent>
    </Tooltip>
  );
}

function CommentEditedHistory({
  orgId,
  commentId,
}: {
  orgId: string;
  commentId: string;
}) {
  const [open, setOpen] = useState(false);
  const versions = useCommentVersions(orgId, commentId, open);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-caption text-muted-foreground/70 underline-offset-2 hover:underline"
        >
          · edited
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <p className="mb-2 text-caption font-medium text-foreground">Edit history</p>
        {versions.isPending ? (
          <Skeleton className="h-12 w-full" />
        ) : (versions.data ?? []).length === 0 ? (
          <p className="text-caption text-muted-foreground">No previous versions.</p>
        ) : (
          <ul className="flex max-h-60 flex-col gap-2 overflow-y-auto">
            {(versions.data ?? []).map((version) => (
              <li key={version.id} className="flex flex-col gap-0.5">
                <span className="text-caption text-muted-foreground/70">
                  {formatRelative(version.created_at)}
                </span>
                <span className="whitespace-pre-wrap rounded bg-muted/40 p-1.5 text-caption text-muted-foreground line-through">
                  {version.content}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function TypeSelect({ value, onChange }: { value: TaskKind; onChange: (kind: TaskKind) => void }) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as TaskKind)}>
      <SelectTrigger aria-label="Type">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="task">Task</SelectItem>
        <SelectItem value="bug">
          <span className="flex items-center gap-2">
            <Bug className="size-3.5 text-danger" aria-hidden="true" />
            Bug
          </span>
        </SelectItem>
        <SelectItem value="story">
          <span className="flex items-center gap-2">
            <BookText className="size-3.5 text-accent" aria-hidden="true" />
            Story
          </span>
        </SelectItem>
        <SelectItem value="epic">
          <span className="flex items-center gap-2">
            <Layers className="size-3.5 text-warning" aria-hidden="true" />
            Epic
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

function SidebarSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1 text-mono-label font-mono text-muted-foreground/70 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        {title}
      </button>
      {open ? children : null}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function humanize(value: string): string {
  const clean = value.replace(/[._-]/g, " ").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function shortTitle(value: string, max = 40): string {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed;
}

function eventPhrase(event: ActivityEvent): string {
  const t = event.event_type;
  const p = event.payload ?? {};
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : undefined);
  const from = str("from");
  const to = str("to");
  if (t === "created") return "created this task";
  if (t === "deleted") return "deleted this task";
  if (t === "assigned") return str("assignee") === "cleared" ? "unassigned this task" : "assigned this task";
  if (t === "updated" || t === "status_changed" || t === "status") {
    const parts: string[] = [];
    if (str("status")) parts.push(`status to ${humanize(str("status") as string)}`);
    if (str("priority")) parts.push(`priority to ${humanize(str("priority") as string)}`);
    if (p["title"] !== undefined) parts.push("the title");
    if (p["assignee"] !== undefined) parts.push("the assignee");
    if (p["description"] !== undefined) parts.push("the description");
    if (from && to) parts.push(`from ${humanize(from)} to ${humanize(to)}`);
    if (parts.length) return `changed ${parts.join(", ")}`;
    return "updated this task";
  }
  if (from && to) return `${humanize(t)} from ${humanize(from)} to ${humanize(to)}`;
  return humanize(t);
}

type FeedItem =
  | { at: string; key: string; type: "event"; event: ActivityEvent }
  | { at: string; key: string; type: "comment"; comment: Comment };

function ActivityFeed({
  orgId,
  taskId,
  actorName,
  mentionConfig,
}: {
  orgId: string;
  taskId: string;
  actorName: (id: string | null) => string;
  mentionConfig: MentionConfig;
}) {
  const activity = useTaskActivity(orgId, taskId);
  const comments = useTaskComments(orgId, taskId);
  const addComment = useAddTaskComment(orgId, taskId);
  const [pendingAttachments, setPendingAttachments] = useState<
    { objectId: string; filename: string; kind: "image" | "file" }[]
  >([]);
  const resolveComment = useResolveComment(orgId, taskId);
  const reactToComment = useReactToComment(orgId, taskId);
  const deepLinkCommentId = useSearchParams().get("comment");
  useEffect(() => {
    if (!deepLinkCommentId || !comments.data) return;
    const el = document.getElementById(`comment-${deepLinkCommentId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [deepLinkCommentId, comments.data]);
  const [body, setBody] = useState("");
  const [reactPickerFor, setReactPickerFor] = useState<string | null>(null);
  const [composerKey, setComposerKey] = useState(0);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [feedTab, setFeedTab] = useState<
    "all" | "comments" | "history" | "transitions" | "worklogs"
  >("all");
  const [commentVisibility, setCommentVisibility] = useState<"internal" | "external">("internal");

  const repliesByParent = useMemo(() => {
    const map = new Map<string, Comment[]>();
    for (const comment of comments.data ?? []) {
      if (comment.parent_id === null) continue;
      const list = map.get(comment.parent_id) ?? [];
      list.push(comment);
      map.set(comment.parent_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.created_at.localeCompare(b.created_at));
    return map;
  }, [comments.data]);

  const items = useMemo<FeedItem[]>(() => {
    const events: FeedItem[] = (activity.data ?? [])
      .filter((event) => !/comment/i.test(event.event_type))
      .map((event) => ({ at: event.created_at, key: `e-${event.id}`, type: "event", event }));
    const cs: FeedItem[] = (comments.data ?? [])
      .filter((comment) => comment.parent_id === null)
      .map((comment) => ({
        at: comment.created_at,
        key: `c-${comment.id}`,
        type: "comment",
        comment,
      }));
    return [...events, ...cs].sort((a, b) => a.at.localeCompare(b.at));
  }, [activity.data, comments.data]);

  const visibleItems = useMemo(() => {
    if (feedTab === "comments") return items.filter((item) => item.type === "comment");
    if (feedTab === "history") return items.filter((item) => item.type === "event");
    return items;
  }, [items, feedTab]);

  const submit = () => {
    const trimmed = body.trim();
    if (trimmed.length === 0 && pendingAttachments.length === 0) return;
    addComment.mutate(
      {
        content: trimmed,
        visibility: commentVisibility,
        attachmentIds: pendingAttachments.map((a) => a.objectId),
      },
      {
        onSuccess: () => {
          setBody("");
          setPendingAttachments([]);
          setComposerKey((value) => value + 1);
        },
      }
    );
  };

  const submitReply = (parentId: string) => {
    const trimmed = replyBody.trim();
    if (trimmed.length === 0) return;
    addComment.mutate(
      { content: trimmed, parentId },
      {
        onSuccess: () => {
          setReplyBody("");
          setReplyTo(null);
        },
      }
    );
  };

  const pending = activity.isPending || comments.isPending;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-small font-semibold text-foreground">Activity</h3>
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
          {(["all", "comments", "history", "transitions", "worklogs"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFeedTab(tab)}
              className={`rounded px-2 py-0.5 text-caption capitalize transition-colors ${
                feedTab === tab
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      {feedTab === "transitions" ? (
        <TaskTransitions orgId={orgId} taskId={taskId} />
      ) : feedTab === "worklogs" ? (
        <TaskWorklogSection orgId={orgId} taskId={taskId} />
      ) : pending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      ) : activity.isError ? (
        <ErrorState error={activity.error} onRetry={() => void activity.refetch()} />
      ) : visibleItems.length === 0 ? (
        <p className="text-small text-muted-foreground">
          {feedTab === "comments"
            ? "No comments yet."
            : feedTab === "history"
              ? "No history yet."
              : "No activity yet. Start the discussion."}
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {visibleItems.map((item) =>
            item.type === "event" ? (
              <li key={item.key} className="flex items-start gap-2.5">
                <span
                  aria-hidden
                  className="mt-[0.4rem] size-1.5 shrink-0 rounded-full bg-border-strong"
                />
                <p className="text-caption leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {actorName(item.event.actor_id)}
                  </span>{" "}
                  {eventPhrase(item.event)}
                  <span className="px-1 text-muted-foreground/50">·</span>
                  {formatRelative(item.event.created_at)}
                </p>
              </li>
            ) : (
              <li key={item.key} id={`comment-${item.comment.id}`} className="flex flex-col gap-2">
                <div className="flex gap-3">
                  <Avatar name={actorName(item.comment.author_id)} size="sm" className="mt-0.5" />
                  <div
                    className={`group/comment flex min-w-0 flex-1 flex-col gap-1 rounded-lg border p-3 ${
                      deepLinkCommentId === item.comment.id
                        ? "border-accent/60 bg-accent-muted/30"
                        : item.comment.resolved_at
                          ? "border-success/40 bg-success/5"
                          : "border-border bg-surface/50"
                    }`}
                  >
                    <p className="flex items-center gap-2 text-caption text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {actorName(item.comment.author_id)}
                      </span>
                      {formatRelative(item.comment.created_at)}
                      <button
                        type="button"
                        aria-label="Copy link to comment"
                        className="opacity-0 transition-opacity hover:text-foreground group-hover/comment:opacity-100"
                        onClick={() => {
                          const url = `${window.location.origin}/app/${orgId}/browse/${item.comment.id}`;
                          void navigator.clipboard.writeText(url);
                          toast.success("Comment link copied");
                        }}
                      >
                        <LinkIcon className="size-3" />
                      </button>
                      {item.comment.visibility === "external" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-muted px-1.5 text-accent">
                          External
                        </span>
                      ) : null}
                      {item.comment.edited_at ? (
                        <CommentEditedHistory orgId={orgId} commentId={item.comment.id} />
                      ) : null}
                      {item.comment.resolved_at ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-1.5 text-success">
                          <Check className="size-3" /> Resolved
                        </span>
                      ) : null}
                    </p>
                    <Markdown source={item.comment.content} orgId={orgId} />
                    <AttachmentList orgId={orgId} attachments={item.comment.attachments ?? []} />
                    {item.comment.reactions.length > 0 || reactPickerFor === item.comment.id ? (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {item.comment.reactions.map((reaction) => (
                          <button
                            key={reaction.emoji}
                            type="button"
                            onClick={() =>
                              reactToComment.mutate({
                                commentId: item.comment.id,
                                emoji: reaction.emoji,
                              })
                            }
                            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-caption transition-colors ${
                              reaction.reacted
                                ? "border-accent/50 bg-accent/10 text-foreground"
                                : "border-border bg-surface text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span>{reaction.emoji}</span>
                            <span className="tabular">{reaction.count}</span>
                          </button>
                        ))}
                        {reactPickerFor === item.comment.id
                          ? REACTION_EMOJIS.filter(
                              (emoji) =>
                                !item.comment.reactions.some((reaction) => reaction.emoji === emoji)
                            ).map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  reactToComment.mutate({ commentId: item.comment.id, emoji });
                                  setReactPickerFor(null);
                                }}
                                className="inline-flex items-center rounded-full border border-border bg-surface px-1.5 py-0.5 text-caption transition-colors hover:bg-muted"
                              >
                                {emoji}
                              </button>
                            ))
                          : null}
                      </div>
                    ) : null}
                    <div className="mt-1 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setReactPickerFor((current) =>
                            current === item.comment.id ? null : item.comment.id
                          )
                        }
                        className="text-caption text-muted-foreground transition-colors hover:text-foreground"
                      >
                        React
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyTo((current) =>
                            current === item.comment.id ? null : item.comment.id
                          );
                          setReplyBody("");
                        }}
                        className="text-caption text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Reply
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          resolveComment.mutate({
                            commentId: item.comment.id,
                            resolved: item.comment.resolved_at === null,
                          })
                        }
                        className="text-caption text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item.comment.resolved_at ? "Reopen" : "Resolve"}
                      </button>
                    </div>
                  </div>
                </div>
                {(repliesByParent.get(item.comment.id) ?? []).map((reply) => (
                  <div key={reply.id} className="ml-9 flex gap-3">
                    <Avatar name={actorName(reply.author_id)} size="sm" className="mt-0.5" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-lg border border-border bg-surface/50 p-3">
                      <p className="text-caption text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {actorName(reply.author_id)}
                        </span>{" "}
                        {formatRelative(reply.created_at)}
                      </p>
                      <Markdown source={reply.content} orgId={orgId} />
                    </div>
                  </div>
                ))}
                {replyTo === item.comment.id ? (
                  <div className="ml-9 flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2">
                    <Textarea
                      value={replyBody}
                      onChange={(event) => setReplyBody(event.target.value)}
                      placeholder="Write a reply…"
                      rows={2}
                      aria-label="Reply"
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => submitReply(item.comment.id)}
                        loading={addComment.isPending}
                        disabled={replyBody.trim().length === 0}
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            ),
          )}
        </ol>
      )}
      <div className="flex flex-col gap-2">
        <TaskDescriptionEditor
          key={composerKey}
          value=""
          onChange={setBody}
          mention={mentionConfig}
          placeholder="Leave a comment… “@” to mention a task or note"
          className="min-h-[3.5rem]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <PendingAttachmentChips
            items={pendingAttachments}
            onRemove={(objectId) =>
              setPendingAttachments((current) => current.filter((a) => a.objectId !== objectId))
            }
          />
          <div className="ml-auto flex items-center gap-2">
            <FileUpload
              orgId={orgId}
              entityType="comment"
              onUploaded={(result: UploadResult) =>
                setPendingAttachments((current) => [
                  ...current,
                  { objectId: result.objectId, filename: result.filename, kind: result.kind },
                ])
              }
            />
            <button
              type="button"
              onClick={() =>
                setCommentVisibility((v) => (v === "internal" ? "external" : "internal"))
              }
              className="text-caption text-muted-foreground hover:text-foreground"
              title="Toggle who can see this comment"
            >
              {commentVisibility === "internal" ? "🔒 Internal" : "🌐 External"}
            </button>
            <Button
              size="sm"
              onClick={submit}
              loading={addComment.isPending}
              disabled={body.trim().length === 0 && pendingAttachments.length === 0}
            >
              Comment
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function TaskDetailBody({
  orgId,
  projectId,
  task,
  onNavigate,
  fullscreen,
}: {
  orgId: string;
  projectId: string;
  task: Task;
  onNavigate?: (taskId: string) => void;
  fullscreen?: boolean;
}) {
  const router = useRouter();
  const updateTask = useUpdateTask(orgId, projectId);
  const me = useMe();
  const convertTask = useConvertTask(orgId, projectId);
  const duplicateTask = useDuplicateTask(orgId, projectId);
  const archiveTask = useArchiveTask(orgId, projectId, task.id);
  const orgMembers = useOrgMembers(orgId);
  const botUsers = useAIUsers(orgId);
  const projectMembers = useProjectMembers(orgId, projectId);
  const projectTasks = useTasks(orgId, projectId);
  const projectNotes = useNotes(orgId, projectId);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useTaskDetailCommands(orgId, projectId, task);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
  }, [task.id, task.title, task.description]);

  useEffect(
    () => () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    },
    [],
  );

  const actorName = useCallback(
    (id: string | null) =>
      (id && orgMembers.data?.find((member) => member.user_id === id)?.full_name) || "Someone",
    [orgMembers.data],
  );

  const commitTitle = () => {
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      setTitle(task.title);
      return;
    }
    if (trimmed !== task.title) updateTask.mutate({ taskId: task.id, title: trimmed });
  };

  const handleDescriptionChange = useCallback(
    (markdown: string) => {
      setDescription(markdown);
      if (commitTimer.current) clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(() => {
        const next = markdown.trim().length === 0 ? null : markdown;
        if (next !== (task.description ?? null)) {
          updateTask.mutate({ taskId: task.id, description: next });
        }
      }, 700);
    },
    [task.description, task.id, updateTask],
  );

  const mentionConfig = useMemo<MentionConfig>(
    () => ({
      resolve: (query: string) => {
        const q = query.trim().toLowerCase();
        const taskMatches: MentionItem[] = (projectTasks.data ?? [])
          .filter((candidate) => candidate.id !== task.id)
          .filter((candidate) => {
            if (q.length === 0) return true;
            return (
              candidate.identifier.toLowerCase().includes(q) ||
              candidate.title.toLowerCase().includes(q) ||
              String(candidate.number).includes(q)
            );
          })
          .map((candidate) => ({
            id: candidate.id,
            label: candidate.identifier,
            hint: candidate.title,
            kind: "task" as const,
          }));
        const noteMatches: MentionItem[] = (projectNotes.data ?? [])
          .filter((note) => q.length === 0 || note.title.toLowerCase().includes(q))
          .map((note) => ({
            id: note.id,
            label: shortTitle(note.title),
            kind: "note" as const,
          }));
        return [...taskMatches, ...noteMatches].slice(0, 8);
      },
      onActivate: (item: MentionItem) => {
        if (item.kind === "note") {
          router.push(`/app/${orgId}/notes/${item.id}`);
          return;
        }
        onNavigate?.(item.id);
      },
    }),
    [projectTasks.data, projectNotes.data, task.id, onNavigate, router, orgId],
  );

  const projectMemberIds = new Set((projectMembers.data ?? []).map((member) => member.user_id));
  const assignableMembers = (orgMembers.data ?? []).filter(
    (member) =>
      (projectMemberIds.has(member.user_id) && member.role !== "guest") ||
      member.user_id === task.assignee_id,
  );

  return (
    <div
      className={`flex ${fullscreen ? "h-full" : "max-h-[88dvh]"} min-h-0 flex-col md:flex-row`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
        <div className="flex flex-wrap items-center gap-2 pl-8 pr-9">
          <Badge variant="outline" className="font-mono">
            {task.identifier}
          </Badge>
          {task.kind === "bug" ? <BugGlyph /> : null}
          {task.archived_at ? (
            <Badge variant="outline" className="border-warning/40 text-warning">
              Archived
            </Badge>
          ) : null}
          <span className="text-caption text-muted-foreground">
            Updated {formatRelative(task.updated_at)}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <TaskSubscribers orgId={orgId} taskId={task.id} />
            <IconButton
              aria-label="Copy link to task"
              variant="ghost"
              size="sm"
              onClick={() => {
                const url = `${window.location.origin}/app/${orgId}/projects/${projectId}?task=${task.id}`;
                void navigator.clipboard
                  .writeText(url)
                  .then(() => toast.success(`Copied link to ${task.identifier}`))
                  .catch(() => toast.error("Could not copy link"));
              }}
            >
              <LinkIcon className="size-4" />
            </IconButton>
            <IconButton
              aria-label="Copy git branch name"
              variant="ghost"
              size="sm"
              onClick={() => {
                const user = (me.data?.email ?? "me").split("@")[0] ?? "me";
                const slug = task.title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-+|-+$/g, "")
                  .slice(0, 50);
                const branch = `${user}/${task.identifier.toLowerCase()}${slug ? `-${slug}` : ""}`;
                void navigator.clipboard
                  .writeText(branch)
                  .then(() => toast.success(`Copied branch name`))
                  .catch(() => toast.error("Could not copy branch name"));
              }}
            >
              <GitBranch className="size-4" />
            </IconButton>
            <IconButton
              aria-label="Duplicate task"
              variant="ghost"
              size="sm"
              disabled={duplicateTask.isPending}
              onClick={() => duplicateTask.mutate(task.id)}
            >
              <CopyPlus className="size-4" />
            </IconButton>
            <IconButton
              aria-label={task.archived_at ? "Restore task" : "Archive task"}
              variant="ghost"
              size="sm"
              disabled={archiveTask.isPending}
              onClick={() => archiveTask.mutate(task.archived_at === null)}
            >
              {task.archived_at ? (
                <ArchiveRestore className="size-4" />
              ) : (
                <Archive className="size-4" />
              )}
            </IconButton>
            <SubscriptionToggle orgId={orgId} taskId={task.id} />
          </div>
        </div>

        <Input
          aria-label="Task title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitTitle}
          className="h-auto border-transparent bg-transparent px-0 py-0 text-h3 font-semibold tracking-[-0.01em] shadow-none focus-visible:ring-0"
        />

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-caption font-medium text-muted-foreground">Description</span>
            <TaskDescriptionHistory orgId={orgId} taskId={task.id} />
          </div>
          <TaskDescriptionEditor
            value={description}
            onChange={handleDescriptionChange}
            mention={mentionConfig}
          />
        </div>

        {task.parent_task_id === null ? (
          <TaskSubtasksPanel
            orgId={orgId}
            projectId={projectId}
            taskId={task.id}
            onOpen={onNavigate}
          />
        ) : null}

        <ActivityFeed
          orgId={orgId}
          taskId={task.id}
          actorName={actorName}
          mentionConfig={mentionConfig}
        />
      </div>

      <aside className="flex w-full shrink-0 flex-col gap-6 border-t border-border bg-surface/40 p-5 pt-10 md:w-72 md:border-l md:border-t-0">
        <SidebarSection title="Properties">
          <div className="flex flex-col gap-3">
            <Field label="Status">
              <StatusSelect
                value={task.status}
                onChange={(status) => updateTask.mutate({ taskId: task.id, status })}
              />
            </Field>
            <Field label="Priority">
              <PrioritySelect
                value={task.priority}
                onChange={(priority) => updateTask.mutate({ taskId: task.id, priority })}
              />
            </Field>
            <Field label="Assignee">
              <AssigneeSelect
                value={task.assignee_id}
                members={assignableMembers}
                onChange={(assigneeId) =>
                  updateTask.mutate({ taskId: task.id, assignee_id: assigneeId })
                }
              />
            </Field>
            {botUsers.data && botUsers.data.length > 0 ? (
              <Field label="Agent">
                <Select
                  value={task.bot_assignee_id ?? "none"}
                  onValueChange={(value) =>
                    updateTask.mutate(
                      value === "none"
                        ? { taskId: task.id, clear_bot_assignee: true }
                        : { taskId: task.id, bot_assignee_id: value }
                    )
                  }
                >
                  <SelectTrigger aria-label="Agent" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No agent</SelectItem>
                    {botUsers.data.map((bot) => (
                      <SelectItem key={bot.id} value={bot.id}>
                        {bot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            <Field label="Type">
              <TypeSelect
                value={task.kind}
                onChange={(kind) => convertTask.mutate({ taskId: task.id, kind })}
              />
            </Field>
            {task.kind === "bug" ? (
              <>
                <Field label="Severity">
                  <SeveritySelect
                    value={task.severity ?? "medium"}
                    onChange={(severity) => updateTask.mutate({ taskId: task.id, severity })}
                  />
                </Field>
                <Field label="Component">
                  <Input
                    key={task.component ?? ""}
                    defaultValue={task.component ?? ""}
                    placeholder="e.g. auth"
                    className="h-8"
                    onBlur={(event) => {
                      const value = event.target.value.trim();
                      if (value === (task.component ?? "")) return;
                      updateTask.mutate({
                        taskId: task.id,
                        ...(value ? { component: value } : { clear_component: true }),
                      });
                    }}
                  />
                </Field>
                <Field label="Release blocker">
                  <Switch
                    checked={task.release_blocker}
                    onCheckedChange={(checked) =>
                      updateTask.mutate({ taskId: task.id, release_blocker: checked })
                    }
                    aria-label="Release blocker"
                  />
                </Field>
              </>
            ) : null}
            <Field label="Cycle">
              <TaskCycleField orgId={orgId} projectId={projectId} task={task} />
            </Field>
            <Field label="Milestone">
              <TaskMilestoneField orgId={orgId} projectId={projectId} task={task} />
            </Field>
            <Field label="Module">
              <TaskModuleField orgId={orgId} projectId={projectId} task={task} />
            </Field>
            <Field label="Release">
              <TaskReleaseField orgId={orgId} task={task} />
            </Field>
            <TaskEstimateField orgId={orgId} projectId={projectId} task={task} />
          </div>
        </SidebarSection>

        <SidebarSection title="Labels">
          {task.labels.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {task.labels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-0.5 text-caption text-foreground"
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-caption text-muted-foreground">No labels</span>
          )}
        </SidebarSection>

        <TaskCustomFields orgId={orgId} projectId={projectId} task={task} />

        <SidebarSection title="Relations">
          <TaskRelationsPanel
            orgId={orgId}
            projectId={projectId}
            taskId={task.id}
            onOpen={onNavigate}
          />
          <TaskSchedulePanel orgId={orgId} projectId={projectId} taskId={task.id} />
        </SidebarSection>

        <SidebarSection title="Linked notes">
          <TaskNoteLinksSection orgId={orgId} taskId={task.id} />
        </SidebarSection>

        <SidebarSection title="Links">
          <TaskLinksSection orgId={orgId} taskId={task.id} />
        </SidebarSection>

        <SidebarSection title="Definition of done">
          <TaskDodSection orgId={orgId} projectId={projectId} task={task} />
        </SidebarSection>

        <SidebarSection title="Updates">
          <TaskUpdatesSection orgId={orgId} taskId={task.id} />
        </SidebarSection>

        <SidebarSection title="Time tracking" defaultOpen={false}>
          <TaskWorklogSection orgId={orgId} taskId={task.id} />
        </SidebarSection>

        <SidebarSection title="Approvals" defaultOpen={false}>
          <TaskApprovalsSection orgId={orgId} taskId={task.id} status={task.status} />
        </SidebarSection>
      </aside>
    </div>
  );
}

export function TaskDetailDialog({
  orgId,
  projectId,
  taskId,
  onClose,
  onNavigate,
}: {
  orgId: string;
  projectId: string;
  taskId: string | null;
  onClose: () => void;
  onNavigate?: (taskId: string) => void;
}) {
  const task = useTask(orgId, taskId ?? "", taskId !== null);
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <Dialog open={taskId !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent
        size="xl"
        className={`overflow-hidden p-0 ${
          fullscreen
            ? "h-[96dvh] max-h-[96dvh] w-[98vw] max-w-[98vw]"
            : "max-h-[88dvh] max-w-6xl"
        }`}
      >
        <DialogTitle className="sr-only">Task details</DialogTitle>
        <button
          type="button"
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          onClick={() => setFullscreen((value) => !value)}
          className="absolute left-3.5 top-3.5 z-10 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
        {task.isPending ? (
          <div className="flex flex-col gap-4 p-6">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : task.isError ? (
          <div className="p-6">
            <ErrorState error={task.error} onRetry={() => void task.refetch()} />
          </div>
        ) : (
          <TaskDetailBody
            orgId={orgId}
            projectId={projectId}
            task={task.data}
            onNavigate={onNavigate}
            fullscreen={fullscreen}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
