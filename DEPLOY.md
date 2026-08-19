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
- **Object storage:** the MinIO bucket **elliptic-media** on this same box,
  reached with the `R2_*` env vars. See [Object storage](#object-storage-minio)
  below.
- **Env vars** (secrets, `OAUTH_ISSUER`, `MCP_RESOURCE_BASE`, `CORS_ORIGINS`,
  `R2_*`, …) live in the Coolify UI under the application's Environment
  Variables. There is no host `.env` or `docker-compose.override.yml` here.
  Coolify keeps a runtime **and** a preview copy of every variable — change one
  and the other keeps its old value.

Deploys stay logged-in-safe for the same reason as before:
`JWT_SECRET_KEY` / `ELLIPTIC_KEK` are pinned in Coolify's env (stable across
deploys) and Postgres is a separate resource that deploys never recreate.

## Object storage (MinIO)

Uploads are backed by an S3-compatible bucket. Without it the API still runs,
but the Drive, comment attachments and every download answer "Object storage is
not configured" — the code fails closed rather than half-working.

The bucket is **elliptic-media** in the MinIO on igris. Coolify manages that
MinIO: project **media** → service **minio**, data on the host at
`/home/woosal/data/minio`. The S3 port and the console bind to the tailnet
address only. The public endpoint is `s3.elliptic.sh`, described below.

The variable names still start with `R2_`, because the code and every
self-hoster's `.env` use them. They hold MinIO values now.

| Variable | Value |
|---|---|
| `R2_ENDPOINT_URL` | `https://s3.elliptic.sh` |
| `R2_ACCESS_KEY_ID` | MinIO service account `elliptic-api` |
| `R2_SECRET_ACCESS_KEY` | the matching secret |
| `R2_ACCOUNT_ID` | empty. It is a Cloudflare idea, and nothing reads it |
| `R2_BUCKET` | `elliptic-media` |

Only the first three decide whether storage is on; the other two have defaults.
The `elliptic-api` service account can read and write this one bucket. It cannot
touch the other buckets in the same MinIO.

boto3 signs a **path style** URL for a custom endpoint, so the bucket name sits
in the path: `s3.elliptic.sh/elliptic-media/<key>`. The client code needs no
addressing option.

### How s3.elliptic.sh reaches MinIO

```
browser or API -> Cloudflare -> tunnel igris-coolify -> edge-caddy -> minio:9000
```

The Caddy block lives in `~/dev/edge/Caddyfile` on igris. It passes the paths of
this one bucket and answers 403 to everything else, so the other buckets stay on
the tailnet.

Three traps live in this path. All three are written down because each one is
invisible until it bites:

**Name the Caddy container, not the service.** Two containers on the `edge`
network answer to the name `caddy`: `edge-caddy` and `companyos-caddy-1`. Docker
answers that name with either one. The tunnel therefore points at
**`http://edge-caddy:80`**, which is unique. A tunnel rule that says
`http://caddy:80` works about half the time, and the other half returns a 404
from the wrong app.

**Browser Integrity Check blocks SDK clients.** Cloudflare answers `error code:
1010` to a request with a non-browser user agent. boto3 is exactly that. A
configuration rule on the zone turns the check off for `s3.elliptic.sh` alone.

**Cloudflare must not cache this host.** A cache rule bypasses the cache for
`s3.elliptic.sh`. Without it, the edge can hold an object that a presigned URL
returned, and serve it after the signature expires.

One limit comes with the tunnel: Cloudflare caps a proxied request body at
100 MB. The app caps an upload at 100 MB too, so a file at the top of that range
can fail at the edge.

### CORS is a MinIO setting, not a bucket rule

The web app asks the API for a presigned URL and then PUTs the bytes **from the
browser straight to the bucket**, so the bucket must allow the web origin. Miss
this and uploads still work over MCP and the REST API while failing in the
browser, which reads as "uploads are broken" from the only surface most people
use.

MinIO takes the origins as one env var on the service, not as a per-bucket JSON
rule:

```
MINIO_API_CORS_ALLOW_ORIGIN=https://elliptic.sh,https://www.elliptic.sh
```

It applies to the whole MinIO. Verify with an `OPTIONS` carrying `Origin` and
`Access-Control-Request-Method: PUT` — a working setup answers 204 with
`access-control-allow-origin` set. MinIO exposes `ETag` by itself.

### Renaming the bucket is a migration

Object keys are `orgs/{org_id}/{entity}/{object_id}/{filename}` and Postgres
stores only the key — the bucket comes from `R2_BUCKET`. Pointing the variable
at a different bucket therefore orphans every existing file. Copy the objects
across first, verify the checksums, flip the variable (**both** the runtime and
the preview copy — Coolify keeps two), redeploy, and only then delete the old
bucket. Bucket-level config such as the Caddy path rule does not travel with the
objects; set it again for the new bucket.

### History

The bucket was Cloudflare R2 until 2026-08-19. All 15 objects moved to igris
after a checksum check, and the R2 bucket was deleted.

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
