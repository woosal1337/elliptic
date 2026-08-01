.PHONY: dev lint format typecheck test migrate revision seed all

dev:
	uv run uvicorn elliptic.main:app --reload --port 8000

lint:
	uv run ruff check .

format:
	uv run ruff format .

typecheck:
	uv run mypy src/

test:
	uv run pytest -q

migrate:
	uv run alembic upgrade head

revision:
	uv run alembic revision --autogenerate -m "$(m)"

seed:
	uv run python scripts/seed.py

all: format lint typecheck test
