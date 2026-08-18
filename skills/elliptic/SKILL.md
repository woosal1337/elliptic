---
name: elliptic
description: >-
  Work an Elliptic workspace over its built-in MCP server (the mcp__elliptic__*
  tools, 121 of them). Use this skill whenever you read or write Elliptic
  projects, tasks, meetings, notes, comments, the document Drive, automations,
  or org settings — it explains the domain model, the
  org_id discipline, the confirm/idempotency conventions, where files live, and
  the gotchas that make calls fail or land in the wrong workspace.
---

# Elliptic — the company brain, over MCP

Elliptic (github.com/woosal1337/elliptic) is an open-source, self-hostable,
agent-native work platform — "Jira for your agents." One multi-tenant workspace
holds projects, tasks, sprints, meetings with speaker-attributed transcripts,
markdown notes, uploaded documents, and automations. Its API embeds a first-party MCP server that exposes the whole workspace:
**every MCP action mirrors what a member can do in the web app, acting as the
human who consented to the connection.**

- MCP endpoint: `{api-origin}/api/v1/mcp` (hosted: `https://api.elliptic.sh/api/v1/mcp`)
- Web app: `{app-origin}/app/{orgId}/…` (hosted: `https://elliptic.sh`)
- Auth: OAuth 2.1 (PKCE, dynamic client registration) or a personal access
  token (`cos_pat_…`) sent as `Authorization: Bearer` or `x-api-key`
- Docs: https://docs.elliptic.sh (the "company-brain MCP" page is the user-facing
  counterpart of this skill)

## The mental model

```
Organization  (tenant; roles: owner > admin > member > guest)
├── Teams ("teamspaces": members, optional lead, per-team workflow override,
│          links to projects that grant project access)
├── Projects  (key like ENG; board, members, artifacts=links)
│   └── Tasks  (identifier ENG-42; status, priority, kind, labels, subtasks,
│               relations, estimates, DoD, source meeting/note provenance)
├── Notes     (markdown pages; a folder IS a note with is_folder=true; nest freely)
├── Drive     (uploaded documents; a folder IS a path on the file; org-wide)
├── Meetings  (speaker-attributed transcript segments, chapters, share links)
├── Vocabulary  (org glossary — shared wording for the workspace)
└── Automations (status triggers → label/assign/route/set_priority)
```

Work flows through statuses: `backlog → todo → in_progress → in_review → done`
(plus `cancelled`, `duplicate`). Each status maps to an immutable category —
`backlog / unstarted / started / completed / cancelled` — which is what
"open/closed" logic keys on. Tasks reference everything that produced them:
`source_meeting_id`, `source_note_id`. Closing a meeting-born task notifies the
meeting's attendees automatically — the loop from conversation to shipped work
is a first-class product feature.

## Golden rules (violating these is the #1 source of silent failures)

1. **Resolve the org first, then pass `org_id` everywhere.** Call
   `list_my_orgs` once at the start of a session. A multi-org token that omits
   `org_id` falls back to the **earliest-created org the user belongs to** —
   rarely the one you mean. A record reported as "not found" usually means
   *wrong org*, not *deleted*. (A single-org token is the opposite: it rejects
   a mismatched `org_id` — omit it there.)
2. **Tools take UUIDs, never `ENG-42` identifiers.** When you only have a
   human identifier or a description, call `search` first; each hit carries the
   UUID plus, for tasks, the identifier. Malformed UUIDs raise raw
   `ValueError`s.
3. **Deletes are two-phase.** Destructive tools take `confirm: false` by
   default and return a `{requires_confirmation: true, …}` preview without
   changing anything; re-call with `confirm: true` to execute. Never skip the
   preview when acting on the user's behalf — read it back to them if there is
   any ambiguity about the target. Exceptions with **no** confirm gate (they
   act immediately): `remove_project_member`, `remove_team_member`,
   `remove_task_relation`, `remove_project_artifact`, `revoke_invite`,
   `update_member_role`.
