export const SETTINGS_GROUPS = [
  "General",
  "Members & Access",
  "Identity",
  "Integrations",
  "AI",
  "Customization",
  "Compliance & Audit",
] as const;

export type SettingsGroup = (typeof SETTINGS_GROUPS)[number];

export interface SettingsSection {
  value: string;
  label: string;
  group: SettingsGroup;
  keywords: string[];
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { value: "general", label: "General", group: "General", keywords: ["org", "name", "slug", "workspace"] },
  { value: "appearance", label: "Appearance", group: "General", keywords: ["theme", "dark", "light", "display"] },
  {
    value: "notifications",
    label: "Notifications",
    group: "General",
    keywords: ["email", "alerts", "mentions", "comments", "digest"],
  },

  { value: "members", label: "Members", group: "Members & Access", keywords: ["people", "users", "invite", "roles"] },
  { value: "teams", label: "Teams", group: "Members & Access", keywords: ["teamspace", "group"] },
  {
    value: "roles",
    label: "Roles",
    group: "Members & Access",
    keywords: ["permissions", "custom role", "access control", "rbac"],
  },
  { value: "tokens", label: "Tokens", group: "Members & Access", keywords: ["pat", "personal access token", "api key"] },

  { value: "sso", label: "SSO", group: "Identity", keywords: ["oidc", "single sign-on", "saml", "identity"] },
  {
    value: "auth-providers",
    label: "Sign-in",
    group: "Identity",
    keywords: ["providers", "google", "github", "password", "magic", "signup", "oauth"],
  },
  { value: "domains", label: "Domains", group: "Identity", keywords: ["sso", "dns", "txt", "verify", "domain"] },
  {
    value: "directory",
    label: "Directory",
    group: "Identity",
    keywords: ["ldap", "active directory", "ad", "openldap", "freeipa"],
  },
  {
    value: "scim",
    label: "SCIM",
    group: "Identity",
    keywords: ["provisioning", "okta", "entra", "azure ad", "directory sync"],
  },

  {
    value: "connectors",
    label: "Connectors",
    group: "Integrations",
    keywords: ["mcp", "integrations", "github", "linear", "notion", "tools"],
  },
  {
    value: "marketplace",
    label: "Marketplace",
    group: "Integrations",
    keywords: ["apps", "agents", "importers", "extensions", "catalog"],
  },
  {
    value: "webhooks",
    label: "Webhooks",
    group: "Integrations",
    keywords: ["events", "outbox", "integrations", "hooks"],
  },
  { value: "automations", label: "Automations", group: "Integrations", keywords: ["rules", "triggers"] },
  { value: "runner", label: "Runner", group: "Integrations", keywords: ["scripts", "cron", "code", "functions"] },

  { value: "ai", label: "AI", group: "AI", keywords: ["provider", "byok", "kill switch", "openai", "anthropic"] },
  { value: "ai-access", label: "AI Access", group: "AI", keywords: ["agents", "ai users", "budget"] },

  { value: "vocabulary", label: "Vocabulary", group: "Customization", keywords: ["terms", "glossary", "brain"] },
  { value: "templates", label: "Templates", group: "Customization", keywords: ["meeting", "recipe"] },
  { value: "workflow", label: "Workflow", group: "Customization", keywords: ["statuses", "states"] },
  {
    value: "work-types",
    label: "Work types",
    group: "Customization",
    keywords: ["hierarchy", "epic", "story", "task", "level", "nesting"],
  },

  {
    value: "compliance",
    label: "Compliance",
    group: "Compliance & Audit",
    keywords: [
      "gdpr",
      "hipaa",
      "soc2",
      "iso27001",
      "ccpa",
      "residency",
      "region",
      "data subject",
      "erasure",
      "privacy",
    ],
  },
  {
    value: "audit",
    label: "Audit log",
    group: "Compliance & Audit",
    keywords: ["compliance", "history", "export", "csv"],
  },
  {
    value: "rbac-audit",
    label: "Role audit",
    group: "Compliance & Audit",
    keywords: ["rbac", "roles", "permissions", "access", "compliance", "members"],
  },
];

// The handful of sections surfaced in the nav by default. Everything else lives
// under a collapsible "More" so the settings page stays uncrowded. Search still
// reaches every section, and deep-linking an overflow tab auto-expands "More".
export const PRIMARY_SETTINGS: ReadonlySet<string> = new Set([
  "general",
  "appearance",
  "notifications",
  "members",
  "teams",
  "connectors",
  "webhooks",
  "ai",
]);

export function settingsSectionPath(orgId: string, value: string): string {
  return `/app/${orgId}/settings?tab=${value}`;
}
