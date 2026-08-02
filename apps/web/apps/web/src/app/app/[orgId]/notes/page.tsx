"use client";

import { useParams } from "next/navigation";
import { useNewParam } from "@/lib/use-new-param";
import { PageHeader } from "@/components/page-header";
import { NoteList } from "@/components/notes/note-list";
import { CreateNoteDialog } from "@/components/notes/create-note-dialog";

export default function NotesPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [createOpen, setCreateOpen] = useNewParam();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-8">
      <PageHeader
        title="Notes"
        actions={<CreateNoteDialog orgId={orgId} open={createOpen} onOpenChange={setCreateOpen} />}
      />
      <NoteList orgId={orgId} emptyAction={<CreateNoteDialog orgId={orgId} />} />
    </div>
  );
}
