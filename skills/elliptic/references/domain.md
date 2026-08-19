# Elliptic — domain model & platform reference

Everything an agent should know about how the workspace is structured, who
can do what, where data lives, and how the MCP session itself behaves.

## 1. Connection & identity

- **Endpoint:** `{api-origin}/api/v1/mcp` — stateless streamable-HTTP, JSON
  responses. Hosted: `https://api.elliptic.sh/api/v1/mcp`.
- **Credentials:** an OAuth 2.1 access token (`Authorization: Bearer …`) or a
  personal access token (`cos_pat_…`, also accepted via `x-api-key`). PATs
  carry **all scopes across all the user's orgs**; OAuth tokens carry exactly
  the scopes the user ticked on the consent screen, for one org or all orgs.
- **You always act as a human.** The principal behind every call is the user
  who consented.
- OAuth mechanics (rarely needed, good to recognize): dynamic client
  registration, PKCE S256 required, access tokens live ~10 minutes with
  30-day rotating refresh tokens, discovery at
  `/.well-known/oauth-authorization-server`. A 401 with a
  `WWW-Authenticate: Bearer resource_metadata=…` header means
  "authenticate", not "broken server".
- **Transactions:** each tool call commits on success and rolls back entirely
  on error — a failed call leaves no partial state.

### Multi-org discipline

A token reaches one org or several. With several, every org-scoped tool takes
`org_id`, and **omitting it falls back to the earliest-created org the user
belongs to** — a footgun. The contract:

1. `list_my_orgs` once per session (its first row *is* the fallback).
2. Pass `org_id` on every call thereafter.
3. Single-org tokens reject `org_id` — omit it there.
4. "Not found" on a record you can see in the web app almost always means the
   call went to the wrong org.

### OAuth scope catalog

Read scopes are baseline (granted by default, locked on the consent screen);
`(E)` marks elevated scopes users must opt into:

| Domain | Read | Write / manage |
|---|---|---|
| Tasks + projects | `tasks:read` | `tasks:write` |
| Notes | `notes:read` | `notes:write` |
| Drive | `drive:read` | `drive:write` |
| Meetings | `meetings:read` | `meetings:write` |
| Comments + attachments | `comments:read` | `comments:write` |

| Activity | `activity:read` | — |
| Brain + search | `brain:read` | — |
| Notifications | `notifications:read` | `notifications:write` |
| Teams | `teams:read` | `teams:write` |
| Views | `views:read` | `views:write` |
| Vocabulary | `vocabulary:read` | `vocabulary:write` |
| Workflow | `workflow:read` | `workflow:write` |
| Automation | `automation:read` | `automation:write` |
| AI agents | `agents:read` | `agents:write` (E), `agents:keys` (E) |
| Integrations | `integrations:read` | `integrations:manage` (E) |
| Profile | `profile:read` | `profile:write` |
| Organization | `org:read` | `org:manage` (E), `org:create` (E) |

There is no separate projects scope (projects ride on `tasks:*`) and no
delete scope (`write` covers deletion). Cross-org reach comes from consenting
to "all organizations", not from a scope.

## 2. Organizations, roles, people

**Org roles:** `owner > admin > member > guest`.

- **Owner** — everything; only owners manage other owners or delete the org;
  the last owner is protected.
- **Admin** — workspace management: workflow statuses, automations, member
  roles below owner, all projects (implicit project-admin everywhere).
- **Member** — normal work: create tasks/notes/meetings, join projects.
- **Guest** — free seat, capped at viewer/commenter on projects, can never be
  assigned work. Demoting someone to guest unassigns all their tasks.

**Project roles:** `admin > member > commenter > viewer`, per project.
Effective access = the max of: direct membership, roles granted via team →
project links, project-admin if you lead a linked team, and the org
admin/owner bypass. Team-granted access is computed live — but membership
rows created when someone joined a team are sticky after they leave.

**Teams (teamspaces)** group members, optionally have a lead, can own
projects, a workflow-status override, and teamspace views. Team membership
itself has no role.

**Invites:** email + role, 7-day expiry, one-time token returned only at
creation (`{app-origin}/invite/{token}`).

## 3. Projects

- `key` (2–6 uppercase letters, unique per org) prefixes task identifiers.
- `status`: `active` | `archived`. **Archived blocks every task write** in
  the project (create, update, transition, delete) until reactivated.
- Soft delete with a 30-day restore window (`list_deleted_projects` /
  `restore_project`); org deletion is instant and total.
