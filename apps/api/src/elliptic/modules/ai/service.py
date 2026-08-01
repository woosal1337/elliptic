"""BYOK key custody, AI users, and provider call orchestration."""

import uuid
from datetime import UTC

from pydantic import BaseModel, TypeAdapter
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from elliptic.core.config import get_settings
from elliptic.core.crypto import decrypt_secret, encrypt_secret, last4
from elliptic.core.database import session_factory
from elliptic.core.deps import OrgContext
from elliptic.core.exceptions import (
    BadGatewayError,
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
)
from elliptic.core.pagination import PageParams
from elliptic.modules.activity.service import record_activity
from elliptic.modules.ai.models import (
    AIChatMessage,
    AIConversation,
    AIProviderKey,
    AIProviderType,
    AIRun,
    AIRunPurpose,
    AIRunStatus,
    AIUser,
    ChatMode,
)
from elliptic.modules.ai.outputs import (
    CHART_DIMENSIONS,
    CHART_METRICS,
    ChartSpecOutput,
    validate_llm_json,
)
from elliptic.modules.ai.providers import (
    ChatMessage,
    CompletionResult,
    default_model,
    get_provider,
    validate_api_key,
)
from elliptic.modules.ai.schemas import (
    AIKeyCreateIn,
    AIKeyUpdateIn,
    AIUserCreateIn,
    AIUserUpdateIn,
)


def _aad(org_id: uuid.UUID) -> bytes:
    return str(org_id).encode()


async def create_key(
    session: AsyncSession, ctx: OrgContext, payload: AIKeyCreateIn
) -> AIProviderKey:
    """Encrypt and store a provider key, optionally validating it upstream."""
    existing = await session.scalar(
        select(AIProviderKey).where(
            AIProviderKey.org_id == ctx.org.id, AIProviderKey.name == payload.name
        )
    )
    if existing is not None:
        raise ConflictError("A key with this name already exists")
    if payload.validate_key and not await validate_api_key(payload.provider, payload.api_key):
        raise BadRequestError("Provider rejected this API key")
    nonce, ciphertext = encrypt_secret(payload.api_key, get_settings().kek_bytes, _aad(ctx.org.id))
    if payload.is_default:
        await session.execute(
            update(AIProviderKey)
            .where(AIProviderKey.org_id == ctx.org.id, AIProviderKey.provider == payload.provider)
            .values(is_default=False)
        )
    key = AIProviderKey(
        org_id=ctx.org.id,
        provider=payload.provider,
        name=payload.name,
        encrypted_key=ciphertext,
        nonce=nonce,
        last4=last4(payload.api_key),
        is_default=payload.is_default,
        base_url=payload.base_url,
        region=payload.region,
        chat_model=payload.chat_model,
        embedding_model=payload.embedding_model,
        embedding_dimensions=payload.embedding_dimensions,
        created_by=ctx.user.id,
    )
    session.add(key)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="ai_key",
        entity_id=key.id,
        event_type="created",
        actor_id=ctx.user.id,
        payload={"provider": payload.provider, "name": payload.name},
    )
    return key


async def list_keys(session: AsyncSession, ctx: OrgContext) -> list[AIProviderKey]:
    """List the org's provider keys (masked at the schema layer)."""
    result = await session.scalars(
        select(AIProviderKey)
        .where(AIProviderKey.org_id == ctx.org.id)
        .order_by(AIProviderKey.created_at)
    )
    return list(result)


async def get_key(session: AsyncSession, ctx: OrgContext, key_id: uuid.UUID) -> AIProviderKey:
    """Fetch one key within the org or 404."""
    key = await session.scalar(
        select(AIProviderKey).where(AIProviderKey.id == key_id, AIProviderKey.org_id == ctx.org.id)
    )
    if key is None:
        raise NotFoundError("Key not found")
    return key


