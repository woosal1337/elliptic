import { DOC_PAGES } from "./pages";
import type { DocPage } from "./types";

export interface DocsNavItem {
  slug: string;
  label: string;
}

export interface DocsNavGroup {
  heading: string;
  items: DocsNavItem[];
}

export const DOCS_NAV: DocsNavGroup[] = [
  {
    "heading": "Getting started",
    "items": [
      {
        "slug": "overview-getting-started",
        "label": "Overview"
      },
      {
        "slug": "core-concepts",
        "label": "Core concepts"
      }
    ]
  },
  {
    "heading": "Work tracking",
    "items": [
      {
        "slug": "projects-and-tasks",
        "label": "Projects & tasks"
      },
      {
        "slug": "workflows-statuses-transitions",
        "label": "Workflows & transitions"
      },
      {
        "slug": "cycles-milestones-modules",
        "label": "Cycles, milestones & modules"
      },
      {
        "slug": "views-and-filters",
        "label": "Views & filters"
      },
      {
        "slug": "recurring-work",
        "label": "Recurring work"
      },
      {
        "slug": "time-tracking-approvals",
        "label": "Time tracking & approvals"
      }
    ]
  },
  {
    "heading": "Knowledge & collaboration",
    "items": [
      {
        "slug": "notes-wiki-pages",
        "label": "Notes, wiki & pages"
      },
      {
        "slug": "meetings",
        "label": "Meetings"
      },
      {
        "slug": "activity-inbox",
        "label": "Activity & Inbox"
      },
      {
        "slug": "files-attachments-embeds",
        "label": "Files, attachments & embeds"
      },
      {
        "slug": "drive",
        "label": "The Drive"
      },
      {
        "slug": "analytics",
        "label": "Analytics"
      }
    ]
  },
  {
    "heading": "Agents & automation",
    "items": [
      {
        "slug": "automations",
        "label": "Automations"
      },
      {
        "slug": "company-brain-mcp",
        "label": "Company-brain MCP"
      },
      {
        "slug": "agent-project-setup",
        "label": "Set up your agent"
      }
    ]
  },
  {
    "heading": "Integrations & sharing",
    "items": [
      {
        "slug": "integrations-webhooks",
        "label": "Integrations & webhooks"
      },
      {
        "slug": "public-sharing",
        "label": "Public sharing"
      },
      {
        "slug": "marketplace-mcp-connectors",
        "label": "Marketplace & connectors"
      }
    ]
  },
  {
    "heading": "Administration",
    "items": [
      {
        "slug": "organizations-teams-members",
        "label": "Organizations, teams & members"
      },
      {
        "slug": "roles-permissions",
        "label": "Roles & permissions"
      },
      {
        "slug": "accounts-auth-tokens",
        "label": "Accounts, auth & tokens"
      },
      {
        "slug": "enterprise-identity",
        "label": "Enterprise identity (SSO, SCIM, LDAP)"
      },
      {
        "slug": "compliance-audit",
        "label": "Compliance & audit"
      },
      {
        "slug": "billing-seats-onboarding",
        "label": "Billing, seats & onboarding"
      }
    ]
  },
  {
    "heading": "Self-hosting",
    "items": [
      {
        "slug": "self-hosting",
        "label": "Self-hosting & operations"
      },
      {
        "slug": "instance-administration",
        "label": "Instance administration & licensing"
      }
    ]
  },
  {
    "heading": "Reference",
    "items": [
      {
        "slug": "references-and-mentions",
        "label": "References & mentions"
      }
    ]
  }
];

const PAGE_BY_SLUG = new Map<string, DocPage>(DOC_PAGES.map((page) => [page.slug, page]));

export const ORDERED_SLUGS: string[] = DOCS_NAV.flatMap((group) =>
  group.items.map((item) => item.slug),
);

export const FIRST_SLUG: string = ORDERED_SLUGS[0] ?? "overview-getting-started";

export function getPage(slug?: string): DocPage | undefined {
  return PAGE_BY_SLUG.get(slug ?? FIRST_SLUG);
}

export function labelForSlug(slug: string): string {
  for (const group of DOCS_NAV) {
    const found = group.items.find((item) => item.slug === slug);
    if (found) return found.label;
  }
  return PAGE_BY_SLUG.get(slug)?.title ?? slug;
}

export function hrefForSlug(slug: string): string {
  return slug === FIRST_SLUG ? "/docs" : `/docs/${slug}`;
}

export function adjacentSlugs(slug: string): { prev?: string; next?: string } {
  const index = ORDERED_SLUGS.indexOf(slug);
  if (index === -1) return {};
  return {
    prev: index > 0 ? ORDERED_SLUGS[index - 1] : undefined,
    next: index < ORDERED_SLUGS.length - 1 ? ORDERED_SLUGS[index + 1] : undefined,
  };
}
