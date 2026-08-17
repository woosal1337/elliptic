/** Shapes returned by the Elliptic API. */
export interface ApiConfig {
  url: string
  timeout: number
}

export interface User {
  id: string
  email: string
  full_name: string
}

export interface Org {
  id: string
  name: string
  slug?: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
}

export interface TaskLabel {
  id: string
  name: string
  color: string
}

export interface Task {
  id: string
  number: number
  identifier: string
  title: string
  status: string
  priority: string
  assignee_id: string | null
  description?: string | null
  due_date?: string | null
  project_id?: string | null
  parent_task_id?: string | null
  labels?: TaskLabel[]
  subtask_total?: number
  subtask_done?: number
}

export interface Member {
  user_id: string
  email: string
  full_name: string
  role: string
}

export interface Project {
  id: string
  name: string
  key: string
}

export interface NotificationItem {
  id: string
  type: string
  entity_type: string
  entity_id: string | null
  actor_name: string | null
  title: string
  snippet: string | null
  read_at: string | null
  created_at: string
}

export interface SearchResult {
  type: string
  id: string
  title: string
  snippet: string | null
  project_id: string | null
}

export interface Note {
  id: string
  title: string
  content: string
  icon: string | null
  parent_id: string | null
  is_folder: boolean
}

export interface StoredObject {
  id: string
  filename: string
  download_url: string
  content_type?: string
}

/** A document in the organisation's Drive. */
export interface DriveFile {
  id: string
  name: string
  folder_path: string
  description: string | null
  filename: string
  content_type: string
  kind: "image" | "file"
  size_bytes: number | null
  created_at: string
}

export interface DriveFolder {
  path: string
  name: string
  file_count: number
}

export interface Comment {
  id: string
  content: string
  author_id: string
  resolved_at: string | null
  created_at: string
  attachments?: StoredObject[]
}

export interface ChatMessage {
  id: string
  role: string
  content: string
}

export interface NotificationPrefs {
  notify_property_change: boolean
  notify_state_change: boolean
  notify_completed: boolean
  notify_comments: boolean
  notify_mentions: boolean
  project_id: string | null
}
