"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";
import { markOptimistic, optimisticMutation, tempId } from "@/lib/optimistic";
import { authKeys } from "@/hooks/use-auth-queries";
import type {
  ActivityEvent,
  BugSeverity,
  Comment,
  CommentReaction,
  CommentVersion,
  DodItem,
  Page,
  RelatedTask,
  NoteLink,
  Task,
  TaskKind,
  TaskLink,
  TaskPriority,
  TaskRelationKind,
  TaskStatus,
  User,
} from "@/lib/types";

export const taskKeys = {
  all: (orgId: string) => ["orgs", orgId, "tasks"] as const,
  byProject: (orgId: string, projectId: string) =>
    [...taskKeys.all(orgId), "project", projectId] as const,
  detail: (orgId: string, taskId: string) => [...taskKeys.all(orgId), taskId] as const,
  subtasks: (orgId: string, taskId: string) =>
    [...taskKeys.detail(orgId, taskId), "subtasks"] as const,
  relations: (orgId: string, taskId: string) =>
    [...taskKeys.detail(orgId, taskId), "relations"] as const,
  comments: (orgId: string, taskId: string) =>
    [...taskKeys.detail(orgId, taskId), "comments"] as const,
  activity: (orgId: string, taskId: string) =>
    [...taskKeys.detail(orgId, taskId), "activity"] as const,
  links: (orgId: string, taskId: string) =>
    [...taskKeys.detail(orgId, taskId), "links"] as const,
  noteLinks: (orgId: string, taskId: string) =>
    [...taskKeys.detail(orgId, taskId), "note-links"] as const,
  subscribers: (orgId: string, taskId: string) =>
    [...taskKeys.detail(orgId, taskId), "subscribers"] as const,
};

export interface CreateTaskInput {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string | null;
  /** Create with nobody assigned, skipping the creator/project-default fallbacks. */
  unassigned?: boolean;
  due_date?: string | null;
  parent_task_id?: string | null;
  source_meeting_id?: string | null;
  source_note_id?: string | null;
  kind?: TaskKind;
  severity?: BugSeverity | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string | null;
  bot_assignee_id?: string | null;
  clear_bot_assignee?: boolean;
  kind?: TaskKind;
  severity?: BugSeverity | null;
  component?: string | null;
  clear_component?: boolean;
  custom_fields?: Record<string, string>;
  dod_items?: DodItem[];
  acceptance_criteria?: string | null;
  estimate?: string | null;
}

export function useTasks(orgId: string, projectId: string) {
  return useQuery({
    queryKey: taskKeys.byProject(orgId, projectId),
    queryFn: async ({ signal }) => {
      const LIMIT = 200;
      const items: Task[] = [];
      for (let offset = 0; ; offset += LIMIT) {
        const page = await api.get<Page<Task>>(
          orgPath(orgId, `/projects/${projectId}/tasks?limit=${LIMIT}&offset=${offset}`),
          signal
        );
        items.push(...page.items);
        if (page.items.length === 0 || items.length >= page.total) break;
      }
      return items;
    },
  });
}

export function useTask(orgId: string, taskId: string, enabled = true) {
  return useQuery({
    queryKey: taskKeys.detail(orgId, taskId),
    queryFn: ({ signal }) => api.get<Task>(orgPath(orgId, `/tasks/${taskId}`), signal),
    enabled,
  });
}

function draftTask(orgId: string, projectId: string, input: CreateTaskInput, list: Task[]): Task {
  const now = new Date().toISOString();
  const maxOrder = list.reduce((max, task) => Math.max(max, task.sort_order), 0);
  return markOptimistic({
    id: tempId(),
    org_id: orgId,
    project_id: projectId,
    number: 0,
    identifier: "…",
    title: input.title,
    description: input.description ?? null,
    status: input.status,
    priority: input.priority,
    assignee_id: input.assignee_id ?? null,
    bot_assignee_id: null,
    start_date: null,
    due_date: input.due_date ?? null,
    sort_order: maxOrder + 1,
    labels: [],
    created_by: "",
    parent_task_id: input.parent_task_id ?? null,
    source_meeting_id: input.source_meeting_id ?? null,
    cycle_id: null,
    milestone_id: null,
    module_id: null,
    release_id: null,
    custom_fields: {},
    dod_items: [],
    acceptance_criteria: null,
    estimate: null,
    kind: input.kind ?? "task",
    severity: input.severity ?? null,
    component: null,
    intake_channel: null,
    archived_at: null,
    subtask_total: 0,
    subtask_done: 0,
    blocked: false,
    created_at: now,
    updated_at: now,
  });
}

