#!/usr/bin/env bash
# Elliptic — per-project agent setup.
#
# Wires the CURRENT project so your AI coding agent (Claude Code, etc.) reliably
# uses the Elliptic company brain whenever it searches for or saves anything
# about the company. Project-scoped and opt-in: it only touches the directory
# you run it in, so your other projects are unaffected. Safe to re-run.
#
# Usage:
#   cd your-project
#   bash elliptic-agent-init.sh [--endpoint URL] [--name elliptic]
#
# It writes (or idempotently updates):
#   .mcp.json                          project-scoped MCP connection (OAuth)
#   CLAUDE.md                          a marked Elliptic routing block
#   .claude/skills/elliptic/SKILL.md  an on-demand skill for the agent
set -euo pipefail

ENDPOINT="${ELLIPTIC_MCP_URL:-${COMPANYOS_MCP_URL:-http://localhost:8000/api/v1/mcp}}"
NAME="elliptic"

while [ $# -gt 0 ]; do
  case "$1" in
    --endpoint) ENDPOINT="$2"; shift 2 ;;
    --endpoint=*) ENDPOINT="${1#*=}"; shift ;;
    --name) NAME="$2"; shift 2 ;;
    --name=*) NAME="${1#*=}"; shift ;;
    -h|--help)
      echo "Usage: elliptic-agent-init.sh [--endpoint URL] [--name elliptic]"
      exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

ROOT="$(pwd)"
echo "Elliptic agent setup"
echo "  project:  $ROOT"
echo "  endpoint: $ENDPOINT"
echo "  server:   $NAME"
echo

# 1) Project-scoped MCP config -------------------------------------------------
MCP_JSON="$ROOT/.mcp.json"
if [ ! -f "$MCP_JSON" ]; then
  cat > "$MCP_JSON" <<EOF
{
  "mcpServers": {
    "$NAME": {
      "type": "http",
      "url": "$ENDPOINT"
    }
  }
}
EOF
  echo "✓ wrote .mcp.json"
elif grep -q "\"$NAME\"" "$MCP_JSON"; then
  echo "• .mcp.json already defines \"$NAME\" — left unchanged"
else
  echo "! .mcp.json exists without a \"$NAME\" server. Add this into its"
  echo "  \"mcpServers\" object (left your file untouched to avoid corruption):"
  echo
  echo "    \"$NAME\": { \"type\": \"http\", \"url\": \"$ENDPOINT\" }"
  echo
fi

# 2) CLAUDE.md routing block (idempotent, between markers) ---------------------
CLAUDE_MD="$ROOT/CLAUDE.md"
START="<!-- elliptic:start -->"
END="<!-- elliptic:end -->"
# Blocks written before the rename carry the old markers. Recognise them so a
# re-run refreshes that block instead of appending a second one.
LEGACY_START="<!-- companyos:start -->"
LEGACY_END="<!-- companyos:end -->"
HAD_BLOCK=0
if [ -f "$CLAUDE_MD" ] && grep -qF -e "$START" -e "$LEGACY_START" "$CLAUDE_MD"; then HAD_BLOCK=1; fi

BLOCK_FILE="$(mktemp)"
cat > "$BLOCK_FILE" <<EOF
$START
## Elliptic (company brain)

This project uses the **Elliptic** MCP as the source of truth for the
organization's projects, tasks, meetings, notes, calendar, and activity.

- **Search first.** Before answering anything about the company, a project, a
  task, a person, a meeting, or a deadline, query Elliptic (\`mcp__${NAME}__*\`)
  instead of guessing or relying only on local files.
- **Save there.** When asked to create or track work — a task, note, decision,
  or follow-up — write it to Elliptic, not just to local memory.
- **It is authoritative.** Treat Elliptic as the source of truth; local memory
  and notes should point to it, not duplicate it.

Authorize once with \`/mcp\`.
$END
EOF

TMP="$(mktemp)"
if [ -f "$CLAUDE_MD" ]; then
  # Drop any previous managed block, keep everything else in order.
  awk -v s="$START" -v e="$END" -v ls="$LEGACY_START" -v le="$LEGACY_END" '
    $0==s || $0==ls {inblk=1}
    inblk && ($0==e || $0==le) {inblk=0; next}
    !inblk {print}
  ' "$CLAUDE_MD" > "$TMP"
fi
# Separate from prior content with a blank line, then append the fresh block.
[ -s "$TMP" ] && printf '\n' >> "$TMP"
cat "$BLOCK_FILE" >> "$TMP"
mv "$TMP" "$CLAUDE_MD"
rm -f "$BLOCK_FILE"
if [ "${HAD_BLOCK:-0}" != "0" ]; then
  echo "✓ refreshed Elliptic block in CLAUDE.md"
else
  echo "✓ added Elliptic block to CLAUDE.md"
fi

# 3) On-demand skill -----------------------------------------------------------
SKILL_DIR="$ROOT/.claude/skills/$NAME"
mkdir -p "$SKILL_DIR"
cat > "$SKILL_DIR/SKILL.md" <<EOF
---
name: $NAME
description: Use whenever the user asks to find, search, look up, check the status of, create, update, or save anything about the company, a project, a task, a meeting, a note, a person, or a deadline. Route those requests to the Elliptic company-brain MCP instead of guessing or relying only on local files.
---

# Elliptic company brain

Elliptic is this organization's source of truth for projects, tasks, meetings,
notes, calendar events, and activity, reachable through the \`mcp__${NAME}__*\`
tools (authorize once with \`/mcp\`).

## When to use
- "find / search / look up / what's the status of …" a project, task, note,
  meeting, or person → search Elliptic first.
- "create / add / track / save / log …" a task, note, decision, or follow-up →
  write it to Elliptic.
- Any question whose answer lives in the company's projects, tasks, or meetings.

## How to use
- Start from a list/search tool, then drill in:
  - \`mcp__${NAME}__list_projects\`, \`mcp__${NAME}__list_project_tasks\`,
    \`mcp__${NAME}__get_task\`
  - \`mcp__${NAME}__create_task\`, \`mcp__${NAME}__update_task\`,
    \`mcp__${NAME}__transition_task_status\`
  - \`mcp__${NAME}__create_note\`, \`mcp__${NAME}__list_notes\`
  - \`mcp__${NAME}__list_meetings\`, \`mcp__${NAME}__list_calendar_events\`
  - \`mcp__${NAME}__brain_changes_since\`, \`mcp__${NAME}__brain_open_threads\`,
    \`mcp__${NAME}__brain_resume\` for "catch me up / where did I leave off".
- Creates accept an \`idempotency_key\` — reuse it so retries never duplicate.
- Treat Elliptic as authoritative: don't answer company questions from memory
  when a tool can fetch the real value.
EOF
echo "✓ wrote .claude/skills/$NAME/SKILL.md"

echo
echo "Done. Next:"
echo "  1. Open this project in Claude Code (or your MCP client)."
echo "  2. Run /mcp and approve \"$NAME\" to authorize (OAuth, opens browser)."
echo "  3. Your agent will now reach for Elliptic on project search/save."
