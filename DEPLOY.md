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
| `deploy.yml` | after CI passes on `main`; manual dispatch | on the ct104 self-hosted runner: `git fetch` + `reset --hard` to the built SHA, then `scripts/deploy-ct104.sh` — a **blue-green** roll of the api behind Caddy (build → start new replica → health-check → drain old), so deploys never drop connections |
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

## Zero-downtime deploys (why deploys no longer log everyone out)

Previously a deploy ran `docker compose up -d --build api`, which **stops the old
api container and starts a new one**. That severed every live connection (MCP
streams, in-flight web/dashboard requests) and returned 502 for the boot+migrate
window — so every push *looked* like it logged everyone out. It never actually
was: `JWT_SECRET_KEY`/`COMPANYOS_KEK` are pinned in the host `.env` (stable across
deploys) and Postgres (grants, refresh tokens, the OAuth signing key) is never
recreated. The disruption was purely the api container being torn down.

The fix: the API runs behind an always-up **Caddy** proxy and is rolled
**blue-green**.

```
cloudflared (host) ──▶ :API_PORT (Caddy) ──▶ api:8000  (1 replica, 2 during a deploy)
```

- `docker-compose.prod.yml` adds Caddy and makes the api internal-only (so it can
  run >1 replica). Caddy discovers replicas via Docker DNS and retries in-flight
  requests against a healthy one.
- `scripts/deploy-ct104.sh` builds the new image, starts a **second** api replica
  on it, waits until it is docker-healthy, then drains and removes the old one.
- Because the old replica keeps serving until the new one is healthy, the public
  endpoint never drops. cloudflared still targets the same host port — it points
  at Caddy now instead of the api container.

**Migrations must be backward-compatible (expand/contract).** During a roll, the
new replica runs `alembic upgrade head` on boot while the *old* code still serves
traffic, so a migration must not break the running old version. Do additive
changes first; drop/rename columns in a later deploy once no old code references
them.

### One-time cutover (already done on ct104)

The first switch to this model is the only deploy with a brief blip, because the
api has to be recreated to release the host port before Caddy can take it:

```bash
cd /opt/companyos
git pull   # get docker-compose.prod.yml + deploy/caddy/Caddyfile + scripts/
C="docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.prod.yml"
$C up -d --no-deps api      # recreate api WITHOUT the host port (frees API_PORT)
$C up -d --no-deps caddy    # Caddy takes API_PORT and proxies to api:8000
curl -s https://api-company.chele.bi/api/v1/health   # verify through the edge
```

After this, every `deploy.yml` run (and manual `scripts/deploy-ct104.sh`) is
zero-downtime.

## Rollback

On the host, redeploy any prior commit and rebuild:

```bash
cd /opt/companyos
git reset --hard <older-sha>
docker compose up -d --build
```
