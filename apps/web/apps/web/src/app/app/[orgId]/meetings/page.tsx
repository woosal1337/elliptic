"use client";

import { useParams } from "next/navigation";
import { useNewParam } from "@/lib/use-new-param";
import { PageHeader } from "@/components/page-header";
import { MeetingList } from "@/components/meetings/meeting-list";
import { ImportMeetingDialog } from "@/components/meetings/import-meeting-dialog";
import { NewMeetingDialog } from "@/components/meetings/new-meeting-dialog";
import { OrgMeetingChat } from "@/components/meetings/org-meeting-chat";

export default function MeetingsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [importOpen, setImportOpen] = useNewParam();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-8">
      <PageHeader
        title="Meetings"
        actions={
          <div className="flex items-center gap-2">
            <OrgMeetingChat orgId={orgId} />
            <NewMeetingDialog orgId={orgId} />
            <ImportMeetingDialog orgId={orgId} open={importOpen} onOpenChange={setImportOpen} />
          </div>
        }
      />
      <MeetingList orgId={orgId} emptyAction={<ImportMeetingDialog orgId={orgId} />} />
    </div>
  );
}
