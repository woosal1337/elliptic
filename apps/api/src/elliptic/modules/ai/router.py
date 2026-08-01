"""BYOK key, AI user, and AI run endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from elliptic.core.deps import OrgContext, OrgCtx, SessionDep, require_role
from elliptic.core.pagination import Page, PageParamsDep
from elliptic.core.schemas import SuccessResponse, ok
from elliptic.modules.ai import actions, insight, service
from elliptic.modules.ai.schemas import (
    ActionExecuteIn,
    ActionProposalOut,
    ActionProposeIn,
    ActionResultOut,
    AIChartIn,
    AIChartOut,
    AIGenerateIn,
    AIKeyCreateIn,
    AIKeyOut,
    AIKeyUpdateIn,
    AIRunOut,
    AITransformIn,
    AITransformOut,
    AIUsageOut,
    AIUserCreateIn,
    AIUserOut,
    AIUserUpdateIn,
    ChatConversationCreateIn,
    ChatConversationOut,
    ChatConversationUpdateIn,
    ChatFeedbackIn,
    ChatMessageIn,
    ChatMessageOut,
    ContextAggregationOut,
    DocAssistIn,
    DocAssistOut,
    EstimateSuggestIn,
    EstimateSuggestOut,
    RouteSuggestionOut,
    RoutingIn,
    RunActionIn,
    RunActionOut,
    WebSearchIn,
    WebSearchOut,
)
from elliptic.modules.orgs.models import OrgRole

router = APIRouter(prefix="/orgs/{org_id}/ai", tags=["ai"])

AdminCtx = Annotated[OrgContext, Depends(require_role(OrgRole.ADMIN))]


@router.post("/keys", status_code=status.HTTP_201_CREATED)
async def create_key(
    payload: AIKeyCreateIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[AIKeyOut]:
    key = await service.create_key(session, ctx, payload)
    return ok(AIKeyOut.model_validate(key), message="Provider key stored")


@router.get("/keys")
async def list_keys(ctx: AdminCtx, session: SessionDep) -> SuccessResponse[list[AIKeyOut]]:
    keys = await service.list_keys(session, ctx)
    return ok([AIKeyOut.model_validate(key) for key in keys])


@router.patch("/keys/{key_id}")
async def update_key(
    key_id: uuid.UUID, payload: AIKeyUpdateIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[AIKeyOut]:
    key = await service.update_key(session, ctx, key_id, payload)
    return ok(AIKeyOut.model_validate(key), message="Key updated")


@router.delete("/keys/{key_id}")
async def delete_key(
    key_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_key(session, ctx, key_id)
    return ok(None, message="Key deleted")


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_ai_user(
    payload: AIUserCreateIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[AIUserOut]:
    ai_user = await service.create_ai_user(session, ctx, payload)
    return ok(AIUserOut.model_validate(ai_user), message="AI user created")


@router.get("/users")
async def list_ai_users(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[list[AIUserOut]]:
    ai_users = await service.list_ai_users(session, ctx)
    return ok([AIUserOut.model_validate(ai_user) for ai_user in ai_users])


@router.get("/users/{ai_user_id}")
async def get_ai_user(
    ai_user_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[AIUserOut]:
    ai_user = await service.get_ai_user(session, ctx, ai_user_id)
    return ok(AIUserOut.model_validate(ai_user))


@router.patch("/users/{ai_user_id}")
async def update_ai_user(
    ai_user_id: uuid.UUID, payload: AIUserUpdateIn, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[AIUserOut]:
    ai_user = await service.update_ai_user(session, ctx, ai_user_id, payload)
    return ok(AIUserOut.model_validate(ai_user), message="AI user updated")


@router.delete("/users/{ai_user_id}")
async def delete_ai_user(
    ai_user_id: uuid.UUID, ctx: AdminCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_ai_user(session, ctx, ai_user_id)
    return ok(None, message="AI user deleted")


@router.get("/runs")
async def list_runs(
    ctx: AdminCtx, session: SessionDep, page: PageParamsDep
) -> SuccessResponse[Page[AIRunOut]]:
    runs, total = await service.list_runs(session, ctx, page)
    items = [AIRunOut.model_validate(run) for run in runs]
    return ok(Page(items=items, total=total, limit=page.limit, offset=page.offset))


@router.post("/route")
async def suggest_route(
    payload: RoutingIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[RouteSuggestionOut]:
    suggestion = await insight.suggest_route(session, ctx, payload.kind, payload.id)
    return ok(suggestion)


@router.post("/transform")
async def transform_text(
    payload: AITransformIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[AITransformOut]:
    result, run = await service.transform_text(
        session,
        ctx,
        text=payload.text,
        action=payload.action,
        target_language=payload.target_language,
    )
    return ok(AITransformOut(result=result, ai_run_id=run.id))


@router.post("/generate")
async def generate_text(
    payload: AIGenerateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[AITransformOut]:
    result, run = await service.generate_text(
        session, ctx, prompt=payload.prompt, context=payload.context
    )
    return ok(AITransformOut(result=result, ai_run_id=run.id))


@router.get("/context")
async def aggregate_context(
    ctx: OrgCtx,
    session: SessionDep,
    item_id: Annotated[uuid.UUID, Query(alias="id")],
) -> SuccessResponse[ContextAggregationOut]:
    aggregation = await insight.aggregate_context(session, ctx, item_id)
    return ok(aggregation)


@router.get("/conversations")
async def list_conversations(
    ctx: OrgCtx, session: SessionDep, q: str | None = None
) -> SuccessResponse[list[ChatConversationOut]]:
    rows = await service.list_conversations(session, ctx, query=q)
    return ok([ChatConversationOut.model_validate(c) for c in rows])


@router.patch("/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: uuid.UUID,
    payload: ChatConversationUpdateIn,
    ctx: OrgCtx,
    session: SessionDep,
) -> SuccessResponse[ChatConversationOut]:
    conversation = await service.update_conversation(
        session,
        ctx,
        conversation_id,
        title=payload.title,
        mode=payload.mode,
        pinned=payload.pinned,
        auto_run=payload.auto_run,
    )
    return ok(ChatConversationOut.model_validate(conversation))


@router.post("/conversations/{conversation_id}/messages/{message_id}/feedback")
async def set_message_feedback(
    conversation_id: uuid.UUID,
    message_id: uuid.UUID,
    payload: ChatFeedbackIn,
    ctx: OrgCtx,
    session: SessionDep,
) -> SuccessResponse[ChatMessageOut]:
    message = await service.set_message_feedback(
        session, ctx, conversation_id, message_id, payload.value
    )
    return ok(ChatMessageOut.model_validate(message))


@router.post("/conversations", status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: ChatConversationCreateIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ChatConversationOut]:
    conversation = await service.create_conversation(
        session, ctx, mode=payload.mode, title=payload.title
    )
    return ok(ChatConversationOut.model_validate(conversation), message="Conversation created")


@router.get("/conversations/{conversation_id}/messages")
async def list_chat_messages(
    conversation_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[list[ChatMessageOut]]:
    rows = await service.list_chat_messages(session, ctx, conversation_id)
    from elliptic.modules.storage import service as storage_service  # noqa: PLC0415
    from elliptic.modules.storage.models import StoredObjectEntity  # noqa: PLC0415
    from elliptic.modules.storage.schemas import StoredObjectOut  # noqa: PLC0415

    grouped = await storage_service.objects_for_entities(
        session, ctx.org.id, StoredObjectEntity.AI_CHAT, [m.id for m in rows]
    )
    items = []
    for m in rows:
        out = ChatMessageOut.model_validate(m)
        out.attachments = [StoredObjectOut.model_validate(o) for o in grouped.get(m.id, [])]
        items.append(out)
    return ok(items)


@router.post("/conversations/{conversation_id}/messages", status_code=status.HTTP_201_CREATED)
async def send_chat_message(
    conversation_id: uuid.UUID, payload: ChatMessageIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ChatMessageOut]:
    mentions = [(m.type, m.id) for m in payload.mentions]
    reply = await service.send_chat_message(
        session,
        ctx,
        conversation_id,
        payload.content,
        mentions=mentions,
        object_ids=payload.object_ids,
    )
    return ok(ChatMessageOut.model_validate(reply))


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: uuid.UUID, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[None]:
    await service.delete_conversation(session, ctx, conversation_id)
    return ok(None, message="Conversation deleted")


@router.post("/suggest-estimate")
async def suggest_estimate(
    payload: EstimateSuggestIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[EstimateSuggestOut]:
    """Suggest an estimate from the project's scale for a work item (COS-168)."""
    result = await service.suggest_estimate(session, ctx, payload.task_id)
    return ok(EstimateSuggestOut.model_validate(result))


