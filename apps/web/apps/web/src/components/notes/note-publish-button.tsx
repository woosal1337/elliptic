"use client";

import { Globe } from "lucide-react";
import { Button, toast } from "@elliptic/ui";
import { usePublishPage } from "@/hooks/use-page-publish";

export function NotePublishButton({ orgId, noteId }: { orgId: string; noteId: string }) {
  const publish = usePublishPage(orgId, noteId);

  return (
    <Button
      variant="ghost"
      size="sm"
      loading={publish.isPending}
      onClick={() =>
        publish.mutate(undefined, {
          onSuccess: (result) => {
            const url =
              typeof window === "undefined"
                ? result.path
                : `${window.location.origin}${result.path}`;
            void navigator.clipboard.writeText(url);
            toast.success("Public link copied");
          },
        })
      }
    >
      <Globe className="size-4" />
      Publish
    </Button>
  );
}
