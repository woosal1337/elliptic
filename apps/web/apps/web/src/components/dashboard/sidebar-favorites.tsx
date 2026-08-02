"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorite-queries";

function favoriteHref(orgId: string, entityType: string, entityId: string): string | null {
  switch (entityType) {
    case "project":
      return `/app/${orgId}/projects/${entityId}`;
    default:
      return null;
  }
}

export function SidebarFavorites({ orgId }: { orgId: string }) {
  const favorites = useFavorites(orgId);
  const items = (favorites.data ?? [])
    .map((favorite) => ({ favorite, href: favoriteHref(orgId, favorite.entity_type, favorite.entity_id) }))
    .filter((entry): entry is { favorite: (typeof entry)["favorite"]; href: string } => entry.href !== null);

  if (items.length === 0) return null;

  return (
    <div className="mt-5">
      <p className="px-2.5 py-1 text-caption font-medium text-muted-foreground/70">
        Favorites
      </p>
      <div className="flex flex-col gap-0.5">
        {items.map(({ favorite, href }) => (
          <Link
            key={favorite.id}
            href={href}
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-small text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
          >
            <Star className="size-3.5 shrink-0 fill-warning text-warning" aria-hidden="true" />
            <span className="truncate">{favorite.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
