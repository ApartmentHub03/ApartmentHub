import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/app/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "ah_sess";

async function clear() {
  const cookieStore = await cookies();
  const sid = cookieStore.get(COOKIE_NAME)?.value;
  if (sid) {
    try {
      await supabaseAdmin().from("verkoop_sessions").delete().eq("id", sid);
    } catch {
      // best effort
    }
  }
  cookieStore.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    // Match the flags used when the cookie was set; otherwise browsers
    // can refuse to clear it (Chrome treats secure mismatch as a different
    // cookie). NODE_ENV === "production" matches attachSessionCookie().
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function GET(req: NextRequest) {
  // Next.js auto-prefetches every <Link>. If we treated prefetches as real
  // signouts, every page load would silently destroy the user's session.
  const isPrefetch =
    req.headers.get("next-router-prefetch") === "1" ||
    req.headers.get("rsc") === "1" ||
    req.headers.get("purpose") === "prefetch" ||
    req.nextUrl.searchParams.has("_rsc");
  if (isPrefetch) {
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }
  await clear();
  return NextResponse.redirect(new URL("/sell-intake", req.url));
}

export async function POST(req: NextRequest) {
  await clear();
  // Form posts expect a redirect back to /sell-intake so the page re-renders unauthed.
  return NextResponse.redirect(new URL("/sell-intake", req.url), { status: 303 });
}
