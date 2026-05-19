import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";

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
