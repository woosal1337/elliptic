#!/bin/sh
#
# Points git at the repo's tracked hooks.
#
# core.hooksPath rather than copying into .git/hooks: the hook stays version
# controlled, so a change to it reaches everyone on their next pull instead of
# living in one person's untracked .git directory.

set -eu

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

git config core.hooksPath .githooks
chmod +x .githooks/*

echo "hooks installed — core.hooksPath = .githooks"
echo
echo "On commit, staged files are formatted and linted:"
echo "  apps/api      ruff format + ruff check --fix"
echo "  apps/web      eslint --fix"
echo "  apps/mobile   eslint --fix"
echo
echo "Skip once with: git commit --no-verify"