async def update_key(
    session: AsyncSession, ctx: OrgContext, key_id: uuid.UUID, payload: AIKeyUpdateIn
) -> AIProviderKey:
    """Update key metadata; the secret itself is immutable."""
    key = await get_key(session, ctx, key_id)
    if payload.name is not None and payload.name != key.name:
        clash = await session.scalar(
            select(AIProviderKey).where(
                AIProviderKey.org_id == ctx.org.id,
                AIProviderKey.name == payload.name,
                AIProviderKey.id != key.id,
            )
        )
        if clash is not None:
            raise ConflictError("A key with this name already exists")
        key.name = payload.name
    if payload.is_default is True:
        await session.execute(
            update(AIProviderKey)
            .where(AIProviderKey.org_id == ctx.org.id, AIProviderKey.provider == key.provider)
            .values(is_default=False)
        )
        key.is_default = True
    elif payload.is_default is False:
        key.is_default = False
    for field in ("base_url", "region", "chat_model", "embedding_model", "embedding_dimensions"):
        value = getattr(payload, field)
        if value is not None:
            setattr(key, field, value)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="ai_key",
        entity_id=key.id,
        event_type="updated",
        actor_id=ctx.user.id,
        payload={"name": key.name},
    )
    await session.flush()
    return key


async def delete_key(session: AsyncSession, ctx: OrgContext, key_id: uuid.UUID) -> None:
    """Delete a provider key."""
    key = await get_key(session, ctx, key_id)
    await session.delete(key)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="ai_key",
        entity_id=key_id,
        event_type="deleted",
        actor_id=ctx.user.id,
        payload={"name": key.name},
    )
    await session.flush()


def decrypt_key(key: AIProviderKey) -> str:
    """Decrypt a stored key for immediate use in a provider call."""
    return decrypt_secret(key.nonce, key.encrypted_key, get_settings().kek_bytes, _aad(key.org_id))


async def resolve_key(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    provider: AIProviderType | None = None,
    key_id: uuid.UUID | None = None,
) -> AIProviderKey:
    """Pick the key to use: explicit id, provider default, or org default."""
    if key_id is not None:
        return await get_key(session, ctx, key_id)
    query = select(AIProviderKey).where(AIProviderKey.org_id == ctx.org.id)
    if provider is not None:
        query = query.where(AIProviderKey.provider == provider)
    key = await session.scalar(
        query.order_by(AIProviderKey.is_default.desc(), AIProviderKey.created_at.desc()).limit(1)
    )
    if key is None:
        raise BadRequestError("No AI provider key configured for this organization")
    return key


async def _persist_failed_run(run: AIRun, error: str) -> None:
    org_id = run.org_id
    provider = run.provider
    model = run.model
    purpose = run.purpose
    created_by = run.created_by
    async with session_factory() as failure_session:
        failure_session.add(
            AIRun(
                org_id=org_id,
                provider=provider,
                model=model,
                purpose=purpose,
                status=AIRunStatus.FAILED,
                error=error,
                created_by=created_by,
            )
        )
        await failure_session.commit()


async def run_completion(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    purpose: AIRunPurpose,
    messages: list[ChatMessage],
    provider: AIProviderType | None = None,
    model: str | None = None,
    key_id: uuid.UUID | None = None,
    max_tokens: int | None = None,
    structured: tuple[str, dict[str, object]] | None = None,
) -> tuple[CompletionResult, AIRun]:
    """Execute a provider call on the org's key, recording an AIRun either way.

    When ``structured`` (schema_name, json_schema) is given, the provider is asked
    to constrain its reply to that schema; the raw JSON comes back in ``.content``.
    """
    if not ctx.org.ai_enabled:
        raise ForbiddenError("AI is disabled for this workspace")
    key = await resolve_key(session, ctx, provider=provider, key_id=key_id)
    chosen_model = model or key.chat_model or default_model(key.provider)
    run = AIRun(
        org_id=ctx.org.id,
        provider=key.provider,
        model=chosen_model,
        purpose=purpose,
        status=AIRunStatus.RUNNING,
        created_by=ctx.user.id,
    )
    session.add(run)
    await session.flush()
    api_key = decrypt_key(key)
    impl = get_provider(key.provider, api_key, base_url=key.base_url)
    tokens = max_tokens or get_settings().ai_max_output_tokens
    try:
        if structured is not None:
            schema_name, json_schema = structured
            result = await impl.complete_structured(
                messages,
                model=chosen_model,
                max_tokens=tokens,
                schema_name=schema_name,
                json_schema=json_schema,
            )
        else:
            result = await impl.complete(messages, model=chosen_model, max_tokens=tokens)
    except BadGatewayError as exc:
        await _persist_failed_run(run, exc.message)
        raise
    run.status = AIRunStatus.SUCCEEDED
    run.input_tokens = result.input_tokens
    run.output_tokens = result.output_tokens
    run.model = result.model
    await session.flush()
    return result, run


