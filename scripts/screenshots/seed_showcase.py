#!/usr/bin/env python3
"""Seed a clean showcase workspace for the README screenshots.

The board in `apps/api/scripts/seed.py` is for development, and it holds 60
"PAGING filler" rows. Those look bad in a screenshot. This script builds a
separate workspace with people, projects, work items, meeting transcripts,
notes, and Drive documents, so every captured screen looks like a real team at
work.

All content here is invented. No live workspace data goes into the images.

    scripts/dev-stack.sh up
    apps/api/.venv/bin/python scripts/screenshots/seed_showcase.py

Run it with the API virtual environment. It needs Python 3.11 or later.

The Drive step uploads through the API's object storage, so the API must run
with `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and
`R2_BUCKET` set. `scripts/screenshots/README.md` says how.

It prints the org id, the sign-in email, and the password, and it writes the
same values to `showcase.json` for the capture scripts to read.

Running it again deletes the workspace it made last time and builds a new one.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

API = "http://localhost:8000/api/v1"
PASSWORD = "showcase-2026"
OUT = Path(__file__).with_name("showcase.json")

TODAY = date(2026, 8, 23)
NOW = datetime(2026, 8, 23, 9, 0, tzinfo=UTC)


# --------------------------------------------------------------------------- http


def call(
    method: str, path: str, body: dict[str, Any] | None = None, token: str | None = None
) -> Any:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{API}{path}", data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read()).get("data")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()[:400]
        raise SystemExit(f"{method} {path} failed ({exc.code}): {detail}") from exc


def register(email: str, name: str) -> str:
    """Register the account if it is new, then return its access token."""
    try:
        call(
            "POST",
            "/auth/register",
            {"email": email, "password": PASSWORD, "full_name": name},
        )
    except SystemExit:
        pass  # already registered on an earlier run
    login = call("POST", "/auth/login", {"email": email, "password": PASSWORD})
    return login["tokens"]["access_token"]


# --------------------------------------------------------------------------- people

PEOPLE = [
    ("ada.reyes@northwind.dev", "Ada Reyes"),
    ("kenji.watanabe@northwind.dev", "Kenji Watanabe"),
    ("nour.haddad@northwind.dev", "Nour Haddad"),
    ("sam.delgado@northwind.dev", "Sam Delgado"),
    ("atlas@northwind.dev", "Atlas (agent)"),
    ("scout@northwind.dev", "Scout (agent)"),
]

# --------------------------------------------------------------------------- work

# (title, status, priority, kind, assignee index, labels, description)
PLATFORM: list[tuple[str, str, str, str, int, list[str], str]] = [
    (
        "Stream board updates over the realtime relay",
        "in_progress",
        "urgent",
        "story",
        1,
        ["Realtime"],
        "Two people on the same board must see each card move without a reload.\n\n"
        "- [x] Relay fan-out per organization\n"
        "- [x] Reconnect with a cursor\n"
        "- [ ] Drop the poll on the board view",
    ),
    (
        "Agents lose the org scope on a token refresh",
        "in_progress",
        "urgent",
        "bug",
        4,
        ["MCP", "Agents"],
        "After a refresh the MCP session falls back to the first organization "
        "the account joined. Every later call then writes to the wrong board.\n\n"
        "**Fix:** carry `org_id` in the refresh grant.",
    ),
    (
        "Cache the task board query per organization",
        "in_progress",
        "high",
        "task",
        2,
        ["Performance"],
        "The board issues one query per column. Collapse it to a single grouped "
        "read and cache it for the length of the request.",
    ),
    (
        "Write the OAuth consent screen copy",
        "in_progress",
        "medium",
        "task",
        3,
        ["Docs"],
        "An agent asks for a scope. The person granting it must understand what "
        "the agent can read and what it can write.",
    ),
    (
        "Give every work item a stable public identifier",
        "todo",
        "high",
        "story",
        0,
        ["Platform"],
        "`PLAT-214` must keep pointing at the same item after a project move.",
    ),
    (
        "Rate-limit the MCP tool surface per token",
        "todo",
        "high",
        "task",
        1,
        ["MCP", "Security"],
        "One runaway agent loop must not take the workspace down for the team.",
    ),
    (
        "Add SCIM group sync for the enterprise plan",
        "todo",
        "medium",
        "story",
        2,
        ["Enterprise"],
        "Groups from the identity provider map to Elliptic teams.",
    ),
    (
        "Search misses titles with a hyphen",
        "todo",
        "medium",
        "bug",
        3,
        ["Search"],
        'Searching for "re-index" returns nothing. The tokenizer splits on the '
        "hyphen and then drops both halves as stop words.",
    ),
    (
        "Publish a read-only board link",
        "todo",
        "low",
        "task",
        5,
        ["Sharing"],
        "A link that shows the board and hides every private field.",
    ),
    (
        "Move the outbox to a single writer",
        "in_review",
        "high",
        "task",
        1,
        ["Platform"],
        "Two workers publish the same event when a deploy overlaps.",
    ),
    (
        "Document the self-hosting upgrade path",
        "in_review",
        "medium",
        "task",
        3,
        ["Docs"],
        "From one tagged release to the next, with the migration step called out.",
    ),
    (
        "Ship the MCP server behind OAuth",
        "done",
        "urgent",
        "epic",
        0,
        ["MCP", "Agents"],
        "Agents reach the whole workspace over one authenticated server.",
    ),
    (
        "Add per-organization workflow states",
        "done",
        "high",
        "story",
        2,
        ["Platform"],
        "Each organization names its own columns.",
    ),
    (
        "Attribute every transcript line to a speaker",
        "done",
        "medium",
        "task",
        4,
        ["Meetings"],
        "The transcript now carries the speaker and the timestamp on each line.",
    ),
    (
        "Turn a meeting decision into a task",
        "done",
        "medium",
        "story",
        5,
        ["Meetings", "Agents"],
        "The new task keeps a link back to the minute it came from.",
    ),
    (
        "Sign webhook payloads",
        "backlog",
        "medium",
        "task",
        1,
        ["Security"],
        "HMAC with a per-endpoint secret, and a replay window.",
    ),
    (
        "Group the activity feed by day",
        "backlog",
        "low",
        "task",
        3,
        ["Platform"],
        "A long feed needs a date break to stay readable.",
    ),
    (
        "Import a board from a CSV export",
        "backlog",
        "low",
        "story",
        2,
        ["Platform"],
        "A team must be able to leave the old tool in one step.",
    ),
]

MOBILE: list[tuple[str, str, str, str, int, list[str], str]] = [
    (
        "Offline queue for task edits",
        "in_progress",
        "urgent",
        "story",
        3,
        ["Mobile"],
        "An edit made on a train must land when the phone reaches a network.",
    ),
    (
        "Push notification for a mention",
        "in_progress",
        "high",
        "task",
        1,
        ["Mobile"],
        "One notification per mention, and it opens the comment.",
    ),
    (
        "The board scroll jumps after a status change",
        "todo",
        "high",
        "bug",
        2,
        ["Mobile"],
        "The list re-sorts under the finger. Keep the anchor row in place.",
    ),
    (
        "Widget for the tasks due today",
        "todo",
        "medium",
        "story",
        0,
        ["Mobile"],
        "A home-screen widget with the three items that need a decision.",
    ),
    (
        "Sign in with the workspace identity provider",
        "in_review",
        "high",
        "task",
        4,
        ["Mobile", "Enterprise"],
        "The same SAML path the web app uses.",
    ),
    (
        "Dark mode across every screen",
        "done",
        "medium",
        "task",
        3,
        ["Mobile"],
        "The theme follows the system setting.",
    ),
    (
        "Ship the first TestFlight build",
        "done",
        "urgent",
        "epic",
        0,
        ["Mobile"],
        "The team reviews the board from a phone.",
    ),
    (
        "Attach a photo to a task from the camera",
        "backlog",
        "low",
        "story",
        2,
        ["Mobile"],
        "A field report needs a picture more than a paragraph.",
    ),
]

# A bug will not save without a severity band.
SEVERITY = {
    "urgent": "critical",
    "high": "high",
    "medium": "medium",
    "low": "low",
    "none": "low",
}

LABELS = [
    ("Platform", "#5b6ee1"),
    ("MCP", "#22a06b"),
    ("Agents", "#8b5cf6"),
    ("Mobile", "#e2725b"),
    ("Realtime", "#0ea5e9"),
    ("Performance", "#f59e0b"),
    ("Security", "#dc2626"),
    ("Enterprise", "#0f766e"),
    ("Meetings", "#a855f7"),
    ("Docs", "#64748b"),
    ("Search", "#2563eb"),
    ("Sharing", "#db2777"),
]

# Checklists on the two work items the README shows close up.
DOD: dict[str, list[tuple[str, bool]]] = {
    "PLAT-2": [
        ("The refresh grant carries the organization id", True),
        ("A refreshed session keeps its scope in the tool tests", True),
        ("The old sessions expire on deploy", False),
    ],
    "PLAT-1": [
        ("Relay fan-out per organization", True),
        ("Reconnect with a cursor", True),
        ("Drop the poll on the board view", False),
    ],
}

# (parent identifier, project key, [(title, status, assignee index)])
SUBTASKS: list[tuple[str, str, list[tuple[str, str, int]]]] = [
    (
        "PLAT-2",
        "PLAT",
        [
            ("Carry the org id through the refresh grant", "in_progress", 4),
            ("Add a scope test to the MCP suite", "todo", 1),
            ("Expire the sessions issued before the fix", "todo", 4),
        ],
    ),
    (
        "PLAT-1",
        "PLAT",
        [
            ("Fan out per organization", "done", 1),
            ("Reconnect with a cursor", "done", 1),
            ("Drop the board poll", "in_progress", 2),
        ],
    ),
]

# (task identifier, [(person index, text)])
COMMENTS: list[tuple[str, list[tuple[int, str]]]] = [
    (
        "PLAT-2",
        [
            (
                4,
                "I reproduced it. After the refresh my session reports the first "
                "organization the account joined, not the one I was called with.",
            ),
            (
                0,
                "That explains the two stray cards on the Mobile board yesterday. "
                "Treat it as a blocker for the beta.",
            ),
            (
                1,
                "The grant drops every claim except the subject. I will carry "
                "`org_id` through and add a test that refreshes mid-session.",
            ),
            (4, "Confirmed on the branch. My scope survives a refresh now."),
        ],
    ),
    (
        "PLAT-1",
        [
            (1, "Fan-out is on staging. No reconnect storms in 48 hours."),
            (
                2,
                "Two browsers, one board, no reload. The poll can go as soon as "
                "the cursor lands.",
            ),
        ],
    ),
    (
        "PLAT-6",
        [
            (
                5,
                "I hit the tool surface 400 times in a minute while testing a loop. "
                "Nothing stopped me. A per-token budget would have.",
            ),
            (0, "Good catch. Per token, not per organization."),
        ],
    ),
]

LAUNCH_SYNC = [
    (
        "Ada Reyes",
        "We have two weeks before the agent beta. Let us agree on the cut line.",
    ),
    (
        "Kenji Watanabe",
        "The relay is the risk. Board updates still take a reload on a slow link.",
    ),
    ("Ada Reyes", "How far is the fan-out work?"),
    (
        "Kenji Watanabe",
        "The fan-out lands today. The reconnect cursor needs one more day.",
    ),
    (
        "Nour Haddad",
        "The board query is the other half. One grouped read instead of six.",
    ),
    ("Ada Reyes", "Then those two are in. What comes out?"),
    ("Sam Delgado", "SCIM group sync. No beta customer asked for it yet."),
    ("Ada Reyes", "Agreed. SCIM moves to the next cycle."),
    ("Nour Haddad", "One more. Agents lose the org scope after a token refresh."),
    ("Ada Reyes", "That one is a blocker. It writes to the wrong board."),
    ("Kenji Watanabe", "I will carry the org id in the refresh grant. Half a day."),
    (
        "Ada Reyes",
        "Good. Decision: relay, board query, and the refresh fix. SCIM waits.",
    ),
]

MOBILE_REVIEW = [
    (
        "Sam Delgado",
        "The offline queue holds an edit for as long as the phone is dark.",
    ),
    (
        "Nour Haddad",
        "What happens when the same task changed on the web in the meantime?",
    ),
    ("Sam Delgado", "Last write wins today. I would rather show the conflict."),
    ("Ada Reyes", "Show it. A silent overwrite costs more than a prompt."),
    ("Sam Delgado", "Then I need a version on the task payload. Small API change."),
    ("Kenji Watanabe", "The payload already carries `updated_at`. Use it."),
    ("Ada Reyes", "Do that. Ship the queue with the conflict prompt."),
]

SECURITY_REVIEW = [
    ("Nour Haddad", "Three things: token scope, rate limits, and the audit trail."),
    ("Kenji Watanabe", "Scope is per organization now, and it survives a refresh."),
    (
        "Nour Haddad",
        "Rate limits are per organization, not per token. One agent can still starve the rest.",
    ),
    ("Ada Reyes", "Move it to the token. That is the unit that misbehaves."),
    (
        "Nour Haddad",
        "The audit trail records the actor, so an agent action is never anonymous.",
    ),
    ("Ada Reyes", "Good. Write the rate-limit change up and put it on the board."),
]

MEETING_PLAN: list[tuple[str, int, int, list[tuple[str, str]], str]] = [
    (
        "Launch sync — agent beta",
        2,
        4,
        LAUNCH_SYNC,
        "Decision: the relay, the board query, and the refresh fix go into the "
        "beta. SCIM group sync waits for the next cycle.",
    ),
    (
        "Mobile review — offline edits",
        5,
        4,
        MOBILE_REVIEW,
        "Decision: the offline queue ships with a conflict prompt, keyed on "
        "`updated_at`. No silent overwrite.",
    ),
    (
        "Security review — the agent surface",
        9,
        3,
        SECURITY_REVIEW,
        "Decision: rate limits move from the organization to the token. The "
        "audit trail already names the actor.",
    ),
]

# (folder path, filename, content type, body)
DOCUMENTS: list[tuple[str, str, str, str]] = [
    (
        "",
        "agent-beta-plan.md",
        "text/markdown",
        "# Agent beta plan\n\nCut line, owners, and dates.\n",
    ),
    (
        "",
        "security-review.md",
        "text/markdown",
        "# Security review\n\nScopes, rate limits, and audit trails.\n",
    ),
    (
        "",
        "pricing-draft.md",
        "text/markdown",
        "# Pricing draft\n\nSeats, agents, and the self-hosted tier.\n",
    ),
    (
        "specs",
        "mcp-tool-surface.md",
        "text/markdown",
        "# MCP tool surface\n\nOne tool per resource, scoped per token.\n",
    ),
    (
        "specs",
        "realtime-relay.md",
        "text/markdown",
        "# Realtime relay\n\nFan-out per organization, cursor on reconnect.\n",
    ),
    (
        "specs",
        "offline-queue.md",
        "text/markdown",
        "# Offline queue\n\nQueue an edit, replay it on the next network.\n",
    ),
    (
        "design",
        "board-redesign.md",
        "text/markdown",
        "# Board redesign\n\nColumn density and the card anatomy.\n",
    ),
    (
        "design",
        "consent-screen.md",
        "text/markdown",
        "# Consent screen\n\nWhat the agent reads, and what it writes.\n",
    ),
    (
        "contracts",
        "dpa-template.md",
        "text/markdown",
        "# Data processing addendum\n\nTemplate for the enterprise plan.\n",
    ),
]

NOTES = [
    (
        "Agent beta — cut line",
        "\U0001f6a2",
        """# Agent beta — cut line

