import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";
import { buildObjectPath, uploadFile, deleteFile, signedUrl } from "@/app/lib/storage";
import { extractSingleDocument, classifyDocument } from "@/app/lib/extract-doc";
import { DOC_KEYS } from "@/app/lib/doc-descriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILE_BYTES = 50 * 1024 * 1024;

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id: dossierId } = await params;
  const staff = await getStaffUser();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (staff.role === "viewer") {
    return NextResponse.json({ error: "forbidden_role" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_form" }, { status: 400 });

  const rawDocKey = (form.get("doc_key") as string | null)?.trim() ?? "";
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size === 0) return NextResponse.json({ error: "empty_file" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "too_large", limit: MAX_FILE_BYTES }, { status: 413 });
  }

  let docKey = rawDocKey;
  let classification: { doc_key: string; confidence: string; reason: string } | null = null;

  if (!docKey || !DOC_KEYS.includes(docKey)) {
    const mime = file.type || "application/octet-stream";
    if (mime === "application/pdf" || mime.startsWith("image/")) {
      const buf = Buffer.from(await file.arrayBuffer());
      classification = await classifyDocument({ bytes: buf, mime, filename: file.name });
      docKey = classification.doc_key;
    } else {
      docKey = "passport";
      classification = { doc_key: "passport", confidence: "low", reason: `Unsupported mime type: ${mime}` };
    }
  }

  const sb = supabaseAdmin();
  const { data: dossier } = await sb
    .from("verkoop_dossiers")
    .select("id")
    .eq("id", dossierId)
    .maybeSingle();
  if (!dossier) return NextResponse.json({ error: "not_found" }, { status: 404 });

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
    await uploadFile({ path, contents: buf, contentType: file.type || "application/octet-stream" });
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
      blob_url: path,
      version: newVersion,
      is_current: true,
      uploaded_by: `staff:${staff.phone_e164}`,
    })
    .select("id, version, uploaded_at")
    .single();

  if (insErr) {
    await deleteFile(path).catch(() => {});
    return NextResponse.json({ error: "db_error", detail: insErr.message }, { status: 500 });
  }

  await sb
    .from("verkoop_dossiers")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", dossierId);

  await sb.from("verkoop_audit").insert({
    dossier_id: dossierId,
    actor: `staff:${staff.phone_e164}`,
    action: prior ? "file_replaced" : "file_uploaded",
    meta: { doc_key: docKey, version: newVersion, size: file.size, filename: file.name, classified: classification !== null },
  });

  const preview = await signedUrl(path);

  waitUntil(
    extractSingleDocument({
      id: inserted.id,
      doc_key: docKey,
      filename: file.name,
      mime_type: file.type || null,
      blob_url: path,
    }).catch(() => {})
  );

  return NextResponse.json({
    ok: true,
    id: inserted.id,
    doc_key: docKey,
    version: newVersion,
    uploaded_at: inserted.uploaded_at,
    preview_url: preview,
    classification: classification ? { doc_key: classification.doc_key, confidence: classification.confidence, reason: classification.reason } : null,
  });
}