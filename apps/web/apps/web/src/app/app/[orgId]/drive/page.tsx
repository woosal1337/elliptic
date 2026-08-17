"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { DriveBrowser } from "@/components/drive/drive-browser";
import { DriveFileDialog } from "@/components/drive/drive-file-dialog";

export default function DrivePage() {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const linked = params.get("file");
  const [openFile, setOpenFile] = useState<string | null>(linked);

  // A `▤Document` mention in a description links here with ?file=<id>, so the
  // dialog follows the URL rather than only local clicks.
  useEffect(() => setOpenFile(linked), [linked]);

  const close = useCallback(() => {
    setOpenFile(null);
    if (linked) router.replace(`/app/${orgId}/drive`);
  }, [linked, orgId, router]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-8">
      <PageHeader
        title="Drive"
        description="Every document this workspace has uploaded. Link one from any task description with “@”."
      />
      <DriveBrowser orgId={orgId} onOpenDetails={setOpenFile} />
      <DriveFileDialog orgId={orgId} fileId={openFile} onClose={close} />
    </div>
  );
}
