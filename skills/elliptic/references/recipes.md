# Elliptic — playbooks

Step-by-step sequences for the jobs agents are most often asked to do. All of
them assume you already ran `list_my_orgs` and hold the right `org_id` (pass
it on every call; omitted below for brevity).

## 1. Catch up ("what happened / what's on my plate?")

1. `brain_open_threads(limit=50)` — open assigned + created work, plus the
2. `brain_changes_since(since="<last-check, with +00:00 offset>", limit=200)`
   — if `count == limit`, you were truncated; raise the limit.
3. `unread_count()` / `list_notifications(status="unread")` — mentions,
   assignments, urgent flags aimed at your user.
4. Summarize by project; for anything active,
   `brain_resume(project_id)` fills in in-flight tasks, fresh notes, and
   recent activity.

Report deltas, not inventories: what changed, what's blocked, what's due.
`get_task` on anything you're about to talk about — `blocked`, `due_date`,
`latest_comment` make the summary concrete.

## 2. Meeting → tracked work

1. Ingest if needed: `import_folio_meeting(folio={…})` with the transcript
   segments (works for any recorder's export you can reshape).
2. `summarize_meeting(meeting_id, template_id="standup"|…)` — segment-cited;
   re-runs append rather than overwrite; `preserve_human=true` keeps human
   edits from the previous summary.
3. Pull action items from the summary's `summary_lines` (sections containing
   "Action"), or `ask_meeting(meeting_id, "List every action item with its
   owner")`.
4. `suggest_meeting_project(meeting_id)` if the meeting isn't filed —
   trust it only at decent confidence; confirm with the user otherwise.
5. `create_tasks_batch(project_id, titles=[…], source_meeting_id=meeting_id)`
   — provenance wires the done-loop (attendees get notified as items
   complete). Then per-task `update_task` for assignees/priorities/dates.
6. Optional broadcast: `create_meeting_share(meeting_id)` then
   `post_meeting_to_slack(meeting_id, channel_id)` (share first, so the Slack
   message carries the "Ask about this meeting" link).

## 3. Run a project day-to-day

- Board: `get_task_board(project_id)`; a specific slice:
  `list_project_tasks(project_id, status=…, assignee_id=…, search=…)`.
- Start work: `transition_task_status(task_id, "in_progress")`; leave
  progress notes with `create_comment("task", task_id, body)`.
- Finish: transition to `in_review`/`done` — if it fails, the error names the
  missing gate (assignee, estimate, due date, DoD). Fix via `update_task`,
  retry.
- Blockers: `add_task_relation(blocked_task, blocking_task, "blocked_by")`;
  surface `blocked: true` tasks in standups.
- New work discovered mid-flight: `create_task(…, parent_task_id=…)` for
  subtasks of the current story/epic.

## 4. Write it down (notes discipline)

1. Find the right place: `list_notes(search="…")` (searches bodies too), or
   walk folders — folders are notes with `is_folder=true`, and their
   `content` says what belongs inside. Read it before filing.
2. Create: `create_note(title, content, project_id=…, parent_id=<folder>)`.
3. Edit: `get_note` → modify → `update_note(content=full_new_body)` —
   content is a full replace; never write back a truncated body.
4. Move: `update_note(note_id, parent_id=<new folder>)`;
   un-file with `move_to_root=true`.
5. Link work to knowledge: `create_task(…, source_note_id=note_id)` when a
   note spawns work; comment on the note (`create_comment("note", …)`) for
   discussion rather than editing someone's prose.

## 5. Put a document where the work can find it (Drive)

1. Look before you upload: `list_drive_files(search="acme msa")`. The Drive is
   org-wide, so the document may already be there from another project.
2. Browse if you are filing: `list_drive_folders()`, then
   `list_drive_files(folder_path="contracts/2026")`.
3. Upload something real (the normal path):
   `create_drive_upload(filename, content_type, size_bytes)` → PUT the bytes to
   `upload_url` with the returned `headers` (your own shell/HTTP) →
   `register_drive_file(object_id, name=…, folder_path="contracts/2026")`.
   Only reach for `upload_drive_file_inline` under 256 KB.