_REASK = "That response was not valid. Reply with ONLY JSON matching the requested schema."


async def run_structured_completion[ModelT: BaseModel](
    session: AsyncSession,
    ctx: OrgContext,
    *,
    purpose: AIRunPurpose,
    messages: list[ChatMessage],
    output_model: type[ModelT],
    schema_name: str,
    provider: AIProviderType | None = None,
    model: str | None = None,
    key_id: uuid.UUID | None = None,
    max_tokens: int | None = None,
) -> tuple[ModelT | None, CompletionResult, AIRun]:
    """Run a completion and validate the reply into ``output_model``.

    Returns ``(validated_or_None, result, run)``. On an invalid reply it re-asks
    once; if still invalid it returns ``None`` so the caller keeps its own
    default/fallback behaviour. Each provider call records its own ``AIRun``.
    """
    adapter: TypeAdapter[ModelT] = TypeAdapter(output_model)
    json_schema = output_model.model_json_schema()
    structured = (schema_name, json_schema)
    result, run = await run_completion(
        session,
        ctx,
        purpose=purpose,
        messages=messages,
        provider=provider,
        model=model,
        key_id=key_id,
        max_tokens=max_tokens,
        structured=structured,
    )
    parsed = validate_llm_json(adapter, result.content)
    if parsed is not None:
        return parsed, result, run
    retry_messages: list[ChatMessage] = [
        *messages,
        {"role": "assistant", "content": result.content},
        {"role": "user", "content": _REASK},
    ]
    result2, run2 = await run_completion(
        session,
        ctx,
        purpose=purpose,
        messages=retry_messages,
        provider=provider,
        model=model,
        key_id=key_id,
        max_tokens=max_tokens,
        structured=structured,
    )
    return validate_llm_json(adapter, result2.content), result2, run2


_TRANSFORM_PROMPTS: dict[str, str] = {
    "rephrase": (
        "Rephrase the text below to improve clarity and flow while preserving its meaning. "
        "Return only the rewritten text, with no preamble or quotes."
    ),
    "summarize": ("Summarize the text below concisely. Return only the summary, with no preamble."),
    "expand": (
        "Expand the text below with more detail, examples, and explanation. "
        "Return only the expanded text, with no preamble."
    ),
    "fix_grammar": (
        "Correct the grammar, spelling, and punctuation of the text below while preserving "
        "its meaning and tone. Return only the corrected text, with no preamble."
    ),
}


async def transform_text(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    text: str,
    action: str,
    target_language: str = "English",
) -> tuple[str, AIRun]:
    """Apply an in-editor AI transform to a text selection, recording an AIRun."""
    if action == "translate":
        instruction = (
            f"Translate the text below into {target_language}. "
            "Return only the translation, with no preamble."
        )
    else:
        instruction = _TRANSFORM_PROMPTS[action]
    messages: list[ChatMessage] = [
        {"role": "system", "content": instruction},
        {"role": "user", "content": text},
    ]
    result, run = await run_completion(session, ctx, purpose=AIRunPurpose.CHAT, messages=messages)
    return result.content.strip(), run


async def generate_text(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    prompt: str,
    context: str | None = None,
) -> tuple[str, AIRun]:
    """Generate new document content from a prompt (an in-editor AI block), recording an AIRun."""
    instruction = (
        "You are a writing assistant embedded in a document editor. Follow the user's "
        "instruction and return only the requested content as clean Markdown — no preamble, "
        "no surrounding explanation, no code fences."
    )
    user_parts: list[str] = []
    if context and context.strip():
        user_parts.append(f"Use this document as context:\n\n{context.strip()}")
    user_parts.append(f"Instruction: {prompt.strip()}")
    messages: list[ChatMessage] = [
        {"role": "system", "content": instruction},
        {"role": "user", "content": "\n\n".join(user_parts)},
    ]
    result, run = await run_completion(session, ctx, purpose=AIRunPurpose.CHAT, messages=messages)
    return result.content.strip(), run


