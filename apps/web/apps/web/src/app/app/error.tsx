"use client";

import Link from "next/link";
import { Button } from "@elliptic/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-display text-h2 font-semibold tracking-[-0.02em] text-foreground">
        This screen did not load
      </h1>
      <p className="max-w-md text-body leading-relaxed text-muted-foreground">
        Something in the page threw an error. Try again, or go back to the workspace.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/app">Back to workspace</Link>
        </Button>
      </div>
      {error.digest ? (
        <span className="mt-6 font-mono text-caption text-muted-foreground">{error.digest}</span>
      ) : null}
    </div>
  );
}
