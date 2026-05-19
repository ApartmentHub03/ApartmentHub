import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { normalizePhone } from "@/app/lib/phone";
import { sendOtpViaZoko } from "@/app/lib/zoko";
import { generateOtp, hashOtp, otpExpiry, AUTH_CONST } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;

export async function POST(req: NextRequest) {
  let payload: { phone?: string; lang?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const phone = normalizePhone(payload.phone ?? "");
  if (!phone) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count } = await sb
    .from("verkoop_otp_codes")
    .select("id", { count: "exact", head: true })
    .eq("phone_e164", phone)
    .gte("created_at", windowStart);
  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const code = generateOtp();
  const code_hash = hashOtp(code, phone);

  const { error: insErr } = await sb.from("verkoop_otp_codes").insert({
    phone_e164: phone,
    code_hash,
    expires_at: otpExpiry().toISOString(),
    ip,
    user_agent: userAgent,
  });
  if (insErr) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const sendResult = await sendOtpViaZoko(phone, code);
  if (!sendResult.ok) {
    return NextResponse.json(
      { error: "send_failed", detail: sendResult.error },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    delivered: sendResult.delivered,
    devCode: sendResult.devCode,
    ttlMinutes: AUTH_CONST.OTP_TTL_MINUTES,
  });
}
