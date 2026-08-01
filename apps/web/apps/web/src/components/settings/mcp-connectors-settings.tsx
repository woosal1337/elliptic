"use client";

import { useState } from "react";
import { CheckCircle2, Plug, Plus, Trash2, Wrench, XCircle } from "lucide-react";
import {
  Badge,
  Button,
  IconButton,
  Input,
  Skeleton,
  Switch,
  toast,
} from "@elliptic/ui";
import {
  type CatalogEntry,
  type RemoteTool,
  useAddConnector,
  useConnectorCatalog,
  useConnectors,
  useDeleteConnector,
  useSetConnectorEnabled,
  useTestConnector,
} from "@/hooks/use-mcp-connector-queries";

function AddForm({ orgId, entry, onDone }: { orgId: string; entry: CatalogEntry; onDone: () => void }) {
  const add = useAddConnector(orgId);
  const [credential, setCredential] = useState("");
  const [url, setUrl] = useState(entry.endpoint_url);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
      {!entry.endpoint_url ? (
        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://your-mcp-server/mcp"
          className="font-mono text-caption"
        />
      ) : null}
      <Input
        type="password"
        value={credential}
        onChange={(event) => setCredential(event.target.value)}
        placeholder="Access token (stored encrypted)"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          loading={add.isPending}
          disabled={!url.trim()}
          onClick={() =>
            add.mutate(
              { catalog_key: entry.key, endpoint_url: url.trim(), credential: credential.trim() || undefined },
              {
                onSuccess: () => {
                  toast.success(`${entry.name} connected`);
                  onDone();
                },
              }
            )
          }
        >
          Connect
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function McpConnectorsSettings({ orgId }: { orgId: string }) {
  const catalog = useConnectorCatalog(orgId);
  const connectors = useConnectors(orgId);
  const setEnabled = useSetConnectorEnabled(orgId);
  const remove = useDeleteConnector(orgId);
  const test = useTestConnector(orgId);
  const [adding, setAdding] = useState<string | null>(null);
  const [tools, setTools] = useState<Record<string, RemoteTool[]>>({});

  return (
    <section className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <Plug className="size-4 text-muted-foreground" />
          Connectors
        </h2>
        <p className="text-caption text-muted-foreground">
          Connect remote Model Context Protocol servers so agents can use their tools. Credentials
          are encrypted at rest.
        </p>
      </div>

      {connectors.data && connectors.data.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {connectors.data.map((connector) => (
            <li key={connector.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-small font-medium text-foreground">
                  {connector.display_name}
                </span>
                <Switch
                  checked={connector.enabled}
                  onCheckedChange={(checked) => setEnabled.mutate({ id: connector.id, enabled: checked })}
                />
                <Button
                  size="sm"
                  variant="outline"
                  loading={test.isPending}
                  onClick={() =>
                    test.mutate(connector.id, {
                      onSuccess: (result) => {
                        if (result.ok) {
                          setTools((current) => ({ ...current, [connector.id]: result.tools }));
                          toast.success(`Found ${result.tools.length} tools`);
                        } else {
                          toast.error(result.error ?? "Connection failed");
                        }
                      },
                    })
                  }
                >
                  <Wrench className="size-3.5" />
                  Test
                </Button>
                <IconButton
                  aria-label="Remove connector"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove.mutate(connector.id)}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
              <span className="truncate font-mono text-caption text-muted-foreground">
                {connector.endpoint_url}
              </span>
              {tools[connector.id] ? (
                <div className="flex flex-wrap gap-1">
                  {tools[connector.id]!.length === 0 ? (
                    <span className="text-caption text-muted-foreground">No tools discovered.</span>
                  ) : (
                    tools[connector.id]!.map((tool) => (
                      <Badge key={tool.name} variant="neutral" size="sm" title={tool.description}>
                        {tool.name}
                      </Badge>
                    ))
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col gap-2">
        <h3 className="text-small font-semibold text-foreground">Available connectors</h3>
        {catalog.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(catalog.data ?? []).map((entry) => (
              <div key={entry.key} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-small font-medium text-foreground">{entry.name}</span>
                  {adding !== entry.key ? (
                    <IconButton aria-label={`Add ${entry.name}`} variant="ghost" size="sm" onClick={() => setAdding(entry.key)}>
                      <Plus className="size-4" />
                    </IconButton>
                  ) : null}
                </div>
                <p className="text-caption text-muted-foreground">{entry.description}</p>
                {adding === entry.key ? (
                  <AddForm orgId={orgId} entry={entry} onDone={() => setAdding(null)} />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {test.data && !test.data.ok ? (
        <div className="flex items-center gap-2 text-caption text-danger">
          <XCircle className="size-3.5" />
          {test.data.error}
        </div>
      ) : test.data?.ok ? (
        <div className="flex items-center gap-2 text-caption text-success">
          <CheckCircle2 className="size-3.5" />
          Connection succeeded.
        </div>
      ) : null}
    </section>
  );
}
