"""The OAuth scope catalog for the CompanyOS MCP company brain."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ScopeDef:
    """One grantable scope with its human-readable consent metadata."""

    scope: str
    domain: str
    label: str
    elevated: bool
    baseline: bool


SCOPE_CATALOG: tuple[ScopeDef, ...] = (
    ScopeDef("tasks:read", "Tasks", "Read tasks, boards, labels and triage", False, True),
    ScopeDef("tasks:write", "Tasks", "Create, update, move, label and delete tasks", False, False),
    ScopeDef("notes:read", "Notes", "Read notes across your projects", False, True),
    ScopeDef("notes:write", "Notes", "Create and edit notes", False, False),
    ScopeDef("meetings:read", "Meetings", "Read meetings, transcripts and summaries", False, True),
    ScopeDef("meetings:write", "Meetings", "Create, edit and summarize meetings", False, False),
    ScopeDef("events:read", "Calendar", "Read your calendar events", False, True),
    ScopeDef("events:write", "Calendar", "Create and edit calendar events", False, False),
    ScopeDef("activity:read", "Activity", "See what changed and where you left off", False, True),
    ScopeDef("brain:read", "Brain", "Catch-me-up, search and open threads", False, True),
    ScopeDef("agents:read", "Agents", "See the org's AI agents and their runs", False, True),
    ScopeDef("agents:write", "Agents", "Create, update, pause and budget AI agents", True, False),
    ScopeDef(
        "sources:read", "Connected sources", "Read GitHub commits and pull requests", False, True
    ),
    ScopeDef("sources:write", "Connected sources", "Link commits and PRs to tasks", False, False),
    ScopeDef(
        "sources:manage", "Connected sources", "Connect and disconnect repositories", True, False
    ),
    ScopeDef("agents:keys", "Agents", "Create and revoke AI agent API keys", True, False),
    ScopeDef(
        "comments:read", "Comments", "Read comments across tasks, notes and meetings", False, True
    ),
    ScopeDef("comments:write", "Comments", "Post, edit and delete comments", False, False),
    ScopeDef(
        "notifications:read",
        "Notifications",
        "Read your notifications and unread count",
        False,
        True,
    ),
    ScopeDef(
        "notifications:write",
        "Notifications",
        "Mark read, archive and snooze notifications",
        False,
        False,
    ),
    ScopeDef("teams:read", "Teams", "Read teams and their members", False, True),
    ScopeDef("teams:write", "Teams", "Create, edit, delete teams and manage members", False, False),
    ScopeDef("views:read", "Views", "Read saved board views", False, True),
    ScopeDef("views:write", "Views", "Create, edit and delete saved views", False, False),
    ScopeDef("vocabulary:read", "Vocabulary", "Read the org glossary", False, True),
    ScopeDef("vocabulary:write", "Vocabulary", "Add, edit and remove glossary terms", False, False),
    ScopeDef("workflow:read", "Workflow", "Read custom workflow statuses", False, True),
    ScopeDef(
        "workflow:write", "Workflow", "Create, edit and delete workflow statuses", False, False
    ),
    ScopeDef("automation:read", "Automation", "Read automation rules", False, True),
    ScopeDef(
        "automation:write",
        "Automation",
        "Create, edit, delete and run automation rules",
        False,
        False,
    ),
    ScopeDef(
        "integrations:read", "Integrations", "Read connected integrations like Slack", False, True
    ),
    ScopeDef(
        "integrations:manage",
        "Integrations",
        "Connect integrations and post to Slack",
        True,
        False,
    ),
    ScopeDef("profile:read", "Profile", "Read your own user profile", False, True),
    ScopeDef("profile:write", "Profile", "Update your own user profile", False, False),
    ScopeDef("org:read", "Organization", "Read org details, members and invites", False, True),
    ScopeDef(
        "org:manage",
        "Organization",
        "Update org, manage members and invitations",
        True,
        False,
    ),
    ScopeDef("org:create", "Organization", "Create new organizations", True, False),
    ScopeDef(
        "orgs:all",
        "Organization",
        "Act across all organizations you belong to",
        True,
        False,
    ),
)

_BY_SCOPE: dict[str, ScopeDef] = {definition.scope: definition for definition in SCOPE_CATALOG}
ALL_SCOPES: frozenset[str] = frozenset(_BY_SCOPE)
BASELINE_SCOPES: frozenset[str] = frozenset(d.scope for d in SCOPE_CATALOG if d.baseline)


def parse_scope(raw: str | None) -> list[str]:
    """Split a space-delimited scope string into a deduplicated, known-scope list."""
    if not raw:
        return []
    seen: dict[str, None] = {}
    for token in raw.split():
        if token in ALL_SCOPES and token not in seen:
            seen[token] = None
    return list(seen)


def intersect_scopes(granted: list[str], requested: list[str]) -> list[str]:
    """Return requested scopes that are also granted, preserving catalog order."""
    granted_set = set(granted)
    requested_set = set(requested)
    return [d.scope for d in SCOPE_CATALOG if d.scope in granted_set and d.scope in requested_set]


def resolve_granted_scopes(selected: list[str], requested: list[str]) -> list[str]:
    """Return the scopes a consent decision grants, in catalog order.

    A client that requested specific scopes caps the grant at that request. A
    client that requested none left the grant to the user, so the decision is
    exactly the known scopes the user selected on the consent screen."""
    if requested:
        return intersect_scopes(selected, requested)
    selected_set = set(selected)
    return [d.scope for d in SCOPE_CATALOG if d.scope in selected_set]
