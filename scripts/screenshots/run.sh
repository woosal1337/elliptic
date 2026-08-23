#!/usr/bin/env bash
#
# Rebuild every screenshot the README shows.
#
#   scripts/screenshots/run.sh            web + mobile
#   scripts/screenshots/run.sh web        web only
#   scripts/screenshots/run.sh mobile     mobile only
#
# It expects the local stack to be up already:
#
#   scripts/dev-stack.sh up
#
# The web step needs no more than that. The mobile step needs a booted iOS
# simulator with the app installed and pointed at the local API. Build it
# first:
#
#   cd apps/mobile
#   EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1 \
#     npx expo run:ios --device "$IOS_DEVICE"
#
# Build Debug, not Release. Only `config.dev.ts` reads EXPO_PUBLIC_API_URL, so
# a Release build talks to production whatever that variable says.
#
# Both steps write into .github/assets/.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HERE="$ROOT/scripts/screenshots"
ASSETS="$ROOT/.github/assets"
MOBILE="$ROOT/apps/mobile"

# The web app moves off :3000 when something else holds the port.
WEB_ORIGIN="${WEB_ORIGIN:-http://localhost:3000}"
IOS_DEVICE="${IOS_DEVICE:-$(xcrun simctl list devices booted 2>/dev/null | grep -Eo '[0-9A-F-]{36}' | head -1)}"

EMAIL="ada.reyes@northwind.dev"
PASSWORD="showcase-2026"

seed() {
  echo "==> seeding the showcase workspace"
  "$ROOT/apps/api/.venv/bin/python" "$HERE/seed_showcase.py"
}

# The captures are taken at two device pixels per CSS pixel, which is larger
# than any README draws them.
shrink() {
  echo "==> shrinking the images"
  python3 "$HERE/optimize.py"
}

web() {
  echo "==> capturing the web screens"
  WEB_ORIGIN="$WEB_ORIGIN" node "$HERE/capture.mjs"
}

# One Maestro run per appearance. The app follows the system setting, so the
# simulator's appearance decides which theme the images show.
mobile_pass() { # appearance, suffix
  local appearance="$1" suffix="$2"
  echo "==> capturing the mobile screens ($appearance)"
  xcrun simctl ui "$IOS_DEVICE" appearance "$appearance"

  # Reinstall, so the pass always starts on the sign-in screen. Then turn the
  # dev-menu button off: it floats over every screen of a Debug build, and it
  # lands in each image. The preference must be written after the install,
  # because the install drops the app's data container.
  local app
  app="$(ls -td "$HOME"/Library/Developer/Xcode/DerivedData/Elliptic-*/Build/Products/Debug-iphonesimulator/Elliptic.app 2>/dev/null | head -1)"
  [ -n "$app" ] || { echo "no Debug build found — run expo run:ios first"; return 1; }
  xcrun simctl uninstall "$IOS_DEVICE" sh.elliptic >/dev/null 2>&1 || true
  xcrun simctl install "$IOS_DEVICE" "$app"
  xcrun simctl spawn "$IOS_DEVICE" defaults write sh.elliptic \
    EXDevMenuShowFloatingActionButton -bool NO
  rm -rf "$MOBILE/.maestro/output/readme"
  (cd "$MOBILE" && IOS_DEVICE="$IOS_DEVICE" MAESTRO_EMAIL="$EMAIL" MAESTRO_PASSWORD="$PASSWORD" \
    scripts/maestro.sh ios .maestro/capture/readme-shots.yaml)

  # Maestro writes to its own run directory, so take the newest one.
  local out
  out="$(ls -td "$HOME"/.maestro/tests/*/readme-shots/takeScreenshot 2>/dev/null | head -1)"
  [ -n "$out" ] || { echo "no Maestro screenshots found"; return 1; }

  for src in "$out"/readme-*.png; do
    local name
    name="$(basename "$src" .png)"
    name="${name#readme-??-}"
    cp "$src" "$ASSETS/mobile-${name}${suffix}.png"
  done
}

case "${1:-all}" in
  seed) seed ;;
  web) web; shrink ;;
  shrink) shrink ;;
  mobile)
    mobile_pass light "-light"
    mobile_pass dark ""
    shrink
    ;;
  all)
    seed
    web
    mobile_pass light "-light"
    mobile_pass dark ""
    shrink
    ;;
  *)
    echo "usage: scripts/screenshots/run.sh [all|seed|web|mobile|shrink]" >&2
    exit 2
    ;;
esac

echo
echo "wrote into $ASSETS"
