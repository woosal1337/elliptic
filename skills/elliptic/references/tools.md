# Elliptic MCP — complete tool catalog (121 tools)

Conventions used below:

- Signature lines show every parameter. `param*` = required. Everything else
  is optional with the shown default. Types are JSON types; ids are UUID
  strings unless noted.
- Every org-scoped tool also takes `org_id: str|None = None` — it is omitted
  from signatures for brevity. Only `create_org`, `list_my_orgs`,
  `get_my_profile`, `update_my_profile` are user-level (no `org_id`).
- **Scope** is the OAuth scope the call requires. `insufficient_scope: <scope>`
  means the grant lacks it.
- 🗑️ = two-phase destructive tool: `confirm=false` (default) returns a
  `{requires_confirmation: true, action, …identifying fields, hint}` preview
  and changes nothing; `confirm=true` executes.
- 🔑 = accepts `idempotency_key` (unique per org, stored forever; a repeated
  key replays the stored result without re-running).
- List tools generally return `{total, items}`; deviations are noted.
- Each MCP call is one transaction: committed on success, fully rolled back on
  any error.

---

## Tasks (`tasks:read` / `tasks:write`) — 20 tools

### `list_project_tasks(project_id*, status=None, assignee_id=None, search=None, limit=50, offset=0)`
Scope `tasks:read`. Board-mirroring filters. `status` must be a valid
TaskStatus string or it raises. `search` is case-insensitive substring over
title **and** description. Excludes archived tasks. Ordered by
board order (`sort_order, number`). `total` is the pre-pagination count.
No server-side limit cap — pass a sane one.

### `get_task(task_id*)`
Scope `tasks:read`. Full task: `identifier` (`ENG-42`), status + immutable
`category`, priority, kind/severity/component, assignee + `bot_assignee_id`
dates, labels, `estimate`, `acceptance_criteria`, `dod_items`,
`custom_fields`, provenance (`source_meeting_id`, `source_note_id`), planning
links (`cycle_id`, `milestone_id`, `module_id` — read-only over
MCP), `subtask_total`/`subtask_done`, `blocked` (true when an open task
`blocks` it), `comment_count`, `latest_comment {content, author_name}`.

