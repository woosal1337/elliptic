# Deploying CompanyOS (ct104)

Production runs on the self-hosted **ct104** server (Tailscale
`ct104-apps.minotaur-banded.ts.net`), fronted by **Cloudflare** →
`api-company.chele.bi`. ct104 serves the **API + Postgres**; the **web app is
deployed via Vercel**, so only the api image is built here (building Next.js on
this 4 GB box OOMs, and would duplicate Vercel). The stack is a **git checkout
at `/opt/companyos`** that **builds the api image locally** (`companyos-api:local`)
via `docker-compose.yml` plus two host-managed, git-ignored files:

- `docker-compose.override.yml` — restart policies + prod `OAUTH_ISSUER` /
  `MCP_RESOURCE_BASE`.
- `.env` — secrets + `API_PORT` (8100) / `WEB_PORT` (3100), which cloudflared targets.

Both are untracked, so `git reset --hard` during a deploy never touches them.
Postgres (`companyos-postgres-1`, volume `companyos_companyos_pgdata`) stays
internal. The api image runs `alembic upgrade head` on start, so deploys
self-migrate.

## CI/CD

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | push to `main`, PRs | lint / typecheck / test (api + web) |
| `deploy.yml` | after CI passes on `main`; manual dispatch | on the ct104 self-hosted runner: `git fetch` + `reset --hard` to the built SHA, `docker compose up -d --build api`, wait for `/api/v1/health` |
| `release.yml` | `v*` tags | publish semver images to GHCR (unchanged) |

## One-time host setup

### Self-hosted runner (label `ct104`)

Installed at `/opt/actions-runner`, registered against
`woosal1337/companyos` with label `ct104`, running as a service. Re-install:

```bash
cd /opt/actions-runner
# get a fresh registration token (repo owner):
#   gh api -X POST repos/woosal1337/companyos/actions/runners/registration-token -q .token
RUNNER_ALLOW_RUNASROOT=1 ./config.sh --url https://github.com/woosal1337/companyos \
  --token <REG_TOKEN> --labels ct104 --name ct104-apps --unattended --replace
./svc.sh install && ./svc.sh start
```

The deploy job targets `runs-on: [self-hosted, ct104]` — the label must match.

### The `/opt/companyos` checkout

Already present, on `main`, remote `https://github.com/woosal1337/companyos.git`.
The runner deploys into it directly. Nothing else to configure — `.env` and
`docker-compose.override.yml` are already in place.

## Config note (the MCP OAuth fix)

`MCP_RESOURCE_BASE` **must** be the full URL including the path:

```yaml
# /opt/companyos/docker-compose.override.yml
    MCP_RESOURCE_BASE: https://api-company.chele.bi/api/v1/mcp
```

A bare origin (`https://api-company.chele.bi`) makes the OAuth flow fail with
`resource must equal the canonical MCP URI`. Verify:

```bash
curl -s https://api-company.chele.bi/.well-known/oauth-protected-resource/api/v1/mcp
# "resource" must read https://api-company.chele.bi/api/v1/mcp
```

## Rollback

On the host, redeploy any prior commit and rebuild:

```bash
cd /opt/companyos
git reset --hard <older-sha>
docker compose up -d --build
```
