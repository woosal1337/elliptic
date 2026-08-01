"use client";

import { Star } from "lucide-react";
import { IconButton } from "@elliptic/ui";
import { useAddFavorite, useFavorites, useRemoveFavorite } from "@/hooks/use-favorite-queries";

export function FavoriteToggle({
  orgId,
  entityType,
  entityId,
  label,
  size = "sm",
}: {
  orgId: string;
  entityType: string;
  entityId: string;
  label: string;
  size?: "sm" | "md";
}) {
  const favorites = useFavorites(orgId);
  const addFavorite = useAddFavorite(orgId);
  const removeFavorite = useRemoveFavorite(orgId);

  const isFavorited = (favorites.data ?? []).some(
    (favorite) => favorite.entity_type === entityType && favorite.entity_id === entityId
  );

  const toggle = () => {
    if (isFavorited) {
      removeFavorite.mutate({ entity_type: entityType, entity_id: entityId });
    } else {
      addFavorite.mutate({ entity_type: entityType, entity_id: entityId, label });
    }
  };

  return (
    <IconButton
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={isFavorited}
      variant="ghost"
      size={size}
      onClick={toggle}
      disabled={addFavorite.isPending || removeFavorite.isPending}
    >
      <Star
        className={isFavorited ? "size-4 fill-warning text-warning" : "size-4 text-muted-foreground"}
      />
    </IconButton>
  );
}