4. Point the work at it: take the `mention` string off the payload and write it
   into the task — `update_task(task_id, description=body + f"\n\nSigned: {mention}")`.
   It renders as a clickable document chip for the team.
5. Read one back: `read_drive_file(file_id)` for text/JSON/XML (windowed —
   respect `truncated`). A PDF answers `readable: false` with a `url`; fetch that
   yourself, or `view_drive_image` when it is an image.
6. Housekeeping: `update_drive_file` to rename or move, `delete_drive_file`
   (preview, then `confirm=true`) — and search descriptions for references
   first, because a deleted document leaves the link text behind.

## 6. Weekly report

1. Time window: `brain_changes_since(since=<7 days ago, tz-aware>, limit=500)`.
2. Per active project: `get_task_board(project_id)` — count by column;
   done-column items with `updated_at` in-window are the ships.
   per teammate matters only if asked — the activity feed is org-wide.
4. Meetings: `list_meetings(limit=20)` for the week's sessions;
   `meetings_chat(question="What decisions were made this week?",
   date_from=…, date_to=…)` for a cited digest (report its
   `coverage` honestly).
5. Write the report as a note (`create_note`) filed under the reports folder,
   and/or a project artifact link if it lives elsewhere.

## 7. Multi-org hygiene

- Session start: `list_my_orgs`; if more than one, confirm which workspace
  the user means before writing anything.
- Cache the chosen `org_id` and pass it on **every** call; never rely on the
  fallback.
- Cross-org work (e.g. "copy this note to the other workspace"): read from
  org A, write to org B — there are no cross-org tools; you are the bridge.
  Entity ids are org-local; never reuse them across orgs.
- If a call suddenly can't find records that were just there, your `org_id`
  dropped off — that is the signature symptom.

## 8. Safety rails when acting for a user

- Preview every 🗑️ delete (`confirm=false`) and relay what would be deleted
  before confirming — especially `delete_note` (subtree cascade!),
  `delete_task` (subtasks cascade), `delete_project`, and anything org-level.
- `delete_org` is total and unrecoverable: require the user to name the org
  explicitly; never chain it after a fallback-resolved org id.
- No-confirm destructive tools (`update_member_role`, `revoke_invite`,
  `remove_*`) — treat your own message to the user
  as the confirm step.
- `update_member_role(role="guest")` silently unassigns all their tasks —
  say so before doing it.
- Never echo secret material: invite tokens, `create_ai_key` inputs, share
  tokens beyond handing over the URL.
- Prefer `create_tasks_batch` + `idempotency_key` for imports so a retry
  can't double-create.
- After `run_automation`, re-read the task — `ok: true` does not prove the
  actions applied.

## 9. Quick reference — argument shapes that bite

| Argument | Shape |
|---|---|
| `org_id`, all `*_id` | UUID strings (never `ENG-42`) |
| Task status | `backlog` `todo` `in_progress` `in_review` `done` `cancelled` `duplicate` |
| Priority | `none` `low` `medium` `high` `urgent` |
| Kind / severity | `task` `bug` `story` `epic` / `low` `medium` `high` `critical` |
| Relation type | `blocks` `blocked_by` `related` `duplicate` `duplicate_of` `implements` `implemented_by` |
| Dates (`due_date`, `start_date`) | `YYYY-MM-DD` |
| Timestamps (`since`, `until`, `starts_at`, …) | ISO-8601 **with offset**: `2026-08-10T09:00:00+00:00` |
| Label / project-key / view color | label color `#rrggbb`; project key `^[A-Z]{2,6}$`; workflow colors are tokens (`warning`, `success`, …) |
| `list_my_tasks.filter` | `assigned` `created` `subscribed` `recent` |
| `search.types` | comma-separated ⊆ `task,note,project,meeting,cycle,module` |
| Comment `entity_type` | `task` `meeting` `note` |
