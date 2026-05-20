import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabase-admin";

const COOKIE_NAME = "ah_sess";
const SESSION_TTL_DAYS = 30;
const OTP_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

export function generateOtp(): string {
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return n.toString().padStart(6, "0");
}

export function hashOtp(code: string, phone: string): string {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

export function newSessionId(): string {
  return randomBytes(32).toString("hex");
}

export function otpExpiry(): Date {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
}

export function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 3600 * 1000);
}

export async function createSession(phoneE164: string, meta: { ip?: string; userAgent?: string }) {
  const sb = supabaseAdmin();
  const id = newSessionId();
  const expires = sessionExpiry();
  const { error } = await sb.from("verkoop_sessions").insert({
    id,
    phone_e164: phoneE164,
    expires_at: expires.toISOString(),
    ip: meta.ip ?? null,
    user_agent: meta.userAgent ?? null,
  });
  if (error) throw error;
  return { id, expires };
}

export function attachSessionCookie(response: NextResponse, sessionId: string, expires: Date) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    // `secure: true` makes browsers reject the cookie on plain HTTP.
    // In dev (http://localhost:3000) that meant the cookie was silently
    // dropped and /sell looped back to /sell/login forever. Only set it
    // in production where the site is served over HTTPS.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
  return response;
}

export async function getSession(): Promise<{ phone_e164: string } | null> {
  const cookie = (await cookies()).get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("verkoop_sessions")
    .select("phone_e164, expires_at")
    .eq("id", cookie)
    .maybeSingle();
  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return { phone_e164: data.phone_e164 };
}

export type StaffUser = {
  phone_e164: string;
  display_name: string | null;
  role: "agent" | "admin" | "viewer";
};

export async function getStaffUser(): Promise<StaffUser | null> {
  const sess = await getSession();
  if (!sess) return null;
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("verkoop_staff_users")
    .select("phone_e164, display_name, role")
    .eq("phone_e164", sess.phone_e164)
    .maybeSingle();
  return (data as StaffUser) ?? null;
}

export const AUTH_CONST = {
  COOKIE_NAME,
  SESSION_TTL_DAYS,
  OTP_TTL_MINUTES,
  MAX_OTP_ATTEMPTS,
};
