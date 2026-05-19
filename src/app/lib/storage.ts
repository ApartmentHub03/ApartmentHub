import { supabaseAdmin } from "./supabase-admin";

export const BUCKET = "verkoop-uploads";
const SIGNED_URL_TTL_SEC = 60 * 60; // 1 hour for staff preview

export function buildObjectPath(dossierId: string, docKey: string, filename: string): string {
  const safeName = filename.replace(/[^\w.\-]+/g, "_").slice(0, 80);
  return `${dossierId}/${docKey}/${Date.now()}_${safeName}`;
}

export async function uploadFile(opts: {
  path: string;
  contents: ArrayBuffer | Buffer | Uint8Array;
  contentType: string;
}): Promise<{ path: string }> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.storage
    .from(BUCKET)
    .upload(opts.path, opts.contents as ArrayBuffer, {
      contentType: opts.contentType,
      upsert: false,
    });
  if (error) throw error;
  return { path: data.path };
}

export async function signedUrl(path: string): Promise<string | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SEC);
  if (error) return null;
  return data.signedUrl;
}

export async function downloadFile(path: string): Promise<ArrayBuffer | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return await data.arrayBuffer();
}

export async function deleteFile(path: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb.storage.from(BUCKET).remove([path]);
}
