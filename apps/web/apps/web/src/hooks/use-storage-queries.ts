"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export type StorageEntity = "comment" | "note" | "task" | "project" | "general";

export interface StoredObject {
  id: string;
  entity_type: StorageEntity;
  entity_id: string | null;
  filename: string;
  content_type: string;
  kind: "image" | "file";
  size_bytes: number | null;
  is_uploaded: boolean;
  created_at: string;
}

interface PresignOut {
  object_id: string;
  storage_key: string;
  upload_url: string;
  expires_in: number;
  max_bytes: number;
}

export interface UploadResult {
  objectId: string;
  filename: string;
  kind: "image" | "file";
  contentType: string;
  sizeBytes: number | null;
}

export interface UploadInput {
  file: File;
  entityType?: StorageEntity;
  entityId?: string | null;
}

export function useUploadFile(orgId: string) {
  return useMutation({
    mutationFn: async ({ file, entityType = "general", entityId = null }: UploadInput): Promise<UploadResult> => {
      const presign = await api.post<PresignOut>(orgPath(orgId, "/storage/presign-upload"), {
        entity_type: entityType,
        entity_id: entityId,
        filename: file.name,
        content_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      });

      const put = await fetch(presign.upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);

      const confirmed = await api.post<StoredObject>(
        orgPath(orgId, `/storage/objects/${presign.object_id}/confirm`)
      );
      return {
        objectId: confirmed.id,
        filename: confirmed.filename,
        kind: confirmed.kind,
        contentType: confirmed.content_type,
        sizeBytes: confirmed.size_bytes,
      };
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useResolveDownload(orgId: string) {
  return useMutation({
    mutationFn: (objectId: string) =>
      api.get<{ download_url: string; expires_in: number; filename: string }>(
        orgPath(orgId, `/storage/objects/${objectId}/download`)
      ),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export async function openStoredObject(orgId: string, objectId: string): Promise<void> {
  const res = await api.get<{ download_url: string }>(
    orgPath(orgId, `/storage/objects/${objectId}/download`)
  );
  window.open(res.download_url, "_blank", "noopener,noreferrer");
}

export function useObjectUrl(orgId: string, objectId: string, enabled = true) {
  return useQuery({
    queryKey: ["orgs", orgId, "storage", objectId, "url"],
    queryFn: ({ signal }) =>
      api.get<{ download_url: string; expires_in: number; filename: string }>(
        orgPath(orgId, `/storage/objects/${objectId}/download`),
        signal
      ),
    enabled,
    staleTime: 4 * 60 * 1000,
  });
}
