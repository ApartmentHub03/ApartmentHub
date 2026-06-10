import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { Resend } from "resend";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";
import { DOC_DESCRIPTIONS, DOC_KEYS } from "@/app/lib/doc-descriptions";
import { documentRequestEmail } from "@/app/lib/email-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES = ["seller", "buyer", "vve", "notary", "lawyer", "partner"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

const resendKey = process.env.VERKOOP_RESEND_API_KEY ?? process.env.RESEND_API_KEY;
const resend = resendKey ? new Resend(resendKey) : null;
const MAIL_FROM = process.env.VERKOOP_MAIL_FROM ?? process.env.MAIL_FROM;

// POST /api/admin/magic-links/send-email — create magic link + send email
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
    custom_message?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { dossier_id, role, required_documents, recipient_email, recipient_name, expires_in_days, custom_message } = body;

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
    .select("id, taal, straat, postcode, woonplaats, naam, email")
    .eq("id", dossier_id)
    .maybeSingle();
  if (dErr || !dossier) {
    return NextResponse.json({ error: "dossier_not_found" }, { status: 404 });
  }

  // Create magic link
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

  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "";
  const url = `${origin}/upload/${data.token}`;

  await sb.from("verkoop_audit").insert({
    dossier_id,
    actor: `staff:${staff.phone_e164}`,
    action: "magic_link_created",
    meta: { magic_link_id: data.id, role, token_prefix: token.slice(0, 8) },
  });

  // Send email if recipient_email provided and Resend is configured
  let emailSent = false;
  let emailError: string | null = null;
  if (recipient_email && resend && MAIL_FROM) {
    const lang = dossier.taal === "en" ? "en" : "nl";
    const docLabels = docs.map((key) => {
      const desc = DOC_DESCRIPTIONS[key];
      return lang === "en" ? (desc?.en ?? key) : (desc?.nl ?? key);
    });

    const address = [dossier.straat, dossier.postcode, dossier.woonplaats].filter(Boolean).join(", ");

    const mail = documentRequestEmail({
      lang,
      role: role as ValidRole,
      recipient_name: recipient_name || "",
      object_adres: address,
      required_documents: docLabels,
      upload_url: url,
      valid_days: days,
      custom_message: custom_message || undefined,
      seller_name: dossier.naam || undefined,
    });

    try {
      const emailResult = await resend.emails.send({
        from: MAIL_FROM,
        replyTo: dossier.email || undefined,
        to: recipient_email,
        subject: mail.subject,
        html: mail.html,
      });
      if (emailResult.error) {
        console.error("[send-email] Resend returned error", emailResult.error);
        emailError = emailResult.error.message || String(emailResult.error);
      } else {
        emailSent = true;
      }
    } catch (err) {
      console.error("[send-email] Resend failed", err);
      emailError = err instanceof Error ? err.message : String(err);
    }

    if (emailSent) {
      await sb.from("verkoop_audit").insert({
        dossier_id,
        actor: `staff:${staff.phone_e164}`,
        action: "magic_link_email_sent",
        meta: { magic_link_id: data.id, role, recipient_email },
      });
    }
  } else if (recipient_email && (!resend || !MAIL_FROM)) {
    emailError = resend ? "MAIL_FROM not configured" : "RESEND_API_KEY not configured";
  }

  return NextResponse.json({
    ok: true,
    id: data.id,
    token: data.token,
    url,
    role: data.role,
    required_documents: data.required_documents,
    expires_at: data.expires_at,
    created_at: data.created_at,
    email_sent: emailSent,
    email_error: emailError,
  });
}