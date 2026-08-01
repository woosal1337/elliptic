"use client";

import { useRef } from "react";
import { Paperclip } from "lucide-react";
import { Button } from "@elliptic/ui";
import {
  type StorageEntity,
  type UploadResult,
  useUploadFile,
} from "@/hooks/use-storage-queries";

export function FileUpload({
  orgId,
  entityType = "general",
  entityId = null,
  accept,
  maxBytes,
  label = "Attach",
  onUploaded,
}: {
  orgId: string;
  entityType?: StorageEntity;
  entityId?: string | null;
  accept?: string;
  maxBytes?: number;
  label?: string;
  onUploaded: (result: UploadResult) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadFile(orgId);

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    if (maxBytes && file.size > maxBytes) {
      const mb = Math.round(maxBytes / (1024 * 1024));
      const { toast } = await import("@elliptic/ui");
      toast.error(`File exceeds the ${mb} MB limit`);
      return;
    }
    const result = await upload.mutateAsync({ file, entityType, entityId });
    onUploaded(result);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => void onPick(event.target.files?.[0])}
      />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        loading={upload.isPending}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="size-3.5" />
        {label}
      </Button>
    </>
  );
}
