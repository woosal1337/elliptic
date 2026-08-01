# Self-hosting Elliptic

Elliptic is a lean two-service application backed by PostgreSQL.

```
            ┌──────────┐      ┌──────────┐      ┌────────────┐
  user ───▶ │   web    │ ───▶ │   api    │ ───▶ │ PostgreSQL │
            │ (Next.js)│      │ (FastAPI)│      │            │
            └──────────┘      └──────────┘      └────────────┘
```

- **web** (`elliptic-web`, Next.js) — serves the UI and proxies `/api/*` to the API via `BACKEND_ORIGIN`.
- **api** (`elliptic-api`, FastAPI) — the application + REST API; health at `GET /api/v1/health`. Runs DB migrations (`alembic upgrade head`) on deploy.
- **PostgreSQL 16** — the only stateful dependency. Use the bundled instance for trials; point `DATABASE_URL` at a managed database in production.

## Minimum hardware

A single small node (**1 vCPU / 2 GB RAM**) runs the whole stack for a small team. Scale `api`/`web` replicas horizontally; the API is stateless.

## Environment reference

All API config lives in `src/elliptic/core/config.py`. The essentials:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | yes | `postgresql+asyncpg://…` |
| `ELLIPTIC_KEK` | yes | base64 32-byte key encrypting BYOK/SSO/SCIM/connector secrets — **rotate per install** |
| `JWT_SECRET_KEY` | yes | session signing secret |
| `CORS_ORIGINS` | yes | comma-separated web origins |
| `APP_BASE_URL` | recommended | public web URL (links in emails) |
| `OAUTH_ISSUER` | recommended | base URL for the MCP OAuth server |
| `RESEND_API_KEY` | optional | enables outbound email + email-OTP login |
| `GOOGLE_CLIENT_ID` / `GITHUB_CLIENT_ID` (+ secrets) | optional | social sign-in (COS-209) |
| `INSTANCE_ADMIN_EMAILS` | optional | comma-separated allowlist bootstrapped as instance admins (COS-223) |

## Quickstart — Helm

```bash
helm install elliptic ./deploy/helm/elliptic \
  --set ingress.host=elliptic.yourco.com \
  --set secrets.ELLIPTIC_KEK="$(openssl rand -base64 32)" \
  --set secrets.JWT_SECRET_KEY="$(openssl rand -hex 32)"
```

Production: set `postgres.enabled=false` and `externalDatabaseUrl=postgresql+asyncpg://…` to use a managed database.

## Quickstart — raw Kubernetes

```bash
# edit deploy/k8s/elliptic.yaml (secret values + image tags), then:
kubectl apply -f deploy/k8s/elliptic.yaml
```

## Other targets

- **Docker Compose** — `docker compose up` (see `docker-compose.yml`).
- **Docker Swarm** — `docker stack deploy -c deploy/swarm/docker-stack.yml elliptic`.

One-click PaaS templates (Coolify / Render / Railway) and a single-container all-in-one image are tracked as follow-on packaging increments.
