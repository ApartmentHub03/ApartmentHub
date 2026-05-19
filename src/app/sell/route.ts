import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";

// /sell is served as a raw Response — the portal HTML is a complete
// <!doctype html><html>...</html> document, which can't be embedded inside
// the main app's React layout without nesting <html> tags and breaking
// hydration. A Route Handler bypasses the root layout entirely.
//
// Auth gate:
//   - No session  → 302 to /sell/login (the React OTP form)
//   - Session     → return the portal HTML directly with text/html

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let cachedHtml: string | null = null;

async function loadPortalHtml(): Promise<string> {
  if (cachedHtml) return cachedHtml;
  const p = path.join(process.cwd(), "src/app/sell/_portal/index.html");
  cachedHtml = await fs.promises.readFile(p, "utf8");
  return cachedHtml;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    const url = new URL("/sell/login", req.url);
    // Preserve any next= the user came in with so they land back on /sell.
    const next = req.nextUrl.searchParams.get("next");
    if (next) url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  try {
    const html = await loadPortalHtml();
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Personalized per-session; never proxy/CDN cache.
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response(
      "<!doctype html><html><body><h1>Portal not found</h1>" +
        "<p>Expected: <code>src/app/sell/_portal/index.html</code></p></body></html>",
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