export function useCreateTask(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  const listKey = taskKeys.byProject(orgId, projectId);
  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      api.post<Task>(orgPath(orgId, `/projects/${projectId}/tasks`), input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Task[]>(listKey);
      const draft = draftTask(orgId, projectId, input, previous ?? []);
      queryClient.setQueryData<Task[]>(listKey, [...(previous ?? []), draft]);
      return { previous };
    },
    onError: (error, _input, context) => {
      queryClient.setQueryData(listKey, context?.previous);
      toast.error(errorMessage(error));
    },
    onSuccess: (task) => {
      toast.success(`Created ${task.identifier}`);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

type UpdateTaskVariables = { taskId: string } & UpdateTaskInput;

function applyTaskPatch(task: Task, input: UpdateTaskVariables): Task {
  const { taskId: _taskId, assignee_id, ...rest } = input;
  const next: Task = { ...task };
  if (rest.title !== undefined) next.title = rest.title;
  if (rest.description !== undefined) next.description = rest.description;
  if (rest.status !== undefined) next.status = rest.status;
  if (rest.priority !== undefined) next.priority = rest.priority;
  if (rest.kind !== undefined) next.kind = rest.kind;
  if (rest.severity !== undefined) next.severity = rest.severity;
  if (rest.custom_fields !== undefined) next.custom_fields = rest.custom_fields;
  if (rest.dod_items !== undefined) next.dod_items = rest.dod_items;
  if (rest.acceptance_criteria !== undefined) next.acceptance_criteria = rest.acceptance_criteria;
  if (rest.estimate !== undefined) next.estimate = rest.estimate;
  if (assignee_id !== undefined) next.assignee_id = assignee_id;
  return next;
}

export function useUpdateTask(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  const optimistic = optimisticMutation<UpdateTaskVariables>({
    queryClient,
    targets: (variables) => [
      {
        queryKey: taskKeys.byProject(orgId, projectId),
        updater: (current) =>
          (current as Task[] | undefined)?.map((task) =>
            task.id === variables.taskId ? applyTaskPatch(task, variables) : task
          ),
      },
      {
        queryKey: taskKeys.detail(orgId, variables.taskId),
        updater: (current) =>
          current ? applyTaskPatch(current as Task, variables) : current,
      },
    ],
    invalidateKeys: (variables) => [
      taskKeys.byProject(orgId, projectId),
      taskKeys.detail(orgId, variables.taskId),
      taskKeys.activity(orgId, variables.taskId),
    ],
  });

  return useMutation({
    mutationFn: async (input: UpdateTaskVariables) => {
      const { taskId, status, assignee_id, severity, ...rest } = input;
      let task: Task | undefined;
      const body: Record<string, unknown> = { ...rest };
      if (assignee_id !== undefined) {
        if (assignee_id === null) {
          body.clear_assignee = true;
        } else {
          body.assignee_id = assignee_id;
        }
      }
      if (severity !== undefined) {
        if (severity === null) {
          body.clear_severity = true;
        } else {
          body.severity = severity;
        }
      }
      if (Object.keys(body).length > 0) {
        task = await api.patch<Task>(orgPath(orgId, `/tasks/${taskId}`), body);
      }
      if (status !== undefined) {
        task = await api.post<Task>(orgPath(orgId, `/tasks/${taskId}/status`), { status });
      }
      if (!task) {
        task = await api.get<Task>(orgPath(orgId, `/tasks/${taskId}`));
      }
      return task;
    },
    onMutate: optimistic.onMutate,
    onError: optimistic.onError,
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(orgId, task.id), task);
      toast.success(`Updated ${task.identifier}`, { duration: 1500 });
    },
    onSettled: optimistic.onSettled,
  });
}

