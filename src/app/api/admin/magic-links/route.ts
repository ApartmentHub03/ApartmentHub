import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";
import { DOC_KEYS } from "@/app/lib/doc-descriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES = ["seller", "buyer", "vve", "notary", "lawyer", "partner"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

// POST /api/admin/magic-links — create a new magic link
export async function POST(req: NextRequest) {
  const staff = await getStaffUser();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (staff.role === "viewer") {
    return NextResponse.json({ error: "forbidden_role" }, { status: 403 });
  }

  let body: {
    dossier_id?: string;
    role?: string;
    required_documents?: string[];
    recipient_email?: string;
    recipient_name?: string;
    expires_in_days?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { dossier_id, role, required_documents, recipient_email, recipient_name, expires_in_days } = body;

  if (!dossier_id || typeof dossier_id !== "string") {
    return NextResponse.json({ error: "missing_dossier_id" }, { status: 400 });
  }
  if (!role || !VALID_ROLES.includes(role as ValidRole)) {
    return NextResponse.json({ error: "invalid_role", valid: VALID_ROLES }, { status: 400 });
  }

  const docs = Array.isArray(required_documents) ? required_documents : [];
  const invalid = docs.filter((d) => !DOC_KEYS.includes(d));
  if (invalid.length > 0) {
    return NextResponse.json({ error: "invalid_doc_keys", keys: invalid }, { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: dossier, error: dErr } = await sb
    .from("verkoop_dossiers")
    .select("id")
    .eq("id", dossier_id)
    .maybeSingle();
  if (dErr || !dossier) {
    return NextResponse.json({ error: "dossier_not_found" }, { status: 404 });
  }

  const token = randomBytes(24).toString("base64url");
  const days = expires_in_days && expires_in_days > 0 ? expires_in_days : 30;

  const { data, error } = await sb
    .from("verkoop_magic_links")
    .insert({
      dossier_id,
      token,
      role,
      allowed_actions: ["upload"],
      required_documents: docs,
      recipient_email: recipient_email || null,
      recipient_name: recipient_name || null,
      created_by: `agent:${staff.phone_e164}`,
      expires_at: new Date(Date.now() + days * 86400000).toISOString(),
    })
    .select("id, token, role, required_documents, expires_at, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }

  await sb.from("verkoop_audit").insert({
    dossier_id,
    actor: `staff:${staff.phone_e164}`,
    action: "magic_link_created",
    meta: { magic_link_id: data.id, role, token_prefix: token.slice(0, 8) },
  });

  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "";
  const url = `${origin}/upload/${data.token}`;

  return NextResponse.json({
    ok: true,
    id: data.id,
    token: data.token,
    url,
    role: data.role,
    required_documents: data.required_documents,
    expires_at: data.expires_at,
    created_at: data.created_at,
  });
}

// GET /api/admin/magic-links?dossier_id=<uuid> — list links for a dossier
export async function GET(req: NextRequest) {
  const staff = await getStaffUser();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const dossierId = url.searchParams.get("dossier_id");
  if (!dossierId) {
    return NextResponse.json({ error: "missing_dossier_id" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("verkoop_magic_links")
    .select("id, token, role, required_documents, recipient_email, recipient_name, created_by, expires_at, used_count, last_used_at, revoked_at, created_at")
    .eq("dossier_id", dossierId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }

  const now = new Date().toISOString();
  const links = (data ?? []).map((row) => ({
    ...row,
    status: row.revoked_at
      ? "revoked"
      : new Date(row.expires_at).toISOString() < now
        ? "expired"
        : "active",
  }));

  return NextResponse.json({ ok: true, links });
}