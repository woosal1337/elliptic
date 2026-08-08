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

export type EventScope = "team" | "personal";

export type CommentEntityType = "task" | "meeting" | "note";

export type AIProvider = "openai" | "anthropic" | "ollama" | "custom" | "bedrock";

export type AIRunPurpose = "summarize" | "chat";

export type AIRunStatus = "running" | "succeeded" | "failed";

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
  ai_enabled: boolean;
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
  intake_owner_id: string | null;
  state_id: string | null;
  intake_enabled: boolean;
  intake_inapp_enabled: boolean;
  worklog_approval_required: boolean;
  intake_token: string | null;
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

export interface ProjectUpdate {
  id: string;
  project_id: string;
  health: ProjectHealth;
  summary: string;
  created_by: string | null;
  created_at: string;
}

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

export type InitiativeStatus = "active" | "completed" | "archived";

export interface Initiative {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  target_date: string | null;
  status: InitiativeStatus;
  project_count: number;
  task_total: number;
  task_done: number;
  task_started: number;
  task_todo: number;
  weighted_total: number;
  weighted_done: number;
  created_at: string;
}

export interface InitiativeUpdate {
  id: string;
  initiative_id: string;
  health: ProjectHealth;
  summary: string;
  created_by: string | null;
  created_at: string;
}

export interface InitiativeProject {
  id: string;
  name: string;
  key: string;
  task_total: number;
  task_done: number;
}

export type ModuleStatus =
  | "planned"
  | "in_progress"
  | "paused"
  | "completed"
  | "cancelled";

export interface Module {
  id: string;
  org_id: string;
  project_id: string;
  name: string;
  description: string | null;
  lead_id: string | null;
  start_date: string | null;
  target_date: string | null;
  status: ModuleStatus;
  milestone_id: string | null;
  task_total: number;
  task_done: number;
  task_started: number;
  task_todo: number;
  archived_at: string | null;
  created_at: string;
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

export type ReleaseStatus = "planned" | "released" | "archived";

export interface Release {
  id: string;
  org_id: string;
  name: string;
  version: string | null;
  description: string | null;
  changelog: string | null;
  status: ReleaseStatus;
  released_at: string | null;
  task_total: number;
  task_done: number;
  created_at: string;
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

export type MilestoneStatus = "upcoming" | "completed";

export interface Milestone {
  id: string;
  org_id: string;
  project_id: string;
  name: string;
  description: string | null;
  target_date: string | null;
  status: MilestoneStatus;
  task_total: number;
  task_done: number;
  created_at: string;
}

export type CycleStatus = "upcoming" | "active" | "completed";

export interface Cycle {
  id: string;
  org_id: string;
  project_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: CycleStatus;
  milestone_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  task_total: number;
  task_done: number;
  started: number;
  todo: number;
  final_total_count: number | null;
  final_completed_count: number | null;
  created_at: string;
}

export interface ActiveCycle extends Cycle {
  project_name: string;
  project_key: string;
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
  bot_assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
  sort_order: number;
  labels: Label[];
  created_by: string;
  parent_task_id: string | null;
  source_meeting_id: string | null;
  cycle_id: string | null;
  milestone_id: string | null;
  module_id: string | null;
  release_id: string | null;
  custom_fields: Record<string, string>;
  dod_items: DodItem[];
  acceptance_criteria: string | null;
  estimate: string | null;
  kind: TaskKind;
  severity: BugSeverity | null;
  component: string | null;
  release_blocker: boolean;
  intake_channel: string | null;
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

export interface MeetingSummary {
  id: string;
  meeting_id: string;
  content: string;
  model: string;
  provider: string;
  created_by: string;
  ai_run_id: string | null;
  created_at: string;
}

export interface MeetingChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface MeetingChatResult {
  reply: string;
  model: string;
  ai_run_id: string;
}

export interface MeetingChatCitation {
  meeting_id: string;
  meeting_title?: string;
  segment_id?: string | null;
  start_seconds?: number | null;
  quote: string;
}

export interface OrgMeetingChatResult extends MeetingChatResult {
  citations: MeetingChatCitation[];
  coverage?: { consulted: number; total: number };
}

export interface RouteSuggestion {
  project_id: string | null;
  route: string | null;
  confidence: number;
}

export interface ContextSignal {
  kind: "related_task" | "related_meeting" | "related_note";
  id: string;
  title: string;
  detail?: string | null;
}

export interface ContextAggregation {
  signals: ContextSignal[];
  confidence: number;
  coverage?: { consulted: number; total: number };
}

export interface MeetingBriefBullet {
  text: string;
  source_kind: "meeting" | "task" | "note" | "project";
  source_id: string;
  source_label: string;
}

export interface MeetingBrief {
  bullets: MeetingBriefBullet[];
  confidence: number;
  generated_at: string;
}

export interface TranscriptChapter {
  label: string;
  start_seconds: number;
  segment_id: string;
}

export interface MeetingTemplate {
  id: string;
  name: string;
  sections: string[];
  prompt_scaffold: string | null;
  built_in: boolean;
}

export interface MeetingRecipe {
  id: string;
  name: string;
  prompt: string;
  built_in: boolean;
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
  summary: string | null;
  action_items: string[];
  decisions: string[];
  include_transcript: boolean;
  transcript: TranscriptSegment[];
}

export interface PublicMeetingChatResult {
  reply: string;
  grounded: boolean;
}

export interface Event {
  id: string;
  org_id: string;
  owner_id: string | null;
  scope: EventScope;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  meeting_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
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

export interface NoteShare {
  id: string;
  note_id: string;
  user_id: string;
  access: NoteShareAccess;
}

export interface AIProviderKey {
  id: string;
  provider: AIProvider;
  name: string;
  last4: string;
  is_default: boolean;
  created_at: string;
}

export interface AIRun {
  id: string;
  org_id: string;
  provider: AIProvider;
  model: string;
  purpose: AIRunPurpose;
  input_tokens: number | null;
  output_tokens: number | null;
  status: AIRunStatus;
  error: string | null;
  created_at: string;
}

export interface AIUser {
  id: string;
  org_id: string;
  name: string;
  provider: AIProvider;
  model: string;
  system_prompt: string;
  is_active: boolean;
  created_at: string;
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
