import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getSession } from "@/app/lib/auth";
import { buildObjectPath, uploadFile, deleteFile, signedUrl } from "@/app/lib/storage";
import { extractSingleDocument } from "@/app/lib/extract-doc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB — matches the bucket limit

async function getOrCreateDossier(phoneE164: string): Promise<string> {
  const sb = supabaseAdmin();
  const { data: existing } = await sb
    .from("verkoop_dossiers")
    .select("id")
    .eq("phone_e164", phoneE164)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await sb
    .from("verkoop_dossiers")
    .insert({
      phone_e164: phoneE164,
      straat: "",
      postcode: "",
      naam: "",
      email: "",
      last_activity_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  await sb.from("verkoop_audit").insert({
    dossier_id: data.id,
    actor: `seller:${phoneE164}`,
    action: "dossier_created",
    meta: { source: "first_upload" },
  });
  return data.id;
}

// POST /api/verkoop/upload — multipart form with `doc_key` + `file`.
// Per-document incremental save. Marks any previous version of the same
// doc_key as is_current=false and stamps replaced_at.
export async function POST(req: NextRequest) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_form" }, { status: 400 });

  const docKey = (form.get("doc_key") as string | null)?.trim() ?? "";
  const file = form.get("file");
  if (!docKey) return NextResponse.json({ error: "missing_doc_key" }, { status: 400 });
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size === 0) return NextResponse.json({ error: "empty_file" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "too_large", limit: MAX_FILE_BYTES }, { status: 413 });
  }

  const sb = supabaseAdmin();
  let dossierId: string;
  try {
    dossierId = await getOrCreateDossier(sess.phone_e164);
  } catch (err) {
    return NextResponse.json(
      { error: "dossier_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  // Find current row for this doc_key (if any) — for versioning + cleanup.
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

  // Mark previous current row as historical.
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
    })
    .select("id, version, uploaded_at")
    .single();

  if (insErr) {
    // Roll back the orphaned storage object.
    await deleteFile(path).catch(() => {});
    return NextResponse.json({ error: "db_error", detail: insErr.message }, { status: 500 });
  }

  await sb
    .from("verkoop_dossiers")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", dossierId);

  await sb.from("verkoop_audit").insert({
    dossier_id: dossierId,
    actor: `seller:${sess.phone_e164}`,
    action: prior ? "file_replaced" : "file_uploaded",
    meta: { doc_key: docKey, version: newVersion, size: file.size, filename: file.name },
  });

  const preview = await signedUrl(path);

  // Kick off the per-doc Claude extract server-side and let it run after the
  // response is sent. waitUntil keeps the serverless function alive for the
  // background work, so this survives the seller closing their tab or
  // navigating immediately (the old portal-side keepalive fetch was unreliable
  // — see ai_extract_status null rate before the switch). extractSingleDocument
  // writes its own status to verkoop_files; nothing to return here.
  waitUntil(
    extractSingleDocument({
      id: inserted.id,
      doc_key: docKey,
      filename: file.name,
      mime_type: file.type || null,
      blob_url: path,
    }).catch((err) => {
      console.warn("[upload] extractSingleDocument failed", inserted.id, err);
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

// DELETE /api/verkoop/upload?doc_key=mjop — soft-delete (mark all current
// versions of this doc_key as not current). The storage objects are kept
// so audit + ZIP exports can still reference them.
export async function DELETE(req: NextRequest) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const docKey = url.searchParams.get("doc_key")?.trim() ?? "";
  if (!docKey) return NextResponse.json({ error: "missing_doc_key" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: dossier } = await sb
    .from("verkoop_dossiers")
    .select("id")
    .eq("phone_e164", sess.phone_e164)
    .maybeSingle();
  if (!dossier) return NextResponse.json({ ok: true, removed: 0 });

  const { data: removed } = await sb
    .from("verkoop_files")
    .update({ is_current: false, replaced_at: new Date().toISOString() })
    .eq("dossier_id", dossier.id)
    .eq("doc_key", docKey)
    .eq("is_current", true)
    .select("id");

  await sb.from("verkoop_audit").insert({
    dossier_id: dossier.id,
    actor: `seller:${sess.phone_e164}`,
    action: "file_removed",
    meta: { doc_key: docKey, removed: removed?.length ?? 0 },
  });

  return NextResponse.json({ ok: true, removed: removed?.length ?? 0 });
}
