import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";
import { uploadFile, deleteFile, signedUrl, buildObjectPath } from "@/app/lib/storage";
import { extractSingleDocument } from "@/app/lib/extract-doc";
import { DOC_KEYS } from "@/app/lib/doc-descriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; fileId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: dossierId, fileId } = await params;
  const staff = await getStaffUser();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (staff.role === "viewer") {
    return NextResponse.json({ error: "forbidden_role" }, { status: 403 });
  }

  let body: { doc_key?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const newDocKey = typeof body.doc_key === "string" ? body.doc_key.trim() : "";
  if (!newDocKey || !DOC_KEYS.includes(newDocKey)) {
    return NextResponse.json({ error: "invalid_doc_key" }, { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: file, error: findErr } = await sb
    .from("verkoop_files")
    .select("id, doc_key, filename, mime_type, blob_url, version, size_bytes")
    .eq("id", fileId)
    .eq("dossier_id", dossierId)
    .eq("is_current", true)
    .maybeSingle();

  if (findErr || !file) {
    return NextResponse.json({ error: "file_not_found" }, { status: 404 });
  }

  if (file.doc_key === newDocKey) {
    const preview = await signedUrl(file.blob_url);
    return NextResponse.json({
      ok: true,
      id: fileId,
      doc_key: file.doc_key,
      version: file.version,
      preview_url: preview,
      unchanged: true,
    });
  }

  const oldPath = file.blob_url;
  const newPath = buildObjectPath(dossierId, newDocKey, file.filename);

  let downloadBuffer: ArrayBuffer;
  try {
    if (/^https?:\/\//i.test(oldPath)) {
      const res = await fetch(oldPath);
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      downloadBuffer = await res.arrayBuffer();
    } else {
      const dlResult = await sb.storage.from("verkoop-uploads").download(oldPath);
      if (dlResult.error || !dlResult.data) throw dlResult.error || new Error("download failed");
      downloadBuffer = await dlResult.data.arrayBuffer();
    }
  } catch (err) {
    return NextResponse.json(
      { error: "download_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  try {
    await uploadFile({
      path: newPath,
      contents: downloadBuffer,
      contentType: file.mime_type || "application/octet-stream",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "storage_upload_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  await deleteFile(oldPath).catch(() => {});

  const oldDocKey = file.doc_key;
  const { data: priorNew } = await sb
    .from("verkoop_files")
    .select("id, version")
    .eq("dossier_id", dossierId)
    .eq("doc_key", newDocKey)
    .eq("is_current", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (priorNew?.id) {
    await sb
      .from("verkoop_files")
      .update({ is_current: false, replaced_at: new Date().toISOString() })
      .eq("id", priorNew.id);
  }

  const newVersion = (priorNew?.version ?? 0) + 1;

  const { error: updErr } = await sb
    .from("verkoop_files")
    .update({
      doc_key: newDocKey,
      blob_url: newPath,
      version: newVersion,
      ai_extract: null,
      ai_extract_status: "pending",
      ai_extract_at: null,
      ai_extract_error: null,
    })
    .eq("id", fileId);

  if (updErr) {
    await deleteFile(newPath).catch(() => {});
    return NextResponse.json({ error: "db_error", detail: updErr.message }, { status: 500 });
  }

  await sb
    .from("verkoop_dossiers")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", dossierId);

  await sb.from("verkoop_audit").insert({
    dossier_id: dossierId,
    actor: `staff:${staff.phone_e164}`,
    action: "file_doc_key_changed",
    meta: { file_id: fileId, old_doc_key: oldDocKey, new_doc_key: newDocKey, filename: file.filename },
  });

  const preview = await signedUrl(newPath);

  waitUntil(
    extractSingleDocument({
      id: fileId,
      doc_key: newDocKey,
      filename: file.filename,
      mime_type: file.mime_type,
      blob_url: newPath,
    }).catch(() => {})
  );

  return NextResponse.json({
    ok: true,
    id: fileId,
    doc_key: newDocKey,
    version: newVersion,
    preview_url: preview,
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id: dossierId, fileId } = await params;
  const staff = await getStaffUser();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (staff.role === "viewer") {
    return NextResponse.json({ error: "forbidden_role" }, { status: 403 });
  }

  const sb = supabaseAdmin();

  const { data: file, error: findErr } = await sb
    .from("verkoop_files")
    .select("id, doc_key, filename, blob_url")
    .eq("id", fileId)
    .eq("dossier_id", dossierId)
    .maybeSingle();

  if (findErr || !file) {
    return NextResponse.json({ error: "file_not_found" }, { status: 404 });
  }

  await deleteFile(file.blob_url).catch(() => {});

  const { error: delErr } = await sb
    .from("verkoop_files")
    .delete()
    .eq("id", fileId);

  if (delErr) {
    return NextResponse.json({ error: "db_error", detail: delErr.message }, { status: 500 });
  }

  await sb
    .from("verkoop_dossiers")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", dossierId);

  await sb.from("verkoop_audit").insert({
    dossier_id: dossierId,
    actor: `staff:${staff.phone_e164}`,
    action: "file_removed",
    meta: { file_id: fileId, doc_key: file.doc_key, filename: file.filename },
  });

  return NextResponse.json({ ok: true });
}