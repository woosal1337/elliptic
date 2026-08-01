"""Integration schemas."""

import uuid

from pydantic import BaseModel, ConfigDict


class SlackConnectionOut(BaseModel):
    """Public view of an org's Slack connection state."""

    connected: bool
    team_name: str | None = None


class SlackChannelOut(BaseModel):
    """One selectable Slack channel."""

    id: str
    name: str


class SendToSlackIn(BaseModel):
    """Payload to post a meeting summary into a Slack channel."""

    channel_id: str


class SendToSlackOut(BaseModel):
    """Result of an outbound Slack post."""

    ok: bool


class SlackOAuthIn(BaseModel):
    """Slack OAuth callback payload."""

    code: str
    state: str | None = None


class SentryIntakeOut(BaseModel):
    """A configured Sentry inbound webhook (COS-260)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    token: str
    enabled: bool


class EmailIntakeOut(BaseModel):
    """A configured inbound-email intake (COS-62)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    token: str
    enabled: bool
