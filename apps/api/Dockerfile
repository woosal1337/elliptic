FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS builder

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
# Tune PyPI fetching for a constrained/lossy network path: a long per-request
# timeout tolerates slow wheels, while a few parallel flows aggregate bandwidth
# (a single TCP flow collapses under packet loss). Fully serial (=1) is both
# slow and fragile here; a small amount of concurrency is faster and reliable.
ENV UV_HTTP_TIMEOUT=180 UV_CONCURRENT_DOWNLOADS=4

COPY pyproject.toml uv.lock README.md ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

COPY src ./src
COPY alembic.ini ./
COPY alembic ./alembic
COPY scripts ./scripts
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

FROM python:3.13-slim-bookworm

RUN groupadd --system app && useradd --system --gid app --create-home app

WORKDIR /app
COPY --from=builder --chown=app:app /app /app

ENV PATH="/app/.venv/bin:$PATH"
USER app
EXPOSE 8000

# Python-based healthcheck so no curl/wget is needed in the slim image.
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=5 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health').read()"]

# Apply pending migrations, then serve. Runs on every container start so the
# schema is in sync on the first deploy too (Coolify skips its pre-deploy hook
# when no prior container exists). Alembic is idempotent, so re-runs are safe.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn elliptic.main:app --host 0.0.0.0 --port 8000"]
