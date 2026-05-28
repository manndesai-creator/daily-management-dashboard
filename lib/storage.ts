"use client";

import { supabase } from "./supabase";

export const CAPTURE_BUCKET = "capture-files";

export type UploadResult =
  | { ok: true; url: string; path: string }
  | { ok: false; error: string };

function safeExt(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) return "";
  const ext = name.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{1,8}$/.test(ext) ? `.${ext}` : "";
}

/**
 * Uploads a file to the capture-files bucket and returns a public URL.
 * The bucket must exist and be marked Public in the Supabase dashboard.
 */
export async function uploadCaptureFile(
  attachmentId: string,
  file: File
): Promise<UploadResult> {
  const ext = safeExt(file.name);
  const path = `attachments/${attachmentId}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(CAPTURE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    const msg = uploadError.message || "Upload failed";
    if (msg.toLowerCase().includes("bucket")) {
      return {
        ok: false,
        error:
          "Bucket 'capture-files' not found. In your Supabase project go to Storage → New bucket, name it 'capture-files' and make it Public.",
      };
    }
    return { ok: false, error: msg };
  }

  const { data } = supabase.storage.from(CAPTURE_BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl, path };
}

export async function deleteCaptureFile(path: string): Promise<void> {
  if (!path) return;
  await supabase.storage.from(CAPTURE_BUCKET).remove([path]);
}

export function isImageType(mime: string | undefined): boolean {
  return !!mime && mime.startsWith("image/");
}

export function isPdfType(mime: string | undefined): boolean {
  return mime === "application/pdf";
}

export function formatFileSize(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
