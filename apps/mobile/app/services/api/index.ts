/**
 * Typed client for the Elliptic API. Unwraps the standard {success,message,data}
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
  Task,
  TaskLabel,
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

  /**
   * Read every page of a paginated collection.
   *
   * The API defaults to 50 rows and caps a page at 200. Asking without params
   * therefore returns the first 50 quietly — a list that looks complete and is
   * not, which is worse than an error. Pages until `total` is satisfied.
   */
  private async fetchAllPages<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
    const PAGE = 200
    const items: T[] = []
    for (let offset = 0; ; offset += PAGE) {
      const res = await this.apisauce.get<Envelope<{ items: T[]; total: number }>>(path, {
        ...params,
        limit: String(PAGE),
        offset: String(offset),
      })
      if (!res.ok || !res.data) break
      const page = res.data.data
      items.push(...page.items)
      // A short page means the end, whatever `total` claims.
      if (page.items.length < PAGE || items.length >= page.total) break
    }
    return items
  }

  async listTasks(
    orgId: string,
    scope: "all" | "assigned" | "created" | "subscribed" | "recent" = "assigned",
  ): Promise<Task[]> {
    return this.fetchAllPages<Task>(`/orgs/${orgId}/tasks/${scope}`)
  }

  async getTask(orgId: string, taskId: string): Promise<Task | null> {
    const res = await this.apisauce.get<Envelope<Task>>(`/orgs/${orgId}/tasks/${taskId}`)
    return res.ok && res.data ? res.data.data : null
  }

  async listComments(orgId: string, entityType: string, entityId: string): Promise<Comment[]> {
    return this.fetchAllPages<Comment>(`/orgs/${orgId}/comments`, {
      entity_type: entityType,
      entity_id: entityId,
    })
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
    return this.fetchAllPages<Note>(`/orgs/${orgId}/notes`)
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
      /** Create with nobody assigned, skipping the creator/project-default fallbacks. */
      unassigned?: boolean
      priority?: string
      due_date?: string | null
      parent_task_id?: string
      label_ids?: string[]
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
      label_ids?: string[]
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

  // ---- Social sign-in (COS-209) ----
  /** Which social providers this instance offers on the sign-in screen. */
  async authProviders(): Promise<{ google: boolean; github: boolean }> {
    const res =
      await this.apisauce.get<Envelope<{ google: boolean; github: boolean }>>("/auth/providers")
    if (!res.ok || !res.data) return { google: false, github: false }
    const d = res.data.data
    return { google: !!d.google, github: !!d.github }
  }

  /** Authorization URL for a native sign-in, bound to this device's challenge. */
  async oauthAuthorizationUrl(provider: string, challenge: string): Promise<string | null> {
    const res = await this.apisauce.get<Envelope<{ authorization_url: string }>>(
      `/auth/oauth/${provider}/native/start`,
      { challenge },
    )
    return res.ok && res.data ? res.data.data.authorization_url : null
  }

  /** Trade the callback's handoff code for real tokens. */
  async exchangeOAuthCode(
    code: string,
    verifier: string,
  ): Promise<{ user: User; tokens: AuthTokens } | { error: string }> {
    const res = await this.apisauce.post<Envelope<{ user: User; tokens: AuthTokens }>>(
      "/auth/oauth/native/exchange",
      { code, verifier },
    )
    if (!res.ok || !res.data?.data?.tokens) {
      return { error: res.data?.message ?? "Could not finish signing in." }
    }
    return res.data.data
  }

  async listLabels(orgId: string): Promise<TaskLabel[]> {
    const res = await this.apisauce.get<Envelope<TaskLabel[]>>(`/orgs/${orgId}/labels`)
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
    return this.fetchAllPages<Task>(`/orgs/${orgId}/projects/${projectId}/tasks`)
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

  async archiveNotification(orgId: string, notificationId: string): Promise<boolean> {
    return this.writeOrQueue("post", `/orgs/${orgId}/notifications/${notificationId}/archive`, {})
  }

  async snoozeNotification(orgId: string, notificationId: string, until: string): Promise<boolean> {
    return this.writeOrQueue("post", `/orgs/${orgId}/notifications/${notificationId}/snooze`, {
      until,
    })
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
  async createNote(
    orgId: string,
    title: string,
    options: { parentId?: string | null; isFolder?: boolean } = {},
  ): Promise<Note | null> {
    const res = await this.apisauce.post<Envelope<Note>>(`/orgs/${orgId}/notes`, {
      title,
      parent_id: options.parentId ?? null,
      is_folder: options.isFolder ?? false,
    })
    return res.ok && res.data ? res.data.data : null
  }

  /** Move a note into a folder, or to the root when `parentId` is null. */
  async moveNote(orgId: string, noteId: string, parentId: string | null): Promise<boolean> {
    const res = await this.apisauce.patch(`/orgs/${orgId}/notes/${noteId}`, {
      parent_id: parentId,
    })
    return res.ok
  }

  async updateNoteTitle(orgId: string, noteId: string, title: string): Promise<boolean> {
    const res = await this.apisauce.patch(`/orgs/${orgId}/notes/${noteId}`, { title })
    return res.ok
  }

  async deleteNote(orgId: string, noteId: string): Promise<boolean> {
    const res = await this.apisauce.delete(`/orgs/${orgId}/notes/${noteId}`)
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
