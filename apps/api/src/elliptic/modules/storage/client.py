"""Cloudflare R2 (S3-compatible) client wrapper — private + presigned (COS-255).

Presigning is CPU-only (no network), so it runs inline. Real S3 I/O (HEAD/DELETE)
is wrapped in asyncio.to_thread so it never blocks the event loop.
"""

import asyncio
import re
import uuid
from functools import lru_cache
from typing import Any

import boto3  # type: ignore[import-untyped]
from botocore.config import Config  # type: ignore[import-untyped]

from elliptic.core.config import get_settings
from elliptic.core.exceptions import BadRequestError

_SAFE = re.compile(r"[^A-Za-z0-9._-]+")


@lru_cache
def _client() -> Any:
    settings = get_settings()
    if not settings.storage_configured:
        raise BadRequestError("Object storage is not configured")
    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def sanitize_filename(filename: str) -> str:
    cleaned = _SAFE.sub("-", filename.strip()).strip("-.") or "file"
    return cleaned[:200]


def build_key(org_id: uuid.UUID, entity_type: str, object_id: uuid.UUID, filename: str) -> str:
    return f"orgs/{org_id}/{entity_type}/{object_id}/{sanitize_filename(filename)}"


def presigned_put(key: str, content_type: str, *, expires: int = 900) -> str:
    """A presigned PUT URL the browser uses to upload bytes directly to R2."""
    settings = get_settings()
    url = _client().generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.r2_bucket, "Key": key, "ContentType": content_type},
        ExpiresIn=expires,
    )
    return str(url)


def presigned_get(key: str, *, expires: int = 300, filename: str | None = None) -> str:
    """A short-lived presigned GET URL for downloading a private object."""
    settings = get_settings()
    params: dict[str, str] = {"Bucket": settings.r2_bucket, "Key": key}
    if filename:
        params["ResponseContentDisposition"] = f'inline; filename="{sanitize_filename(filename)}"'
    return str(_client().generate_presigned_url("get_object", Params=params, ExpiresIn=expires))


async def head_object(key: str) -> dict[str, Any] | None:
    """Return {size, etag, content_type} for an uploaded object, or None if absent."""
    settings = get_settings()

    def _head() -> dict[str, Any] | None:
        try:
            resp = _client().head_object(Bucket=settings.r2_bucket, Key=key)
        except Exception:
            return None
        return {
            "size": int(resp.get("ContentLength", 0)),
            "etag": str(resp.get("ETag", "")).strip('"'),
            "content_type": resp.get("ContentType", ""),
        }

    return await asyncio.to_thread(_head)


async def delete_object(key: str) -> None:
    settings = get_settings()

    def _delete() -> None:
        _client().delete_object(Bucket=settings.r2_bucket, Key=key)

    await asyncio.to_thread(_delete)


async def put_bytes(key: str, data: bytes, content_type: str) -> None:
    """Upload bytes straight to R2 (the small-file path for MCP agents)."""
    settings = get_settings()

    def _put() -> None:
        _client().put_object(
            Bucket=settings.r2_bucket, Key=key, Body=data, ContentType=content_type
        )

    await asyncio.to_thread(_put)


async def get_bytes(key: str) -> bytes | None:
    """Download an object's raw bytes (used to hand image content to MCP agents)."""
    settings = get_settings()

    def _get() -> bytes | None:
        try:
            resp = _client().get_object(Bucket=settings.r2_bucket, Key=key)
            body: bytes = resp["Body"].read()
            return body
        except Exception:
            return None

    return await asyncio.to_thread(_get)
