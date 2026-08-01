# Elliptic API

Multi-tenant, agent-native work platform, Jira for your agents. Users and AI agents create and join organizations, organizations contain teams and projects, projects contain Linear-style tasks, meetings with transcripts, and markdown notes. Organizations bring their own OpenAI or Anthropic API keys (BYOK) and all AI features run on the org key. Every mutation is recorded in an activity log.

## Stack

- Python 3.13, uv, src layout
- FastAPI, SQLAlchemy 2.0 async, asyncpg, Alembic
- Pydantic v2, pydantic-settings, loguru
- argon2 password hashing, PyJWT tokens, AES-256-GCM key encryption
- PostgreSQL 17 (docker compose), pytest against a real test database
- ruff, mypy strict

## Run with Docker (everything containerized)

```bash
docker compose up -d --build      # postgres + api (migrations run on start)
curl localhost:8001/api/v1/health # {"success":true,...}
docker exec elliptic-api python scripts/seed.py   # demo data
```

The API container publishes on host port **8001** (`8001 -> 8000`), runs `alembic upgrade head` on boot, then serves uvicorn. A dev `ELLIPTIC_KEK` and `JWT_SECRET_KEY` are baked into `docker-compose.yml` for local convenience and are overridable via the environment. Demo login: `ege@elliptic.sh` / `password`.

## Local development (API on host)

```bash
docker compose up -d postgres   # just the database
cp .env.example .env            # then fill ELLIPTIC_KEK and JWT_SECRET_KEY
uv sync --all-groups
uv run alembic upgrade head
uv run python scripts/seed.py
make dev                        # http://localhost:8000/api/v1/health
```

Generate a KEK:

```bash
python -c "import base64,os;print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
```

## Commands

| Command | What it does |
|---|---|
| `make dev` | Run uvicorn with reload |
| `make lint` | ruff check |
| `make format` | ruff format |
| `make typecheck` | mypy strict over src/ |
| `make test` | pytest against the docker test db |
| `make migrate` | alembic upgrade head |
| `make revision m="msg"` | autogenerate a migration |
| `make seed` | seed demo data |
| `make all` | format, lint, typecheck, test |

## Architecture map

```
src/elliptic/
  main.py            app factory, lifespan, router registration
  core/              settings, db engine/session, security, crypto,
                     deps (auth + OrgContext), exceptions, handlers,
                     logging, base model, pagination, response envelope
  modules/
    auth/            register, login, refresh, logout, me
    users/           profile
    orgs/            organizations, members, roles, invites
    teams/           teams and team members
    projects/        projects, keys, project members, task counter
    tasks/           Linear-style tasks, labels, board, status flow
    meetings/        meetings, transcript segments, Folio import,
                     AI summarize and chat over transcripts
    notes/           markdown notes
    comments/        polymorphic comments on tasks/meetings/notes
    activity/        append-only activity events and feeds
    ai/              BYOK provider keys, AI users, AI runs, providers
```

Every org-scoped route resolves an `OrgContext` (org + membership + role) before any data access. Services take the context and filter every query by `org_id`. See `CONVENTIONS.md` for the rules.

## Self-hosting

Deploy Elliptic on Docker, Kubernetes (Helm or raw manifests), or Swarm — see [SELF-HOSTING.md](SELF-HOSTING.md) and `deploy/`.

## License

Licensed under the [Apache License 2.0](LICENSE).
