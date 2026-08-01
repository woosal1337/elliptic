"""Seed the development database with a demo user, org, team, project, and content."""

import asyncio
from datetime import UTC, datetime, timedelta

from loguru import logger
from sqlalchemy import select

from elliptic.core.database import engine, session_factory
from elliptic.core.models_registry import (
    Meeting,
    Note,
    Organization,
    OrganizationMember,
    Project,
    ProjectMember,
    Task,
    Team,
    TeamMember,
    TranscriptSegment,
    User,
)
from elliptic.core.security import hash_password
from elliptic.modules.meetings.models import MeetingSource
from elliptic.modules.orgs.models import OrgRole
from elliptic.modules.tasks.models import TaskPriority, TaskStatus

DEMO_EMAIL = "ege@elliptic.sh"
DEMO_PASSWORD = "password"

TASKS: list[tuple[str, TaskStatus, TaskPriority]] = [
    ("Set up CI pipeline", TaskStatus.DONE, TaskPriority.HIGH),
    ("Design the org settings page", TaskStatus.IN_REVIEW, TaskPriority.MEDIUM),
    ("Implement BYOK key rotation", TaskStatus.IN_PROGRESS, TaskPriority.URGENT),
    ("Write onboarding docs", TaskStatus.IN_PROGRESS, TaskPriority.LOW),
    ("Folio import edge cases", TaskStatus.TODO, TaskPriority.HIGH),
    ("Meeting chat streaming v2", TaskStatus.TODO, TaskPriority.MEDIUM),
    ("Audit log retention policy", TaskStatus.BACKLOG, TaskPriority.NONE),
    ("Evaluate RLS rollout", TaskStatus.BACKLOG, TaskPriority.LOW),
]

SEGMENTS: list[tuple[str, float, float, str]] = [
    ("Ege", 0.0, 14.5, "Welcome everyone, today we are reviewing the CompanyOS launch plan."),
    ("Mira", 14.5, 31.0, "The API scaffold is done, tenancy isolation tests are green."),
    ("Ege", 31.0, 52.0, "Great. Next milestone is the BYOK flow and the meeting summaries."),
    ("Mira", 52.0, 70.0, "I will own the provider integration, target is end of the sprint."),
]


async def seed() -> None:
    """Insert demo data if the demo user does not already exist."""
    async with session_factory() as session:
        existing = await session.scalar(select(User).where(User.email == DEMO_EMAIL))
        if existing is not None:
            logger.info("Demo user already exists, skipping seed")
            return
        user = User(
            email=DEMO_EMAIL,
            password_hash=hash_password(DEMO_PASSWORD),
            full_name="Ege Celebi",
        )
        session.add(user)
        await session.flush()

        org = Organization(name="Demo Org", slug="demo-org", description="Seeded demo org")
        session.add(org)
        await session.flush()
        session.add(OrganizationMember(org_id=org.id, user_id=user.id, role=OrgRole.OWNER))

        team = Team(org_id=org.id, name="Core", description="Core product team")
        session.add(team)
        await session.flush()
        session.add(TeamMember(org_id=org.id, team_id=team.id, user_id=user.id))

        project = Project(
            org_id=org.id,
            team_id=team.id,
            name="Demo Project",
            key="DEMO",
            description="Seeded demo project",
            task_counter=len(TASKS),
        )
        session.add(project)
        await session.flush()
        session.add(ProjectMember(org_id=org.id, project_id=project.id, user_id=user.id))

        for index, (title, task_status, priority) in enumerate(TASKS, start=1):
            session.add(
                Task(
                    org_id=org.id,
                    project_id=project.id,
                    number=index,
                    title=title,
                    status=task_status,
                    priority=priority,
                    assignee_id=user.id if index % 2 == 0 else None,
                    sort_order=index * 1024.0,
                    created_by=user.id,
                )
            )

        meeting = Meeting(
            org_id=org.id,
            project_id=project.id,
            title="Launch planning sync",
            started_at=datetime.now(UTC) - timedelta(days=1),
            duration_seconds=70,
            source=MeetingSource.FOLIO,
            external_attendees=["Mira"],
            created_by=user.id,
        )
        session.add(meeting)
        await session.flush()
        for position, (speaker, start, end, text) in enumerate(SEGMENTS):
            session.add(
                TranscriptSegment(
                    meeting_id=meeting.id,
                    org_id=org.id,
                    speaker=speaker,
                    start_seconds=start,
                    end_seconds=end,
                    text=text,
                    position=position,
                )
            )

        session.add(
            Note(
                org_id=org.id,
                project_id=project.id,
                title="Launch checklist",
                content="- [x] Scaffold\n- [ ] BYOK flow\n- [ ] Meeting summaries\n",
                created_by=user.id,
                updated_by=user.id,
            )
        )

        await session.commit()
        logger.info("Seeded demo data: {} / {}", DEMO_EMAIL, DEMO_PASSWORD)


async def main() -> None:
    """Run the seed and dispose the engine."""
    try:
        await seed()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
