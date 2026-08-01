import type { DocBlock } from "@/app/docs/_content/types";

export interface Release {
  /** Semver, e.g. "1.0.0". */
  version: string;
  /** ISO date, yyyy-mm-dd */
  date: string;
  blocks: DocBlock[];
}

export const RELEASES: Release[] = [
  {
    version: "1.1.2",
    date: "2026-07-17",
    blocks: [
      {
        type: "p",
        text: "A second MCP OAuth compatibility patch: your choices on the consent screen now decide the grant for clients that request no scopes.",
      },
      { type: "h3", text: "MCP OAuth" },
      {
        type: "ul",
        items: [
          "Fixed write access for MCP clients. Clients like Claude Code send no `scope` parameter on the authorize request, and the server silently reduced every consent decision — including Root / Admin — to the read-only baseline. The selection you make on the consent screen is now exactly the grant.",
          "Clients that request explicit scopes are unchanged: the grant is still capped at what the client requested.",
        ],
      },
    ],
  },
  {
    version: "1.1.1",
    date: "2026-07-17",
    blocks: [
      {
        type: "p",
        text: "A compatibility fix for connecting MCP clients: the OAuth authorization server no longer requires the RFC 8707 resource indicator.",
      },
      { type: "h3", text: "MCP OAuth" },
      {
        type: "ul",
        items: [
          "The `resource` parameter is now optional on the authorize request. When a client omits it, the server binds the request to the canonical MCP resource URI from its own metadata, so clients that predate resource indicators in the MCP auth spec (for example JetBrains Air's MCP settings) can complete the consent flow.",
          "A provided `resource` must still equal the canonical MCP URI, so audience binding is unchanged: a code minted for this server cannot be replayed against another one.",
        ],
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-06-28",
    blocks: [
      {
        type: "p",
        text: "The public site, properly. A working marketing site with deep product pages, a hosted blog and changelog, and full SEO.",
      },
      { type: "h3", text: "Marketing site" },
      {
        type: "ul",
        items: [
          "A fully functional footer and top nav, with every link resolving.",
          "Deep, technical product pages for Projects, Meetings, Notes, and Activity.",
          "Rebuilt About and Contact pages, plus Privacy and Terms.",
        ],
      },
      { type: "h3", text: "Blog and changelog" },
      {
        type: "ul",
        items: [
          "A Elliptic-hosted blog with posts and an RSS feed.",
          "This changelog, hosted on the site.",
        ],
      },
      { type: "h3", text: "SEO and social previews" },
      {
        type: "ul",
        items: [
          "Sitemap, robots, and canonical URLs across the site.",
          "Generated Open Graph and Twitter cards, with a per-page image.",
        ],
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-06-28",
    blocks: [
      {
        type: "p",
        text: "The first public release of Elliptic. The full agent-native work platform, open source under Apache-2.0 and self-hostable with one docker compose.",
      },
      { type: "h3", text: "Work tracking" },
      {
        type: "ul",
        items: [
          "Projects with leads, members, states, and templates.",
          "Linear-style tasks with stable identifiers like `DEMO-42`, List, Board, and Table views, sub-tasks, labels, priorities, and the PQL query language.",
          "Cycles, initiatives, milestones, and releases for planning at every altitude.",
          "Intake and triage to turn inbound requests into tracked work.",
        ],
      },
      { type: "h3", text: "Meetings and knowledge" },
      {
        type: "ul",
        items: [
          "Speaker-attributed meeting transcripts, AI summaries, and ask-the-meeting.",
          "Notes and a company wiki with live multi-cursor co-editing.",
          "Folio meeting import.",
        ],
      },
      { type: "h3", text: "AI and agents" },
      {
        type: "ul",
        items: [
          "A built-in MCP server (OAuth 2.1, about 144 tools) that exposes the whole workspace to agents.",
          "An in-product assistant, plus agents with budgets and a sandboxed runner.",
          "Bring your own OpenAI or Anthropic key, encrypted at rest, with every run written to an audit log.",
        ],
      },
      { type: "h3", text: "Collaboration" },
      {
        type: "ul",
        items: [
          "Live sync over SSE, threaded comments, reactions, activity feeds, notifications, and full-text search.",
          "Public embeds and shareable links.",
        ],
      },
      { type: "h3", text: "Enterprise and platform" },
      {
        type: "ul",
        items: [
          "True multi-tenancy with org-scoped data isolation.",
          "SSO over SAML and OIDC, SCIM, LDAP, IdP group sync, and domain verification.",
          "RBAC with audit logs, approvals, and compliance surfaces.",
          "Webhooks, an outbox event backbone, S3-compatible storage, and analytics dashboards.",
        ],
      },
      {
        type: "callout",
        variant: "tip",
        title: "Get started",
        text: "Run the whole stack with one `docker compose up`. See the [docs](https://docs.company.chele.bi) and the [repository](https://github.com/woosal1337/elliptic).",
      },
    ],
  },
];

export const sortedReleases: Release[] = [...RELEASES].sort((a, b) =>
  b.date.localeCompare(a.date),
);