async def create_ai_user(session: AsyncSession, ctx: OrgContext, payload: AIUserCreateIn) -> AIUser:
    """Define a custom AI agent member for the org."""
    existing = await session.scalar(
        select(AIUser).where(AIUser.org_id == ctx.org.id, AIUser.name == payload.name)
    )
    if existing is not None:
        raise ConflictError("An AI user with this name already exists")
    ai_user = AIUser(
        org_id=ctx.org.id,
        name=payload.name,
        provider=payload.provider,
        model=payload.model,
        system_prompt=payload.system_prompt,
        is_active=payload.is_active,
    )
    session.add(ai_user)
    await session.flush()
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="ai_user",
        entity_id=ai_user.id,
        event_type="created",
        actor_id=ctx.user.id,
        payload={"name": ai_user.name},
    )
    return ai_user


async def list_ai_users(session: AsyncSession, ctx: OrgContext) -> list[AIUser]:
    """List the org's AI users."""
    result = await session.scalars(
        select(AIUser).where(AIUser.org_id == ctx.org.id).order_by(AIUser.created_at)
    )
    return list(result)


async def get_ai_user(session: AsyncSession, ctx: OrgContext, ai_user_id: uuid.UUID) -> AIUser:
    """Fetch one AI user within the org or 404."""
    ai_user = await session.scalar(
        select(AIUser).where(AIUser.id == ai_user_id, AIUser.org_id == ctx.org.id)
    )
    if ai_user is None:
        raise NotFoundError("AI user not found")
    return ai_user


async def update_ai_user(
    session: AsyncSession, ctx: OrgContext, ai_user_id: uuid.UUID, payload: AIUserUpdateIn
) -> AIUser:
    """Apply updates to an AI user."""
    ai_user = await get_ai_user(session, ctx, ai_user_id)
    if payload.name is not None and payload.name != ai_user.name:
        clash = await session.scalar(
            select(AIUser).where(
                AIUser.org_id == ctx.org.id,
                AIUser.name == payload.name,
                AIUser.id != ai_user.id,
            )
        )
        if clash is not None:
            raise ConflictError("An AI user with this name already exists")
        ai_user.name = payload.name
    if payload.model is not None:
        ai_user.model = payload.model
    if payload.system_prompt is not None:
        ai_user.system_prompt = payload.system_prompt
    if payload.is_active is not None:
        ai_user.is_active = payload.is_active
    if payload.budget_monthly_cents is not None:
        ai_user.budget_monthly_cents = payload.budget_monthly_cents
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="ai_user",
        entity_id=ai_user.id,
        event_type="updated",
        actor_id=ctx.user.id,
        payload={"name": ai_user.name},
    )
    await session.flush()
    return ai_user


async def delete_ai_user(session: AsyncSession, ctx: OrgContext, ai_user_id: uuid.UUID) -> None:
    """Delete an AI user."""
    ai_user = await get_ai_user(session, ctx, ai_user_id)
    await session.delete(ai_user)
    await record_activity(
        session,
        org_id=ctx.org.id,
        entity_type="ai_user",
        entity_id=ai_user_id,
        event_type="deleted",
        actor_id=ctx.user.id,
        payload={"name": ai_user.name},
    )
    await session.flush()


async def list_runs(
    session: AsyncSession, ctx: OrgContext, page: PageParams
) -> tuple[list[AIRun], int]:
    """List the org's AI runs, newest first."""
    base = select(AIRun).where(AIRun.org_id == ctx.org.id)
    total = await session.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await session.scalars(
        base.order_by(AIRun.created_at.desc(), AIRun.id.desc())
        .limit(page.limit)
        .offset(page.offset)
    )
    return list(result), total


_ASK_SYSTEM = (
    "You are CompanyOS Assistant in ASK mode: a read-only helper answering questions "
    "about the user's workspace (projects, work items, cycles, modules, pages). Be concise "
    "and practical. You cannot change any data in this mode; if the user asks you to make "
    "changes, tell them to switch the conversation to Build mode."
)
_BUILD_SYSTEM = (
    "You are CompanyOS Assistant in BUILD mode: you help the user take actions on their "
    "workspace. Describe the concrete change you would make (the entity, fields, and values) "
    "and confirm intent. Respect the user's role and permissions; never claim to have done "
    "something you cannot verify. Be concise."
)