export function useConvertTask(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, kind }: { taskId: string; kind: TaskKind }) =>
      api.post<Task>(orgPath(orgId, `/tasks/${taskId}/convert`), { kind }),
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(orgId, task.id), task);
      void queryClient.invalidateQueries({ queryKey: taskKeys.byProject(orgId, projectId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(orgId, task.id) });
      toast.success(`Converted ${task.identifier} to ${task.kind}`, { duration: 1500 });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDuplicateTask(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      api.post<Task>(orgPath(orgId, `/tasks/${taskId}/duplicate`)),
    onSuccess: (task) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.byProject(orgId, projectId) });
      toast.success(`Duplicated as ${task.identifier}`, { duration: 1500 });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteTask(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.delete<null>(orgPath(orgId, `/tasks/${taskId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.byProject(orgId, projectId) });
    },
  });
}

export function useTaskComments(orgId: string, taskId: string, enabled = true) {
  return useQuery({
    queryKey: taskKeys.comments(orgId, taskId),
    queryFn: async ({ signal }) => {
      const page = await api.get<Page<Comment>>(
        orgPath(orgId, `/comments?entity_type=task&entity_id=${taskId}`),
        signal
      );
      return page.items;
    },
    enabled,
  });
}

export function useCommentVersions(orgId: string, commentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["orgs", orgId, "comments", commentId, "versions"] as const,
    queryFn: ({ signal }) =>
      api.get<CommentVersion[]>(orgPath(orgId, `/comments/${commentId}/versions`), signal),
    enabled,
  });
}

export interface AddCommentVariables {
  content: string;
  parentId?: string | null;
  attachmentIds?: string[];
}

export function useAddTaskComment(orgId: string, taskId: string) {
  const queryClient = useQueryClient();
  const commentsKey = taskKeys.comments(orgId, taskId);
  return useMutation({
    mutationFn: (variables: AddCommentVariables) =>
      api.post<Comment>(orgPath(orgId, "/comments"), {
        entity_type: "task",
        entity_id: taskId,
        content: variables.content,
        parent_id: variables.parentId ?? null,
        attachment_ids: variables.attachmentIds ?? [],
      }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: commentsKey });
      const previous = queryClient.getQueryData<Comment[]>(commentsKey);
      const now = new Date().toISOString();
      const me = queryClient.getQueryData<User>(authKeys.me());
      const draft: Comment = markOptimistic({
        id: tempId(),
        org_id: orgId,
        entity_type: "task",
        entity_id: taskId,
        author_id: me?.id ?? "",
        content: variables.content,
        parent_id: variables.parentId ?? null,
        anchor: null,
        resolved_at: null,
        edited_at: null,
        reactions: [],
        attachments: [],
        created_at: now,
        updated_at: now,
      });
      queryClient.setQueryData<Comment[]>(commentsKey, [...(previous ?? []), draft]);
      return { previous };
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(commentsKey, context?.previous);
      toast.error(errorMessage(error));
    },
    onSuccess: () => {
      toast.success("Comment added");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: commentsKey });
      void queryClient.invalidateQueries({ queryKey: taskKeys.activity(orgId, taskId) });
    },
  });
}

export function useReactToComment(orgId: string, taskId: string) {
  const queryClient = useQueryClient();
  const commentsKey = taskKeys.comments(orgId, taskId);
  return useMutation({
    mutationFn: (variables: { commentId: string; emoji: string }) =>
      api.post<CommentReaction[]>(
        orgPath(orgId, `/comments/${variables.commentId}/reactions`),
        { emoji: variables.emoji }
      ),
    onSuccess: (reactions, variables) => {
      queryClient.setQueryData<Comment[]>(commentsKey, (current) =>
        current?.map((item) =>
          item.id === variables.commentId ? { ...item, reactions } : item
        )
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: commentsKey });
    },
  });
}

export function useResolveComment(orgId: string, taskId: string) {
  const queryClient = useQueryClient();
  const commentsKey = taskKeys.comments(orgId, taskId);
  return useMutation({
    mutationFn: (variables: { commentId: string; resolved: boolean }) =>
      api.post<Comment>(orgPath(orgId, `/comments/${variables.commentId}/resolve`), {
        resolved: variables.resolved,
      }),
    onSuccess: (comment) => {
      queryClient.setQueryData<Comment[]>(commentsKey, (current) =>
        current?.map((item) => (item.id === comment.id ? comment : item))
      );
      toast.success(comment.resolved_at ? "Comment resolved" : "Comment reopened", {
        duration: 1500,
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: commentsKey });
    },
  });
}

export function useTaskSubscribers(orgId: string, taskId: string, enabled = true) {
  return useQuery({
    queryKey: taskKeys.subscribers(orgId, taskId),
    queryFn: ({ signal }) =>
      api.get<string[]>(orgPath(orgId, `/tasks/${taskId}/subscribers`), signal),
    enabled,
  });
}

export function useTaskNoteLinks(orgId: string, taskId: string, enabled = true) {
  return useQuery({
    queryKey: taskKeys.noteLinks(orgId, taskId),
    queryFn: ({ signal }) =>
      api.get<NoteLink[]>(orgPath(orgId, `/tasks/${taskId}/notes`), signal),
    enabled,
  });
}

export function useLinkNote(orgId: string, taskId: string) {
  const queryClient = useQueryClient();
  const key = taskKeys.noteLinks(orgId, taskId);
  return useMutation({
    mutationFn: (noteId: string) =>
      api.post(orgPath(orgId, `/tasks/${taskId}/notes/${noteId}`)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUnlinkNote(orgId: string, taskId: string) {
  const queryClient = useQueryClient();
  const key = taskKeys.noteLinks(orgId, taskId);
  return useMutation({
    mutationFn: (noteId: string) =>
      api.delete(orgPath(orgId, `/tasks/${taskId}/notes/${noteId}`)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useArchiveTask(orgId: string, projectId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (archived: boolean) =>
      api.post<Task>(orgPath(orgId, `/tasks/${taskId}/archive`), { archived }),
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(orgId, taskId), task);
      void queryClient.invalidateQueries({ queryKey: taskKeys.byProject(orgId, projectId) });
      toast.success(task.archived_at ? "Task archived" : "Task restored");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useTaskLinks(orgId: string, taskId: string, enabled = true) {
  return useQuery({
    queryKey: taskKeys.links(orgId, taskId),
    queryFn: ({ signal }) =>
      api.get<TaskLink[]>(orgPath(orgId, `/tasks/${taskId}/links`), signal),
    enabled,
  });
}

export function useAddTaskLink(orgId: string, taskId: string) {
  const queryClient = useQueryClient();
  const linksKey = taskKeys.links(orgId, taskId);
  return useMutation({
    mutationFn: (variables: { url: string; title?: string | null }) =>
      api.post<TaskLink>(orgPath(orgId, `/tasks/${taskId}/links`), {
        url: variables.url,
        title: variables.title ?? null,
      }),
    onSuccess: (link) => {
      queryClient.setQueryData<TaskLink[]>(linksKey, (current) => [link, ...(current ?? [])]);
    },
    onError: (error) => toast.error(errorMessage(error)),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: linksKey });
    },
  });
}

export function useDeleteTaskLink(orgId: string, taskId: string) {
  const queryClient = useQueryClient();
  const linksKey = taskKeys.links(orgId, taskId);
  return useMutation({
    mutationFn: (linkId: string) =>
      api.delete(orgPath(orgId, `/tasks/${taskId}/links/${linkId}`)),
    onSuccess: (_data, linkId) => {
      queryClient.setQueryData<TaskLink[]>(linksKey, (current) =>
        current?.filter((link) => link.id !== linkId)
      );
    },
    onError: (error) => toast.error(errorMessage(error)),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: linksKey });
    },
  });
}

export function useTaskActivity(orgId: string, taskId: string, enabled = true) {
  return useQuery({
    queryKey: taskKeys.activity(orgId, taskId),
    queryFn: async ({ signal }) => {
      const page = await api.get<Page<ActivityEvent>>(
        orgPath(orgId, `/activity/task/${taskId}`),
        signal
      );
      return page.items;
    },
    enabled,
  });
}

export function useSubtasks(orgId: string, taskId: string, enabled = true) {
  return useQuery({
    queryKey: taskKeys.subtasks(orgId, taskId),
    queryFn: ({ signal }) =>
      api.get<Task[]>(orgPath(orgId, `/tasks/${taskId}/subtasks`), signal),
    enabled,
  });
}

export function useTaskRelations(orgId: string, taskId: string, enabled = true) {
  return useQuery({
    queryKey: taskKeys.relations(orgId, taskId),
    queryFn: ({ signal }) =>
      api.get<RelatedTask[]>(orgPath(orgId, `/tasks/${taskId}/relations`), signal),
    enabled,
  });
}

export function useCreateRelation(orgId: string, projectId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      target_task_id: string;
      type?: TaskRelationKind;
      custom_type_id?: string;
    }) => api.post<null>(orgPath(orgId, `/tasks/${taskId}/relations`), input),
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: () => toast.success("Relation added"),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.relations(orgId, taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.byProject(orgId, projectId) });
    },
  });
}

export function useDeleteRelation(orgId: string, projectId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (relationId: string) =>
      api.delete<null>(orgPath(orgId, `/tasks/${taskId}/relations/${relationId}`)),
    onError: (error) => toast.error(errorMessage(error)),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.relations(orgId, taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.byProject(orgId, projectId) });
    },
  });
}

export function useSetTaskSubscription(orgId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subscribed: boolean) =>
      api.post<null>(
        orgPath(orgId, `/tasks/${taskId}/${subscribed ? "subscribe" : "unsubscribe"}`),
        {}
      ),
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: (_data, subscribed) =>
      toast.success(subscribed ? "Subscribed" : "Unsubscribed", { duration: 1500 }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(orgId, taskId) });
    },
  });
}

export interface TaskDescriptionVersion {
  id: string;
  task_id: string;
  description: string | null;
  edited_by: string | null;
  created_at: string;
}

export function useTaskDescriptionVersions(orgId: string, taskId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...taskKeys.detail(orgId, taskId), "description-versions"] as const,
    enabled,
    queryFn: ({ signal }) =>
      api.get<TaskDescriptionVersion[]>(
        orgPath(orgId, `/tasks/${taskId}/description/versions`),
        signal
      ),
  });
}

export function useRestoreTaskDescription(orgId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) =>
      api.post<Task>(
        orgPath(orgId, `/tasks/${taskId}/description/versions/${versionId}/restore`),
        {}
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all(orgId) });
      toast.success("Description restored");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export async function downloadProjectTasksCsv(orgId: string, projectId: string): Promise<void> {
  const response = await fetch(orgPath(orgId, `/projects/${projectId}/tasks/export.csv`), {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Export failed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "tasks.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export interface TaskTransition {
  from_status: string | null;
  to_status: string | null;
  at: string;
  actor_id: string | null;
  seconds_in_prev: number;
}

export interface TaskTransitions {
  current_status: string;
  seconds_in_current: number;
  transitions: TaskTransition[];
}

export function useTaskTransitions(orgId: string, taskId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...taskKeys.detail(orgId, taskId), "transitions"] as const,
    enabled,
    queryFn: ({ signal }) =>
      api.get<TaskTransitions>(orgPath(orgId, `/tasks/${taskId}/transitions`), signal),
  });
}

export type ScheduleDependencyType =
  | "finish_to_start"
  | "start_to_start"
  | "finish_to_finish"
  | "start_to_finish";

export interface ScheduleLink {
  link_id: string;
  task_id: string;
  identifier: string;
  title: string;
  status: TaskStatus;
  due_date: string | null;
  dependency_type: ScheduleDependencyType;
  direction: "predecessor" | "successor";
}

export function useScheduleLinks(orgId: string, taskId: string, enabled = true) {
  return useQuery({
    queryKey: [...taskKeys.detail(orgId, taskId), "schedule-links"] as const,
    enabled,
    queryFn: ({ signal }) =>
      api.get<ScheduleLink[]>(orgPath(orgId, `/tasks/${taskId}/schedule-links`), signal),
  });
}

export function useCreateScheduleLink(orgId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      other_task_id: string;
      dependency_type: ScheduleDependencyType;
      other_is_predecessor: boolean;
    }) => api.post<null>(orgPath(orgId, `/tasks/${taskId}/schedule-links`), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...taskKeys.detail(orgId, taskId), "schedule-links"],
      });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteScheduleLink(orgId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) =>
      api.delete<null>(orgPath(orgId, `/tasks/${taskId}/schedule-links/${linkId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...taskKeys.detail(orgId, taskId), "schedule-links"],
      });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export interface ShiftedTask {
  id: string;
  identifier: string | null;
  title: string;
  start_date: string | null;
  due_date: string | null;
}

export function useAutoShift(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      api.post<{ shifted: ShiftedTask[] }>(orgPath(orgId, `/tasks/${taskId}/auto-shift`)),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all(orgId) });
      void queryClient.invalidateQueries({
        queryKey: ["orgs", orgId, "projects", projectId, "timeline"],
      });
      const n = result.shifted.length;
      toast.success(n === 0 ? "Dependents already fit" : `Shifted ${n} dependent ${n === 1 ? "item" : "items"}`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
