/**
 * Typed client for the CompanyOS API. Unwraps the standard {success,message,data}
 * envelope and carries a Bearer token for authenticated requests.
 */
import { ApisauceInstance, create } from "apisauce"

import Config from "@/config"
import { enqueue, NETWORK_PROBLEMS, type QueuedMethod } from "@/services/offlineQueue"

import type {
  ApiConfig,
  AuthTokens,
  ChatMessage,
  Comment,
  Member,
  Note,
  NotificationItem,
  NotificationPrefs,
  Org,
  Project,
  SearchResult,
  Sticky,
  Task,
  User,
} from "./types"

export const DEFAULT_API_CONFIG: ApiConfig = {
  url: Config.API_URL,
  timeout: 15000,
}

interface Envelope<T> {
  success: boolean
  message?: string
  data: T
}

interface AuthHandlers {
  getRefreshToken: () => string | undefined
  onRefreshed: (tokens: AuthTokens) => void
  onAuthFailure: () => void
}

type RetryableConfig = {
  _retry?: boolean
  url?: string
  headers?: Record<string, string>
}

export class Api {
  apisauce: ApisauceInstance
  config: ApiConfig
  private authHandlers?: AuthHandlers
  private refreshing: Promise<string | null> | null = null

  constructor(config: ApiConfig = DEFAULT_API_CONFIG) {
    this.config = config
    this.apisauce = create({
      baseURL: this.config.url,
      timeout: this.config.timeout,
      headers: { Accept: "application/json" },
    })

    // Transparently refresh the access token on a 401, then retry the request once.
    this.apisauce.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const original = error?.config as RetryableConfig | undefined
        const status = error?.response?.status
        const url = original?.url ?? ""
        if (status === 401 && original && !original._retry && !url.includes("/auth/")) {
          original._retry = true
          const token = await this.refreshAccessToken()
          if (token) {
            original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${token}` }
            return this.apisauce.axiosInstance(original)
          }
        }
        return Promise.reject(error)
      },
    )
  }

  setToken(token?: string): void {
    if (token) this.apisauce.setHeader("Authorization", `Bearer ${token}`)
    else this.apisauce.deleteHeader("Authorization")
  }

  /** Run a write; if the device is offline, durably queue it and report success. */
  private async writeOrQueue(method: QueuedMethod, path: string, body?: unknown): Promise<boolean> {
    const res = await this.apisauce[method](path, body)
    if (res.ok) return true
    if (res.problem && NETWORK_PROBLEMS.includes(res.problem)) {
      enqueue({ method, path, body })
      return true
    }
    return false
  }

  /** Wired by AuthContext so the client can self-refresh and sign out on failure. */
  setAuthHandlers(handlers: AuthHandlers): void {
    this.authHandlers = handlers
  }

  /** Single-flight refresh: concurrent 401s share one /auth/refresh call. */
  private async refreshAccessToken(): Promise<string | null> {
    if (!this.authHandlers) return null
    if (!this.refreshing) {
      this.refreshing = (async () => {
        const refreshToken = this.authHandlers!.getRefreshToken()
        if (!refreshToken) {
          this.authHandlers!.onAuthFailure()
          return null
        }
        try {
          const res = await this.apisauce.axiosInstance.post<Envelope<AuthTokens>>(
            "/auth/refresh",
            { refresh_token: refreshToken },
            { headers: { Authorization: "" } },
          )
          const tokens = res.data?.data
          if (tokens?.access_token) {
            this.setToken(tokens.access_token)
            this.authHandlers!.onRefreshed(tokens)
            return tokens.access_token
          }
        } catch {
          // fall through to auth failure
        }
        this.authHandlers!.onAuthFailure()
        return null
      })()
    }
    const result = await this.refreshing
    this.refreshing = null
    return result
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ user: User; tokens: AuthTokens } | { error: string }> {
    const res = await this.apisauce.post<Envelope<{ user: User; tokens: AuthTokens }>>(
      "/auth/login",
      { email, password },
    )
    if (!res.ok || !res.data?.data?.tokens) {
      return { error: res.data?.message ?? "Could not sign in. Check your details and try again." }
    }
    return res.data.data
  }

  async register(
    email: string,
    password: string,
    fullName: string,
  ): Promise<{ ok: true } | { error: string }> {
    const res = await this.apisauce.post<Envelope<User>>("/auth/register", {
      email,
      password,
      full_name: fullName,
    })
    if (!res.ok) return { error: res.data?.message ?? "Could not create your account." }
    return { ok: true }
  }

  async me(): Promise<User | null> {
    const res = await this.apisauce.get<Envelope<User>>("/users/me")
    return res.ok && res.data ? res.data.data : null
  }

  async updateProfile(fullName: string): Promise<User | null> {
    const res = await this.apisauce.patch<Envelope<User>>("/users/me", { full_name: fullName })
    return res.ok && res.data ? res.data.data : null
  }

  /** Workspace-default email notification preferences (project_id null). */
  async getNotificationPrefs(orgId: string): Promise<NotificationPrefs | null> {
    const res = await this.apisauce.get<Envelope<NotificationPrefs[]>>(
      `/orgs/${orgId}/notifications/preferences`,
    )
    if (!res.ok || !res.data) return null
    const list = res.data.data
    return list.find((p) => p.project_id == null) ?? list[0] ?? null
  }

  async updateNotificationPrefs(
    orgId: string,
    prefs: Omit<NotificationPrefs, "project_id">,
  ): Promise<boolean> {
    const res = await this.apisauce.put(`/orgs/${orgId}/notifications/preferences`, {
      ...prefs,
      project_id: null,
    })
    return res.ok
  }

  async listTasks(
    orgId: string,
    scope: "assigned" | "created" | "subscribed" | "recent" = "assigned",
  ): Promise<Task[]> {
    const res = await this.apisauce.get<Envelope<{ items: Task[]; total: number }>>(
      `/orgs/${orgId}/tasks/${scope}`,
    )
    return res.ok && res.data ? res.data.data.items : []
  }

  async getTask(orgId: string, taskId: string): Promise<Task | null> {
    const res = await this.apisauce.get<Envelope<Task>>(`/orgs/${orgId}/tasks/${taskId}`)
    return res.ok && res.data ? res.data.data : null
  }

  async listComments(orgId: string, entityType: string, entityId: string): Promise<Comment[]> {
    const res = await this.apisauce.get<Envelope<{ items: Comment[]; total: number }>>(
      `/orgs/${orgId}/comments`,
      { entity_type: entityType, entity_id: entityId },
    )
    return res.ok && res.data ? res.data.data.items : []
  }

  async resolveComment(orgId: string, commentId: string, resolved: boolean): Promise<boolean> {
    const res = await this.apisauce.post<Envelope<Comment>>(
      `/orgs/${orgId}/comments/${commentId}/resolve`,
      { resolved },
    )
    return res.ok
  }

  async listTriage(orgId: string): Promise<Task[]> {
    const res = await this.apisauce.get<Envelope<Task[] | { items: Task[] }>>(
      `/orgs/${orgId}/triage`,
    )
    if (!res.ok || !res.data) return []
    const data = res.data.data
    return Array.isArray(data) ? data : (data?.items ?? [])
  }

  async acceptTriage(orgId: string, taskId: string): Promise<boolean> {
    const res = await this.apisauce.post(`/orgs/${orgId}/tasks/${taskId}/triage/accept`, {})
    return res.ok
  }

  async declineTriage(
    orgId: string,
    taskId: string,
    reason = "Declined on mobile",
  ): Promise<boolean> {
    const res = await this.apisauce.post(`/orgs/${orgId}/tasks/${taskId}/triage/decline`, {
      reason,
    })
    return res.ok
  }

  async listNotes(orgId: string): Promise<Note[]> {
    const res = await this.apisauce.get<Envelope<{ items: Note[]; total: number }>>(
      `/orgs/${orgId}/notes`,
    )
    return res.ok && res.data ? res.data.data.items : []
  }

  async updateNote(orgId: string, noteId: string, content: string): Promise<boolean> {
    const res = await this.apisauce.patch(`/orgs/${orgId}/notes/${noteId}`, { content })
    return res.ok
  }

  async getNote(orgId: string, noteId: string): Promise<Note | null> {
    const res = await this.apisauce.get<Envelope<Note>>(`/orgs/${orgId}/notes/${noteId}`)
    return res.ok && res.data ? res.data.data : null
  }

  async registerDevice(orgId: string, platform: string, token: string): Promise<boolean> {
    const res = await this.apisauce.post(`/orgs/${orgId}/notifications/devices`, {
      platform,
      token,
    })
    return res.ok
  }

  async presignUpload(
    orgId: string,
    opts: { filename: string; content_type: string; size_bytes: number; entity_type?: string },
  ): Promise<{ object_id: string; upload_url: string } | null> {
    const res = await this.apisauce.post<Envelope<{ object_id: string; upload_url: string }>>(
      `/orgs/${orgId}/storage/presign-upload`,
      {
        entity_type: opts.entity_type ?? "ai_chat",
        filename: opts.filename,
        content_type: opts.content_type,
        size_bytes: opts.size_bytes,
      },
    )
    return res.ok && res.data ? res.data.data : null
  }

  async confirmUpload(orgId: string, objectId: string): Promise<boolean> {
    const res = await this.apisauce.post(`/orgs/${orgId}/storage/objects/${objectId}/confirm`, {})
    return res.ok
  }

  async createConversation(orgId: string, mode: "ask" | "build" = "ask"): Promise<string | null> {
    const res = await this.apisauce.post<Envelope<{ id: string }>>(
      `/orgs/${orgId}/ai/conversations`,
      { mode },
    )
    return res.ok && res.data ? res.data.data.id : null
  }

  async listChatMessages(orgId: string, conversationId: string): Promise<ChatMessage[]> {
    const res = await this.apisauce.get<Envelope<ChatMessage[]>>(
      `/orgs/${orgId}/ai/conversations/${conversationId}/messages`,
    )
    return res.ok && res.data ? res.data.data : []
  }

  async sendChatMessage(
    orgId: string,
    conversationId: string,
    content: string,
    objectIds: string[] = [],
  ): Promise<boolean> {
    const res = await this.apisauce.post(
      `/orgs/${orgId}/ai/conversations/${conversationId}/messages`,
      { content, object_ids: objectIds },
    )
    return res.ok
  }

  // ---- Tasks (write) ----
  async createTask(
    orgId: string,
    projectId: string,
    input: {
      title: string
      description?: string
      status?: string
      assignee_id?: string | null
      priority?: string
      due_date?: string | null
      parent_task_id?: string
    },
  ): Promise<Task | null> {
    const path = `/orgs/${orgId}/projects/${projectId}/tasks`
    const res = await this.apisauce.post<Envelope<Task>>(path, input)
    if (res.ok && res.data) return res.data.data
    if (res.problem && NETWORK_PROBLEMS.includes(res.problem)) {
      enqueue({ method: "post", path, body: input })
      // Optimistic local row so the task appears immediately; it's really created on reconnect.
      return {
        id: `pending-${Date.now()}`,
        number: 0,
        identifier: "•••",
        title: input.title,
        status: "todo",
        priority: input.priority ?? "none",
        assignee_id: input.assignee_id ?? null,
        project_id: projectId,
        parent_task_id: input.parent_task_id ?? null,
      } as Task
    }
    return null
  }

  async updateTask(
    orgId: string,
    taskId: string,
    patch: {
      title?: string
      description?: string | null
      assignee_id?: string | null
      priority?: string
      due_date?: string | null
      status?: string
    },
  ): Promise<Task | null> {
    const path = `/orgs/${orgId}/tasks/${taskId}`
    const res = await this.apisauce.patch<Envelope<Task>>(path, patch)
    if (res.ok && res.data) return res.data.data
    if (res.problem && NETWORK_PROBLEMS.includes(res.problem)) {
      enqueue({ method: "patch", path, body: patch })
      return { id: taskId, ...patch } as Task // optimistic; real patch syncs on reconnect
    }
    return null
  }

  async transitionTaskStatus(orgId: string, taskId: string, status: string): Promise<Task | null> {
    const path = `/orgs/${orgId}/tasks/${taskId}/status`
    const res = await this.apisauce.post<Envelope<Task>>(path, { status })
    if (res.ok && res.data) return res.data.data
    if (res.problem && NETWORK_PROBLEMS.includes(res.problem)) {
      enqueue({ method: "post", path, body: { status } })
      return { id: taskId, status } as Task // optimistic; real transition syncs on reconnect
    }
    return null
  }

  async listSubtasks(orgId: string, taskId: string): Promise<Task[]> {
    const res = await this.apisauce.get<Envelope<Task[]>>(`/orgs/${orgId}/tasks/${taskId}/subtasks`)
    return res.ok && res.data ? res.data.data : []
  }

  async listMembers(orgId: string): Promise<Member[]> {
    const res = await this.apisauce.get<Envelope<Member[] | { items: Member[] }>>(
      `/orgs/${orgId}/members`,
    )
    if (!res.ok || !res.data) return []
    const d = res.data.data
    return Array.isArray(d) ? d : (d?.items ?? [])
  }

  async listProjects(orgId: string): Promise<Project[]> {
    const res = await this.apisauce.get<Envelope<Project[] | { items: Project[] }>>(
      `/orgs/${orgId}/projects`,
    )
    if (!res.ok || !res.data) return []
    const d = res.data.data
    return Array.isArray(d) ? d : (d?.items ?? [])
  }

  async listProjectTasks(orgId: string, projectId: string): Promise<Task[]> {
    const res = await this.apisauce.get<Envelope<{ items: Task[]; total: number }>>(
      `/orgs/${orgId}/projects/${projectId}/tasks`,
    )
    return res.ok && res.data ? res.data.data.items : []
  }

  async createComment(
    orgId: string,
    entityType: string,
    entityId: string,
    content: string,
    mentionUserIds: string[] = [],
    attachmentIds: string[] = [],
  ): Promise<boolean> {
    return this.writeOrQueue("post", `/orgs/${orgId}/comments`, {
      entity_type: entityType,
      entity_id: entityId,
      content,
      mention_user_ids: mentionUserIds,
      attachment_ids: attachmentIds,
    })
  }

  // ---- Notifications ----
  async listNotifications(orgId: string, unreadOnly = false): Promise<NotificationItem[]> {
    const res = await this.apisauce.get<
      Envelope<{ items: NotificationItem[]; unread_count: number }>
    >(`/orgs/${orgId}/notifications`, unreadOnly ? { unread: true } : undefined)
    return res.ok && res.data ? res.data.data.items : []
  }

  async unreadCount(orgId: string): Promise<number> {
    const res = await this.apisauce.get<Envelope<{ count: number }>>(
      `/orgs/${orgId}/notifications/unread-count`,
    )
    return res.ok && res.data ? res.data.data.count : 0
  }

  async markNotificationRead(orgId: string, notificationId: string): Promise<boolean> {
    return this.writeOrQueue("post", `/orgs/${orgId}/notifications/${notificationId}/read`, {})
  }

  async markAllNotificationsRead(orgId: string): Promise<boolean> {
    const res = await this.apisauce.post(`/orgs/${orgId}/notifications/read-all`, {})
    return res.ok
  }

  // ---- Search ----
  async search(orgId: string, q: string, types?: string): Promise<SearchResult[]> {
    const res = await this.apisauce.get<Envelope<{ results: SearchResult[] }>>(
      `/orgs/${orgId}/search`,
      { q, limit: 20, ...(types ? { types } : {}) },
    )
    return res.ok && res.data ? res.data.data.results : []
  }

  // ---- Triage ----
  async triageCount(orgId: string): Promise<number> {
    const res = await this.apisauce.get<Envelope<{ total: number }>>(`/orgs/${orgId}/triage/count`)
    return res.ok && res.data ? res.data.data.total : 0
  }

  async snoozeTriage(orgId: string, taskId: string, snoozedTill: string): Promise<boolean> {
    const res = await this.apisauce.post(`/orgs/${orgId}/tasks/${taskId}/triage/snooze`, {
      snoozed_till: snoozedTill,
    })
    return res.ok
  }

  // ---- Notes (create/delete/title) ----
  async createNote(orgId: string, title: string): Promise<Note | null> {
    const res = await this.apisauce.post<Envelope<Note>>(`/orgs/${orgId}/notes`, { title })
    return res.ok && res.data ? res.data.data : null
  }

  async updateNoteTitle(orgId: string, noteId: string, title: string): Promise<boolean> {
    const res = await this.apisauce.patch(`/orgs/${orgId}/notes/${noteId}`, { title })
    return res.ok
  }

  async deleteNote(orgId: string, noteId: string): Promise<boolean> {
    const res = await this.apisauce.delete(`/orgs/${orgId}/notes/${noteId}`)
    return res.ok
  }

  // ---- Stickies ----
  async listStickies(orgId: string): Promise<Sticky[]> {
    const res = await this.apisauce.get<Envelope<Sticky[] | { items: Sticky[] }>>(
      `/orgs/${orgId}/stickies`,
    )
    if (!res.ok || !res.data) return []
    const d = res.data.data
    return Array.isArray(d) ? d : (d?.items ?? [])
  }

  async createSticky(orgId: string, content: string): Promise<Sticky | null> {
    const res = await this.apisauce.post<Envelope<Sticky>>(`/orgs/${orgId}/stickies`, { content })
    return res.ok && res.data ? res.data.data : null
  }

  async updateSticky(orgId: string, stickyId: string, content: string): Promise<boolean> {
    const res = await this.apisauce.patch(`/orgs/${orgId}/stickies/${stickyId}`, { content })
    return res.ok
  }

  async deleteSticky(orgId: string, stickyId: string): Promise<boolean> {
    const res = await this.apisauce.delete(`/orgs/${orgId}/stickies/${stickyId}`)
    return res.ok
  }

  async convertSticky(orgId: string, stickyId: string): Promise<boolean> {
    const res = await this.apisauce.post(`/orgs/${orgId}/stickies/${stickyId}/convert`, {
      kind: "task",
    })
    return res.ok
  }

  // ---- AI conversations (list, for history) ----
  async listConversations(orgId: string): Promise<{ id: string; title?: string }[]> {
    const res = await this.apisauce.get<
      Envelope<{ id: string; title?: string }[] | { items: { id: string; title?: string }[] }>
    >(`/orgs/${orgId}/ai/conversations`)
    if (!res.ok || !res.data) return []
    const d = res.data.data
    return Array.isArray(d) ? d : (d?.items ?? [])
  }

  async listOrgs(): Promise<Org[]> {
    const res = await this.apisauce.get<Envelope<Org[] | { items: Org[] }>>("/orgs")
    if (!res.ok || !res.data) return []
    const data = res.data.data
    return Array.isArray(data) ? data : (data?.items ?? [])
  }
}

export const api = new Api()
