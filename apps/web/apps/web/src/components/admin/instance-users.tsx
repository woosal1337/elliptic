"use client";

import { Ban, ShieldCheck, ShieldOff, Undo2 } from "lucide-react";
import { Badge, Button, Skeleton } from "@elliptic/ui";
import {
  useGrantAdmin,
  useInstanceUsers,
  useRevokeAdmin,
  useSuspendUser,
  useUnsuspendUser,
} from "@/hooks/use-instance-admin";

export function InstanceUsers() {
  const users = useInstanceUsers();
  const suspend = useSuspendUser();
  const unsuspend = useUnsuspendUser();
  const grant = useGrantAdmin();
  const revoke = useRevokeAdmin();

  if (users.isPending) return <Skeleton className="h-64 w-full" />;

  return (
    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {(users.data ?? []).map((user) => (
        <li key={user.id} className="flex items-center gap-3 px-3 py-2.5 text-small">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-1.5 truncate text-foreground">
              {user.full_name || user.email}
              {user.is_instance_admin ? (
                <Badge variant="accent" size="sm">
                  instance admin
                </Badge>
              ) : null}
              {user.suspended ? (
                <Badge variant="danger" size="sm">
                  suspended
                </Badge>
              ) : null}
            </span>
            <span className="truncate text-caption text-muted-foreground">
              {user.email} · {user.org_count} workspace{user.org_count === 1 ? "" : "s"}
            </span>
          </div>
          {user.is_instance_admin ? (
            <Button size="sm" variant="ghost" onClick={() => revoke.mutate(user.id)}>
              <ShieldOff className="size-3.5" />
              Revoke admin
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => grant.mutate(user.id)}>
              <ShieldCheck className="size-3.5" />
              Make admin
            </Button>
          )}
          {user.suspended ? (
            <Button size="sm" variant="ghost" onClick={() => unsuspend.mutate(user.id)}>
              <Undo2 className="size-3.5" />
              Reinstate
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="text-danger hover:text-danger"
              onClick={() => suspend.mutate(user.id)}
            >
              <Ban className="size-3.5" />
              Suspend
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
