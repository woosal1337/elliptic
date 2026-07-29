import * as LegacyFS from "expo-file-system/legacy"

import { api } from "@/services/api"

export interface UploadAsset {
  uri: string
  name: string
  type: string
  size: number
}

/** Upload a local asset to R2 via the presigned flow; returns the stored object id. */
export async function uploadAsset(
  orgId: string,
  asset: UploadAsset,
  entityType = "ai_chat",
): Promise<string | null> {
  const presigned = await api.presignUpload(orgId, {
    filename: asset.name,
    content_type: asset.type,
    size_bytes: asset.size,
    entity_type: entityType,
  })
  if (!presigned) return null

  const result = await LegacyFS.uploadAsync(presigned.upload_url, asset.uri, {
    httpMethod: "PUT",
    uploadType: LegacyFS.FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": asset.type },
  })
  if (result.status < 200 || result.status >= 300) return null

  const confirmed = await api.confirmUpload(orgId, presigned.object_id)
  return confirmed ? presigned.object_id : null
}
