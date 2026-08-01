"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import {
  cn,
  Input,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
} from "@elliptic/ui";
import { PageHeader } from "@/components/page-header";
import { GeneralSettings } from "@/components/settings/general-settings";
import { MembersSettings } from "@/components/settings/members-settings";
import { TeamsSettings } from "@/components/settings/teams-settings";
import { DomainsSettings } from "@/components/settings/domains-settings";
import { SSOSettings } from "@/components/settings/sso-settings";
import { AuthProvidersSettings } from "@/components/settings/auth-providers-settings";
import { LdapSettings } from "@/components/settings/ldap-settings";
import { ScimSettings } from "@/components/settings/scim-settings";
import { McpConnectorsSettings } from "@/components/settings/mcp-connectors-settings";
import { MarketplaceSettings } from "@/components/settings/marketplace-settings";
import { WebhooksSettings } from "@/components/settings/webhooks-settings";
import { ComplianceSettings } from "@/components/settings/compliance-settings";
import { AISettings } from "@/components/settings/ai-settings";
import { AIAccessSettings } from "@/components/settings/ai-access-settings";
import { VocabularySettings } from "@/components/settings/vocabulary-settings";
import { MeetingTemplatesSettings } from "@/components/settings/meeting-templates-settings";
import { WorkflowSettings } from "@/components/settings/workflow-settings";
import { WorkTypesSettings } from "@/components/settings/work-types-settings";
import { RelationTypesSettings } from "@/components/settings/relation-types-settings";
import { AutomationsSettings } from "@/components/settings/automations-settings";
import { RunnerSettings } from "@/components/settings/runner-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { AccessTokensSettings } from "@/components/settings/access-tokens-settings";
import { AuditLogSettings } from "@/components/settings/audit-log-settings";
import { RbacAuditSettings } from "@/components/settings/rbac-audit-settings";
import { RolesSettings } from "@/components/settings/roles-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import {
  PRIMARY_SETTINGS,
  SETTINGS_GROUPS,
  SETTINGS_SECTIONS,
  type SettingsSection,
} from "@/lib/settings-sections";

function groupSections(items: SettingsSection[]) {
  return SETTINGS_GROUPS.map((group) => ({
    group,
    items: items.filter((section) => section.group === group),
  })).filter((entry) => entry.items.length > 0);
}

