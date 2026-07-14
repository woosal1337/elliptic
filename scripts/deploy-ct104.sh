#!/usr/bin/env bash
#
# Zero-downtime (blue-green) deploy of the CompanyOS API on ct104.
#
# The API sits behind an always-up Caddy proxy (docker-compose.prod.yml). A
# deploy builds the new image, starts a SECOND api replica on it alongside the
# old one, waits until the new replica is healthy, then drains and removes the
# old one. Caddy load-balances across whatever replicas exist, so the public
# endpoint (cloudflared -> Caddy) never drops a connection.
#
# Requirements:
#   - Run from the /opt/companyos checkout already reset to the target commit.
#   - The host .env (API_PORT, secrets) and docker-compose.override.yml are in
#     place (untracked).
#   - DB migrations MUST be backward-compatible (expand/contract): the new
#     replica runs `alembic upgrade head` on boot while the old code still
#     serves, so a migration can't break the still-running old replica.
#
# Usage:  bash scripts/deploy-ct104.sh
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.prod.yml)
API_PORT="$(grep -E '^API_PORT=' .env 2>/dev/null | cut -d= -f2 || true)"
API_PORT="${API_PORT:-8100}"

log() { echo "[deploy] $*"; }

# 1) Build the new image; the old container keeps serving during the build.
log "building api image…"
"${COMPOSE[@]}" build api

# 1a) First cutover: if Caddy isn't running yet, the api may still be publishing
#     the host port from the pre-proxy setup, so Caddy can't bind it. Recreate
#     the api under the prod definition (internal-only, `ports: !reset []`) to
#     free the port, then bring Caddy up. This is the ONLY step with a brief
#     blip and runs exactly once; afterwards deploys are pure blue-green.
if ! "${COMPOSE[@]}" ps --services --filter status=running | grep -qx caddy; then
  log "first cutover: recreating api internal-only + starting caddy (one-time brief blip)…"
  "${COMPOSE[@]}" up -d --no-deps api
  "${COMPOSE[@]}" up -d --no-deps caddy
  log "verifying via proxy on :${API_PORT}…"
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:${API_PORT}/api/v1/health" >/dev/null 2>&1; then
      log "cutover complete, healthy via proxy ✓"
      docker image prune -f >/dev/null 2>&1 || true
      exit 0
    fi
    sleep 2
  done
  log "ERROR: proxy health check failed during first cutover."
  exit 1
fi

# 2) Ensure the proxy is up (idempotent; owns the public host port).
log "ensuring caddy proxy is up…"
"${COMPOSE[@]}" up -d --no-deps caddy

# 3) Blue-green: add a second api replica on the new image WITHOUT recreating
#    the old one. The old (blue) keeps serving on the old image.
OLD_IDS="$("${COMPOSE[@]}" ps -q api)"
log "current api replica(s): $(echo "$OLD_IDS" | tr '\n' ' ')"
log "starting green replica…"
"${COMPOSE[@]}" up -d --no-deps --no-recreate --scale api=2 api

# 4) Wait until every api replica reports docker-healthy.
log "waiting for replicas to become healthy…"
healthy_all=0
for _ in $(seq 1 60); do
  ids="$("${COMPOSE[@]}" ps -q api)"
  total=$(echo "$ids" | grep -c . || true)
  healthy=0
  for id in $ids; do
    st="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$id" 2>/dev/null || echo none)"
    [ "$st" = "healthy" ] && healthy=$((healthy + 1))
  done
  log "  healthy ${healthy}/${total}"
  if [ "$total" -ge 2 ] && [ "$healthy" -ge 2 ]; then healthy_all=1; break; fi
  sleep 3
done
if [ "$healthy_all" != 1 ]; then
  log "ERROR: green replica did not become healthy; leaving old replica in place."
  "${COMPOSE[@]}" logs --tail=80 api || true
  # Roll back to a single (old) replica.
  "${COMPOSE[@]}" up -d --no-deps --no-recreate --scale api=1 api || true
  exit 1
fi

# 5) Let Caddy discover the green replica (refresh interval is 2s) before we
#    take the old one out of rotation.
sleep 4

# 6) Drain + remove the old replica(s). Green keeps serving.
for id in $OLD_IDS; do
  log "draining old replica ${id}…"
  docker stop -t 25 "$id" >/dev/null && docker rm "$id" >/dev/null
done

# 7) Normalise desired scale back to 1 without disturbing green.
"${COMPOSE[@]}" up -d --no-deps --no-recreate --scale api=1 api

# 8) Final health gate through the public proxy path.
log "verifying via proxy on :${API_PORT}…"
for _ in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:${API_PORT}/api/v1/health" >/dev/null 2>&1; then
    log "healthy via proxy ✓"
    docker image prune -f >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 2
done
log "ERROR: proxy health check failed after cutover."
exit 1
