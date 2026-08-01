"""Config-as-code export + validation (COS-243)."""

from typing import Any

from jsonschema import Draft7Validator  # type: ignore[import-untyped]
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.deps import OrgContext
from elliptic.modules.config.schema import CONFIG_SCHEMA


async def export_config(session: AsyncSession, ctx: OrgContext) -> dict[str, Any]:
    """Serialize the org's declarative configuration into a canonical doc (COS-243)."""
    from elliptic.modules.projects.service import list_projects  # noqa: PLC0415
    from elliptic.modules.tasks.service import list_labels  # noqa: PLC0415
    from elliptic.modules.views.service import list_views  # noqa: PLC0415
    from elliptic.modules.workflow.service import list_statuses  # noqa: PLC0415

    projects = await list_projects(session, ctx)
    labels = await list_labels(session, ctx)
    statuses = await list_statuses(session, ctx, None)
    views = await list_views(session, ctx)

    return {
        "version": 1,
        "projects": [
            {"key": p.key, "name": p.name, "description": p.description}
            for p in projects
            if p.deleted_at is None
        ],
        "labels": [{"name": label.name, "color": label.color} for label in labels],
        "workflow_statuses": [{"name": s.name, "category": s.category.value} for s in statuses],
        "views": [{"name": v.name, "kind": getattr(v, "kind", None)} for v in views],
    }


def validate_config(document: dict[str, Any]) -> list[str]:
    """Validate a config document against the schema; return human-readable errors (COS-243)."""
    validator = Draft7Validator(CONFIG_SCHEMA)
    errors = []
    for error in sorted(validator.iter_errors(document), key=lambda e: list(e.path)):
        location = "/".join(str(p) for p in error.path) or "(root)"
        errors.append(f"{location}: {error.message}")
    return errors
