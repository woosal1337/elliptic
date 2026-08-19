# Deploying Elliptic (igris / Coolify)

Production runs on the self-hosted **igris** box (reachable only over
Tailscale), managed by **Coolify**. The dashboard URL, host address and other
host specifics are deliberately kept out of this public doc. Cloudflare
terminates public TLS at its edge and a cloudflared tunnel hands requests
to Coolify's Traefik proxy
(`coolify-proxy`), which routes `api.elliptic.sh` to the api container.
igris serves the **API + Postgres**; the **web app is deployed via Vercel**
(`elliptic.sh`), so only the api is built here.

## CI/CD

| Stage | Trigger | What it does |
|---|---|---|
| `ci.yml` | push to `main`, PRs | lint / typecheck / test (api + web) |
| Coolify auto-deploy | push to `main` (GitHub webhook) | builds `apps/api` from its Dockerfile, tags the image with the commit SHA, rolls it out behind a healthcheck |
| `release.yml` | `v*` tags | publish semver images to GHCR (unchanged) |

**Auto-deploy is a GitHub webhook, not a workflow.** The repo has a push
webhook (admins: Settings → Webhooks) pointed at the Coolify instance;
deliveries are HMAC-signed with a shared secret, and Coolify deploys `main`
on every push. There is nothing deploy-related left in `.github/workflows/`,
and CI runs only on GitHub-hosted runners — the repo registers no self-hosted
runner.

## The Coolify application

Coolify project **elliptic** → environment **production** → application
**elliptic-api**:

- **Source:** `woosal1337/elliptic.git`, branch `main`, base directory
  `/apps/api`, Dockerfile build pack.
- **Domain:** `api.elliptic.sh` → Traefik → container port 8000.
- **Database:** the Coolify-managed **elliptic-postgres** resource
  (`postgres:17-alpine`), internal to the `coolify` Docker network — never
  published on a host port. The app reaches it via the `DATABASE_URL` env var.
- **Object storage:** the Cloudflare R2 bucket **elliptic-media**, reached with
  the `R2_*` env vars. See [Object storage](#object-storage-r2) below.
- **Env vars** (secrets, `OAUTH_ISSUER`, `MCP_RESOURCE_BASE`, `CORS_ORIGINS`,
  `R2_*`, …) live in the Coolify UI under the application's Environment
  Variables. There is no host `.env` or `docker-compose.override.yml` here.
  Coolify keeps a runtime **and** a preview copy of every variable — change one
  and the other keeps its old value.

Deploys stay logged-in-safe for the same reason as before:
`JWT_SECRET_KEY` / `ELLIPTIC_KEK` are pinned in Coolify's env (stable across
deploys) and Postgres is a separate resource that deploys never recreate.

## Object storage (R2)

Uploads are backed by an S3-compatible bucket. Without it the API still runs,
but the Drive, comment attachments and every download answer "Object storage is
not configured" — the code fails closed rather than half-working.

Five variables live in the Coolify UI alongside the rest:

| Variable | Note |
|---|---|
| `R2_ENDPOINT_URL` | `https://<account_id>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | from an R2 API token |
| `R2_SECRET_ACCESS_KEY` | shown once at creation, never again |
| `R2_ACCOUNT_ID` | Cloudflare account id |
| `R2_BUCKET` | `elliptic-media` |

Only the first three decide whether storage is on; the other two have defaults.
Mint the key pair at Cloudflare → R2 → Manage API tokens → Object Read & Write.

### The bucket needs CORS

The web app asks the API for a presigned URL and then PUTs the bytes **from the
browser straight to the bucket**, so the bucket itself must allow the web
origin. Miss this and uploads still work over MCP and the REST API while
failing in the browser, which reads as "uploads are broken" from the only
surface most people use.

```json
{"rules": [{
  "allowed": {"origins": ["https://elliptic.sh", "https://www.elliptic.sh"],
              "methods": ["GET", "PUT", "HEAD"],
              "headers": ["content-type", "content-length"]},
  "exposeHeaders": ["ETag"],
  "maxAgeSeconds": 3600}]}
```

A new rule takes a few seconds to propagate; a preflight that 403s immediately
after a write is usually just that. Verify with an `OPTIONS` carrying `Origin`
and `Access-Control-Request-Method: PUT` — a working bucket answers 204 with
`access-control-allow-origin` set.

### Renaming the bucket is a migration

Object keys are `orgs/{org_id}/{entity}/{object_id}/{filename}` and Postgres
stores only the key — the bucket comes from `R2_BUCKET`. Pointing the variable
at a different bucket therefore orphans every existing file. Copy the objects
across first, verify the checksums, flip the variable (**both** the runtime and
the preview copy — Coolify keeps two), redeploy, and only then delete the old
bucket. Bucket-level config such as the CORS rule does not travel with the
objects; set it again on the new bucket.

## Config note (the MCP OAuth fix)

`MCP_RESOURCE_BASE` **must** be the full URL including the path:

```
MCP_RESOURCE_BASE=https://api.elliptic.sh/api/v1/mcp
```

A bare origin (`https://api.elliptic.sh`) makes the OAuth flow fail with
`resource must equal the canonical MCP URI`. Verify:

```bash
curl -s https://api.elliptic.sh/.well-known/oauth-protected-resource/api/v1/mcp
# "resource" must read https://api.elliptic.sh/api/v1/mcp
```

## Zero-downtime deploys and migrations

Coolify does a health-checked rolling update: it builds the new image, starts
the new container alongside the old one, waits until the healthcheck
(`GET /api/v1/health`) passes, then swaps Traefik over and removes the old
container. The old container keeps serving until the new one is healthy, so
the public endpoint never drops.

**Migrations must be backward-compatible (expand/contract).** The image runs
`alembic upgrade head` on start, while the *old* code is still serving — a
migration must not break the running old version. Do additive changes first;
drop/rename columns in a later deploy once no old code references them.

## Rollback

In the Coolify UI: **elliptic-api → Deployments**, pick an earlier successful
deployment and redeploy it. Images are tagged with the commit SHA and kept on
igris, so rolling back does not rebuild.

## Legacy (pre-Coolify)

- The interim manual compose stack on igris (a migration stopgap: an untracked
  checkout driven by a `docker-compose.igris.yml` overlay) may still be running
  but serves no public traffic; its Postgres volume holds the pre-migration
  data. Tear it down once a final backup is confirmed.
- The legacy manual blue-green files (`docker-compose.prod.yml`,
  `deploy/caddy/` and the deploy script) have been removed; if a compose-based
  reference is ever needed, they live in git history at v1.2.0.
