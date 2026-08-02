#!/usr/bin/env bash
#
# Bring up the whole local stack for eyeballing changes: Postgres, the API, and
# the web app pointed at it. Everything runs against the local database, so
# nothing here can reach production.
#
#   scripts/dev-stack.sh up      start Postgres + API + web (idempotent)
#   scripts/dev-stack.sh seed    reset the demo board
#   scripts/dev-stack.sh status  what is listening
#   scripts/dev-stack.sh down    stop the API and web (Postgres keeps running)
#
# Sign in at http://localhost:3000 with either:
#   ege@elliptic.sh            / password           (seeded demo org)
#   claude.testbench@elliptic.sh / test-bench-2026  (every status + priority)
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT/apps/api"
WEB_DIR="$ROOT/apps/web"
LOG_DIR="${TMPDIR:-/tmp}/elliptic-dev"
mkdir -p "$LOG_DIR"

# Local-only values. The KEK is a throwaway 32-byte key; the JWT secret is not a
# production secret and must never become one.
export DATABASE_URL="postgresql+asyncpg://companyos:companyos@localhost:5434/companyos"
export ELLIPTIC_KEK="MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA="
export JWT_SECRET_KEY="local-dev-only-secret-not-production-0000"
export ENV=development
export CORS_ORIGINS="http://localhost:3000"
export APP_BASE_URL="http://localhost:3000"
export OAUTH_ISSUER="http://localhost:8000"

# curl -w already prints 000 when it cannot connect, and exits non-zero — a
# `|| echo 000` on top yields "000000", which then reads as "up".
up_of() { curl -sS -o /dev/null -w '%{http_code}' --max-time 3 "$1" 2>/dev/null; true; }

wait_for() { # url, label
  for _ in $(seq 1 45); do
    [ "$(up_of "$1")" != "000" ] && { echo "  $2 ready"; return 0; }
    sleep 2
  done
  echo "  $2 did not come up — see $LOG_DIR"; return 1
}

case "${1:-up}" in
  up)
    echo "postgres…"
    (cd "$API_DIR" && docker compose up -d postgres >/dev/null)
    for _ in $(seq 1 30); do
      docker exec companyos-postgres pg_isready -U companyos >/dev/null 2>&1 && break
      sleep 1
    done
    echo "  ready on :5434"

    echo "migrations…"
    (cd "$API_DIR" && uv run alembic upgrade head >"$LOG_DIR/migrate.log" 2>&1) && echo "  applied"

    if [ "$(up_of http://localhost:8000/api/v1/health)" = "000" ]; then
      echo "api…"
      (cd "$API_DIR" && nohup uv run uvicorn elliptic.main:app --port 8000 \
         >"$LOG_DIR/api.log" 2>&1 & disown) || true
      wait_for http://localhost:8000/api/v1/health "  api :8000"
    else
      echo "api already on :8000"
    fi

    if [ "$(up_of http://localhost:3000)" = "000" ]; then
      echo "web…"
      (cd "$WEB_DIR" && BACKEND_ORIGIN=http://localhost:8000 nohup bun run dev \
         >"$LOG_DIR/web.log" 2>&1 & disown) || true
      wait_for http://localhost:3000 "  web :3000"
    else
      echo "web already on :3000"
    fi

    echo
    echo "http://localhost:3000 — ege@elliptic.sh / password"
    ;;

  seed)
    (cd "$API_DIR" && uv run python scripts/seed.py)
    ;;

  status)
    printf '  postgres :5434  %s\n' "$(docker ps --format '{{.Names}}' | grep -q companyos-postgres && echo up || echo down)"
    printf '  api      :8000  %s\n' "$(up_of http://localhost:8000/api/v1/health)"
    printf '  web      :3000  %s\n' "$(up_of http://localhost:3000)"
    printf '  logs            %s\n' "$LOG_DIR"
    ;;

  down)
    pkill -f "uvicorn elliptic.main:app" 2>/dev/null && echo "  api stopped" || echo "  api not running"
    pkill -f "next.*dev" 2>/dev/null && echo "  web stopped" || echo "  web not running"
    echo "  postgres left running (docker compose down to stop it)"
    ;;

  *)
    echo "usage: $0 {up|seed|status|down}"; exit 2 ;;
esac
