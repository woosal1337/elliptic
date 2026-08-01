#!/usr/bin/env bash
#
# Cross-platform Maestro runner for Elliptic mobile.
#
# Drives flows on either the iOS simulator (where the app is developed) or the
# Android emulator (Android_1, where the Linear app lives as a UX reference).
# Screenshots taken by a flow land in .maestro/output/<flow-name>/ (or wherever
# the flow's takeScreenshot points).
#
# Usage:
#   scripts/maestro.sh ios   <flow.yaml> [maestro args...]
#   scripts/maestro.sh android <flow.yaml> [maestro args...]
#   scripts/maestro.sh devices                 # list connected devices
#
# Env overrides:
#   IOS_DEVICE      iOS simulator UDID (default: booted iPhone 17 Pro)
#   ANDROID_DEVICE  adb device id      (default: emulator-5554)
#   JAVA_HOME       JDK for Maestro    (default: whatever this host has)
#
set -euo pipefail

# Maestro runs on the JVM. macOS ships no JRE, so fall back to a Homebrew JDK
# instead of failing with "Unable to locate a Java Runtime".
if [ -z "${JAVA_HOME:-}" ]; then
  JAVA_HOME="$(/usr/libexec/java_home 2>/dev/null || true)"
  if [ -z "$JAVA_HOME" ]; then
    for jdk in /opt/homebrew/opt/openjdk /opt/homebrew/opt/openjdk@17; do
      [ -x "$jdk/libexec/openjdk.jdk/Contents/Home/bin/java" ] || continue
      JAVA_HOME="$jdk/libexec/openjdk.jdk/Contents/Home"
      break
    done
  fi
  [ -n "$JAVA_HOME" ] && export JAVA_HOME
fi

MAESTRO_BIN="${MAESTRO_BIN:-$HOME/.maestro/bin/maestro}"
ADB="${ADB:-$HOME/Library/Android/sdk/platform-tools/adb}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

IOS_DEVICE="${IOS_DEVICE:-$(xcrun simctl list devices booted 2>/dev/null | grep -Eo '[0-9A-F-]{36}' | head -1)}"
ANDROID_DEVICE="${ANDROID_DEVICE:-emulator-5554}"

cmd="${1:-}"; shift || true

case "$cmd" in
  devices)
    echo "iOS (booted simulators):"
    xcrun simctl list devices booted | grep -E "Booted" || echo "  none"
    echo "Android (adb):"
    "$ADB" devices | grep -w device || echo "  none"
    ;;
  ios)
    flow="$1"; shift || true
    [ -z "${IOS_DEVICE:-}" ] && { echo "No booted iOS simulator. Boot one first."; exit 1; }
    echo "▶ iOS  ($IOS_DEVICE) :: $flow"
    # Extra args (e.g. -e KEY=value) must precede the flow file.
    cd "$ROOT" && "$MAESTRO_BIN" --device "$IOS_DEVICE" test "$@" "$flow"
    ;;
  android)
    flow="$1"; shift || true
    echo "▶ Android ($ANDROID_DEVICE) :: $flow"
    cd "$ROOT" && "$MAESTRO_BIN" --device "$ANDROID_DEVICE" test "$@" "$flow"
    ;;
  *)
    echo "usage: scripts/maestro.sh {ios|android|devices} <flow.yaml> [args]"
    exit 2
    ;;
esac
