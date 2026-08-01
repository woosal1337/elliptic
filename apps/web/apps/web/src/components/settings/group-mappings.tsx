"use client";

import { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import {
  Badge,
  Button,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import {
  useCreateMapping,
  useDeleteMapping,
  useGroupMappings,
} from "@/hooks/use-idp-sync-queries";
import { useProjects } from "@/hooks/use-project-queries";

const ROLES = ["admin", "member", "commenter", "viewer"];

export function GroupMappings({ orgId }: { orgId: string }) {
  const mappings = useGroupMappings(orgId);
  const projects = useProjects(orgId);
  const create = useCreateMapping(orgId);
  const remove = useDeleteMapping(orgId);
  const [group, setGroup] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [role, setRole] = useState("member");

  const projectName = (id: string) =>
    (projects.data ?? []).find((p) => p.id === id)?.name ?? id.slice(0, 8);

  const add = () => {
    if (!group.trim() || !projectId) return;
    create.mutate(
      { idp_group: group.trim(), project_id: projectId, role },
      { onSuccess: () => setGroup("") }
    );
  };

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-5">
      <div className="flex flex-col gap-1">
        <h3 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <Users className="size-4 text-muted-foreground" />
          Group → project role mapping
        </h3>
        <p className="text-caption text-muted-foreground">
          On SSO login, a member&apos;s IdP groups grant project roles here (highest role wins).
          Manually-added members are never changed.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
        <Input
          value={group}
          onChange={(event) => setGroup(event.target.value)}
          placeholder="IdP group (e.g. engineering)"
          className="w-48"
        />
        <Select value={projectId ?? ""} onValueChange={setProjectId}>
          <SelectTrigger className="w-44" aria-label="Project">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            {(projects.data ?? []).map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-32 capitalize" aria-label="Role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r} className="capitalize">
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={add} loading={create.isPending} disabled={!group.trim() || !projectId}>
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      {mappings.isPending ? (
        <Skeleton className="h-12 w-full" />
      ) : (mappings.data ?? []).length === 0 ? (
        <p className="text-small text-muted-foreground">No group mappings yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {(mappings.data ?? []).map((mapping) => (
            <li
              key={mapping.id}
              className="group flex items-center gap-2 rounded-md border border-border px-3 py-2 text-small"
            >
              <Badge variant="outline" size="sm">
                {mapping.idp_group}
              </Badge>
              <span className="text-muted-foreground">→</span>
              <span className="flex-1 truncate text-foreground">{projectName(mapping.project_id)}</span>
              <Badge variant="neutral" size="sm" className="capitalize">
                {mapping.role}
              </Badge>
              <IconButton
                aria-label="Delete mapping"
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => remove.mutate(mapping.id)}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
