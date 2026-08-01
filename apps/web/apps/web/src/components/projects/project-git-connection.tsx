"use client";

import { useState } from "react";
import { Copy, GitBranch, Plus, Trash2 } from "lucide-react";
import { Button, IconButton, Input, Skeleton, toast } from "@elliptic/ui";
import {
  useCreateGitConnection,
  useDeleteGitConnection,
  useGitConnections,
} from "@/hooks/use-git-queries";

export function ProjectGitConnection({
  orgId,
  projectId,
  canManage,
}: {
  orgId: string;
  projectId: string;
  canManage: boolean;
}) {
  const connections = useGitConnections(orgId, projectId);
  const create = useCreateGitConnection(orgId, projectId);
  const remove = useDeleteGitConnection(orgId, projectId);
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");

  const webhookUrl = (token: string) =>
    typeof window === "undefined"
      ? `/api/v1/integrations/git/${token}`
      : `${window.location.origin}/api/v1/integrations/git/${token}`;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <GitBranch className="size-4 text-muted-foreground" />
          GitHub sync
        </h2>
        <p className="text-caption text-muted-foreground">
          Add the webhook URL to your repo (Settings → Webhooks). Issues open triage items;
          PRs that say &ldquo;closes COS-123&rdquo; link and auto-complete the item on merge.
        </p>
      </div>

      {connections.isPending ? (
        <Skeleton className="h-12 w-full" />
      ) : (connections.data ?? []).length === 0 ? null : (
        <ul className="flex flex-col gap-1.5">
          {(connections.data ?? []).map((connection) => (
            <li
              key={connection.id}
              className="group flex items-center gap-2 rounded-md border border-border px-3 py-2 text-small"
            >
              <span className="font-medium text-foreground">
                {connection.owner}/{connection.repo}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-caption text-muted-foreground">
                {webhookUrl(connection.token)}
              </span>
              <IconButton
                aria-label="Copy webhook URL"
                variant="ghost"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(webhookUrl(connection.token));
                  toast.success("Webhook URL copied");
                }}
              >
                <Copy className="size-4" />
              </IconButton>
              {canManage ? (
                <IconButton
                  aria-label="Disconnect"
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => remove.mutate(connection.id)}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="flex items-center gap-2">
          <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="owner" className="w-32" />
          <span className="text-muted-foreground">/</span>
          <Input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="repo" className="w-40" />
          <Button
            size="sm"
            variant="outline"
            loading={create.isPending}
            disabled={!owner.trim() || !repo.trim()}
            onClick={() =>
              create.mutate(
                { owner: owner.trim(), repo: repo.trim() },
                { onSuccess: () => { setOwner(""); setRepo(""); } }
              )
            }
          >
            <Plus className="size-3.5" />
            Connect repo
          </Button>
        </div>
      ) : null}
    </section>
  );
}