@router.get("/usage")
async def ai_usage(ctx: OrgCtx, session: SessionDep) -> SuccessResponse[AIUsageOut]:
    """AI credit usage vs the per-seat monthly pool (COS-264)."""
    data = await service.ai_usage(session, ctx)
    return ok(AIUsageOut.model_validate(data))


@router.post("/chart")
async def ai_chart(
    payload: AIChartIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[AIChartOut]:
    """Generate a chart from a natural-language request, grounded in real data (COS-237)."""
    data = await service.ai_chart(session, ctx, payload.prompt)
    return ok(AIChartOut.model_validate(data))


@router.post("/propose-action")
async def propose_action(
    payload: ActionProposeIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ActionProposalOut]:
    """Propose a Build-mode action without executing it (COS-212)."""
    proposal = await actions.propose_action(session, ctx, payload.prompt)
    return ok(ActionProposalOut.model_validate(proposal))


@router.post("/execute-action", status_code=status.HTTP_201_CREATED)
async def execute_action(
    payload: ActionExecuteIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[ActionResultOut]:
    """Execute a confirmed Build-mode action through the RBAC service layer (COS-212)."""
    result = await actions.execute_action(session, ctx, payload.action, payload.params)
    return ok(ActionResultOut.model_validate(result), message="Action executed")


@router.post("/conversations/{conversation_id}/run-action", status_code=status.HTTP_201_CREATED)
async def run_conversation_action(
    conversation_id: uuid.UUID, payload: RunActionIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[RunActionOut]:
    """Auto-run: propose and execute a Build-mode action in one step (COS-221)."""
    entry = await service.run_conversation_action(session, ctx, conversation_id, payload.prompt)
    return ok(RunActionOut.model_validate(entry), message="Action run")


@router.post("/web-search")
async def web_search(
    payload: WebSearchIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[WebSearchOut]:
    """Search the web and synthesize a grounded answer with sources (COS-258)."""
    data = await service.web_search(session, ctx, payload.query)
    return ok(WebSearchOut.model_validate(data))


@router.post("/doc-assist")
async def doc_assist(
    payload: DocAssistIn, ctx: OrgCtx, session: SessionDep
) -> SuccessResponse[DocAssistOut]:
    """Page-anchored writing assistant grounded on the live note content (COS-254)."""
    data = await service.doc_assist(
        session,
        ctx,
        note_id=payload.note_id,
        content=payload.content,
        question=payload.question,
        selection=payload.selection,
    )
    return ok(DocAssistOut.model_validate(data))