- Useful fields: `lead_id`, `default_assignee_id` (fallback assignee for new
  `features` (per-project tab toggles: meetings, notes),
  `estimate_scale` (the allowed estimate
  strings), `target_date`, portfolio `state_id`
  (draft/planning/execution/monitoring/completed/cancelled lifecycle),
  `auto_archive_days` / `auto_close_days`.
- Project **artifacts** = labelled external links on the project brief.
- Project **network**: `private` | `public` (publishable board).

## 4. Tasks

**Identifier:** `{PROJECTKEY}-{number}` (e.g. `ENG-42`), numbered per
project. MCP tools take task UUIDs; resolve identifiers via `search`. Humans
can deep-link any identifier at `{app-origin}/app/{orgId}/browse/ENG-42`.

**Statuses & categories** (statuses are renameable per org/team; categories
are immutable semantics):

| Status | Category | Meaning |
|---|---|---|
| `backlog` | backlog | not yet committed |
| `todo` | unstarted | committed, not begun |
| `in_progress` | started | actively worked |
| `in_review` | started | awaiting review |
| `done` | completed | finished |
| `cancelled` | cancelled | abandoned |
| `duplicate` | cancelled | superseded; hidden from boards |

"Open" = category not in {completed, cancelled}. Backward = moving to a
lower-ranked category (auto-commented, or blocked org-wide by policy).

**Enums:** priority `none | low | medium | high | urgent`; kind
`task | bug | story | epic`; bug severity `low | medium | high | critical`
(required for bugs; drives SLA due dates: critical +1d, high +3d, medium +7d,
low +30d).

**Hierarchy:** subtasks are one level deep, same project; kind nesting
follows levels (epic 3 > story 2 > task/bug 1) — a child may not sit under a
strictly lower-level parent.

**Relations:** `blocks`/`blocked_by`, `related`, `duplicate`/`duplicate_of`,
`implements`/`implemented_by`. A task is `blocked` when an open task blocks
it. Inverse names are accepted on input and stored in canonical direction.

**Rich fields:** `estimate` (string from the project's scale), `dod_items`
(checklist gating "done" when the workflow requires it),
`acceptance_criteria`, `component`, `custom_fields`,
`start_date`/`due_date`, description **version history** on every edit.

**Provenance:** `source_meeting_id` / `source_note_id` record where work came
from. Completing a meeting-born task notifies that meeting's attendees — set
provenance whenever you create tasks from a meeting or note.

**Workflow guardrails** (configured per org/team by admins): allowed
transition edges per status (open until any edge is defined), per-edge
required project role, and conditions — require assignee / estimate / due
date / all-DoD-checked. `transition_task_status` enforces all of them;
Nothing bypasses them.

## 5. Notes

One tree of markdown pages. A **folder is a note with `is_folder=true`**;
folders nest and keep their own `content` — a blurb about what belongs
inside, worth reading before filing. Bodies are plain markdown stored in
Postgres (returned whole by `get_note`; no separate blob store). Mentions are
encoded as markdown links (`/__mention/{task|note|user}/{id}`).

Visibility: `public` (org-wide, default), `private`, `shared` (per-member
view/comment/edit grants). Locked pages reject edits. Every edit snapshots a
restorable version. Notes can be published to a public URL and support
templates — both managed in the web app. Deleting a note **cascades to its
whole subtree**.

Treat concurrent editing carefully: writes are last-write-wins full-content
replaces. Read, modify, write back — and keep edits tight.

## 6. Meetings

Lifecycle: created manually (`create_meeting`) or imported from a recorder
export (`import_folio_meeting` — title, start, attendee names, and
speaker-attributed segments in one atomic call).

- **Transcript** = ordered segments `{speaker, start/end seconds, text}`.
- **Chapters** are derived on the fly (topic jump points; need ≥6 segments).
- **Shares** mint a public link (`{app-origin}/share/meetings/{token}`)
  showing the meeting title, transcript optional, revocable.
- **Visibility:** meetings attached to a project follow project membership;
  unattached meetings are org-visible. Editing/deleting/sharing is
  creator-or-admin.
- The done-loop: tasks created with `source_meeting_id` notify attendees when
  completed.

## 7. Search, brain & activity

- `search` covers exactly: **task** (title+description), **note** (title
  only), **project** (name/key), **meeting** (title only). Substring+fuzzy,
  top-N; not a semantic
  index. Note bodies → `list_notes(search=…)`; transcript content →
  `meetings_chat`.
- Brain tools are deterministic composites: `brain_open_threads` (my open
  work), `brain_changes_since` (org activity after a timestamp),
  `brain_resume` (a project's in-flight tasks + recent notes + activity).
- The **activity feed** is the append-only audit spine (`created`, `updated`,
  `status_changed`, `commented`,
  `automation_applied`, …). Every MCP write lands there attributed to the
  acting user. Notifications are the per-person inbox slice: `assigned`,
  `mentioned`, `commented`, `member_added`, `meeting_action_done`, `urgent`,
  `task_created`, `status_changed`.

## 8. Storage & attachments

- Backend: S3-compatible object storage (Cloudflare R2 by default), bucket
  `elliptic-media`, keys `orgs/{org_id}/{entity_type}/{object_id}/{filename}`.
- Limits: 100 MB per file (configurable), content-type allowlist (images,
  PDF, text/CSV/markdown, zip, JSON, Office docs).
- Upload is a REST presign flow (15-min PUT window + server-side confirm).
  For **comment and note attachments** it is web/mobile only. For **Drive
  documents** the same flow is exposed over MCP — see below.
- Over MCP you read attachments: comment `attachments` arrays, `get_attachment`
  (fresh 300-second presigned URL — re-mint rather than caching), and
  `view_image_attachment` (inline pixels). Both need `comments:read`.
- Self-hosted instances without storage configured return `url: null` and
  reject presigns with "Object storage is not configured".
- Note bodies, task descriptions, transcripts: **text in Postgres**, not
  object storage. Project artifacts: external links, no storage at all.

### The Drive (`drive_files`)

- One org-wide document store on the same bucket, `entity_type = "drive"`. A
  row is `{id, org_id, stored_object_id (unique), name, folder_path,
  description, uploaded_by}`; the bytes stay in `stored_objects`, and deleting
  either removes both.
- **Folders are a path, not a tree.** `folder_path` is `"contracts/2026"`, or
  `""` for the root. Listing groups by prefix, so a folder exists while a
  document carries it and cannot be orphaned; renaming one is a prefix update
  over its documents (`POST /drive/folders/rename`).
- Org-scoped by design — a signed contract is referenced from tasks in several
  projects, so a project-scoped store would force a copy per project. Reads
  need org membership (guests included); writes need `member` or above.
- Every MCP payload carries `mention`: `[name](/__mention/file/<id>)`. Paste it
  into a task description and web + mobile render a clickable document chip.
- Tools (`drive:read` / `drive:write`): `list_drive_files`,
  `list_drive_folders`, `get_drive_file`, `read_drive_file`, `view_drive_image`,
  `create_drive_upload` → `register_drive_file`, `upload_drive_file_inline`
  (256 KB cap), `update_drive_file`, `delete_drive_file` (confirm-gated).
- `read_drive_file` decodes text/JSON/XML only, in windows (`offset`, `limit`,
  `truncated`). A PDF or Office file returns `readable: false` plus a URL —
  this build extracts no text from those formats. The same service backs
  `GET /drive/files/{id}/text`, which is what the web and mobile previews read:
  a presigned URL lives on the storage origin, so *reading* it in a client would
  need bucket CORS while *rendering* it does not.

## 9. What exists in the product but NOT over MCP

Be direct with users when they ask for these — offer the web link instead of
improvising:

| Capability | Where it lives |
|---|---|
| Retrospectives | project tab |
| Worklogs (time tracking + approval) | task panel |
| Favorites, approvals, project templates | web app |
| Task status *rename/reorder* transfers | web app |
| File upload | web/mobile apps |
| Slack connect/disconnect; GitHub/Sentry/email integrations | settings |
| Custom relation types | web/REST |

## 10. Web-app URL map (for handing humans links)

Base: `{app-origin}/app/{orgId}` (hosted app-origin: `https://elliptic.sh`).

| Surface | Path |
|---|---|
| My tasks / Inbox | `/my-tasks`, `/inbox` |
| Notes / Wiki | `/notes`, `/notes/{noteId}`, `/wiki` |
| Projects | `/projects`, `/projects/{projectId}` (opens the Board; `?tab=` overview, board, tasks, epics, insights, meetings, notes, members, settings) |
| Meetings | `/meetings`, `/meetings/{meetingId}` |
| Activity / Search | `/activity`, `/search` |
| Teamspace | `/teams/{teamId}` |
| **Universal resolver** | `/browse/{identifier}` — accepts `ENG-42`, a bare project key, or a comment id |
| Settings | `/settings` |

Public (no login): `/share/meetings/{token}`, `/public/boards/{token}`,
`/public/pages/{token}`, `/public/views/{token}`, ## 11. Deployment shape (for self-hosters)

Three containers: Postgres 17, the FastAPI API (which embeds the MCP server,
scheduler, realtime relay — no Redis, no workers), and the Next.js web app.
`docker compose up --build` from the repo root; migrations run on start.
Production needs `OAUTH_ISSUER` and `MCP_RESOURCE_BASE` set to the public API
origin (`MCP_RESOURCE_BASE` must include the `/api/v1/mcp` path), plus strong
`JWT_SECRET_KEY` and `ELLIPTIC_KEK`. Object storage (R2/S3) and Slack/Google/
GitHub OAuth are optional add-ons. Helm/k8s/Swarm manifests live in
`apps/api/deploy/`; images at `ghcr.io/woosal1337/elliptic-{api,web}`.
