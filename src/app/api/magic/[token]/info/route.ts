import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { DOC_DESCRIPTIONS } from "@/app/lib/doc-descriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

// GET /api/magic/[token]/info — resolve a magic link (public, no auth)
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  const sb = supabaseAdmin();

  // Query without expiry/revocation filters first to distinguish between
  // "never existed" (404), "revoked" (410), and "expired" (410).
  const { data: rawLink, error: rawErr } = await sb
    .from("verkoop_magic_links")
    .select("id, dossier_id, role, required_documents, recipient_name, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (rawErr || !rawLink) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (rawLink.revoked_at) {
    return NextResponse.json({ ok: false, error: "revoked" }, { status: 410 });
  }

  if (new Date(rawLink.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "expired" }, { status: 410 });
  }

  const link = rawLink;

  const { data: dossier } = await sb
    .from("verkoop_dossiers")
    .select("straat, postcode, woonplaats, taal")
    .eq("id", link.dossier_id)
    .maybeSingle();

  if (!dossier) {
    return NextResponse.json({ ok: false, error: "dossier_not_found" }, { status: 404 });
  }

  const address = [dossier.straat, dossier.postcode, dossier.woonplaats].filter(Boolean).join(", ");
  const lang = dossier.taal === "en" ? "en" : "nl";

  const docKeys: string[] = Array.isArray(link.required_documents) ? link.required_documents : [];

  const { data: existingFiles } = await sb
    .from("verkoop_files")
    .select("doc_key")
    .eq("dossier_id", link.dossier_id)
    .eq("is_current", true)
    .in("doc_key", docKeys.length > 0 ? docKeys : ["__none__"]);

  const uploadedKeys = new Set((existingFiles ?? []).map((f) => f.doc_key));

  const docs = docKeys.map((key) => {
    const desc = DOC_DESCRIPTIONS[key];
    return {
      key,
      label_nl: desc?.nl ?? key,
      label_en: desc?.en ?? key,
      uploaded: uploadedKeys.has(key),
    };
  });

  return NextResponse.json({
    ok: true,
    dossier_address: address,
    dossier_taal: lang,
    role: link.role,
    required_documents: docs,
    recipient_name: link.recipient_name,
    expires_at: link.expires_at,
  });
}