4. **Statuses move only through `transition_task_status`.** `update_task`
   cannot change status. Transitions run the project's workflow guardrails
   (allowed edges, required roles, require-assignee/estimate/due-date/DoD
   conditions, backward-move policy) and fire notifications + automations.
5. **Clearing a field needs its explicit flag** — `clear_assignee`,
   `clear_severity`, `clear_component` on `update_task`, `move_to_root` on
   `update_note` — because an omitted argument and an explicit null arrive
   identically over the tool boundary.
6. **Pass `idempotency_key` on creates you might retry.** Twelve create
   tools accept it (`create_task`, `create_tasks_batch`, `create_project`,
   `create_comment`, `create_note`, `create_meeting`, `import_folio_meeting`,
   `register_drive_file`, `create_team`, `create_view`, `create_term`,
   `create_workflow_status`, `create_automation`). Keys are unique per
   **org**, not per tool, and never expire — namespace them
   (`"taskimport-2026-08-10-row17"`).
7. **Always pass a sane `limit`.** The MCP path has **no server-side cap**
   (the REST API caps at 200; MCP does not). `get_task_board` and several
   list-all tools return everything unpaginated — fine for normal workspaces, heavy for big ones.
8. **Timestamps must carry a timezone.** `brain_changes_since` and
   `snooze_notification` crash on naive ISO strings; always send
   `2026-08-01T00:00:00+00:00`-style values. Dates (`due_date`, `start_date`)
   are bare `YYYY-MM-DD`.
9. **Respect admin intent even where MCP doesn't enforce it.** A few
   docstrings say "admin only" while MCP enforcement is scope-based (meeting
   vocabulary, `create_project`, `create_team`,
   `add_project_member`). Treat those as admin actions: don't perform them for
   a non-admin user without their explicit ask.

## What you can do, at a glance (121 tools)

| Domain | Tools | Read | Write highlights |
|---|---|---|---|
| Tasks & labels | 20 | boards, my-tasks, subtasks, relations | create/update/transition/delete, batch create, label CRUD, subscriptions |
| Projects | 16 | list/get, members, artifacts | create/update, soft-delete + 30-day restore, membership, link artifacts |
| Meetings | 11 | transcripts, chapters, segments | create/import, update/delete, share links |
| Orgs & members | 11 | my orgs, members, invites | create org, roles, invites, delete org (owner) |
| Teams | 8 | teams, members | create/update/delete, membership |
| Comments & attachments | 7 | threads incl. attachment URLs | comment on task/meeting/note, view images inline |
| Notifications | 6 | inbox, unread count | read/archive/snooze |
| Notes | 5 | list/get (full markdown) | create/update/move/delete pages & folders |
| Drive (documents) | 10 | browse/search folders, read text, view images | presigned or inline upload, rename/move, delete |
| Automations | 5 | rules | rule CRUD (admin), run skills on demand |
| Views | 4 | saved views | personal/teamspace/org view CRUD |
| Vocabulary | 4 | glossary | term CRUD |
| Workflow statuses | 4 | org/team status sets | status CRUD (admin) |
| Brain | 3 | open threads, changes-since, project resume | — |
| Integrations (Slack) | 2 | status, channels | — |
| Activity | 2 | org feed, per-entity timeline | — |
| Profile | 2 | own profile | update name |
| Search | 1 | tasks, notes, projects, meetings, cycles, modules | — |

Not reachable over MCP (web/REST only — say so rather than improvising):
cycles/sprints, milestones, modules, retrospectives, worklogs, favorites,
approvals, project templates, **comment/note attachment upload** (those upload
through the web app — Drive documents, by contrast, DO upload over MCP), Slack
connect/disconnect, GitHub/Sentry/email integrations.

## Session playbook

Start of a session (cheap, no AI spend):
1. `list_my_orgs` → pick the org, hold its id.
2. `brain_open_threads` → your open assigned and created tasks.
3. `brain_changes_since` (tz-aware timestamp, generous limit) → what moved.
4. Per project: `brain_resume(project_id)` → in-flight tasks, recent notes,
   recent activity.

