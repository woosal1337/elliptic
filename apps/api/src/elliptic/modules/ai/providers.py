"""AI provider protocol and httpx-based OpenAI and Anthropic implementations."""

import json
from dataclasses import dataclass
from typing import Any, Protocol, TypedDict

import httpx

from elliptic.core.config import get_settings
from elliptic.core.exceptions import BadGatewayError
from elliptic.modules.ai.models import AIProviderType

ANTHROPIC_VERSION = "2023-06-01"


class ChatMessage(TypedDict):
    """One chat message exchanged with a provider."""

    role: str
    content: str


@dataclass(frozen=True)
class CompletionResult:
    """Provider completion output with token usage."""

    content: str
    model: str
    input_tokens: int | None
    output_tokens: int | None


class AIProvider(Protocol):
    """Minimal completion interface every provider implements."""

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        """Run a chat completion and return the text with usage."""
        ...

    async def complete_structured(
        self,
        messages: list[ChatMessage],
        *,
        model: str,
        max_tokens: int,
        schema_name: str,
        json_schema: dict[str, Any],
    ) -> CompletionResult:
        """Run a completion constrained to a JSON schema; ``.content`` is the JSON."""
        ...


def _client(transport: httpx.AsyncBaseTransport | None) -> httpx.AsyncClient:
    timeout = get_settings().ai_timeout_seconds
    return httpx.AsyncClient(timeout=timeout, transport=transport)


def _raise_provider_error(provider: str, response: httpx.Response) -> None:
    raise BadGatewayError(f"{provider} request failed with status {response.status_code}")


class OpenAIProvider:
    """OpenAI (and OpenAI-compatible: Ollama, custom) chat completions over raw HTTP."""

    def __init__(
        self,
        api_key: str,
        transport: httpx.AsyncBaseTransport | None = None,
        base_url: str | None = None,
    ) -> None:
        self._api_key = api_key
        self._transport = transport
        self._base_url = (base_url or get_settings().openai_base_url).rstrip("/")

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        """Call POST /chat/completions and extract the first choice."""
        body = {"model": model, "max_tokens": max_tokens, "messages": messages}
        headers = {"Authorization": f"Bearer {self._api_key}"}
        async with _client(self._transport) as client:
            try:
                response = await client.post(
                    f"{self._base_url}/chat/completions", json=body, headers=headers
                )
            except httpx.HTTPError as exc:
                raise BadGatewayError("openai request failed") from exc
        if response.status_code != httpx.codes.OK:
            _raise_provider_error("openai", response)
        data: dict[str, Any] = response.json()
        usage = data.get("usage") or {}
        content = data["choices"][0]["message"]["content"] or ""
        return CompletionResult(
            content=content,
            model=str(data.get("model", model)),
            input_tokens=usage.get("prompt_tokens"),
            output_tokens=usage.get("completion_tokens"),
        )

    async def complete_structured(
        self,
        messages: list[ChatMessage],
        *,
        model: str,
        max_tokens: int,
        schema_name: str,
        json_schema: dict[str, Any],
    ) -> CompletionResult:
        """Call /chat/completions with a json_schema response_format."""
        body = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": messages,
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": schema_name, "schema": json_schema},
            },
        }
        headers = {"Authorization": f"Bearer {self._api_key}"}
        async with _client(self._transport) as client:
            try:
                response = await client.post(
                    f"{self._base_url}/chat/completions", json=body, headers=headers
                )
            except httpx.HTTPError as exc:
                raise BadGatewayError("openai request failed") from exc
        if response.status_code != httpx.codes.OK:
            _raise_provider_error("openai", response)
        data: dict[str, Any] = response.json()
        usage = data.get("usage") or {}
        content = data["choices"][0]["message"]["content"] or ""
        return CompletionResult(
            content=content,
            model=str(data.get("model", model)),
            input_tokens=usage.get("prompt_tokens"),
            output_tokens=usage.get("completion_tokens"),
        )