export default function SettingsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [showMore, setShowMore] = useState(false);

  const tabFromUrl = searchParams.get("tab");
  const active =
    tabFromUrl && SETTINGS_SECTIONS.some((s) => s.value === tabFromUrl) ? tabFromUrl : "general";

  const searching = query.trim().length > 0;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SETTINGS_SECTIONS;
    return SETTINGS_SECTIONS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.keywords.some((keyword) => keyword.toLowerCase().includes(q))
    );
  }, [query]);

  const groupedVisible = useMemo(() => groupSections(visible), [visible]);
  const groupedPrimary = useMemo(
    () => groupSections(SETTINGS_SECTIONS.filter((s) => PRIMARY_SETTINGS.has(s.value))),
    []
  );
  const overflowSections = useMemo(
    () => SETTINGS_SECTIONS.filter((s) => !PRIMARY_SETTINGS.has(s.value)),
    []
  );
  const groupedOverflow = useMemo(() => groupSections(overflowSections), [overflowSections]);

  // Reveal "More" automatically when a hidden section is the active tab (deep link).
  const moreOpen = showMore || !PRIMARY_SETTINGS.has(active);

  const setTab = (value: string) => {
    router.replace(`/app/${orgId}/settings?tab=${value}`, { scroll: false });
  };

  const renderGroups = (grouped: { group: string; items: SettingsSection[] }[]) =>
    grouped.map(({ group, items }) => (
      <div key={group} className="flex flex-col gap-0.5">
        <p className="px-2.5 pb-1 text-caption font-medium uppercase tracking-wider text-muted-foreground/70">
          {group}
        </p>
        {items.map((section) => {
          const isActive = section.value === active;
          return (
            <button
              key={section.value}
              type="button"
              onClick={() => setTab(section.value)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center rounded-md px-2.5 py-2 text-left text-small font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                isActive
                  ? "bg-accent-muted text-accent"
                  : "text-nav-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    ));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <PageHeader eyebrow="Organization" title="Settings" description="Organization configuration." />

      <div className="lg:hidden">
        <Select value={active} onValueChange={setTab}>
          <SelectTrigger className="w-full" aria-label="Settings section">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SETTINGS_GROUPS.map((group) => {
              const items = SETTINGS_SECTIONS.filter((section) => section.group === group);
              if (items.length === 0) return null;
              return (
                <SelectGroup key={group}>
                  <SelectLabel>{group}</SelectLabel>
                  {items.map((section) => (
                    <SelectItem key={section.value} value={section.value}>
                      {section.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
        <aside className="hidden lg:block lg:w-60 lg:shrink-0">
          <div className="flex flex-col gap-3 lg:sticky lg:top-8">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search settings…"
                className="h-9 pl-9"
                aria-label="Search settings"
              />
            </div>
            <nav aria-label="Settings" className="flex flex-col gap-4">
              {searching ? (
                groupedVisible.length === 0 ? (
                  <p className="px-2.5 py-2 text-small text-muted-foreground">
                    No settings match “{query.trim()}”.
                  </p>
                ) : (
                  renderGroups(groupedVisible)
                )
              ) : (
                <>
                  {renderGroups(groupedPrimary)}
                  {groupedOverflow.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        aria-expanded={moreOpen}
                        onClick={() => setShowMore((open) => !open)}
                        className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-caption font-medium uppercase tracking-wider text-muted-foreground/70 transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        <ChevronRight
                          aria-hidden="true"
                          className={cn(
                            "size-3.5 transition-transform duration-150",
                            moreOpen && "rotate-90"
                          )}
                        />
                        More
                        <span className="text-muted-foreground/50">{overflowSections.length}</span>
                      </button>
                      {moreOpen ? (
                        <div className="mt-1 flex flex-col gap-4">{renderGroups(groupedOverflow)}</div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </nav>
          </div>
        </aside>

        <Tabs value={active} onValueChange={setTab} className="min-w-0 flex-1">
          <div className="max-w-3xl">
            <TabsContent value="general" className="mt-0">
              <GeneralSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="appearance" className="mt-0">
              <AppearanceSettings />
            </TabsContent>
            <TabsContent value="tokens" className="mt-0">
              <AccessTokensSettings />
            </TabsContent>
            <TabsContent value="members" className="mt-0">
              <MembersSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="teams" className="mt-0">
              <TeamsSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="domains" className="mt-0">
              <DomainsSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="sso" className="mt-0">
              <SSOSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="auth-providers" className="mt-0">
              <AuthProvidersSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="directory" className="mt-0">
              <LdapSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="scim" className="mt-0">
              <ScimSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="connectors" className="mt-0">
              <McpConnectorsSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="marketplace" className="mt-0">
              <MarketplaceSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="webhooks" className="mt-0">
              <WebhooksSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="compliance" className="mt-0">
              <ComplianceSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="ai" className="mt-0">
              <AISettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="ai-access" className="mt-0">
              <AIAccessSettings />
            </TabsContent>
            <TabsContent value="vocabulary" className="mt-0">
              <VocabularySettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="templates" className="mt-0">
              <MeetingTemplatesSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="workflow" className="mt-0">
              <WorkflowSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="work-types" className="mt-0">
              <div className="flex flex-col gap-8">
                <WorkTypesSettings orgId={orgId} />
                <RelationTypesSettings orgId={orgId} />
              </div>
            </TabsContent>
            <TabsContent value="automations" className="mt-0">
              <AutomationsSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="runner" className="mt-0">
              <RunnerSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="notifications" className="mt-0">
              <NotificationSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="audit" className="mt-0">
              <AuditLogSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="roles" className="mt-0">
              <RolesSettings orgId={orgId} />
            </TabsContent>
            <TabsContent value="rbac-audit" className="mt-0">
              <RbacAuditSettings orgId={orgId} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
