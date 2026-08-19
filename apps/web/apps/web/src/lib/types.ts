export type OrgRole = "owner" | "admin" | "member" | "guest";

export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done" | "cancelled" | "duplicate";

export type ApprovalState = "pending" | "approved" | "rejected";

export interface TaskApproval {
  id: string;
  task_id: string;
  target_status: TaskStatus;
  state: ApprovalState;
  note: string | null;
  requested_by: string | null;
  decided_by: string | null;
  created_at: string;
}

export type TaskPriority = "none" | "low" | "medium" | "high" | "urgent";

export type TaskKind = "task" | "bug" | "story" | "epic";

export type BugSeverity = "low" | "medium" | "high" | "critical";

export type TaskRelationKind =
  | "blocks"
  | "blocked_by"
  | "related"
  | "duplicate"
  | "duplicate_of"
  | "implements"
  | "implemented_by";

export type ProjectStatus = "active" | "archived";

export type MeetingSource = "folio" | "manual";

export type CommentEntityType = "task" | "meeting" | "note";

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  email_verified: boolean;
  totp_enabled?: boolean;
  locale?: string;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginResult {
  user: User | null;
  tokens: TokenPair | null;
  two_factor_required?: boolean;
}

export interface Org {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  block_backward_transitions: boolean;
  residency_region: string | null;
  compliance_frameworks: string[];
  data_controller: string | null;
  dpo_contact: string | null;
  created_at: string;
}

export interface OrgMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: OrgRole;
  created_at: string;
}

export interface Invite {
  id: string;
  email: string;
  role: OrgRole;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
  token: string | null;
  project_id?: string | null;
}

export interface Team {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  lead_id: string | null;
  charter: string | null;
  logo_props: { icon?: string; color?: string };
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  created_at: string;
}

export interface TeamStats {
  project_count: number;
  task_total: number;
  task_done: number;
  overdue: number;
}

export type ProjectNetwork = "private" | "public";

export interface Project {
  id: string;
  org_id: string;
  team_id: string | null;
  name: string;
  key: string;
  icon: string | null;
  description: string | null;
  status: ProjectStatus;
  network: ProjectNetwork;
  default_assignee_id: string | null;
  state_id: string | null;
  worklog_approval_required: boolean;
  features: Record<string, boolean>;
  estimate_scale: string[];
  labels: string[];
  auto_archive_days: number | null;
  auto_close_days: number | null;
  auto_close_status: TaskStatus | null;
  deleted_at: string | null;
  created_at: string;
}

export interface ProjectBrowseEntry {
  id: string;
  name: string;
  key: string;
  icon: string | null;
  description: string | null;
  network: ProjectNetwork;
  lead_id: string | null;
  member_count: number;
  is_member: boolean;
}

export type ProjectRole = "admin" | "member" | "commenter" | "viewer";

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  created_at: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface VocabularyTerm {
  id: string;
  term: string;
  definition: string;
  created_at: string;
  updated_at: string;
}

