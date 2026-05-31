import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";
import { BUCKET } from "@/app/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const VALID_STATUSES = ["in_progress", "awaiting_followups", "complete", "archived"] as const;

const EDITABLE_FIELDS = [
  "status",
  "naam",
  "email",
  "telefoon",
  "straat",
  "postcode",
  "woonplaats",
  "vraagprijs",
  "oplev_datum",
  "motivatie",
] as const;

type Editable = (typeof EDITABLE_FIELDS)[number];

// PATCH /api/dashboard-selling/dossiers/[id]
// Admin + agent can edit. Viewer is blocked.
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: dossierId } = await params;
  const staff = await getStaffUser();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (staff.role === "viewer") {
    return NextResponse.json({ error: "forbidden_role" }, { status: 403 });
  }

  let body: Partial<Record<Editable, unknown>>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in body) {
      let v = body[key];
      if (typeof v === "string") v = v.trim();
      if (key === "status" && v && !VALID_STATUSES.includes(v as (typeof VALID_STATUSES)[number])) {
        return NextResponse.json({ error: "invalid_status" }, { status: 400 });
      }
      if (key === "vraagprijs" && v !== null && v !== "") {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) {
          return NextResponse.json({ error: "invalid_vraagprijs" }, { status: 400 });
        }
        v = n;
      }
      patch[key] = v === "" ? null : v;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }
  patch.last_activity_at = new Date().toISOString();

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("verkoop_dossiers")
    .update(patch)
    .eq("id", dossierId)
    .select(
      "id, status, naam, email, telefoon, phone_e164, straat, postcode, woonplaats, vraagprijs, oplev_datum, motivatie, taal"
    )
    .single();
  if (error) {
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }

  await sb.from("verkoop_audit").insert({
    dossier_id: dossierId,
    actor: `staff:${staff.phone_e164}`,
    action: "dossier_edited",
    meta: { fields: Object.keys(patch).filter((k) => k !== "last_activity_at") },
  });

  return NextResponse.json({ ok: true, dossier: data });
}

// DELETE /api/dashboard-selling/dossiers/[id]
// Permanently removes a dossier. Admin-only — this is destructive and cannot
// be undone. verkoop_files and verkoop_audit rows cascade on the FK; the
// stored objects in the bucket are cleaned up here first (cascade doesn't
// reach Storage).
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id: dossierId } = await params;
  const staff = await getStaffUser();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (staff.role !== "admin") {
    return NextResponse.json({ error: "forbidden_role" }, { status: 403 });
  }

  const sb = supabaseAdmin();
  const { data: dossier, error: findErr } = await sb
    .from("verkoop_dossiers")
    .select("id, naam")
    .eq("id", dossierId)
    .maybeSingle();
  if (findErr || !dossier) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Collect the stored object paths to remove. Prefer the explicit blob_url
  // values on verkoop_files (skipping legacy http(s) Vercel Blob URLs that
  // don't live in this bucket), and walk the dossier folder to catch the
  // signed OTD pdf and anything else under <dossierId>/.
  const paths = new Set<string>();
  const { data: files } = await sb
    .from("verkoop_files")
    .select("blob_url")
    .eq("dossier_id", dossierId);
  for (const f of files ?? []) {
    if (f.blob_url && !/^https?:\/\//i.test(f.blob_url)) paths.add(f.blob_url);
  }
  // Two-level walk of the dossier folder (root + one level of subfolders).
  try {
    const { data: top } = await sb.storage.from(BUCKET).list(dossierId, { limit: 1000 });
    for (const entry of top ?? []) {
      if (entry.id === null) {
        // Subfolder (e.g. a doc_key folder or _signed) — list its contents.
        const sub = `${dossierId}/${entry.name}`;
        const { data: inner } = await sb.storage.from(BUCKET).list(sub, { limit: 1000 });
        for (const f of inner ?? []) {
          if (f.id !== null) paths.add(`${sub}/${f.name}`);
        }
      } else {
        paths.add(`${dossierId}/${entry.name}`);
      }
    }
  } catch (err) {
    // Storage listing is best-effort; proceed with whatever we collected.
    console.error("[dossier/delete] storage walk failed", err);
  }
  if (paths.size > 0) {
    const { error: rmErr } = await sb.storage.from(BUCKET).remove([...paths]);
    if (rmErr) console.error("[dossier/delete] storage remove failed", rmErr);
  }

  // Delete the dossier row last. verkoop_files + verkoop_audit cascade.
  const { error: delErr } = await sb.from("verkoop_dossiers").delete().eq("id", dossierId);
  if (delErr) {
    return NextResponse.json({ error: "db_error", detail: delErr.message }, { status: 500 });
  }

  console.log(
    `[dossier/delete] ${dossierId} (${dossier.naam ?? "?"}) removed by ${staff.phone_e164}; ${paths.size} objects deleted`
  );

  return NextResponse.json({ ok: true, deleted: dossierId, objects_removed: paths.size });
}
