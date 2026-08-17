"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";
import type { DriveFile, DriveFolder, Page } from "@/lib/types";

export const driveKeys = {
  all: (orgId: string) => ["orgs", orgId, "drive"] as const,
  files: (orgId: string, folderPath: string, search: string) =>
    [...driveKeys.all(orgId), "files", folderPath, search] as const,
  folders: (orgId: string) => [...driveKeys.all(orgId), "folders"] as const,
  detail: (orgId: string, fileId: string) => [...driveKeys.all(orgId), fileId] as const,
};

interface PresignOut {
  object_id: string;
  storage_key: string;
  upload_url: string;
  expires_in: number;
  max_bytes: number;
}

/** The server ceiling (`file_size_limit_bytes`), checked here so a doomed upload never starts. */
export const DRIVE_FILE_LIMIT = 100 * 1024 * 1024;

/**
 * Documents in one folder, or across the whole Drive when `folderPath` is null.
 *
 * "" and null are different asks: "" is the root folder (files filed at the top
 * level), null is every document there is — what the mention picker needs.
 */
export function useDriveFiles(orgId: string, folderPath: string | null, search: string) {
  const trimmed = search.trim();
  return useQuery({
    queryKey: driveKeys.files(orgId, folderPath ?? "*", trimmed),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ limit: "200" });
      // While searching, look through the whole Drive rather than one folder —
      // the point of a search is that you do not know where the file sits.
      if (trimmed) params.set("search", trimmed);
      else if (folderPath !== null) params.set("folder_path", folderPath);
      const page = await api.get<Page<DriveFile>>(
        orgPath(orgId, `/drive/files?${params.toString()}`),
        signal
      );
      return page.items;
    },
  });
}

export function useDriveFolders(orgId: string) {
  return useQuery({
    queryKey: driveKeys.folders(orgId),
    queryFn: ({ signal }) => api.get<DriveFolder[]>(orgPath(orgId, "/drive/folders"), signal),
  });
}

export function useDriveFile(orgId: string, fileId: string, enabled = true) {
  return useQuery({
    queryKey: driveKeys.detail(orgId, fileId),
    enabled: enabled && fileId.length > 0,
    queryFn: ({ signal }) => api.get<DriveFile>(orgPath(orgId, `/drive/files/${fileId}`), signal),
  });
}

export interface DriveUploadInput {
  file: File;
  folderPath?: string;
  name?: string;
  description?: string | null;
}

/** presign → PUT straight to R2 → register as a document. */
export function useUploadToDrive(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      folderPath = "",
      name,
      description = null,
    }: DriveUploadInput): Promise<DriveFile> => {
      if (file.size > DRIVE_FILE_LIMIT) {
        throw new Error(`${file.name} is larger than the 100 MB limit`);
      }
      const contentType = file.type || "application/octet-stream";
      const presign = await api.post<PresignOut>(orgPath(orgId, "/drive/presign-upload"), {
        filename: file.name,
        content_type: contentType,
        size_bytes: file.size,
      });

      const put = await fetch(presign.upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);

      return api.post<DriveFile>(orgPath(orgId, "/drive/files"), {
        object_id: presign.object_id,
        name: name ?? null,
        folder_path: folderPath,
        description,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: driveKeys.all(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateDriveFile(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      fileId,
      ...input
    }: {
      fileId: string;
      name?: string;
      folder_path?: string;
      description?: string | null;
      clear_description?: boolean;
    }) => api.patch<DriveFile>(orgPath(orgId, `/drive/files/${fileId}`), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: driveKeys.all(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteDriveFile(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => api.delete<null>(orgPath(orgId, `/drive/files/${fileId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: driveKeys.all(orgId) });
      toast.success("Document deleted");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useRenameDriveFolder(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { path: string; new_path: string }) =>
      api.post<DriveFolder[]>(orgPath(orgId, "/drive/folders/rename"), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: driveKeys.all(orgId) });
      toast.success("Folder moved");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

/**
 * A short-lived signed URL for previewing or downloading one document.
 *
 * Kept in the query cache with a lifetime under the link's own 300 seconds, so a
 * dialog that re-renders does not mint a new link every time, and a stale link
 * is never handed to an `<img>` or an `<object>`.
 */
export function useDriveFileUrl(orgId: string, fileId: string, enabled = true) {
  return useQuery({
    queryKey: [...driveKeys.detail(orgId, fileId), "url"] as const,
    enabled: enabled && fileId.length > 0,
    staleTime: 4 * 60 * 1000,
    queryFn: ({ signal }) =>
      api.get<{ download_url: string; expires_in: number; filename: string }>(
        orgPath(orgId, `/drive/files/${fileId}/download`),
        signal
      ),
  });
}

export interface DriveText {
  readable: boolean;
  text: string | null;
  reason?: string;
  truncated?: boolean;
  total_chars?: number;
}

/**
 * A text document's content, read through the API.
 *
 * Deliberately not fetched from the signed storage URL: that URL is on the
 * storage origin, so reading it in JavaScript would need a CORS policy on the
 * bucket, while *rendering* it needs none. The API already decodes text for
 * agents; the same call serves the preview.
 */
export function useDriveFileText(orgId: string, fileId: string, enabled = true) {
  return useQuery({
    queryKey: [...driveKeys.detail(orgId, fileId), "text"] as const,
    enabled: enabled && fileId.length > 0,
    queryFn: ({ signal }) =>
      api.get<DriveText>(orgPath(orgId, `/drive/files/${fileId}/text`), signal),
  });
}

/** The in-app route that previews a document — never a link straight to storage. */
export function driveFileHref(orgId: string, fileId: string): string {
  return `/app/${orgId}/drive?file=${encodeURIComponent(fileId)}`;
}
