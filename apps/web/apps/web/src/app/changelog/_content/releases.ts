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
    version: "1.6.0",
    date: "2026-08-27",
    blocks: [
      {
        type: "p",
        text: "Drive, notes as folders, an iOS widget and an Android app that works. This release also removes eight features that nobody used.",
      },
      { type: "h3", text: "Drive" },
      {
        type: "ul",
        items: [
          "A document store for the organization. Upload a file, file it in a folder, and mention it from a task, a note or a comment. Web, mobile and the MCP reach the same files.",
          "The preview plays a video and an audio file, and an image no longer sits behind a skeleton that never clears.",
          "The upload allowlist accepts video and audio.",
          "A browser end-to-end suite covers the Drive and the Notes.",
        ],
      },
      { type: "h3", text: "Notes" },
      {
        type: "ul",
        items: [
          "A note can be a folder. Web and mobile browse the tree, and a folder opens as its own screen on the phone.",
          "The note page is the editor and nothing else. Live co-editing is gone.",
          "An agent reads and writes the folder fields the API already carried.",
        ],
      },
      { type: "h3", text: "iOS and Android" },
      {
        type: "ul",
        items: [
          "A Tasks widget for the home screen and the lock screen, drawn in the app's own colours.",
          "Android gets a tab bar, inset form cards, native switches and a read-only smoke tour.",
          "The row swipe is one continuous gesture, and a full swipe stays inside the reach of a thumb.",
          "The Profile screen no longer crashes on iOS.",
        ],
      },
      { type: "h3", text: "Notifications" },
      {
        type: "ul",
        items: [
          "A push arrives when a task appears or moves. It arrives once, in the workspace it came from.",
          "The toggles in settings govern push. Email now carries account mail only.",
          "A push, a widget row and a web notification each open the task they name.",
        ],
      },
      { type: "h3", text: "Agents and the MCP" },
      {
        type: "ul",
        items: [
          "A search tool, plus the task fields the API already had.",
          "Every tool reaches the organization you meant, instead of the first one you joined.",
          "The Elliptic agent skill ships with the repo.",
        ],
      },
      { type: "h3", text: "Removed" },
      {
        type: "ul",
        items: [
          "Eight features that nobody used, and seven project views, out of the API and the web app together.",
          "The docs and the agent skill describe what is left.",
        ],
      },
      { type: "h3", text: "Fixes" },
      {
        type: "ul",
        items: [
          "The command palette no longer replaces the page with an error screen after you open a task, a note or a meeting.",
          "A markdown table renders as a table in a comment, a task update and a description. The editor kept the cells apart, instead of joining them on save.",
          "A one-line preview shows clean text, with no asterisks and no pipes.",
          "The API commits its session before the response leaves.",
          "The sidebar is one list, and a long line stays inside the task dialog.",
        ],
      },
    ],
  },
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
        text: "Run the whole stack with one `docker compose up`. See the [docs](https://docs.elliptic.sh) and the [repository](https://github.com/woosal1337/elliptic).",
      },
    ],
  },
];

export const sortedReleases: Release[] = [...RELEASES].sort((a, b) =>
  b.date.localeCompare(a.date),
);