async def create_conversation(
    session: AsyncSession, ctx: OrgContext, *, mode: "ChatMode", title: str
) -> "AIConversation":
    conversation = AIConversation(org_id=ctx.org.id, user_id=ctx.user.id, title=title, mode=mode)
    session.add(conversation)
    await session.flush()
    return conversation


async def list_conversations(
    session: AsyncSession, ctx: OrgContext, *, query: str | None = None
) -> list["AIConversation"]:
    """List the user's conversations, pinned first, optionally filtered by title (COS-231)."""
    stmt = select(AIConversation).where(
        AIConversation.org_id == ctx.org.id, AIConversation.user_id == ctx.user.id
    )
    if query and query.strip():
        stmt = stmt.where(AIConversation.title.ilike(f"%{query.strip()}%"))
    result = await session.scalars(
        stmt.order_by(AIConversation.pinned.desc(), AIConversation.updated_at.desc())
    )
    return list(result)


async def update_conversation(
    session: AsyncSession,
    ctx: OrgContext,
    conversation_id: uuid.UUID,
    *,
    title: str | None = None,
    mode: "ChatMode | None" = None,
    pinned: bool | None = None,
    auto_run: bool | None = None,
) -> "AIConversation":
    """Rename / re-mode / pin / toggle auto-run on a conversation (COS-231, COS-221)."""
    conversation = await _get_conversation(session, ctx, conversation_id)
    if title is not None:
        conversation.title = title.strip()[:255] or conversation.title
    if mode is not None:
        conversation.mode = mode
    if pinned is not None:
        conversation.pinned = pinned
    if auto_run is not None:
        conversation.auto_run = auto_run
    await session.flush()
    return conversation


async def run_conversation_action(
    session: AsyncSession, ctx: OrgContext, conversation_id: uuid.UUID, prompt: str
) -> dict[str, object]:
    """Auto-run: propose a Build-mode action and execute it in one step (COS-221).

    Returns a batch-review entry (the proposal summary plus the executed result).
    """
    from elliptic.modules.ai import actions  # noqa: PLC0415

    conversation = await _get_conversation(session, ctx, conversation_id)
    if conversation.mode is not ChatMode.BUILD:
        raise BadRequestError("Auto-run is only available in Build mode")
    proposal = await actions.propose_action(session, ctx, prompt)
    result = await actions.execute_action(
        session,
        ctx,
        str(proposal["action"]),
        proposal["params"],  # type: ignore[arg-type]
    )
    return {"summary": proposal["summary"], "result": result}


async def set_message_feedback(
    session: AsyncSession,
    ctx: OrgContext,
    conversation_id: uuid.UUID,
    message_id: uuid.UUID,
    value: int,
) -> "AIChatMessage":
    """Record thumbs feedback (-1/0/+1) on an assistant message (COS-231)."""
    await _get_conversation(session, ctx, conversation_id)
    message = await session.scalar(
        select(AIChatMessage).where(
            AIChatMessage.id == message_id,
            AIChatMessage.conversation_id == conversation_id,
        )
    )
    if message is None:
        raise NotFoundError("Message not found")
    message.feedback = 1 if value > 0 else (-1 if value < 0 else 0)
    await session.flush()
    return message


async def _get_conversation(
    session: AsyncSession, ctx: OrgContext, conversation_id: uuid.UUID
) -> "AIConversation":
    conversation = await session.scalar(
        select(AIConversation).where(
            AIConversation.id == conversation_id,
            AIConversation.org_id == ctx.org.id,
            AIConversation.user_id == ctx.user.id,
        )
    )
    if conversation is None:
        raise NotFoundError("Conversation not found")
    return conversation


async def list_chat_messages(
    session: AsyncSession, ctx: OrgContext, conversation_id: uuid.UUID
) -> list["AIChatMessage"]:
    await _get_conversation(session, ctx, conversation_id)
    result = await session.scalars(
        select(AIChatMessage)
        .where(AIChatMessage.conversation_id == conversation_id)
        .order_by(AIChatMessage.created_at)
    )
    return list(result)


