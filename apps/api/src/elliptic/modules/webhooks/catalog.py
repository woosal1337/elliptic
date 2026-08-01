"""Event catalog: the single source of truth for webhook-routable events.

``EVENT_CATALOG`` is the human-facing grouping shown in the UI. ``EVENT_MAP``
is the routing table from an activity ``(entity_type, event_type)`` tuple to a
catalog key. A key only routes if it is reachable through ``EVENT_MAP``.
"""

from typing import Any

EVENT_CATALOG: list[dict[str, Any]] = [
    {
        "domain": "Tasks",
        "events": [
            {"key": "task.created", "label": "Task created", "scope": "project"},
            {"key": "task.updated", "label": "Task updated", "scope": "project"},
            {"key": "task.assigned", "label": "Task assigned", "scope": "project"},
            {"key": "task.status_changed", "label": "Task status changed", "scope": "project"},
            {"key": "task.completed", "label": "Task completed", "scope": "project"},
            {"key": "task.deleted", "label": "Task deleted", "scope": "project"},
        ],
    },
    {
        "domain": "Comments",
        "events": [
            {"key": "comment.added", "label": "Comment added", "scope": "project"},
            {"key": "comment.updated", "label": "Comment updated", "scope": "project"},
            {"key": "comment.deleted", "label": "Comment deleted", "scope": "project"},
        ],
    },
    {
        "domain": "Notes",
        "events": [
            {"key": "note.created", "label": "Note created", "scope": "project"},
            {"key": "note.updated", "label": "Note updated", "scope": "project"},
            {"key": "note.deleted", "label": "Note deleted", "scope": "project"},
        ],
    },
    {
        "domain": "Meetings",
        "events": [
            {"key": "meeting.created", "label": "Meeting created", "scope": "project"},
            {"key": "meeting.updated", "label": "Meeting updated", "scope": "project"},
            {"key": "meeting.deleted", "label": "Meeting deleted", "scope": "project"},
            {"key": "meeting.summarized", "label": "Meeting summarized", "scope": "project"},
        ],
    },
    {
        "domain": "Projects",
        "events": [
            {"key": "project.updated", "label": "Project updated", "scope": "project"},
            {"key": "project.member_added", "label": "Project member added", "scope": "project"},
            {
                "key": "project.member_removed",
                "label": "Project member removed",
                "scope": "project",
            },
        ],
    },
    {
        "domain": "Organization",
        "events": [
            {"key": "org.member_joined", "label": "Member joined org", "scope": "org"},
            {"key": "org.member_removed", "label": "Member removed from org", "scope": "org"},
            {"key": "org.member_role_changed", "label": "Member role changed", "scope": "org"},
            {"key": "org.invite_created", "label": "Invite created", "scope": "org"},
            {"key": "org.updated", "label": "Organization updated", "scope": "org"},
        ],
    },
    {
        "domain": "Teams",
        "events": [
            {"key": "team.created", "label": "Team created", "scope": "org"},
            {"key": "team.member_added", "label": "Team member added", "scope": "org"},
            {"key": "team.member_removed", "label": "Team member removed", "scope": "org"},
        ],
    },
]


EVENT_MAP: dict[tuple[str, str], str] = {
    ("task", "created"): "task.created",
    ("task", "updated"): "task.updated",
    ("task", "assigned"): "task.assigned",
    ("task", "status_changed"): "task.status_changed",
    ("task", "deleted"): "task.deleted",
    ("note", "created"): "note.created",
    ("note", "updated"): "note.updated",
    ("note", "deleted"): "note.deleted",
    ("meeting", "created"): "meeting.created",
    ("meeting", "updated"): "meeting.updated",
    ("meeting", "deleted"): "meeting.deleted",
    ("meeting", "summarized"): "meeting.summarized",
    ("project", "updated"): "project.updated",
    ("project", "member_added"): "project.member_added",
    ("project", "member_removed"): "project.member_removed",
    ("organization", "member_added"): "org.member_joined",
    ("organization", "member_removed"): "org.member_removed",
    ("organization", "member_role_changed"): "org.member_role_changed",
    ("organization", "invite_created"): "org.invite_created",
    ("organization", "updated"): "org.updated",
    ("team", "created"): "team.created",
    ("team", "member_added"): "team.member_added",
    ("team", "member_removed"): "team.member_removed",
    ("task", "commented"): "comment.added",
    ("meeting", "commented"): "comment.added",
    ("note", "commented"): "comment.added",
    ("task", "comment_updated"): "comment.updated",
    ("meeting", "comment_updated"): "comment.updated",
    ("note", "comment_updated"): "comment.updated",
    ("task", "comment_deleted"): "comment.deleted",
    ("meeting", "comment_deleted"): "comment.deleted",
    ("note", "comment_deleted"): "comment.deleted",
}


ALL_EVENT_KEYS: set[str] = {event["key"] for group in EVENT_CATALOG for event in group["events"]}

EVENT_LABELS: dict[str, str] = {
    event["key"]: event["label"] for group in EVENT_CATALOG for event in group["events"]
}

EVENT_SCOPE: dict[str, str] = {
    event["key"]: event["scope"] for group in EVENT_CATALOG for event in group["events"]
}

ORG_SCOPED_KEYS: set[str] = {key for key, scope in EVENT_SCOPE.items() if scope == "org"}


_MEMBER_VERBS = {"member_added", "member_removed", "member_joined", "member_role_changed"}
_VERB_CATEGORY = {
    "created": "created",
    "completed": "completed",
    "assigned": "assigned",
    "status_changed": "status_changed",
    "deleted": "deleted",
}


def category_for(key: str) -> str:
    """Return the styling category derived from a catalog key's domain and verb."""
    domain, _, verb = key.partition(".")
    if domain == "comment":
        return "comment"
    if verb in _MEMBER_VERBS:
        return "member"
    return _VERB_CATEGORY.get(verb, "updated")
