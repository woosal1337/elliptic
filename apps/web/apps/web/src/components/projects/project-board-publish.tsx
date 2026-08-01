"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { Button, toast } from "@elliptic/ui";
import { usePublishBoard, useUnpublishBoard } from "@/hooks/use-board-publish";

const ATTRIBUTES: { value: string; label: string }[] = [
  { value: "priority", label: "Priority" },
  { value: "assignee", label: "Assignee (shown as 'assigned')" },
  { value: "due_date", label: "Due date" },
  { value: "labels", label: "Labels" },
];

export function ProjectBoardPublish({
  orgId,
  projectId,
  canManage,
}: {
  orgId: string;
  projectId: string;
  canManage: boolean;
}) {
  const publish = usePublishBoard(orgId, projectId);
  const unpublish = useUnpublishBoard(orgId, projectId);
  const [selected, setSelected] = useState<string[]>(["priority", "due_date"]);

  if (!canManage) return null;

  const toggle = (value: string) =>
    setSelected((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    );

  const doPublish = () => {
    publish.mutate(selected, {
      onSuccess: (result) => {
        const url =
          typeof window === "undefined" ? result.path : `${window.location.origin}${result.path}`;
        void navigator.clipboard.writeText(url);
        toast.success("Public board link copied");
      },
    });
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <Globe className="size-4 text-muted-foreground" />
          Public board
        </h2>
        <p className="text-caption text-muted-foreground">
          Publish a read-only board to a login-less link. Status, item ID, and title always show;
          choose which other attributes are visible to anonymous viewers.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {ATTRIBUTES.map((attr) => (
          <label key={attr.value} className="flex items-center gap-1.5 text-small text-foreground">
            <input
              type="checkbox"
              checked={selected.includes(attr.value)}
              onChange={() => toggle(attr.value)}
            />
            {attr.label}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={doPublish} loading={publish.isPending}>
          <Globe className="size-3.5" />
          Publish &amp; copy link
        </Button>
        <Button size="sm" variant="ghost" onClick={() => unpublish.mutate()} loading={unpublish.isPending}>
          Unpublish
        </Button>
      </div>
    </section>
  );
}