async def _resolve_mentions(
    session: AsyncSession, ctx: OrgContext, mentions: "list[tuple[str, uuid.UUID]] | None"
) -> str:
    """Build a context block describing @-referenced entities (COS-227)."""
    if not mentions:
        return ""
    from elliptic.modules.projects.models import Project  # noqa: PLC0415
    from elliptic.modules.tasks.models import Task  # noqa: PLC0415

    lines: list[str] = []
    for kind, entity_id in mentions[:20]:
        if kind == "task":
            task = await session.scalar(
                select(Task).where(Task.id == entity_id, Task.org_id == ctx.org.id)
            )
            if task is not None:
                desc = f" — {task.description[:300]}" if task.description else ""
                lines.append(f"Work item: {task.title} (status={task.status.value}){desc}")
        elif kind == "project":
            project = await session.scalar(
                select(Project).where(Project.id == entity_id, Project.org_id == ctx.org.id)
            )
            if project is not None:
                lines.append(f"Project: {project.name} (key={project.key})")
    if not lines:
        return ""
    return "The user referenced these workspace items:\n" + "\n".join(lines)


async def _attachment_context(
    session: AsyncSession,
    ctx: OrgContext,
    object_ids: "list[uuid.UUID] | None",
    message_id: uuid.UUID,
) -> str:
    """Bind uploaded files to the chat message and build text context for the LLM (COS-211).

    Text files are inlined (truncated); images/binaries are referenced by name. Full image
    vision pass-through to the model is a documented follow-up.
    """
    if not object_ids:
        return ""
    from elliptic.modules.storage import client as storage_client  # noqa: PLC0415
    from elliptic.modules.storage import service as storage_service  # noqa: PLC0415
    from elliptic.modules.storage.models import StoredObjectEntity  # noqa: PLC0415

    bound = await storage_service.bind_objects(
        session, ctx, object_ids, StoredObjectEntity.AI_CHAT, message_id
    )
    parts: list[str] = []
    for obj in bound:
        textual = obj.content_type.startswith("text/") or obj.content_type in (
            "application/json",
            "application/xml",
        )
        if textual:
            data = await storage_client.get_bytes(obj.storage_key)
            snippet = data.decode("utf-8", "replace")[:6000] if data else ""
            parts.append(f'Attached file "{obj.filename}" ({obj.content_type}):\n{snippet}')
        else:
            parts.append(
                f'Attached file "{obj.filename}" ({obj.content_type}) — '
                "binary/image; refer to it by name."
            )
    if not parts:
        return ""
    return "The user attached the following file(s):\n\n" + "\n\n".join(parts)


async def send_chat_message(
    session: AsyncSession,
    ctx: OrgContext,
    conversation_id: uuid.UUID,
    content: str,
    mentions: "list[tuple[str, uuid.UUID]] | None" = None,
    object_ids: "list[uuid.UUID] | None" = None,
) -> "AIChatMessage":
    """Append the user's message, call the LLM with mode-aware context, store + return the reply."""
    conversation = await _get_conversation(session, ctx, conversation_id)
    history = await list_chat_messages(session, ctx, conversation_id)

    user_message = AIChatMessage(
        org_id=ctx.org.id, conversation_id=conversation_id, role="user", content=content
    )
    session.add(user_message)
    await session.flush()
    attachment_context = await _attachment_context(session, ctx, object_ids, user_message.id)
    if conversation.title == "New chat" and not history:
        conversation.title = content[:80]

    system = _BUILD_SYSTEM if conversation.mode is ChatMode.BUILD else _ASK_SYSTEM
    messages: list[ChatMessage] = [{"role": "system", "content": system}]
    mention_context = await _resolve_mentions(session, ctx, mentions)
    if mention_context:
        messages.append({"role": "system", "content": mention_context})
    if attachment_context:
        messages.append({"role": "system", "content": attachment_context})
    messages.extend({"role": m.role, "content": m.content} for m in history)
    messages.append({"role": "user", "content": content})

    result, _run = await run_completion(session, ctx, purpose=AIRunPurpose.CHAT, messages=messages)
    reply = AIChatMessage(
        org_id=ctx.org.id,
        conversation_id=conversation_id,
        role="assistant",
        content=result.content.strip(),
    )
    session.add(reply)
    await session.flush()
    return reply