### `create_task(project_id*, title*, description=None, status="backlog", priority="none", assignee_id=None, unassigned=False, start_date=None, due_date=None, label_ids=None, parent_task_id=None, source_meeting_id=None, source_note_id=None, kind="task", severity=None, component=None, mention_user_ids=None, related_task_ids=None)` 🔑
Scope `tasks:write`. Assignee resolution when `assignee_id` omitted:
`unassigned=true` → nobody; else project's
default assignee; else **you (the caller)**. Assignees must be project
members and never guests. `kind="bug"` **requires** `severity` and gets an
SLA due date when none given (critical +1d, high +3d, medium +7d, low +30d).
Subtasks: one level only, same project, kind-nesting rules apply (an epic
can't sit under a story). Dates are `YYYY-MM-DD`. Title 1–500 chars.
Side effects: activity, auto-subscribe creator+assignee, MENTIONED
notifications for mentions, `related` relations for `related_task_ids`,

### `update_task(task_id*, title=None, description=None, priority=None, assignee_id=None, clear_assignee=False, start_date=None, due_date=None, estimate=None, acceptance_criteria=None, label_ids=None, kind=None, severity=None, clear_severity=False, component=None, clear_component=False, release_blocker=None, mention_user_ids=None, related_task_ids=None)`
Scope `tasks:write`. Omitted = untouched; clearing needs the `clear_*` flag.
**Cannot change status** — use `transition_task_status`. `label_ids` is
whole-set **replace** (use `attach_task_labels`/`detach_task_labels` for
add/remove). Description edits snapshot a version. Raising priority to
`urgent` notifies the assignee. `estimate` ≤ 20 chars, values conventionally
from the project's `estimate_scale`.

### `transition_task_status(task_id*, status*)`
Scope `tasks:write`. The only way to move status. Enforces, in order:
not-same-status; project not archived; workflow edge rules (open by default —
once any transition rule exists from the source status, only listed targets
pass); per-edge `required_role`; blocking conditions ("an assignee is
required" / estimate / due date / all-DoD-checked); backward-move policy
(blocked org-wide if `block_backward_transitions`, else allowed with an
automatic "↩︎ Status moved back" comment). Side effects: status_changed
activity + notifications, `on_status_change` automations, and — when moving
to `done` with a `source_meeting_id` — the meeting loop closes and attendees
are notified.

### `delete_task(task_id*, confirm=False)` 🗑️
Scope `tasks:write`. **Hard** delete (a sync tombstone is kept); subtasks
cascade. Blocked on archived projects.

### `list_labels()` / `create_label(name*, color="#808080")` / `delete_label(label_id*, confirm=False)` 🗑️
Scope `tasks:read`/`write`. Labels are **org-wide** tags `{id, name, color}`.
`create_label` is get-or-create on the exact (case-sensitive) name — safe to
retry; returns `created: bool`. Color must be `#rrggbb`. Deleting removes the
label from every task. Unknown id on delete returns
`{deleted: false, error: "Label not found"}` rather than raising.

### `attach_task_labels(task_id*, label_ids*)` / `detach_task_labels(task_id*, label_ids*)`
Scope `tasks:write`. Additive / subtractive set operations over the task's
current labels (already-attached / not-attached ids are no-ops). Unknown
label id → "One or more labels not found". Returns the full task.

### `create_tasks_batch(project_id*, titles*, source_note_id=None, source_meeting_id=None)` 🔑
Scope `tasks:write`. One task per non-blank line (stripped, truncated to
500 chars), all `backlog`/`none`/`task`, shared provenance. Each row runs the
full create path (notifications and automations fire per task). With no
project default assignee, **every row is assigned to you** — mention that to
the user or reassign after. All-blank input → "No task titles provided".

### `get_task_board(project_id*)`
Scope `tasks:read`. `{columns: [{status, tasks[]}]}` — every status except
`duplicate`, empty columns included, board order within columns. Excludes
**includes archived tasks**, and is unpaginated: on huge projects
prefer `list_project_tasks` with filters.

### `list_my_tasks(filter="assigned", limit=50, offset=0)`
Scope `tasks:read`. `filter` ∈ `assigned | created | subscribed | recent`
(anything else raises). `recent` = union of the other three ordered by
`updated_at` desc; the rest order open-before-closed then priority. Spans all
projects in the org; excludes archived.

### `list_subtasks(task_id*)`
Scope `tasks:read`. Children of one parent, board order, unpaginated.

### `subscribe_task(task_id*)` / `unsubscribe_task(task_id*)`
Scope `tasks:write`. Your own subscription only. Note: assignee and creator
always get task notifications regardless of subscription.

### `list_task_relations(task_id*)`
Scope `tasks:read`. Perspective-aware: a stored `blocks` row reads as
`blocks` from the source task and `blocked_by` from the target. Items:
`{relation_id, task_id, identifier, title, status, due_date, type}`.

### `add_task_relation(task_id*, target_task_id*, type*)`
Scope `tasks:write`. Accepted types: `blocks`, `blocked_by`, `related`,
`duplicate`/`duplicates`, `duplicate_of`, `implements`, `implemented_by`
(inverse forms are stored flipped, so only canonical directions persist).
Errors: unknown type, self-relation, target not found, "This relation
already exists".

### `remove_task_relation(task_id*, relation_id*)`
Scope `tasks:write`. Works from either end. **No confirm gate.**

---

## Projects (`tasks:read` / `tasks:write` — no separate projects scope) — 16 tools

### `list_projects()`
Scope `tasks:read`. All non-deleted projects — **including archived ones**
(check `status`). No membership filter, no pagination, returns `{items}`
(no `total`).

### `get_project(project_id*)`
Scope `tasks:read`. Fields worth knowing: `key`, `status`
(`active|archived`), `network` (`private|public`), `lead_id`,
`default_assignee_id`, `worklog_approval_required`, `target_date`,
`state_id` (portfolio lifecycle state), `features` (per-project feature
flags), `estimate_scale`, `auto_archive_days`/`auto_close_days`.

### `create_project(name*, key*, description=None)` 🔑
Scope `tasks:write`. `key` must match `^[A-Z]{2,6}$` and be unique in the
org. Creator becomes project admin. Treat as an admin action even though MCP
enforcement is scope-based.

### `update_project(project_id*, name=None, description=None, status=None, team_id=None, lead_id=None, target_date=None)`
Scope `tasks:write`. `status` ∈ `active | archived`. **Archiving blocks all
task writes in the project** until re-activated.

### `delete_project(project_id*, confirm=False)` 🗑️ / `restore_project(project_id*)` / `list_deleted_projects()`
Scope `tasks:write` (restore/list-deleted: write/read). Soft delete with a
**30-day recovery window**; restore raises past the window. Tasks are kept.

### `get_project_subscription(project_id*)` / `subscribe_project(project_id*)` / `unsubscribe_project(project_id*)`
Scope `tasks:read`/`write`. Project subscribers receive `task_created`
notifications for the project.

### `list_project_members(project_id*)`
Scope `tasks:read`. **Direct** member rows only (`{user_id, role, …}`, role ∈
`admin|member|commenter|viewer`); access derived from teams or org-admin
bypass does not appear here.

### `add_project_member(project_id*, user_id*)` / `remove_project_member(project_id*, user_id*)`
Scope `tasks:write`. Add is always role `member` (change roles in the web
app); guests cannot be members. Remove: cannot remove yourself; a project
keeps ≥1 member. Remove has **no confirm gate**.

### `list_project_artifacts(project_id*)` / `add_project_artifact(project_id*, label*, url*)` / `remove_project_artifact(project_id*, artifact_id*)`
Scope `tasks:read`/`write`. Artifacts are labelled external **links** (repo,
design doc, spec) on the project brief — not uploaded files. URL is not
format-validated. Remove has **no confirm gate**.

---

## Meetings (`meetings:read` / `meetings:write`) — 11 tools

Visibility: a meeting attached to a project is only visible to that project's
members (admins see all); it surfaces as *not found*, never 403. Editing,
deleting, and share management require being the creator or an org admin.

### `list_meetings(limit=50, offset=0)`
Scope `meetings:read`. Newest first. Fields: `title`, `started_at`,
`duration_seconds`, `source` (`manual|folio`), `project_id`,
`external_attendees` (names/emails of outsiders), `raw_markdown`.

### `get_meeting(meeting_id*)`
Scope `meetings:read`. Metadata only — transcripts via
`list_meeting_segments`.

### `create_meeting(title*, started_at*, duration_seconds=None, project_id=None, attendee_ids=None, external_attendees=None, raw_markdown=None)` 🔑
Scope `meetings:write`. `started_at` ISO-8601. `attendee_ids` must be org
member ids. Attaching a project requires being a member of it.

### `import_folio_meeting(folio*)` 🔑
Scope `meetings:write`. Atomic import of a recorder export:
`folio = {title, started_at, duration_seconds?, attendees?,
segments: [{speaker, start_seconds, end_seconds, text}], markdown?,
project_id?}`. `segments` is required. This is the way to ingest any
externally recorded meeting (from any source) as a speaker-attributed
transcript.

### `update_meeting(meeting_id*, title=None, project_id=None, raw_markdown=None)`
Scope `meetings:write`, creator-or-admin. Only these three fields; nothing
can be cleared (no clear flags here).

### `delete_meeting(meeting_id*, confirm=False)` 🗑️
Scope `meetings:write`, creator-or-admin. Cascades transcript, summaries,
and share link.

### `list_meeting_segments(meeting_id*, limit=200, offset=0)`
Scope `meetings:read`. Ordered transcript slices:
`{speaker, start_seconds, end_seconds, text, position}`.

### `list_meeting_chapters(meeting_id*)` — free
Scope `meetings:read`. Derived topic jump points (`{label, start_seconds,
segment_id}`); empty when the transcript has < 6 segments. No AI call.

### `get_meeting_share(meeting_id*)` / `create_meeting_share(meeting_id*, include_transcript=False)` / `update_meeting_share(meeting_id*, include_transcript=None, revoked=None)`
Scope `meetings:read`/`write`; create/update are creator-or-admin. One share
per meeting; public URL `{app-origin}/share/meetings/{token}`. Guests always
see summary + action items + decisions; the transcript only with
`include_transcript`. Re-creating reuses the token and un-revokes.
`get` returns `{share: null}` when none exists.

## Notes (`notes:read` / `notes:write`) — 5 tools

Notes are markdown pages in one nesting tree; **a folder is a note with
`is_folder=true`** and keeps its own `content` describing what belongs
inside. Visibility: `public` (org-wide, the default), `private`/`shared`
(creator, admins, explicitly shared members). Locked notes reject edits.
Every title/content change snapshots a version (restorable in the web app).

### `list_notes(project_id=None, search=None, limit=50, offset=0)`
Scope `notes:read`. `search` covers title **and body**. Excludes archived.
Ordered by `updated_at` desc. Items include the **full markdown content** —
keep `limit` modest.

### `get_note(note_id*)`
Scope `notes:read`. Whole body in one call.

### `create_note(title*, content="", project_id=None, parent_id=None, is_folder=False)` 🔑
Scope `notes:write`. `parent_id` files it inside a folder (folders nest).
The parent just has to exist — it isn't required to be a folder, so check
`is_folder` yourself before filing.

### `update_note(note_id*, title=None, content=None, project_id=None, parent_id=None, move_to_root=False)`
Scope `notes:write`. `content` is a **full replace** — read, modify, write
back for partial edits. `move_to_root=true` is the only way to un-file a note
(it wins over `parent_id` if both are passed). Self-parenting rejected.

### `delete_note(note_id*, confirm=False)` 🗑️
Scope `notes:write`. Hard delete; **cascades to every child** — deleting a
folder deletes its entire subtree. Preview first, always.

---

## Drive (`drive:read` / `drive:write`) — 10 tools

The org's uploaded documents — one store for the whole workspace, not per
project, because a contract is referenced from tasks in several projects.
**Folders are a path on the document** (`folder_path`, `"contracts/2026"`, `""`
for the root), so a folder exists while something carries it and can never be
orphaned. Every payload carries `mention` —
`[name](/__mention/file/<id>)` — paste it into a task description and it renders
as a clickable document chip on web and mobile.

### `list_drive_files(folder_path=None, search=None, recursive=False, limit=50, offset=0)`
Scope `drive:read`. Omit `folder_path` for every document; pass `""` for the
root only. `recursive=true` includes subfolders. `search` matches name and
description **across the whole Drive**, ignoring `folder_path`.

### `list_drive_folders()`
Scope `drive:read`. Each folder with the count of documents it holds directly.

### `get_drive_file(file_id*)`
Scope `drive:read`. Metadata plus a presigned `url` that lives **300 seconds** —
call again for a fresh one rather than caching it.

### `read_drive_file(file_id*, offset=0, limit=20000)`
Scope `drive:read`. Decodes `text/*`, JSON and XML into `text`, a window at a
time (`truncated` says there is more; raise `offset`). A PDF or Office file
returns `readable: false`, a `reason`, and a download `url` — this build
extracts no text from those formats.

### `view_drive_image(file_id*)`
Scope `drive:read`. An image document's actual pixels, inline. Raises for a
non-image; use `get_drive_file` there.

### `create_drive_upload(filename*, content_type*, size_bytes*)`
Scope `drive:write`. Reserves a slot and returns `{object_id, upload_url,
method, headers, expires_in, max_bytes}`. Send the bytes yourself —
`curl -X PUT -H "Content-Type: <content_type>" --upload-file <path> "<upload_url>"`
— the header must match exactly or R2 rejects the signature. Then
`register_drive_file`. **This is the upload path for anything but a tiny file:**
tool arguments are written by the model, so base64 costs ~1.4 tokens per byte.

### `register_drive_file(object_id*, name=None, folder_path="", description=None)` 🔑
Scope `drive:write`. Confirms the upload against storage (a PUT that never
landed fails here) and files it. `name` defaults to the filename. Rejects an
object reserved for another entity, and rejects one already in the Drive.

### `upload_drive_file_inline(filename*, content_base64*, content_type*, name=None, folder_path="", description=None)`
Scope `drive:write`. One-shot upload for a **small** document — hard cap 256 KB
decoded. Larger payloads raise; use `create_drive_upload`.

### `update_drive_file(file_id*, name=None, folder_path=None, description=None, clear_description=False)`
Scope `drive:write`. Rename, move between folders, edit the description.
`clear_description=true` empties it — an omitted argument and an explicit null
arrive identically over the tool boundary. A path with `..` is rejected.

### `delete_drive_file(file_id*, confirm=False)` 🗑️
Scope `drive:write`. Deletes the document **and its bytes**. Preview unless
`confirm=true`. Any description that mentions it keeps the link text, which then
resolves to nothing — check `search` for references first.

---

## Comments & attachments (`comments:read` / `comments:write`) — 7 tools

Comments attach to a `task`, `meeting`, or `note` (that exact `entity_type`
string). Threading, reactions, and resolution exist in the product; over MCP
you work with body text + attachments.

### `list_comments(entity_type*, entity_id*, limit=50, offset=0)`
Scope `comments:read`. **Oldest first** (unlike most lists). Each comment's
`attachments` carry `{id, filename, content_type, kind, size_bytes, url}` —
`url` is presigned and expires in ~300 s; re-mint with `get_attachment`.

### `get_comment(comment_id*)` / `create_comment(entity_type*, entity_id*, body*)` 🔑 / `update_comment(comment_id*, body*)` / `delete_comment(comment_id*, confirm=False)` 🗑️
Scope `comments:read`/`write`. Body is markdown. Update/delete are
author-or-admin; delete can additionally be denied by the org's role matrix.
Creating a comment notifies watchers and auto-subscribes you to the task.

### `get_attachment(object_id*)`
Scope `comments:read`. Fresh 300-second presigned `download_url` + metadata
for any uploaded attachment. "File has not finished uploading" means the
uploader never confirmed it.

### `view_image_attachment(object_id*)`
Scope `comments:read`. Returns the actual image inline (not a dict) so you
can see it. Non-images → use `get_attachment` instead.

---

## Search (`brain:read`) — 1 tool

### `search(query*, types=None, limit=20)`
The id resolver — reach for it before hand-filtering lists. `types` is a
comma-separated subset of `task, note, project, meeting, cycle, module`
(omit for all six). Substring + fuzzy ranking (no embeddings). **Caveats:**
note and meeting matching is by **title only** (note bodies via
`list_notes(search=…)`, transcript content via `meetings_chat`); results skip
per-note/per-meeting visibility subtleties, so a hit may still 404 on fetch.
Hits: `{type, id, title, snippet, project_id, identifier, score}`.

---

## Views (`views:read` / `views:write`) — 4 tools

A view is a saved slice of work: `{name, config, scope, is_default}` with
`config` keys `status`, `assignee_id`, `label_id`, `search` (unknown keys are
ignored). Scopes: `personal` (yours), `teamspace` (needs `team_id`; team
members + admins manage), `team` (org-wide; admins only).

### `list_views()` — your personal views + org-wide views + views of teams you belong to.
### `create_view(name*, config=None, scope="personal", team_id=None, is_default=False)` 🔑
### `update_view(view_id*, name=None, config=None, is_default=None)` — `config` is whole-object replace; scope/team immutable.
### `delete_view(view_id*, confirm=False)` 🗑️ — deleting a published view kills its public link.

---

## Workflow statuses (`workflow:read` / `workflow:write` + org admin) — 4 tools

Renameable status rows inside immutable categories
(`backlog|unstarted|started|completed|cancelled`). `team_id=null` = org
default set; a team's rows override it for that team's projects. Colors are
design tokens (`muted-foreground`, `warning`, `accent`, `success`, `danger`),
not hex.

### `list_workflow_statuses(team_id=None)` — exclusive scope: with `team_id` you get **only** that team's override rows (may be empty), without it only the org rows.
### `create_workflow_status(name*, category*, color="muted-foreground", position=None, team_id=None)` 🔑
### `update_workflow_status(status_id*, name=None, color=None, position=None, is_default=None)` — category is immutable; `is_default=true` demotes siblings.
### `delete_workflow_status(status_id*, confirm=False)` 🗑️ — fails with a ConflictError if any work item sits in the status (moving them first requires the web app); team-scoped rows can't be deleted over MCP.

---

## Teams (`teams:read` / `teams:write`) — 8 tools

Teams (a.k.a. teamspaces) group people, may own projects and a workflow
override, and their project links **grant project access to every member**.
Membership has no per-member role; power comes from the team lead and org
roles.

### `list_teams()` / `get_team(team_id*)`
### `create_team(name*, description=None)` 🔑 — no lead can be set over MCP, so only org admins can manage the team afterwards. Treat as an admin action.
### `update_team(team_id*, name=None, description=None)` / `delete_team(team_id*, confirm=False)` 🗑️ — genuinely gated: team lead or org admin only. Delete cascades members, project links, and the team's workflow override.
### `list_team_members(team_id*)`
### `add_team_member(team_id*, user_id*)` — side effect: grants at least project-member access on **every project linked to the team**. Removing later does **not** revoke those grants.
### `remove_team_member(team_id*, user_id*)` — no confirm gate.

---

## Orgs, members & invites — 11 tools

### `create_org(name*, description=None)` — scope `org:create` (elevated), user-level
You become owner; the six default workflow statuses are seeded. Disabled on
instances that restrict workspace creation.

### `list_my_orgs()` — scope `org:read`, user-level, no parameters
Every org you belong to, ordered by creation — **the first row is exactly
what the org_id fallback resolves to**. Does not include your role; use
`list_org_members` for that.

### `get_org()` / `update_org(name=None, description=None)`
Scope `org:read` / `org:manage` (elevated). Org fields include
and `block_backward_transitions` (read-only over MCP).

### `delete_org(confirm=False)` 🗑️ — scope `org:manage`, **owner only**
Deletes the organization and **everything** in it, unrecoverable. Non-owners
get `{deleted: false, error}`. Never call without an explicit, verbatim user
instruction.

### `list_org_members()`
`{id (membership row), user_id, email, full_name, role}` — use `user_id` in
other tools. Roles: `owner | admin | member | guest`.

### `update_member_role(user_id*, role*)` — scope `org:manage`
Guards: not your own role; owner grants/changes are owner-only; the last
owner can't be demoted. **Demoting to `guest` unassigns every task they hold
and caps their project roles at commenter** — warn the user first. No confirm
gate.

### `remove_org_member(user_id*, confirm=False)` 🗑️ — scope `org:manage`
Also removes their team and project memberships. Last owner protected.

### `list_invites()` / `create_invite(email*, role=None)` / `revoke_invite(invite_id*)`
Scope `org:read` / `org:manage`. Role defaults to `member`; inviting an owner
is owner-only. The one-time token appears **only** in the create response
(accept URL: `{app-origin}/invite/{token}`); 7-day expiry. Revoke has no
confirm gate.

---

## Notifications (`notifications:read` / `notifications:write`) — 6 tools

Always your own inbox, per-org. Types: `assigned`, `mentioned`, `commented`,
`member_added`, `meeting_action_done`, `urgent`, `task_created`,
`status_changed`. "Unread" excludes archived and currently-snoozed rows.

### `list_notifications(status="unread", limit=50)` — `status` ∈ `unread|all|archived`; no offset; returns `{total (page size), items, unread_count}`.
### `unread_count()` → `{count}`
### `mark_notification_read(notification_id*)` / `archive_notification(notification_id*)` — idempotent.
### `mark_all_notifications_read()` — also sweeps snoozed ones; no confirm.
### `snooze_notification(notification_id*, until*)` — `until` must be future **and tz-aware**.

---

## Activity (`activity:read`) — 2 tools

The append-only org mutation log (who did what, when, to which entity).
Payload details are withheld over MCP — fetch the entity for current state.

### `list_activity(limit=50, offset=0)` — org-wide, newest first, not filtered by your project memberships.
### `get_entity_activity(entity_type*, entity_id*, limit=50, offset=0)` — one entity's timeline. `entity_type` is a free string (`task`, `note`, `project`, `meeting`, …); a typo yields an empty list, not an error.

---

## Brain (`brain:read`) — 3 tools

Cross-project catch-up primitives; deterministic, no AI spend.

### `brain_open_threads(limit=25)`
`{assigned_to_me, created_by_me}` — your open work. Open-filtering happens **after** the limit: raise `limit` if the top
of the list is all closed items.

### `brain_changes_since(since*, limit=100)`
Org activity newer than `since` (ISO-8601 **with offset**). Reads the newest
`limit` events then filters — it is "recent N ∩ newer than since", so a busy
org needs a generous `limit`; if `count == limit`, you're truncated.

### `brain_resume(project_id*, limit=20)`
`{project, in_flight_tasks (started-category), recent_notes (≤10),
recent_activity}` — "where did we leave off" for one project. The in-flight
filter also applies post-limit; backlog-heavy projects may need a bigger
`limit`.

---

## Vocabulary (`vocabulary:read` / `vocabulary:write`) — 4 tools

The org glossary: product names, acronyms, people. Injected as a system
message into every meeting AI call (first 200 terms), so keeping it clean
directly improves summaries. Treat writes as admin actions.

### `list_vocabulary()` / `create_term(term*, definition*)` 🔑 / `update_term(term_id*, term=None, definition=None)` / `delete_term(term_id*, confirm=False)` 🗑️
Terms unique per org (case-sensitive); term ≤ 120 chars, definition ≤ 2000.

---

## Automations (`automation:read` / `automation:write`; writes require org admin) — 5 tools

A rule = trigger + ordered actions. The trigger is `on_status_change`. Actions (`{type, value}`): `label` (label id **or
name**), `assign` (member user id, no guests), `route` (project id — the task
is renumbered in the destination), `set_priority` (a valid priority).
`is_skill=true` removes a rule from automatic firing; skills run on demand.

### `list_automations()`
### `create_automation(name*, trigger*, actions=None, is_skill=False, enabled=True)` 🔑 — actions validated against real org data at save time.
### `update_automation(rule_id*, name=None, trigger=None, actions=None, is_skill=None, enabled=None)` — `actions=[]` replaces with empty; `None` leaves untouched.
### `delete_automation(rule_id*, confirm=False)` 🗑️
### `run_automation(rule_id*, task_id*)` — runs an **enabled skill** against a task; not admin-gated. ⚠️ Always returns `{ok: true}` even when individual actions silently fail — verify by re-reading the task.

---

## Integrations — Slack (`integrations:read` / `integrations:manage` elevated) — 3 tools

One Slack workspace per org; connecting/disconnecting happens in the web app.
There is no generic send-message tool.

### `get_slack_integration()` → `{connected, team_name}` — never raises.
### `list_slack_channels()` — public + private channels the bot can see (single page of 1000).
## Profile — 2 tools (user-level, no org_id)

### `get_my_profile()` — scope `profile:read`. Who am I acting as.
### `update_my_profile(full_name=None)` — scope `profile:write`.
