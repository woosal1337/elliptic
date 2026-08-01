import type { DocBlock, DocPage } from "../_content/types";
import { DOC_PAGES } from "../_content/pages";
import { ORDERED_SLUGS } from "../_content/nav";

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN ?? "http://localhost:3000";
const DOCS_ORIGIN = process.env.NEXT_PUBLIC_DOCS_ORIGIN ?? `${APP_ORIGIN}/docs`;
const MCP_ORIGIN = process.env.NEXT_PUBLIC_MCP_ORIGIN ?? "http://localhost:8000";

function blockToMarkdown(block: DocBlock): string {
  switch (block.type) {
    case "h2":
      return `## ${block.text ?? ""}`;
    case "h3":
      return block.text?.trim() ? `### ${block.text}` : "";
    case "p":
      return block.text ?? "";
    case "ul":
      return (block.items ?? []).map((item) => `- ${item}`).join("\n");
    case "ol":
      return (block.items ?? []).map((item, index) => `${index + 1}. ${item}`).join("\n");
    case "steps":
      return (block.steps ?? [])
        .map((step, index) => `${index + 1}. **${step.title}**\n\n   ${step.text}`)
        .join("\n");
    case "code":
      return "```" + (block.lang ?? "") + "\n" + (block.code ?? "") + "\n```";
    case "callout": {
      const tag =
        block.variant === "warning"
          ? "[!WARNING]"
          : block.variant === "tip"
            ? "[!TIP]"
            : "[!NOTE]";
      const lines = [tag];
      if (block.title) lines.push(`**${block.title}**`);
      if (block.text) lines.push(block.text);
      return lines.map((line) => `> ${line}`).join("\n");
    }
    case "table": {
      const headers = block.headers ?? [];
      const rows = block.rows ?? [];
      const head = `| ${headers.join(" | ")} |`;
      const sep = `| ${headers.map(() => "---").join(" | ")} |`;
      const body = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
      return [head, sep, body].filter(Boolean).join("\n");
    }
    default:
      return "";
  }
}

export function pageToMarkdown(page: DocPage): string {
  const parts = [`# ${page.title}`, `> ${page.description}`];
  for (const block of page.blocks) {
    const md = blockToMarkdown(block);
    if (md) parts.push(md);
  }
  return parts.join("\n\n") + "\n";
}

function orderedPages(): DocPage[] {
  return ORDERED_SLUGS.map((slug) => DOC_PAGES.find((page) => page.slug === slug)).filter(
    (page): page is DocPage => Boolean(page),
  );
}

export function allPagesToMarkdown(): string {
  const preamble = [
    "# Elliptic — Full Documentation",
    "> Elliptic is an AI-native company brain: organizations, projects, tasks, meetings, notes, calendar, activity, and an org-wide knowledge brain. Every surface is usable by people in the web app and by AI agents through the Company-Brain MCP (OAuth 2.1). This file concatenates the entire end-user documentation as Markdown so an agent can load the full product scope in a single pass.",
    `Web app: ${APP_ORIGIN}/app · Docs: ${DOCS_ORIGIN} · MCP endpoint: ${MCP_ORIGIN}/api/v1/mcp`,
  ].join("\n\n");
  return [preamble, ...orderedPages().map(pageToMarkdown)].join("\n\n---\n\n") + "\n";
}

export function llmsIndex(): string {
  const first = ORDERED_SLUGS[0];
  const lines = [
    "# Elliptic",
    "",
    "> AI-native company brain. Organizations, projects, tasks, meetings, notes, calendar, activity, and a knowledge brain — usable by people and by AI agents via the Company-Brain MCP (OAuth 2.1, per-org tokens, granular scopes).",
    "",
    "## Documentation",
    ...orderedPages().map((page) => {
      const url = page.slug === first ? `${DOCS_ORIGIN}/` : `${DOCS_ORIGIN}/${page.slug}`;
      return `- [${page.title}](${url}): ${page.description}`;
    }),
    "",
    "## Full text",
    `- [Full documentation as one Markdown file](${DOCS_ORIGIN}/llms-full.txt): every page concatenated for agent ingestion.`,
  ];
  return lines.join("\n") + "\n";
}