Find work → do work: `get_task_board(project_id)` for the board,
`list_my_tasks(filter="assigned")` for your plate, then
`transition_task_status` as work moves, `create_comment` to leave a trail.

Meetings → work: `list_meetings` / `list_meeting_segments` for the transcript
and `list_meeting_chapters` for its shape, then `create_tasks_batch(titles,
source_meeting_id=…)` to turn what was agreed into tracked tasks — provenance
makes the done-loop notify attendees.

Notes: `list_notes(search=…)` searches title *and* body; folders are notes
(`is_folder=true`) and keep a `content` blurb describing what belongs inside —
read it before filing. Deleting a folder deletes everything in it.

## Files & attachments (where things are stored)

Note bodies and task descriptions are **markdown text in Postgres** — no blob
store involved; `get_note` returns the entire body. Uploaded files (comment
attachments, etc.) live in **S3-compatible object storage** (Cloudflare R2 by
default, bucket `elliptic-media`, keys
`orgs/{org_id}/{entity_type}/{object_id}/{filename}`), max 100 MB, content-type
allowlisted. Over MCP you can **read** them: comment payloads carry
`attachments` with short-lived (300 s) presigned URLs, `get_attachment`
re-mints a fresh URL, and `view_image_attachment` returns actual pixels to look
at inline. A self-hosted instance without storage configured returns
`url: null` / "Object storage is not configured". Project "artifacts" are
labelled external **links**, not files.

**The Drive** (`drive:read` / `drive:write`) is the org's document store on top
of that same bucket: `drive_files` rows carry a name, a `folder_path` (a string
like `contracts/2026`, `""` for the root — folders are not rows, so they cannot
be orphaned) and a description. It is org-scoped, never project-scoped, because
one contract is referenced from tasks in several projects. Each listed document
carries a `mention` string — paste it into a task description and it renders as
a clickable chip for humans on web and phone. Upload is two steps on purpose:
`create_drive_upload` returns a presigned PUT URL and the exact headers, the
agent sends the bytes with its own HTTP/shell, then `register_drive_file` files
it. Base64 through `upload_drive_file_inline` is capped at 256 KB, because tool
arguments are written by the model and a real document would cost ~1.4 tokens
per byte. `read_drive_file` returns text for text/JSON/XML only; a PDF or Office
file comes back `readable: false` with a URL to fetch instead.

## Error truth table

| Symptom | Real cause |
|---|---|
| `NotFoundError` on a record you know exists | Wrong `org_id` (fallback picked another org) — re-check with `list_my_orgs` |
| `insufficient_scope: X` | The OAuth grant lacks that scope; the user must re-consent (baseline grants are read-only) |
| `This token is scoped to a single organization; omit org_id` | You passed `org_id` on a single-org token |
| `ValueError: badly formed hexadecimal UUID string` | You passed `ENG-42` or a name where a UUID belongs — `search` first |
| `{requires_confirmation: true}` returned | Not an error: re-call with `confirm=true` after verifying the preview |
| `BadRequestError: Cannot move to this status: …` | A transition condition (assignee/estimate/due-date/DoD) is unmet — fix the field, then transition |
| `ForbiddenError: … not allowed by the project's workflow` | Workflow edges restrict this move; `list_workflow_statuses` + ask the user |
| `Project is archived` | All task writes are blocked; un-archive via `update_project(status="active")` |
| `TypeError: can't compare offset-naive and offset-aware datetimes` | Add a UTC offset to your timestamp |

## Deep references (load on demand)

- **[references/tools.md](references/tools.md)** — every tool: parameters,
  defaults, scopes, return shapes, side effects, per-tool gotchas.
- **[references/domain.md](references/domain.md)** — entities and enums,
  statuses and transition rules, roles and permissions,
  notes/meetings/search internals, storage, scopes catalog, web-app URL map.
- **[references/recipes.md](references/recipes.md)** — step-by-step playbooks:
  catch-up, meeting-to-tasks, weekly report, filing notes, filing Drive
  documents, multi-org hygiene.
