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

TASKS: list[tuple[str, TaskStatus, TaskPriority, str]] = [
    # Deliberately silly, so it is obvious at a glance that you are looking at
    # seeded data and not somebody's real board.
    (
        "Teach the standup bot to read the room",
        TaskStatus.IN_PROGRESS,
        TaskPriority.URGENT,
        'It currently replies **"great question!"** to silence. Twice.',
    ),
    (
        "Rename `utils2.ts` before anyone notices",
        TaskStatus.IN_PROGRESS,
        TaskPriority.HIGH,
        "There is also a `utils2.final.ts`. We do not talk about it.",
    ),
    (
        "Convince the CSS to centre the div",
        TaskStatus.IN_PROGRESS,
        TaskPriority.MEDIUM,
        "Tried `flex`. Tried `grid`. Tried asking nicely.\n\nNext: `margin: 0 auto` and a candle.",
    ),
    (
        "Reply to the email from three weeks ago",
        TaskStatus.IN_PROGRESS,
        TaskPriority.LOW,
        'Opening line options:\n\n- "Apologies for the delay"\n- "Circling back"\n- emigrate',
    ),
    (
        "Add a loading spinner that spins the right way",
        TaskStatus.TODO,
        TaskPriority.HIGH,
        "Widdershins is apparently *not* a supported value.",
    ),
    (
        "Investigate why the tests pass on Fridays",
        TaskStatus.TODO,
        TaskPriority.URGENT,
        "Hypothesis: the tests are also tired.",
    ),
    (
        "Write a changelog nobody will read",
        TaskStatus.TODO,
        TaskPriority.MEDIUM,
        "Include one lie to see if anyone is paying attention.",
    ),
    (
        "Buy a bigger monitor to fit the stack trace",
        TaskStatus.TODO,
        TaskPriority.LOW,
        "Current record: 41 frames, 9 of them `node_modules`.",
    ),
    (
        "Name the staging server something dignified",
        TaskStatus.TODO,
        TaskPriority.NONE,
        "`beefy-badger-2` has been in production for a year.",
    ),
    (
        "Explain the sprint to the cat",
        TaskStatus.IN_REVIEW,
        TaskPriority.MEDIUM,
        "She has notes. They are mostly about the sprint being too long.",
    ),
    (
        "Remove the `// TODO: fix this properly` from 2019",
        TaskStatus.IN_REVIEW,
        TaskPriority.LOW,
        "It has outlasted two rewrites and one company rename.",
    ),
    ("Ship it", TaskStatus.DONE, TaskPriority.URGENT, "It shipped. Nobody is entirely sure how."),
    (
        "Turn it off and on again",
        TaskStatus.DONE,
        TaskPriority.HIGH,
        "Worked. Filed under *engineering*.",
    ),
    ("Blame the cache", TaskStatus.DONE, TaskPriority.MEDIUM, "It was, in fairness, the cache."),
    (
        "Add one more `!important`",
        TaskStatus.DONE,
        TaskPriority.LOW,
        "That makes four on the same rule. The div is centred now.",
    ),
    (
        "Read the documentation",
        TaskStatus.BACKLOG,
        TaskPriority.NONE,
        "Filed under *someday*, next to *learn Rust properly*.",
    ),
    ("Refactor everything, tastefully", TaskStatus.BACKLOG, TaskPriority.LOW, "Scope: yes."),
    (
        "Achieve inbox zero",
        TaskStatus.BACKLOG,
        TaskPriority.NONE,
        "Current: 4,812. Trending the wrong way.",
    ),
    (
        "Migrate off the thing we migrated to last year",
        TaskStatus.BACKLOG,
        TaskPriority.MEDIUM,
        "It is fine. It is just that there is a newer one now.",
    ),
    (
        'Duplicate of "Ship it"',
        TaskStatus.DUPLICATE,
        TaskPriority.LOW,
        "Kept so the duplicate status has something to render.",
    ),
    (
        "Rewrite it in a language with no users",
        TaskStatus.CANCELLED,
        TaskPriority.LOW,
        "Cancelled after the third meeting about the meeting.",
    ),
]

SEGMENTS: list[tuple[str, float, float, str]] = [
    ("Ege", 0.0, 14.5, "Welcome everyone, today we are reviewing the Elliptic launch plan."),
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

        for index, (title, task_status, priority, description) in enumerate(TASKS, start=1):
            session.add(
                Task(
                    org_id=org.id,
                    project_id=project.id,
                    number=index,
                    title=title,
                    description=description,
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
