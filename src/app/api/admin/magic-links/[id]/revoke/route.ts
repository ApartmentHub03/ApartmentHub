import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/magic-links/[id]/revoke — revoke a magic link
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const staff = await getStaffUser();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (staff.role === "viewer") {
    return NextResponse.json({ error: "forbidden_role" }, { status: 403 });
  }

  const sb = supabaseAdmin();

  const { data: link, error: findErr } = await sb
    .from("verkoop_magic_links")
    .select("id, revoked_at, dossier_id")
    .eq("id", id)
    .maybeSingle();

  if (findErr || !link) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (link.revoked_at) {
    return NextResponse.json({ ok: true, already_revoked: true });
  }

  const { error } = await sb
    .from("verkoop_magic_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }

  await sb.from("verkoop_audit").insert({
    dossier_id: link.dossier_id,
    actor: `staff:${staff.phone_e164}`,
    action: "magic_link_revoked",
    meta: { magic_link_id: id },
  });

  return NextResponse.json({ ok: true });
}