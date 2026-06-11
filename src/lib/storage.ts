import { put, del } from "@vercel/blob";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export type StoredUpload = {
  url: string;
  /** Blob pathname or local absolute file path. */
  storagePath: string;
  size: number;
  type: string;
};

/** Vercel Blob (token or OIDC + store id). */
export function isBlobStorageAvailable(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN),
  );
}

/** Local disk — dev fallback when Blob is not configured. */
export function isFilesystemStorageAvailable(): boolean {
  return !process.env.VERCEL && !isBlobStorageAvailable();
}

export function isUploadStorageAvailable(): boolean {
  return isBlobStorageAvailable() || isFilesystemStorageAvailable();
}

export const UPLOAD_UNAVAILABLE_MESSAGE =
  "File uploads are not configured. Add a Vercel Blob store (BLOB_READ_WRITE_TOKEN) or run locally without VERCEL.";

export function isVercelBlobUrl(url: string): boolean {
  return url.includes("blob.vercel-storage.com");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function avatarExtension(type: string): string {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/gif") return "gif";
  return "webp";
}

/** Persist a file to Vercel Blob or local public/uploads. */
export async function storeUploadedFile(input: {
  file: File;
  /** e.g. avatars/userId or issues/issueId */
  keyPrefix: string;
  filename?: string;
}): Promise<StoredUpload> {
  const type = input.file.type || "application/octet-stream";
  const safeName = sanitizeFilename(input.file.name);
  const filename = input.filename ?? `${randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await input.file.arrayBuffer());

  if (isBlobStorageAvailable()) {
    const pathname = `${input.keyPrefix}/${filename}`;
    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: type,
      addRandomSuffix: false,
    });
    return {
      url: blob.url,
      storagePath: blob.pathname,
      size: input.file.size,
      type,
    };
  }

  if (isFilesystemStorageAvailable()) {
    const segments = input.keyPrefix.split("/");
    const uploadsDir = path.join(process.cwd(), "public", "uploads", ...segments);
    await mkdir(uploadsDir, { recursive: true });
    const filepath = path.join(uploadsDir, filename);
    await writeFile(filepath, buffer);
    const url = `/uploads/${input.keyPrefix}/${filename}`;
    return {
      url,
      storagePath: filepath,
      size: input.file.size,
      type,
    };
  }

  throw new Error(UPLOAD_UNAVAILABLE_MESSAGE);
}

/** Store a user avatar with a stable extension-based filename. */
export async function storeAvatarFile(
  userId: string,
  file: File,
): Promise<StoredUpload> {
  const type = file.type || "application/octet-stream";
  const filename = `${randomUUID()}.${avatarExtension(type)}`;
  return storeUploadedFile({
    file,
    keyPrefix: `avatars/${userId}`,
    filename,
  });
}

/** Remove a previously stored file (Blob URL or local path). */
export async function deleteStoredFile(
  url: string | null | undefined,
  storagePath?: string | null,
): Promise<void> {
  if (!url && !storagePath) return;

  if (url && isVercelBlobUrl(url)) {
    try {
      await del(url);
    } catch {
      // Best-effort cleanup; orphaned blobs are acceptable.
    }
    return;
  }

  const localPath =
    storagePath ??
    (url?.startsWith("/uploads/")
      ? path.join(process.cwd(), "public", url)
      : null);

  if (localPath) {
    try {
      await unlink(localPath);
    } catch {
      // File may already be gone.
    }
  }
}
