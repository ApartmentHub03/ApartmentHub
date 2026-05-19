import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { normalizePhone } from "@/app/lib/phone";
import { createSession, attachSessionCookie, hashOtp, AUTH_CONST } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let payload: { phone?: string; code?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const phone = normalizePhone(payload.phone ?? "");
  const code = (payload.code ?? "").trim();
  if (!phone || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const code_hash = hashOtp(code, phone);
  const nowIso = new Date().toISOString();

  const { data: row, error } = await sb
    .from("verkoop_otp_codes")
    .select("id, code_hash, attempts, expires_at, consumed_at")
    .eq("phone_e164", phone)
    .is("consumed_at", null)
    .gte("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "no_active_code" }, { status: 400 });
  }

  if (row.attempts >= AUTH_CONST.MAX_OTP_ATTEMPTS) {
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
  }

  if (row.code_hash !== code_hash) {
    await sb
      .from("verkoop_otp_codes")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);
    return NextResponse.json({ error: "wrong_code" }, { status: 400 });
  }

  // Create session FIRST. If it fails, OTP is still valid and user can retry —
  // avoids the "consumed code, no session" lockout state.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim();
  const userAgent = req.headers.get("user-agent") ?? undefined;
  let session: { id: string; expires: Date };
  try {
    session = await createSession(phone, { ip: ip ?? undefined, userAgent });
  } catch (err) {
    console.error("[verify-otp] createSession failed", err);
    return NextResponse.json(
      {
        error: "session_failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }

  await sb
    .from("verkoop_otp_codes")
    .update({ consumed_at: nowIso })
    .eq("id", row.id);

  // Staff allowlist check — if phone is in verkoop_staff_users, mark isStaff.
  const { data: staff } = await sb
    .from("verkoop_staff_users")
    .select("phone_e164, role, display_name")
    .eq("phone_e164", phone)
    .maybeSingle();

  if (staff) {
    await sb
      .from("verkoop_staff_users")
      .update({ last_login_at: nowIso })
      .eq("phone_e164", phone);
    const res = NextResponse.json({
      ok: true,
      isStaff: true,
      role: staff.role,
      displayName: staff.display_name,
    });
    return attachSessionCookie(res, session.id, session.expires);
  }

  // Seller flow — detect existing dossier for ?resume=1 routing.
  const { data: dossier } = await sb
    .from("verkoop_dossiers")
    .select("id, status")
    .eq("phone_e164", phone)
    .maybeSingle();

  const res = NextResponse.json({
    ok: true,
    isStaff: false,
    isReturning: Boolean(dossier),
    dossierId: dossier?.id ?? null,
    status: dossier?.status ?? null,
  });
  return attachSessionCookie(res, session.id, session.expires);
}
