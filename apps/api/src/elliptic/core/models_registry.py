"""Imports every model so Base.metadata is fully populated."""

from elliptic.core.models_base import Base
from elliptic.modules.activity.models import ActivityEvent
from elliptic.modules.approvals.models import TaskApproval
from elliptic.modules.auth_providers.models import AuthProviderConfig
from elliptic.modules.automation.models import AutomationRule
from elliptic.modules.comments.models import Comment, CommentReaction, CommentVersion
from elliptic.modules.domains.models import OrgDomain
from elliptic.modules.drive.models import DriveFile
from elliptic.modules.favorites.models import Favorite
from elliptic.modules.idp_sync.models import GroupRoleMapping
from elliptic.modules.instance.models import InstanceLicense, InstanceSettings
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
from elliptic.modules.meetings.models import Meeting, MeetingShare, TranscriptSegment
from elliptic.modules.notes.models import Note
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
)
from elliptic.modules.properties.models import CustomProperty, PropertyTemplate
from elliptic.modules.rbac_audit.models import RbacAuditEvent
from elliptic.modules.recurring.models import RecurringTaskRule
from elliptic.modules.retrospectives.models import Retrospective
from elliptic.modules.runner.models import RunnerExecution, RunnerScript
from elliptic.modules.scim.models import ScimToken
from elliptic.modules.sso.models import SSOConnection
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
    "ActivityEvent",
    "AuthProviderConfig",
    "AutomationRule",
    "Base",
    "Comment",
    "CommentReaction",
    "CommentVersion",
    "CustomProperty",
    "CustomRole",
    "DeletedEntity",
    "DeviceToken",
    "DriveFile",
    "EmailIntake",
    "EventOutbox",
    "Favorite",
    "GitRepoConnection",
    "GroupRoleMapping",
    "InstanceLicense",
    "InstanceSettings",
    "Invitation",
    "LDAPConnection",
    "Label",
    "McpConnector",
    "McpIdempotencyKey",
    "Meeting",
    "MeetingShare",
    "NotDuplicatePair",
    "Note",
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
    "ProjectWebhook",
    "PropertyTemplate",
    "RbacAuditEvent",
    "RecurringTaskRule",
    "RelationTypeDef",
    "Retrospective",
    "RunnerExecution",
    "RunnerScript",
    "SSOConnection",
    "ScimToken",
    "SentryIntake",
    "SlackConnection",
    "StoredObject",
    "Task",
    "TaskApproval",
    "TaskDescriptionVersion",
    "TaskLink",
    "TaskNoteLink",
    "TaskRelation",
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