async def delete_conversation(
    session: AsyncSession, ctx: OrgContext, conversation_id: uuid.UUID
) -> None:
    conversation = await _get_conversation(session, ctx, conversation_id)
    await session.delete(conversation)
    await session.flush()


async def suggest_estimate(
    session: AsyncSession, ctx: OrgContext, task_id: uuid.UUID
) -> dict[str, object]:
    """Propose an estimate from the project's scale for a work item (COS-168)."""
    from elliptic.modules.tasks.service import get_task_with_project  # noqa: PLC0415

    task, project = await get_task_with_project(session, ctx, task_id)
    scale = list(project.estimate_scale or [])
    if not scale:
        raise BadRequestError("This project has no estimate scale configured")

    instruction = (
        "You are a senior engineer estimating work. Given a work item and an ordered "
        "estimate scale (smallest to largest), choose the single most appropriate estimate. "
        "Respond with ONLY the exact scale value, nothing else."
    )
    parts = [f"Estimate scale (smallest to largest): {', '.join(scale)}", f"Title: {task.title}"]
    if task.description:
        parts.append(f"Description: {task.description[:2000]}")
    messages: list[ChatMessage] = [
        {"role": "system", "content": instruction},
        {"role": "user", "content": "\n\n".join(parts)},
    ]
    result, run = await run_completion(
        session, ctx, purpose=AIRunPurpose.CHAT, messages=messages, max_tokens=16
    )
    raw = result.content.strip()
    suggestion = next((value for value in scale if value.lower() == raw.lower()), None)
    if suggestion is None:
        suggestion = next((value for value in scale if value.lower() in raw.lower()), None)
    return {
        "suggestion": suggestion,
        "raw": raw,
        "scale": scale,
        "ai_run_id": run.id,
    }


_CREDITS_PER_SEAT = 500


async def ai_usage(session: AsyncSession, ctx: OrgContext) -> dict[str, object]:
    """Per-seat AI credit pool: usage this calendar month vs the seat-based limit (COS-264)."""
    from datetime import datetime  # noqa: PLC0415

    from elliptic.modules.orgs.service import seat_usage  # noqa: PLC0415

    now = datetime.now(UTC)
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    used = await session.scalar(
        select(func.count())
        .select_from(AIRun)
        .where(AIRun.org_id == ctx.org.id, AIRun.created_at >= period_start)
    )
    used_count = int(used or 0)

    seats = await seat_usage(session, ctx)
    billable_value = seats["billable_seats"]
    billable_seats = billable_value if isinstance(billable_value, int) else 0
    limit = max(billable_seats, 1) * _CREDITS_PER_SEAT
    remaining = max(limit - used_count, 0)
    return {
        "used": used_count,
        "limit": limit,
        "remaining": remaining,
        "billable_seats": billable_seats,
        "credits_per_seat": _CREDITS_PER_SEAT,
        "period_start": period_start,
        "percent_used": round(100 * used_count / limit, 1) if limit else 0.0,
    }


async def ai_chart(session: AsyncSession, ctx: OrgContext, prompt: str) -> dict[str, object]:
    """Let the LLM pick a metric + breakdown dimension, then compute real data (COS-237)."""
    from elliptic.modules.analytics.service import custom_chart  # noqa: PLC0415

    instruction = (
        "You turn a question about workspace metrics into a chart spec. Choose a metric "
        f"from {list(CHART_METRICS)} and a breakdown dimension from {list(CHART_DIMENSIONS)}. "
        'Respond with ONLY compact JSON: {"metric": "...", "dimension": "...", "title": "..."}.'
    )
    messages: list[ChatMessage] = [
        {"role": "system", "content": instruction},
        {"role": "user", "content": prompt.strip()},
    ]
    spec, _result, run = await run_structured_completion(
        session,
        ctx,
        purpose=AIRunPurpose.CHAT,
        messages=messages,
        output_model=ChartSpecOutput,
        schema_name="chart_spec",
        max_tokens=120,
    )
    metric, dimension, title = "count", "status", "Work items by status"
    if spec is not None:
        metric, dimension = spec.metric, spec.dimension
        if spec.title.strip():
            title = spec.title.strip()[:120]

    chart = await custom_chart(session, ctx, metric=metric, dimension=dimension, project_id=None)
    return {
        "title": title,
        "metric": metric,
        "dimension": dimension,
        "points": chart["points"],
        "ai_run_id": run.id,
    }