Decided in the launch sync on 21 August.

## In

- Realtime relay fan-out, with the reconnect cursor
- One grouped board query per organization
- The org scope carried through a token refresh

## Out

- SCIM group sync. It moves to the next cycle.

## Open

- Who writes the consent screen copy? Sam takes a first pass.
""",
    ),
    (
        "How an agent joins a workspace",
        "\U0001f916",
        """# How an agent joins a workspace

1. The agent asks for the MCP server URL.
2. The person approves the scopes on the consent screen.
3. The grant carries the organization id, so every later call stays in scope.
4. The agent appears in the member list, with its own activity trail.

An agent gets the same permissions model a person gets. Nothing more.
""",
    ),
    (
        "Weekly team notes",
        "\U0001f4dd",
        """# Weekly team notes

## 23 August

- The relay went out to staging. No reconnect storms in 48 hours.
- Search still misses hyphenated titles. Nour has the tokenizer.
- Two agents now run the triage board without help.

## 16 August

- The board query dropped from 340 ms to 41 ms.
- The mobile app took its first TestFlight build.
""",
    ),
]


# --------------------------------------------------------------------------- build


def main() -> None:
    print("registering people…")
    tokens: dict[str, str] = {}
    for email, name in PEOPLE:
        tokens[email] = register(email, name)

    owner_email = PEOPLE[0][0]
    owner = tokens[owner_email]

    me = call("GET", "/auth/me", token=owner)
    print(f"  owner: {me['full_name']} <{me['email']}>")

    for existing in call("GET", "/orgs", token=owner) or []:
        if existing["name"] == "Northwind":
            print(f"  removing the earlier Northwind org ({existing['id']})")
            call("DELETE", f"/orgs/{existing['id']}", token=owner)

    org = call("POST", "/orgs", {"name": "Northwind"}, token=owner)
    org_id = org["id"]
    print(f"  org: {org['name']} ({org_id})")

    print("adding the team…")
    for email, _name in PEOPLE[1:]:
        invite = call(
            "POST",
            f"/orgs/{org_id}/invites",
            {"email": email, "role": "member"},
            token=owner,
        )
        call("POST", "/invites/accept", {"token": invite["token"]}, token=tokens[email])

    members = call("GET", f"/orgs/{org_id}/members", token=owner)
    rows = members if isinstance(members, list) else members["items"]
    by_email = {m["email"]: m["user_id"] if "user_id" in m else m["id"] for m in rows}
    user_ids = [by_email[email] for email, _ in PEOPLE]
    print(f"  {len(user_ids)} members")

    print("creating labels…")
    label_ids: dict[str, str] = {}
    for name, color in LABELS:
        label = call(
            "POST",
            f"/orgs/{org_id}/labels",
            {"name": name, "color": color},
            token=owner,
        )
        label_ids[name] = label["id"]

    print("creating teams…")
    team = call(
        "POST",
        f"/orgs/{org_id}/teams",
        {
            "name": "Core",
            "description": "The platform, the API, and the agent surface.",
            "lead_id": user_ids[0],
        },
        token=owner,
    )
    for uid in user_ids[1:4]:
        call(
            "POST",
            f"/orgs/{org_id}/teams/{team['id']}/members",
            {"user_id": uid},
            token=owner,
        )

    print("creating projects…")
    projects: dict[str, str] = {}
    task_ids: dict[str, str] = {}
    plan = [
        (
            "Platform",
            "PLAT",
            "The API, the realtime relay, and the agent surface.",
            TODAY + timedelta(days=21),
            PLATFORM,
        ),
        (
            "Mobile",
            "MOB",
            "The iOS and Android app, built on React Native.",
            TODAY + timedelta(days=45),
            MOBILE,
        ),
    ]
    for name, key, description, target, items in plan:
        project = call(
            "POST",
            f"/orgs/{org_id}/projects",
            {
                "name": name,
                "key": key,
                "description": description,
                "team_id": team["id"],
                "lead_id": user_ids[0],
                "target_date": target.isoformat(),
            },
            token=owner,
        )
        projects[key] = project["id"]
        for uid in user_ids[1:]:
            try:
                call(
                    "POST",
                    f"/orgs/{org_id}/projects/{project['id']}/members",
                    {"user_id": uid},
                    token=owner,
                )
            except SystemExit:
                pass

        print(f"  {key}: {len(items)} work items")
        for offset, (title, status, priority, kind, who, labels, body) in enumerate(
            items
        ):
            created = call(
                "POST",
                f"/orgs/{org_id}/projects/{project['id']}/tasks",
                {
                    "title": title,
                    "description": body,
                    "status": status,
                    "priority": priority,
                    "kind": kind,
                    **({"severity": SEVERITY[priority]} if kind == "bug" else {}),
                    "assignee_id": user_ids[who],
                    "due_date": (TODAY + timedelta(days=3 + offset)).isoformat(),
                    "label_ids": [
                        label_ids[name] for name in labels if name in label_ids
                    ],
                },
                token=owner,
            )
            task_ids[created["identifier"]] = created["id"]

    print("adding sub-tasks, checklists, and comments…")
    for identifier, dod in DOD.items():
        call(
            "PATCH",
            f"/orgs/{org_id}/tasks/{task_ids[identifier]}",
            {"dod_items": [{"text": text, "done": done} for text, done in dod]},
            token=owner,
        )

    for identifier, project_key, subtasks in SUBTASKS:
        for title, status, who in subtasks:
            call(
                "POST",
                f"/orgs/{org_id}/projects/{projects[project_key]}/tasks",
                {
                    "title": title,
                    "status": status,
                    "priority": "medium",
                    "assignee_id": user_ids[who],
                    "parent_task_id": task_ids[identifier],
                },
                token=owner,
            )

    for identifier, thread in COMMENTS:
        for who, text in thread:
            call(
                "POST",
                f"/orgs/{org_id}/comments",
                {
                    "entity_type": "task",
                    "entity_id": task_ids[identifier],
                    "content": text,
                },
                token=tokens[PEOPLE[who][0]],
            )

    print("importing the meeting transcripts…")
    meeting_ids: list[str] = []
    for title, days_ago, attendee_count, transcript, summary in MEETING_PLAN:
        segments = []
        at = 0.0
        for speaker, text in transcript:
            length = 4.0 + len(text) / 14.0
            segments.append(
                {
                    "speaker": speaker,
                    "start_seconds": round(at, 1),
                    "end_seconds": round(at + length, 1),
                    "text": text,
                }
            )
            at += length + 0.6
        meeting = call(
            "POST",
            f"/orgs/{org_id}/meetings/import",
            {
                "title": title,
                "started_at": (NOW - timedelta(days=days_ago)).isoformat(),
                "duration_seconds": int(at),
                "attendees": [name for _e, name in PEOPLE[:attendee_count]],
                "segments": segments,
                "markdown": summary,
            },
            token=owner,
        )
        meeting_ids.append(meeting["id"])

    print("uploading documents…")
    for folder, filename, content_type, body in DOCUMENTS:
        presign = call(
            "POST",
            f"/orgs/{org_id}/drive/presign-upload",
            {
                "filename": filename,
                "content_type": content_type,
                "size_bytes": len(body.encode()),
            },
            token=owner,
        )
        put = urllib.request.Request(
            presign["upload_url"], data=body.encode(), method="PUT"
        )
        put.add_header("Content-Type", content_type)
        with urllib.request.urlopen(put, timeout=30):
            pass
        call(
            "POST",
            f"/orgs/{org_id}/drive/files",
            {"object_id": presign["object_id"], "folder_path": folder},
            token=owner,
        )

    print("creating notes…")
    note_ids: list[str] = []
    for title, icon, content in NOTES:
        note = call(
            "POST",
            f"/orgs/{org_id}/notes",
            {"title": title, "icon": icon, "content": content},
            token=owner,
        )
        note_ids.append(note["id"])

    OUT.write_text(
        json.dumps(
            {
                "org_id": org_id,
                "email": owner_email,
                "password": PASSWORD,
                "projects": projects,
                "meeting_id": meeting_ids[0],
                "note_id": note_ids[0],
            },
            indent=2,
        )
        + "\n"
    )
    print(f"\nwrote {OUT}")
    print(f"sign in at http://localhost:3000/login as {owner_email} / {PASSWORD}")


if __name__ == "__main__":
    sys.exit(main())
