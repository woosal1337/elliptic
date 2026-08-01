"""Test fixtures: env setup, schema lifecycle, app, and HTTP client."""

import os

os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://companyos:companyos@localhost:5434/companyos_test"
)
os.environ["ENV"] = "test"
os.environ["ELLIPTIC_KEK"] = "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA="
os.environ["JWT_SECRET_KEY"] = "test-secret-key-with-enough-length-for-hs256"

from collections.abc import AsyncIterator

import pytest
from asgi_lifespan import LifespanManager
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from elliptic.core.database import engine
from elliptic.core.models_registry import Base
from elliptic.main import app as fastapi_app


@pytest.fixture(scope="session", autouse=True)
async def setup_db() -> AsyncIterator[None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


@pytest.fixture(scope="session")
async def app(setup_db: None) -> AsyncIterator[FastAPI]:
    async with LifespanManager(fastapi_app):
        yield fastapi_app


@pytest.fixture(autouse=True)
async def clean_db(setup_db: None) -> AsyncIterator[None]:
    yield
    table_names = ", ".join(table.name for table in Base.metadata.sorted_tables)
    async with engine.begin() as conn:
        await conn.execute(text(f"TRUNCATE {table_names} CASCADE"))


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as http_client:
        yield http_client
