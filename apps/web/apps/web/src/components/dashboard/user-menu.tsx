"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Settings, UserCog } from "lucide-react";
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
  cn,
} from "@elliptic/ui";
import { useLogout, useMe } from "@/hooks/use-auth-queries";

export function UserMenu({ orgId, collapsed = false }: { orgId: string; collapsed?: boolean }) {
  const router = useRouter();
  const me = useMe();
  const logout = useLogout();

  if (me.isPending) {
    return <Skeleton className="h-11 w-full rounded-md" />;
  }

  if (me.isError) {
    return (
      <div className="px-2 py-2 text-caption text-muted-foreground">Signed out</div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title={collapsed ? me.data.full_name : undefined}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          collapsed && "justify-center px-0"
        )}
      >
        <Avatar name={me.data.full_name} size="sm" />
        {collapsed ? null : (
          <>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-small font-medium text-foreground">
                {me.data.full_name}
              </span>
              <span className="truncate text-caption text-muted-foreground">{me.data.email}</span>
            </div>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-[13.5rem]">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-small font-medium text-foreground">{me.data.full_name}</span>
          <span className="text-caption font-normal text-muted-foreground">{me.data.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push(`/app/${orgId}/account`)}>
          <UserCog />
          Account
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push(`/app/${orgId}/settings`)}>
          <Settings />
          Org settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => logout.mutate()}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
