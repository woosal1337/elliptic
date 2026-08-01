"use client";

import { useState } from "react";
import { Plus, Shield, Trash2 } from "lucide-react";
import { Badge, Button, IconButton, Input, Skeleton } from "@elliptic/ui";
import {
  useCreateRole,
  useCustomRoles,
  useDeleteRole,
  usePermissionCatalog,
} from "@/hooks/use-roles-queries";

export function RolesSettings({ orgId }: { orgId: string }) {
  const catalog = usePermissionCatalog(orgId);
  const roles = useCustomRoles(orgId);
  const create = useCreateRole(orgId);
  const remove = useDeleteRole(orgId);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, string>>>({});

  const toggle = (key: string) =>
    setSelected((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    );

  const setCell = (resource: string, action: string, value: string) =>
    setMatrix((current) => {
      const next = { ...current, [resource]: { ...(current[resource] ?? {}) } };
      if (value) {
        next[resource]![action] = value;
      } else {
        delete next[resource]![action];
        if (Object.keys(next[resource]!).length === 0) delete next[resource];
      }
      return next;
    });

  const submit = () => {
    if (!name.trim() || selected.length === 0) return;
    create.mutate(
      { name: name.trim(), permissions: selected, matrix },
      {
        onSuccess: () => {
          setName("");
          setSelected([]);
          setMatrix({});
        },
      }
    );
  };

  const labelFor = (key: string) =>
    (catalog.data?.catalog ?? []).find((p) => p.key === key)?.label ?? key;

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <Shield className="size-4 text-muted-foreground" />
          Custom roles
        </h2>
        <p className="text-caption text-muted-foreground">
          Define roles from a granular permission scheme and assign them to members to extend the
          base owner/admin/member roles.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Role name (e.g. Release manager)"
          className="max-w-xs"
        />
        {catalog.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {(catalog.data?.catalog ?? []).map((perm) => (
              <label key={perm.key} className="flex items-center gap-2 text-small text-foreground">
                <input
                  type="checkbox"
                  checked={selected.includes(perm.key)}
                  onChange={() => toggle(perm.key)}
                />
                {perm.label}
              </label>
            ))}
          </div>
        )}

        {(catalog.data?.matrix_schema ?? []).length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-muted-foreground">
              Resource permissions (overrides — leave unset to inherit)
            </span>
            <div className="overflow-x-auto">
              <table className="w-full text-caption">
                <tbody>
                  {(catalog.data?.matrix_schema ?? []).map((row) => (
                    <tr key={row.resource} className="border-t border-border">
                      <td className="py-1.5 pr-2 font-medium text-foreground">{row.label}</td>
                      {row.actions.map((action) => (
                        <td key={action} className="px-1 py-1.5">
                          <select
                            aria-label={`${row.resource} ${action}`}
                            value={matrix[row.resource]?.[action] ?? ""}
                            onChange={(event) => setCell(row.resource, action, event.target.value)}
                            className="rounded border border-border bg-surface px-1 py-0.5 text-caption"
                          >
                            <option value="">{action}: —</option>
                            {(catalog.data?.matrix_cells ?? []).map((cell) => (
                              <option key={cell} value={cell}>
                                {action}: {cell}
                              </option>
                            ))}
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div>
          <Button
            size="sm"
            onClick={submit}
            loading={create.isPending}
            disabled={!name.trim() || selected.length === 0}
          >
            <Plus className="size-3.5" />
            Create role
          </Button>
        </div>
      </div>

      {roles.isPending ? (
        <Skeleton className="h-20 w-full rounded-lg" />
      ) : (roles.data ?? []).length === 0 ? (
        <p className="text-small text-muted-foreground">No custom roles yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {(roles.data ?? []).map((role) => (
            <li
              key={role.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
            >
              <div className="flex items-center gap-2">
                <span className="flex-1 text-small font-medium text-foreground">{role.name}</span>
                <IconButton
                  aria-label={`Delete ${role.name}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => remove.mutate(role.id)}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.map((perm) => (
                  <Badge key={perm} variant="neutral" size="sm">
                    {labelFor(perm)}
                  </Badge>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
