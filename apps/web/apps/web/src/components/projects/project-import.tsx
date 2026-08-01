"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button, Textarea } from "@elliptic/ui";
import { type ImportReport, useImportTasks } from "@/hooks/use-import-queries";

const SAMPLE = "Summary,Description,Status,Priority,Type\nFix login bug,NPE on submit,Todo,High,Bug";

export function ProjectImport({
  orgId,
  projectId,
  canManage,
}: {
  orgId: string;
  projectId: string;
  canManage: boolean;
}) {
  const importTasks = useImportTasks(orgId, projectId);
  const [content, setContent] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);

  if (!canManage) return null;

  const submit = () => {
    if (!content.trim()) return;
    importTasks.mutate(content.trim(), { onSuccess: (result) => setReport(result) });
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <Upload className="size-4 text-muted-foreground" />
          Import work items
        </h2>
        <p className="text-caption text-muted-foreground">
          Paste CSV exported from Jira, Linear, Trello, or a spreadsheet. Recognized columns:
          summary/title, description, status, priority, type.
        </p>
      </div>
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={SAMPLE}
        rows={6}
        className="font-mono text-caption"
      />
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={submit} loading={importTasks.isPending} disabled={!content.trim()}>
          <Upload className="size-3.5" />
          Import
        </Button>
        {report ? (
          <span className="text-caption text-muted-foreground">
            Created {report.created_count}
            {report.skipped_count > 0 ? `, skipped ${report.skipped_count}` : ""}
            {report.errors.length > 0 ? `, ${report.errors.length} errors` : ""}.
          </span>
        ) : null}
      </div>
      {report && report.errors.length > 0 ? (
        <ul className="flex flex-col gap-0.5 rounded-md bg-danger-muted/40 p-2.5 text-caption text-danger">
          {report.errors.slice(0, 5).map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