async def fetch_web_results(query: str) -> list[dict[str, str]]:
    """Keyless web search via the DuckDuckGo Instant Answer API (mocked in tests, COS-258)."""
    import httpx  # noqa: PLC0415

    async with httpx.AsyncClient(timeout=8.0) as http:
        resp = await http.get(
            "https://api.duckduckgo.com/",
            params={"q": query, "format": "json", "no_html": "1", "no_redirect": "1"},
            headers={"User-Agent": "CompanyOS/1.0"},
        )
        resp.raise_for_status()
        data = resp.json()

    results: list[dict[str, str]] = []
    if data.get("AbstractText"):
        results.append(
            {
                "title": str(data.get("Heading", query)),
                "snippet": str(data["AbstractText"]),
                "url": str(data.get("AbstractURL", "")),
            }
        )
    results.extend(
        {
            "title": str(topic.get("Text", ""))[:80],
            "snippet": str(topic.get("Text", "")),
            "url": str(topic.get("FirstURL", "")),
        }
        for topic in data.get("RelatedTopics", [])[:8]
        if isinstance(topic, dict) and topic.get("Text")
    )
    return results


async def web_search(session: AsyncSession, ctx: OrgContext, query: str) -> dict[str, object]:
    """Search the web and have the org's LLM synthesize a grounded answer (COS-258)."""
    if not ctx.org.ai_enabled:
        raise ForbiddenError("AI is disabled for this workspace")
    from elliptic.modules.instance.service import air_gapped_enabled  # noqa: PLC0415

    if await air_gapped_enabled(session):
        raise ForbiddenError("Web search is disabled in air-gapped mode")
    results = await fetch_web_results(query)
    if not results:
        return {
            "query": query,
            "answer": "No web results were found for that query.",
            "sources": [],
        }

    context = "\n\n".join(
        f"[{i + 1}] {r['title']}\n{r['snippet']}\n{r['url']}" for i, r in enumerate(results)
    )
    instruction = (
        "You answer the user's question using ONLY the provided web search results. "
        "Cite sources inline as [n]. If the results don't answer it, say so. Be concise."
    )
    messages: list[ChatMessage] = [
        {"role": "system", "content": instruction},
        {"role": "user", "content": f"Question: {query}\n\nWeb results:\n{context}"},
    ]
    result, _run = await run_completion(session, ctx, purpose=AIRunPurpose.CHAT, messages=messages)
    return {"query": query, "answer": result.content.strip(), "sources": results}


async def doc_assist(
    session: AsyncSession,
    ctx: OrgContext,
    *,
    note_id: uuid.UUID,
    content: str,
    question: str,
    selection: str | None = None,
) -> dict[str, object]:
    """Answer a question anchored to a page, grounded on its live content (COS-254)."""
    from elliptic.modules.notes.models import Note  # noqa: PLC0415

    note = await session.scalar(select(Note).where(Note.id == note_id, Note.org_id == ctx.org.id))
    if note is None:
        raise NotFoundError("Page not found")

    instruction = (
        "You are a writing assistant anchored to a single page. Answer the user's "
        "question using the page content as primary context. If they ask you to write "
        "or edit, return clean Markdown that can be inserted into the page — no preamble, "
        "no code fences."
    )
    parts = [f"Page title: {note.title}", f"Page content:\n{content[:20000]}"]
    if selection and selection.strip():
        parts.append(f"The user has selected this passage:\n{selection[:4000]}")
    parts.append(f"Question or instruction:\n{question}")
    messages: list[ChatMessage] = [
        {"role": "system", "content": instruction},
        {"role": "user", "content": "\n\n".join(parts)},
    ]
    result, run = await run_completion(session, ctx, purpose=AIRunPurpose.CHAT, messages=messages)
    return {"answer": result.content.strip(), "ai_run_id": run.id}
