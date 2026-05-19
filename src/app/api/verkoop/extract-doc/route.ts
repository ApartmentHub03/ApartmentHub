import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { extractSingleDocument } from "@/app/lib/extract-doc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// One PDF is usually 5-15s; cap at 60s in case of a large MJOP.
// On Hobby this is capped at 10s by Vercel; on Pro it honors the value.
export const maxDuration = 60;

// POST /api/verkoop/extract-doc
// Body: { file_id: uuid }
//
// Fires the per-document Claude extraction for one uploaded file and stores
// the structured JSON on verkoop_files.ai_extract. Called fire-and-forget
// from the seller portal right after each /api/verkoop/upload success, and
// also called inline by the staff analyse endpoint for any current file
// whose extract is still missing.
export async function POST(req: NextRequest) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { file_id?: string } | null;
  const fileId = body?.file_id?.trim();
  if (!fileId) return NextResponse.json({ error: "missing_file_id" }, { status: 400 });

  const sb = supabaseAdmin();

  // Ownership check: the file's dossier must belong to this phone.
  const { data: file, error } = await sb
    .from("verkoop_files")
    .select(
      "id, doc_key, filename, mime_type, blob_url, is_current, ai_extract_status, dossier_id, verkoop_dossiers!inner(phone_e164)"
    )
    .eq("id", fileId)
    .maybeSingle();

  if (error || !file) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const dossierPhone = (file as unknown as { verkoop_dossiers: { phone_e164: string } })
    .verkoop_dossiers?.phone_e164;
  if (dossierPhone !== sess.phone_e164) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!file.is_current) {
    return NextResponse.json({ error: "not_current" }, { status: 410 });
  }

  // Idempotency: if extract already done, return it.
  if (file.ai_extract_status === "done") {
    return NextResponse.json({ ok: true, status: "done", cached: true });
  }

  const extract = await extractSingleDocument({
    id: file.id,
    doc_key: file.doc_key,
    filename: file.filename,
    mime_type: file.mime_type,
    blob_url: file.blob_url,
  });

  if (!extract) {
    return NextResponse.json({ ok: false, status: "failed" }, { status: 502 });
  }
  return NextResponse.json({
    ok: true,
    status: "done",
    summary: extract.summary,
    flags: extract.flags,
  });
}