class AnthropicProvider:
    """Anthropic Messages API over raw HTTP."""

    def __init__(self, api_key: str, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._api_key = api_key
        self._transport = transport
        self._base_url = get_settings().anthropic_base_url

    async def complete(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int
    ) -> CompletionResult:
        """Call POST /v1/messages, lifting system messages into the system field."""
        system_parts = [m["content"] for m in messages if m["role"] == "system"]
        chat = [m for m in messages if m["role"] != "system"]
        body: dict[str, Any] = {"model": model, "max_tokens": max_tokens, "messages": chat}
        if system_parts:
            body["system"] = "\n\n".join(system_parts)
        headers = {"x-api-key": self._api_key, "anthropic-version": ANTHROPIC_VERSION}
        async with _client(self._transport) as client:
            try:
                response = await client.post(
                    f"{self._base_url}/v1/messages", json=body, headers=headers
                )
            except httpx.HTTPError as exc:
                raise BadGatewayError("anthropic request failed") from exc
        if response.status_code != httpx.codes.OK:
            _raise_provider_error("anthropic", response)
        data: dict[str, Any] = response.json()
        usage = data.get("usage") or {}
        content = "".join(
            block.get("text", "")
            for block in data.get("content", [])
            if block.get("type") == "text"
        )
        return CompletionResult(
            content=content,
            model=str(data.get("model", model)),
            input_tokens=usage.get("input_tokens"),
            output_tokens=usage.get("output_tokens"),
        )

    async def complete_structured(
        self,
        messages: list[ChatMessage],
        *,
        model: str,
        max_tokens: int,
        schema_name: str,
        json_schema: dict[str, Any],
    ) -> CompletionResult:
        """Call /v1/messages with a single forced tool; read its tool_use input."""
        system_parts = [m["content"] for m in messages if m["role"] == "system"]
        chat = [m for m in messages if m["role"] != "system"]
        body: dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": chat,
            "tools": [
                {
                    "name": schema_name,
                    "description": "Return the structured result.",
                    "input_schema": json_schema,
                }
            ],
            "tool_choice": {"type": "tool", "name": schema_name},
        }
        if system_parts:
            body["system"] = "\n\n".join(system_parts)
        headers = {"x-api-key": self._api_key, "anthropic-version": ANTHROPIC_VERSION}
        async with _client(self._transport) as client:
            try:
                response = await client.post(
                    f"{self._base_url}/v1/messages", json=body, headers=headers
                )
            except httpx.HTTPError as exc:
                raise BadGatewayError("anthropic request failed") from exc
        if response.status_code != httpx.codes.OK:
            _raise_provider_error("anthropic", response)
        data: dict[str, Any] = response.json()
        usage = data.get("usage") or {}
        content = ""
        for block in data.get("content", []):
            if block.get("type") == "tool_use" and block.get("name") == schema_name:
                content = json.dumps(block.get("input", {}))
                break
        if not content:
            content = "".join(
                block.get("text", "")
                for block in data.get("content", [])
                if block.get("type") == "text"
            )
        return CompletionResult(
            content=content,
            model=str(data.get("model", model)),
            input_tokens=usage.get("input_tokens"),
            output_tokens=usage.get("output_tokens"),
        )


def get_provider(
    provider: AIProviderType,
    api_key: str,
    transport: httpx.AsyncBaseTransport | None = None,
    base_url: str | None = None,
) -> AIProvider:
    """Build the provider implementation for a stored key.

    Ollama and custom providers are OpenAI-compatible and route through the
    OpenAI provider with the configured base_url. Bedrock execution (AWS SigV4)
    is not implemented yet — its config is stored but a call raises.
    """
    if provider is AIProviderType.ANTHROPIC:
        return AnthropicProvider(api_key, transport=transport)
    if provider is AIProviderType.BEDROCK:
        raise BadGatewayError("AWS Bedrock execution is not yet supported")
    return OpenAIProvider(api_key, transport=transport, base_url=base_url)


def default_model(provider: AIProviderType) -> str:
    """Return the configured default model for a provider."""
    settings = get_settings()
    if provider is AIProviderType.OPENAI:
        return settings.openai_default_model
    return settings.anthropic_default_model


async def validate_api_key(
    provider: AIProviderType, api_key: str, transport: httpx.AsyncBaseTransport | None = None
) -> bool:
    """Validate a key with a free models-list call; 401 means invalid.

    Only the hosted OpenAI/Anthropic endpoints can be validated this way; for
    self-hosted/custom/Bedrock providers we skip validation (accept on trust).
    """
    settings = get_settings()
    if provider is AIProviderType.OPENAI:
        url = f"{settings.openai_base_url}/models"
        headers = {"Authorization": f"Bearer {api_key}"}
    elif provider is AIProviderType.ANTHROPIC:
        url = f"{settings.anthropic_base_url}/v1/models"
        headers = {"x-api-key": api_key, "anthropic-version": ANTHROPIC_VERSION}
    else:
        return True
    async with _client(transport) as client:
        try:
            response = await client.get(url, headers=headers)
        except httpx.HTTPError as exc:
            raise BadGatewayError("Provider validation request failed") from exc
    if response.status_code == httpx.codes.UNAUTHORIZED:
        return False
    if response.status_code in (httpx.codes.OK, httpx.codes.TOO_MANY_REQUESTS):
        return True
    _raise_provider_error(provider, response)
    return False
