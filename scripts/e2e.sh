#!/usr/bin/env bash
#
# Run the browser end-to-end suite against a throwaway stack:
#
#   Postgres  the dev container, with its own companyos_e2e database
#   MinIO     a fresh container on :9100, bucket elliptic-media
#   API       uvicorn on :8210, pointed at both
#   Web       next dev on :3210, proxying /api to :8210
#
#   scripts/e2e.sh         start the stack, run the tests, stop the stack
#   scripts/e2e.sh up      start the stack and leave it running
#   scripts/e2e.sh down    stop the API, the web app, and MinIO
#
# The dev stack on :8000/:3000 is untouched. The e2e database is dropped and
# recreated on every run, so a run always starts from zero.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT/apps/api"
WEB_DIR="$ROOT/apps/web/apps/web"
E2E_DIR="$ROOT/e2e"
LOG_DIR="${TMPDIR:-/tmp}/elliptic-e2e"
mkdir -p "$LOG_DIR"

API_PORT=8210
WEB_PORT=3210
MINIO_PORT=9100
MINIO_NAME=elliptic-e2e-minio

# Local-only values, mirrored from dev-stack.sh. None of these are secrets.
export DATABASE_URL="postgresql+asyncpg://companyos:companyos@localhost:5434/companyos_e2e"
export ELLIPTIC_KEK="MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA="
export JWT_SECRET_KEY="local-e2e-only-secret-not-production-0000"
export ENV=development
export CORS_ORIGINS="http://localhost:$WEB_PORT"
export APP_BASE_URL="http://localhost:$WEB_PORT"
export OAUTH_ISSUER="http://localhost:$API_PORT"
export R2_ENDPOINT_URL="http://localhost:$MINIO_PORT"
export R2_ACCESS_KEY_ID="minioadmin"
export R2_SECRET_ACCESS_KEY="minioadmin"
export R2_BUCKET="elliptic-media"

up_of() { curl -sS -o /dev/null -w '%{http_code}' --max-time 3 "$1" 2>/dev/null; true; }

wait_for() { # url, label
  for _ in $(seq 1 60); do
    [ "$(up_of "$1")" != "000" ] && { echo "  $2 ready"; return 0; }
    sleep 2
  done
  echo "  $2 did not come up — see $LOG_DIR"; return 1
}

start() {
  echo "postgres…"
  (cd "$API_DIR" && docker compose up -d postgres >/dev/null)
  for _ in $(seq 1 30); do
    docker exec companyos-postgres pg_isready -U companyos >/dev/null 2>&1 && break
    sleep 1
  done
  docker exec companyos-postgres psql -U companyos -d postgres \
    -c "DROP DATABASE IF EXISTS companyos_e2e;" -c "CREATE DATABASE companyos_e2e;" >/dev/null
  echo "  companyos_e2e reset"

  echo "minio…"
  docker rm -f "$MINIO_NAME" >/dev/null 2>&1 || true
  docker run -d --name "$MINIO_NAME" \
    -p "$MINIO_PORT:9000" \
    -e MINIO_ROOT_USER=minioadmin \
    -e MINIO_ROOT_PASSWORD=minioadmin \
    -e MINIO_API_CORS_ALLOW_ORIGIN="http://localhost:$WEB_PORT" \
    minio/minio server /data >/dev/null
  wait_for "http://localhost:$MINIO_PORT/minio/health/live" "minio"
  docker exec "$MINIO_NAME" sh -c \
    "mc alias set local http://127.0.0.1:9000 minioadmin minioadmin >/dev/null && mc mb -p local/$R2_BUCKET >/dev/null"
  echo "  bucket $R2_BUCKET ready"

  # Through python -m, not the .venv/bin scripts: those carry the shebang of
  # the path this repo had before its rename, and they fail to spawn.
  echo "migrations…"
  (cd "$API_DIR" && .venv/bin/python -m alembic upgrade head >"$LOG_DIR/migrate.log" 2>&1) \
    && echo "  applied"

  echo "api…"
  (cd "$API_DIR" && nohup .venv/bin/python -m uvicorn elliptic.main:app --port "$API_PORT" \
    >"$LOG_DIR/api.log" 2>&1 & echo $! >"$LOG_DIR/api.pid")
  wait_for "http://localhost:$API_PORT/api/v1/health" "api"

  echo "web…"
  # A .next cache from an older checkout holds absolute paths and sends the
  # dev server into a reload loop. A fresh compile costs seconds and is sound.
  rm -rf "$WEB_DIR/.next"
  (cd "$WEB_DIR" && BACKEND_ORIGIN="http://localhost:$API_PORT" PORT="$WEB_PORT" \
    nohup bun run dev >"$LOG_DIR/web.log" 2>&1 & echo $! >"$LOG_DIR/web.pid")
  wait_for "http://localhost:$WEB_PORT" "web"
}

stop() {
  for name in api web; do
    if [ -f "$LOG_DIR/$name.pid" ]; then
      pkill -P "$(cat "$LOG_DIR/$name.pid")" 2>/dev/null || true
      kill "$(cat "$LOG_DIR/$name.pid")" 2>/dev/null || true
      rm -f "$LOG_DIR/$name.pid"
    fi
  done
  # By port, not by name: the port sits in the environment, so no command
  # line names it, and a survivor here breaks the next run with EADDRINUSE.
  lsof -ti ":$API_PORT" 2>/dev/null | xargs kill 2>/dev/null || true
  lsof -ti ":$WEB_PORT" 2>/dev/null | xargs kill 2>/dev/null || true
  docker rm -f "$MINIO_NAME" >/dev/null 2>&1 || true
  echo "e2e stack stopped"
}

run_tests() {
  cd "$E2E_DIR"
  [ -d node_modules ] || bun install
  # The local binary, not bunx: bunx run outside this directory fetches a
  # second playwright version, and two versions refuse to run one suite.
  ./node_modules/.bin/playwright test "$@"
}

case "${1:-all}" in
  up) start ;;
  down) stop ;;
  test) shift || true; run_tests "$@" ;;
  all)
    trap stop EXIT
    start
    run_tests
    ;;
  *) echo "usage: scripts/e2e.sh [up|down|test|all]"; exit 1 ;;
esac
