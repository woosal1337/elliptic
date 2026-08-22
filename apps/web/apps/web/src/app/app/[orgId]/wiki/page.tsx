"use client";

import { useParams } from "next/navigation";
import { useNewParam } from "@/lib/use-new-param";
import { PageHeader } from "@/components/page-header";
import { NoteList } from "@/components/notes/note-list";
import { CreateNoteDialog } from "@/components/notes/create-note-dialog";

export default function WikiPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [createOpen, setCreateOpen] = useNewParam();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
      <PageHeader
        title="Wiki"
        actions={<CreateNoteDialog orgId={orgId} open={createOpen} onOpenChange={setCreateOpen} />}
      />
      <NoteList
        orgId={orgId}
        wikiOnly
        emptyDescription="Build a shared knowledge base — handbooks, runbooks, and policies organized as a page tree."
        emptyAction={<CreateNoteDialog orgId={orgId} />}
      />
    </div>
  );
}
