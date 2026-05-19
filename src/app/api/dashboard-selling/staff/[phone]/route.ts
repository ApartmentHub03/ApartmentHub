import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES = ["admin", "agent", "viewer"] as const;
type Role = (typeof VALID_ROLES)[number];
type Params = { params: Promise<{ phone: string }> };

async function requireAdmin() {
  const me = await getStaffUser();
  if (!me) return { error: "unauthorized", status: 401 as const };
  if (me.role !== "admin") return { error: "forbidden", status: 403 as const };
  return { me };
}

// PATCH — update display_name and/or role (admin only)
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { phone: rawPhone } = await params;
  const phone = decodeURIComponent(rawPhone);
  let body: { display_name?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (body.display_name !== undefined) patch.display_name = body.display_name.trim() || null;
  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role as Role)) {
      return NextResponse.json({ error: "invalid_role" }, { status: 400 });
    }
    patch.role = body.role;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }

  // Don't allow removing the last admin or downgrading yourself out of admin.
  if (patch.role && patch.role !== "admin") {
    if (auth.me.phone_e164 === phone) {
      return NextResponse.json({ error: "cannot_self_demote" }, { status: 400 });
    }
    const sb = supabaseAdmin();
    const { count } = await sb
      .from("verkoop_staff_users")
      .select("phone_e164", { count: "exact", head: true })
      .eq("role", "admin")
      .neq("phone_e164", phone);
    if ((count ?? 0) === 0) {
      return NextResponse.json({ error: "last_admin" }, { status: 400 });
    }
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("verkoop_staff_users")
    .update(patch)
    .eq("phone_e164", phone)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, staff: data });
}

// DELETE — remove a staff member (admin only, not self, not last admin)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { phone: rawPhone } = await params;
  const phone = decodeURIComponent(rawPhone);
  if (auth.me.phone_e164 === phone) {
    return NextResponse.json({ error: "cannot_self_delete" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  // Check if removing this user leaves no admin behind.
  const { data: target } = await sb
    .from("verkoop_staff_users")
    .select("role")
    .eq("phone_e164", phone)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (target.role === "admin") {
    const { count } = await sb
      .from("verkoop_staff_users")
      .select("phone_e164", { count: "exact", head: true })
      .eq("role", "admin")
      .neq("phone_e164", phone);
    if ((count ?? 0) === 0) {
      return NextResponse.json({ error: "last_admin" }, { status: 400 });
    }
  }

  const { error } = await sb.from("verkoop_staff_users").delete().eq("phone_e164", phone);
  if (error) {
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }

  // Best-effort: also kill any active sessions for this phone so they're logged out
  await sb.from("verkoop_sessions").delete().eq("phone_e164", phone);

  return NextResponse.json({ ok: true });
}