export interface PersonalAccessToken {
  id: string;
  name: string;
  description: string | null;
  prefix: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface PersonalAccessTokenCreated extends PersonalAccessToken {
  token: string;
}

export interface WorkItemTemplate {
  id: string;
  project_id: string;
  name: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  kind: TaskKind;
  created_at: string;
}

export type PropertyType = "text" | "number" | "date" | "select" | "checkbox" | "url";

export interface CustomProperty {
  id: string;
  org_id: string;
  project_id: string;
  name: string;
  type: PropertyType;
  options: string[];
  created_at: string;
}

export type ProjectHealth = "on_track" | "at_risk" | "off_track";

export interface Favorite {
  id: string;
  entity_type: string;
  entity_id: string;
  label: string;
  position: number;
  created_at: string;
}

export interface WorkItemUpdate {
  id: string;
  task_id: string;
  health: ProjectHealth;
  summary: string;
  created_by: string | null;
  created_at: string;
}

export interface ThroughputPoint {
  date: string;
  created: number;
  resolved: number;
}

export interface AuditEntry {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_name: string;
  actor_type: "user" | "system";
  entity_type: string;
  entity_id: string;
  event_type: string;
  project_id: string | null;
  changes: Record<string, unknown>;
}

export type RbacResourceScope = "org" | "project" | "team";

export interface RbacAuditEntry {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_name: string;
  actor_type: string;
  subject_user_id: string | null;
  subject_name: string | null;
  resource_scope: RbacResourceScope;
  resource_id: string;
  project_id: string | null;
  action: string;
  role_before: string | null;
  role_after: string | null;
  detail: Record<string, unknown> | null;
}

export type WorklogApprovalStatus = "approved" | "pending" | "rejected";

export interface Worklog {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string | null;
  minutes: number;
  note: string | null;
  logged_at: string;
  approval_status: WorklogApprovalStatus;
  approver_id: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
}

export interface WorklogList {
  entries: Worklog[];
  total_minutes: number;
}

export interface Task {
  id: string;
  org_id: string;
  project_id: string;
  number: number;
  identifier: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
  sort_order: number;
  labels: Label[];
  created_by: string;
  parent_task_id: string | null;
  source_meeting_id: string | null;
  custom_fields: Record<string, string>;
  dod_items: DodItem[];
  acceptance_criteria: string | null;
  estimate: string | null;
  kind: TaskKind;
  severity: BugSeverity | null;
  component: string | null;
  archived_at: string | null;
  subtask_total: number;
  subtask_done: number;
  blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface DodItem {
  text: string;
  done: boolean;
}

export interface RelatedTask {
  relation_id: string;
  task_id: string;
  identifier: string;
  title: string;
  status: TaskStatus;
  due_date: string | null;
  type: TaskRelationKind;
}

export interface BoardColumn {
  status: TaskStatus;
  tasks: Task[];
}

export interface TaskLink {
  id: string;
  task_id: string;
  url: string;
  title: string | null;
  created_by: string | null;
  created_at: string;
}

export interface NoteLink {
  note_id: string;
  title: string;
  project_id: string | null;
}

export interface CommentReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface Attachment {
  id: string;
  entity_type: string;
  entity_id: string | null;
  filename: string;
  content_type: string;
  kind: "image" | "file";
  size_bytes: number | null;
  is_uploaded: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  org_id: string;
  entity_type: CommentEntityType;
  entity_id: string;
  author_id: string;
  content: string;
  parent_id: string | null;
  anchor: string | null;
  resolved_at: string | null;
  edited_at: string | null;
  reactions: CommentReaction[];
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
}

export interface CommentVersion {
  id: string;
  comment_id: string;
  content: string;
  edited_by: string | null;
  created_at: string;
}

export interface ActivityEvent {
  id: string;
  org_id: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface Meeting {
  id: string;
  org_id: string;
  project_id: string | null;
  title: string;
  started_at: string;
  duration_seconds: number | null;
  source: MeetingSource;
  external_attendees: string[];
  raw_markdown: string | null;
  created_by: string;
  created_at: string;
}

export interface TranscriptSegment {
  id: string;
  meeting_id: string;
  speaker: string;
  start_seconds: number;
  end_seconds: number;
  text: string;
  position: number;
}

export interface TranscriptChapter {
  label: string;
  start_seconds: number;
  segment_id: string;
}

export interface MeetingShare {
  token: string;
  meeting_id: string;
  include_transcript: boolean;
  revoked: boolean;
  created_at: string;
}

export interface PublicMeetingShare {
  meeting_title: string;
  include_transcript: boolean;
  transcript: TranscriptSegment[];
}

export type NoteVisibility = "public" | "private" | "shared";
export type NoteShareAccess = "view" | "comment" | "edit";

export interface Note {
  id: string;
  org_id: string;
  project_id: string | null;
  team_id: string | null;
  parent_id: string | null;
  is_folder: boolean;
  title: string;
  content: string;
  icon: string | null;
  visibility: NoteVisibility;
  locked: boolean;
  archived_at: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

/** A document in the organization's Drive. */
export interface DriveFile {
  id: string;
  name: string;
  folder_path: string;
  description: string | null;
  filename: string;
  content_type: string;
  kind: "image" | "file";
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriveFolder {
  path: string;
  name: string;
  file_count: number;
}

export interface NoteShare {
  id: string;
  note_id: string;
  user_id: string;
  access: NoteShareAccess;
}

export type WebhookProvider = "slack" | "discord";

export interface Webhook {
  id: string;
  project_id: string;
  provider: WebhookProvider;
  name: string | null;
  url_hint: string;
  events: string[];
  enabled: boolean;
  last_delivery_at: string | null;
  last_delivery_status: "ok" | "failed" | null;
  last_delivery_error: string | null;
  created_at: string;
}

export interface WebhookCreated extends Webhook {
  signing_secret: string;
}

export interface WebhookTestResult {
  ok: boolean;
  status: string;
  detail: string | null;
}

export interface WebhookCatalog {
  groups: {
    domain: string;
    events: { key: string; label: string; scope: "project" | "org" }[];
  }[];
}
