"""Imports every model so Base.metadata is fully populated."""

from elliptic.core.models_base import Base
from elliptic.modules.activity.models import ActivityEvent
from elliptic.modules.ai.models import (
    AIChatMessage,
    AIConversation,
    AIProviderKey,
    AIRun,
    AIUser,
)
from elliptic.modules.approvals.models import TaskApproval
from elliptic.modules.auth_providers.models import AuthProviderConfig
from elliptic.modules.automation.models import AutomationRule
from elliptic.modules.comments.models import Comment, CommentReaction, CommentVersion
from elliptic.modules.customers.models import Customer, CustomerRequest
from elliptic.modules.cycles.models import Cycle
from elliptic.modules.dashboards.models import Dashboard, DashboardWidget
from elliptic.modules.domains.models import OrgDomain
from elliptic.modules.embeds.models import NoteEmbed
from elliptic.modules.events.models import Event
from elliptic.modules.favorites.models import Favorite
from elliptic.modules.idp_sync.models import GroupRoleMapping
from elliptic.modules.initiatives.models import Initiative, InitiativeUpdate
from elliptic.modules.instance.models import InstanceLicense, InstanceSettings
from elliptic.modules.intake.models import IntakeForm
from elliptic.modules.integrations.git_models import GitRepoConnection
from elliptic.modules.integrations.models import (
    EmailIntake,
    SentryIntake,
    SlackConnection,
)
from elliptic.modules.ldap.models import LDAPConnection
from elliptic.modules.mcp_auth.models import (
    OAuthAccessToken,
    OAuthAuthorizationCode,
    OAuthClient,
    OAuthGrant,
    OAuthRefreshToken,
    OAuthSigningKey,
)
from elliptic.modules.mcp_connectors.models import McpConnector
from elliptic.modules.mcp_server.models import McpIdempotencyKey
from elliptic.modules.meeting_templates.models import MeetingRecipe, MeetingTemplate
from elliptic.modules.meetings.models import (
    Meeting,
    MeetingShare,
    MeetingSummary,
    TranscriptSegment,
)
from elliptic.modules.milestones.models import Milestone
from elliptic.modules.modules.models import Module
from elliptic.modules.notes.models import (
    Note,
    NoteShare,
    NoteTemplate,
    NoteVersion,
    PublicPageComment,
)
from elliptic.modules.notifications.models import (
    DeviceToken,
    Notification,
    NotificationPreference,
)
from elliptic.modules.orgs.models import (
    CustomRole,
    Invitation,
    Organization,
    OrganizationMember,
)
from elliptic.modules.outbox.models import EventOutbox, WebhookEndpoint
from elliptic.modules.projects.models import (
    Project,
    ProjectArtifact,
    ProjectMember,
    ProjectState,
    ProjectSubscription,
    ProjectTemplate,
    ProjectUpdate,
)
from elliptic.modules.properties.models import CustomProperty, PropertyTemplate
from elliptic.modules.rbac_audit.models import RbacAuditEvent
from elliptic.modules.recurring.models import RecurringTaskRule
from elliptic.modules.register.models import RegisterEntry
from elliptic.modules.releases.models import ChangelogEntry, Release
from elliptic.modules.retrospectives.models import Retrospective
from elliptic.modules.runner.models import RunnerExecution, RunnerScript
from elliptic.modules.scim.models import ScimToken
from elliptic.modules.sso.models import SSOConnection
from elliptic.modules.stickies.models import Sticky
from elliptic.modules.storage.models import StoredObject
from elliptic.modules.sync.models import DeletedEntity
from elliptic.modules.tasks.models import (
    Label,
    NotDuplicatePair,
    RelationTypeDef,
    Task,
    TaskDescriptionVersion,
    TaskLink,
    TaskNoteLink,
    TaskRelation,
    TaskScheduleLink,
    TaskSubscription,
    WorkItemTemplate,
    WorkItemTypeLevel,
    WorkItemUpdate,
)
from elliptic.modules.teams.models import Team, TeamMember, TeamProjectLink
from elliptic.modules.users.models import PersonalAccessToken, User
from elliptic.modules.views.models import TaskView
from elliptic.modules.vocabulary.models import VocabularyTerm
from elliptic.modules.webhooks.models import ProjectWebhook
from elliptic.modules.workflow.models import (
    TransitionCondition,
    WorkflowStatus,
    WorkflowTransition,
)
from elliptic.modules.worklogs.models import Worklog

__all__ = [
    "AIChatMessage",
    "AIConversation",
    "AIProviderKey",
    "AIRun",
    "AIUser",
    "ActivityEvent",
    "AuthProviderConfig",
    "AutomationRule",
    "Base",
    "ChangelogEntry",
    "Comment",
    "CommentReaction",
    "CommentVersion",
    "CustomProperty",
    "CustomRole",
    "Customer",
    "CustomerRequest",
    "Cycle",
    "Dashboard",
    "DashboardWidget",
    "DeletedEntity",
    "DeviceToken",
    "EmailIntake",
    "Event",
    "EventOutbox",
    "Favorite",
    "GitRepoConnection",
    "GroupRoleMapping",
    "Initiative",
    "InitiativeUpdate",
    "InstanceLicense",
    "InstanceSettings",
    "IntakeForm",
    "Invitation",
    "LDAPConnection",
    "Label",
    "McpConnector",
    "McpIdempotencyKey",
    "Meeting",
    "MeetingRecipe",
    "MeetingShare",
    "MeetingSummary",
    "MeetingTemplate",
    "Milestone",
    "Module",
    "NotDuplicatePair",
    "Note",
    "NoteEmbed",
    "NoteShare",
    "NoteTemplate",
    "NoteVersion",
    "Notification",
    "NotificationPreference",
    "OAuthAccessToken",
    "OAuthAuthorizationCode",
    "OAuthClient",
    "OAuthGrant",
    "OAuthRefreshToken",
    "OAuthSigningKey",
    "OrgDomain",
    "Organization",
    "OrganizationMember",
    "PersonalAccessToken",
    "Project",
    "ProjectArtifact",
    "ProjectMember",
    "ProjectState",
    "ProjectSubscription",
    "ProjectTemplate",
    "ProjectUpdate",
    "ProjectWebhook",
    "PropertyTemplate",
    "PublicPageComment",
    "RbacAuditEvent",
    "RecurringTaskRule",
    "RegisterEntry",
    "RelationTypeDef",
    "Release",
    "Retrospective",
    "RunnerExecution",
    "RunnerScript",
    "SSOConnection",
    "ScimToken",
    "SentryIntake",
    "SlackConnection",
    "Sticky",
    "StoredObject",
    "Task",
    "TaskApproval",
    "TaskDescriptionVersion",
    "TaskLink",
    "TaskNoteLink",
    "TaskRelation",
    "TaskScheduleLink",
    "TaskSubscription",
    "TaskView",
    "Team",
    "TeamMember",
    "TeamProjectLink",
    "TranscriptSegment",
    "TransitionCondition",
    "User",
    "VocabularyTerm",
    "WebhookEndpoint",
    "WorkItemTemplate",
    "WorkItemTypeLevel",
    "WorkItemUpdate",
    "WorkflowStatus",
    "WorkflowTransition",
    "Worklog",
]
