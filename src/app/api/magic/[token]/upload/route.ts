import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { buildObjectPath, uploadFile, deleteFile, signedUrl } from "@/app/lib/storage";
import { extractSingleDocument } from "@/app/lib/extract-doc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const RATE_LIMIT_WINDOW_MIN = 10;
const RATE_LIMIT_MAX = 20;

type Params = { params: Promise<{ token: string }> };

// POST /api/magic/[token]/upload — upload a file via magic link (public, no auth)
export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  const sb = supabaseAdmin();

  // Query without filters first to distinguish revoked/expired from not-found
  const { data: rawLink, error: linkErr } = await sb
    .from("verkoop_magic_links")
    .select("id, dossier_id, role, required_documents, expires_at, used_count, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (linkErr || !rawLink) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (rawLink.revoked_at) {
    return NextResponse.json({ error: "revoked" }, { status: 410 });
  }

  if (new Date(rawLink.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  const link = rawLink;

  const requiredDocs: string[] = Array.isArray(link.required_documents) ? link.required_documents : [];

  // Rate limit: max 20 uploads from this specific token in the last 10 minutes
  const actorPrefix = `magic_link:${token.slice(0, 8)}`;
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60000).toISOString();
  const { count } = await sb
    .from("verkoop_audit")
    .select("*", { count: "exact", head: true })
    .eq("dossier_id", link.dossier_id)
    .in("action", ["file_uploaded", "file_replaced"])
    .like("actor", `${actorPrefix}%`)
    .gte("created_at", windowStart);
  if (count !== null && count >= RATE_LIMIT_MAX) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_form" }, { status: 400 });

  const docKey = (form.get("doc_key") as string | null)?.trim() ?? "";
  const file = form.get("file");
  if (!docKey) return NextResponse.json({ error: "missing_doc_key" }, { status: 400 });
  if (!requiredDocs.includes(docKey)) {
    return NextResponse.json({ error: "doc_key_not_allowed", allowed: requiredDocs }, { status: 403 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size === 0) return NextResponse.json({ error: "empty_file" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "too_large", limit: MAX_FILE_BYTES }, { status: 413 });
  }

  const dossierId = link.dossier_id;

  // Find current version for this doc_key
  const { data: prior } = await sb
    .from("verkoop_files")
    .select("id, blob_url, version")
    .eq("dossier_id", dossierId)
    .eq("doc_key", docKey)
    .eq("is_current", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const newVersion = (prior?.version ?? 0) + 1;
  const path = buildObjectPath(dossierId, docKey, file.name);
  const buf = await file.arrayBuffer();

  try {
    await uploadFile({
      path,
      contents: buf,
      contentType: file.type || "application/octet-stream",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "storage_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  if (prior?.id) {
    await sb
      .from("verkoop_files")
      .update({ is_current: false, replaced_at: new Date().toISOString() })
      .eq("id", prior.id);
  }

  const { data: inserted, error: insErr } = await sb
    .from("verkoop_files")
    .insert({
      dossier_id: dossierId,
      doc_key: docKey,
      filename: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      blob_url: path, // storage path, not a URL — preview goes via signedUrl()
      version: newVersion,
      is_current: true,
      uploaded_by: actorPrefix,
    })
    .select("id, version, uploaded_at")
    .single();

  if (insErr) {
    await deleteFile(path).catch(() => {});
    return NextResponse.json({ error: "db_error", detail: insErr.message }, { status: 500 });
  }

  // Update usage counters on the magic link
  await sb
    .from("verkoop_magic_links")
    .update({
      used_count: link.used_count + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", link.id);

  // Update dossier activity
  await sb
    .from("verkoop_dossiers")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", dossierId);

  // Audit trail
  await sb.from("verkoop_audit").insert({
    dossier_id: dossierId,
    actor: actorPrefix,
    action: prior ? "file_replaced" : "file_uploaded",
    meta: { doc_key: docKey, version: newVersion, size: file.size, filename: file.name, magic_link_id: link.id },
  });

  const preview = await signedUrl(path);

  // Kick off per-doc AI extraction
  waitUntil(
    extractSingleDocument({
      id: inserted.id,
      doc_key: docKey,
      filename: file.name,
      mime_type: file.type || null,
      blob_url: path,
    }).catch((err) => {
      console.warn("[magic-upload] extractSingleDocument failed", inserted.id, err);
    })
  );

  return NextResponse.json({
    ok: true,
    id: inserted.id,
    doc_key: docKey,
    version: inserted.version,
    filename: file.name,
    size_bytes: file.size,
    mime_type: file.type,
    uploaded_at: inserted.uploaded_at,
    preview_url: preview,
  });
}