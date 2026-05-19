import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";
import { normalizePhone } from "@/app/lib/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES = ["admin", "agent", "viewer"] as const;
type Role = (typeof VALID_ROLES)[number];

async function requireAdmin() {
  const me = await getStaffUser();
  if (!me) return { error: "unauthorized", status: 401 as const };
  if (me.role !== "admin") return { error: "forbidden", status: 403 as const };
  return { me };
}

// GET — list all staff (admin only)
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("verkoop_staff_users")
    .select("phone_e164, display_name, role, created_at, last_login_at")
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, staff: data ?? [], me: auth.me });
}

// POST — add a new staff member (admin only)
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { phone?: string; display_name?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const phone = normalizePhone(body.phone ?? "");
  if (!phone) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });

  const role = (body.role ?? "agent") as Role;
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }
  const displayName = (body.display_name ?? "").trim() || null;

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("verkoop_staff_users")
    .insert({ phone_e164: phone, display_name: displayName, role })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "already_exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, staff: data });
}
