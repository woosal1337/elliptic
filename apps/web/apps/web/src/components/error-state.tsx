"use client";

import { AlertTriangle } from "lucide-react";
import { Button, EmptyState } from "@elliptic/ui";
import { errorMessage } from "@/lib/api";

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<AlertTriangle />}
      title="Something went wrong"
      description={errorMessage(error)}
      action={
        onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : undefined
      }
    />
  );
}
