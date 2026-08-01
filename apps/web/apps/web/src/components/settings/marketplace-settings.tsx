"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Blocks, Bot, FileInput, Plug, Puzzle } from "lucide-react";
import { Badge, Button, Skeleton } from "@elliptic/ui";
import {
  type MarketplaceItem,
  useMarketplaceCatalog,
  useMarketplaceInstalled,
} from "@/hooks/use-marketplace-queries";

const CATEGORY_LABEL: Record<string, string> = {
  app: "Apps",
  agent: "Agents",
  importer: "Importers",
  connector: "Connectors",
};
const CATEGORY_ICON: Record<string, typeof Blocks> = {
  app: Blocks,
  agent: Bot,
  importer: FileInput,
  connector: Plug,
};

const INSTALL_ROUTE: Record<string, string> = {
  "settings:connectors": "?tab=connectors",
  "settings:integrations": "?tab=integrations",
  "settings:ai": "?tab=ai",
};

export function MarketplaceSettings({ orgId }: { orgId: string }) {
  const catalog = useMarketplaceCatalog(orgId);
  const installed = useMarketplaceInstalled(orgId);
  const router = useRouter();
  const params = useParams<{ orgId: string }>();
  const [filter, setFilter] = useState<string | null>(null);

  const items = (catalog.data ?? []).filter((i) => !filter || i.category === filter);
  const grouped = items.reduce<Record<string, MarketplaceItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  const install = (item: MarketplaceItem) => {
    if (item.install_kind.startsWith("settings:")) {
      router.push(`/app/${params.orgId}/settings${INSTALL_ROUTE[item.install_kind] ?? ""}`);
    } else if (item.install_kind.startsWith("project:")) {
      router.push(`/app/${params.orgId}/projects`);
    }
  };

  return (
    <section className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <Puzzle className="size-4 text-muted-foreground" />
          Marketplace
        </h2>
        <p className="text-caption text-muted-foreground">
          Browse apps, agents, importers, and connectors you can add to this workspace.
          {installed.data
            ? ` ${installed.data.agents} agent${installed.data.agents === 1 ? "" : "s"} and ${installed.data.connectors} connector${installed.data.connectors === 1 ? "" : "s"} active.`
            : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button variant={filter === null ? "secondary" : "outline"} size="sm" onClick={() => setFilter(null)}>
          All
        </Button>
        {Object.keys(CATEGORY_LABEL).map((category) => (
          <Button
            key={category}
            variant={filter === category ? "secondary" : "outline"}
            size="sm"
            onClick={() => setFilter(category)}
          >
            {CATEGORY_LABEL[category]}
          </Button>
        ))}
      </div>

      {catalog.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        Object.entries(grouped).map(([category, list]) => {
          const Icon = CATEGORY_ICON[category] ?? Blocks;
          return (
            <div key={category} className="flex flex-col gap-2">
              <h3 className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
                <Icon className="size-3.5" />
                {CATEGORY_LABEL[category] ?? category}
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {list.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-small font-medium text-foreground">{item.name}</span>
                      <Badge variant="neutral" size="sm">
                        {item.category}
                      </Badge>
                    </div>
                    <p className="flex-1 text-caption text-muted-foreground">{item.description}</p>
                    <div>
                      <Button size="sm" variant="outline" onClick={() => install(item)}>
                        Set up
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}
