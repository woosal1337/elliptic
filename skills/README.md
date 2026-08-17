# Skills

Agent skills that ship with Elliptic. A skill is a folder holding a
`SKILL.md` (instructions an agent loads when the task matches) plus optional
`references/` files it reads on demand.

| Skill | What it teaches |
|---|---|
| [`elliptic/`](elliptic/SKILL.md) | Operating an Elliptic workspace through its built-in MCP server: the domain model, org discipline, all 155 tools, storage layout, and step-by-step playbooks. |

## Installing

**Claude Code** — copy (or symlink) the folder into your project or user
skills directory:

```bash
# per-project
mkdir -p .claude/skills && cp -r skills/elliptic .claude/skills/

# or globally, for every project
mkdir -p ~/.claude/skills && cp -r skills/elliptic ~/.claude/skills/
```

**Other agent runtimes** — any harness that supports the SKILL.md convention
(frontmatter `name` + `description`, body loaded on demand) can point at the
folder directly.

The skill assumes the agent also has the Elliptic MCP server connected
(`https://api.elliptic.sh/api/v1/mcp`, or your self-hosted
`{api-origin}/api/v1/mcp`). See [docs.elliptic.sh](https://docs.elliptic.sh)
for connecting Claude Code, Cursor, and other clients.

## Keeping it honest

The skill documents the MCP surface as implemented in
`apps/api/src/elliptic/modules/mcp_server/`. When tools change, update the
catalog in `skills/elliptic/references/tools.md` — the per-module tool counts
can be checked with:

```bash
grep -c "@mcp.tool" apps/api/src/elliptic/modules/mcp_server/tools_*.py
```
