import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { Resend } from "resend";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";
import { inventoryRequestEmail } from "@/app/lib/email-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resendKey = process.env.VERKOOP_RESEND_API_KEY ?? process.env.RESEND_API_KEY;
const resend = resendKey ? new Resend(resendKey) : null;
const MAIL_FROM = process.env.VERKOOP_MAIL_FROM ?? process.env.MAIL_FROM;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getStaffUser();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (staff.role === "viewer") {
    return NextResponse.json({ error: "forbidden_role" }, { status: 403 });
  }

  const { id: dossierId } = await params;

  let body: {
    recipient_email?: string;
    custom_message?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: dossier, error: dErr } = await sb
    .from("verkoop_dossiers")
    .select("id, taal, straat, postcode, woonplaats, naam, email")
    .eq("id", dossierId)
    .maybeSingle();
  if (dErr || !dossier) {
    return NextResponse.json({ error: "dossier_not_found" }, { status: 404 });
  }

  const recipientEmail = (body.recipient_email || dossier.email || "").trim();
  if (!recipientEmail) {
    return NextResponse.json({ error: "no_recipient_email" }, { status: 400 });
  }

  const token = randomBytes(24).toString("base64url");
  const days = 30;

  const { data, error } = await sb
    .from("verkoop_inventory_links")
    .insert({
      dossier_id: dossierId,
      token,
      recipient_email: recipientEmail,
      created_by: `staff:${staff.phone_e164}`,
      expires_at: new Date(Date.now() + days * 86400000).toISOString(),
    })
    .select("id, token, expires_at, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }

  const origin =
    req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "";
  const url = `${origin}/inventory/${data.token}`;

  await sb.from("verkoop_audit").insert({
    dossier_id: dossierId,
    actor: `staff:${staff.phone_e164}`,
    action: "inventory_link_created",
    meta: { inventory_link_id: data.id, token_prefix: token.slice(0, 8) },
  });

  let emailSent = false;
  let emailError: string | null = null;

  if (resend && MAIL_FROM) {
    const lang = dossier.taal === "en" ? "en" : "nl";
    const address = [dossier.straat, dossier.postcode, dossier.woonplaats]
      .filter(Boolean)
      .join(", ");

    const mail = inventoryRequestEmail({
      lang,
      recipient_name: dossier.naam || "",
      object_adres: address,
      inventory_url: url,
      valid_days: days,
      custom_message: body.custom_message || undefined,
    });

    try {
      const emailResult = await resend.emails.send({
        from: MAIL_FROM,
        replyTo: dossier.email || undefined,
        to: recipientEmail,
        subject: mail.subject,
        html: mail.html,
      });
      if (emailResult.error) {
        console.error("[send-inventory] Resend returned error", emailResult.error);
        emailError = emailResult.error.message || String(emailResult.error);
      } else {
        emailSent = true;
      }
    } catch (err) {
      console.error("[send-inventory] Resend failed", err);
      emailError = err instanceof Error ? err.message : String(err);
    }

    if (emailSent) {
      await sb.from("verkoop_audit").insert({
        dossier_id: dossierId,
        actor: `staff:${staff.phone_e164}`,
        action: "inventory_link_email_sent",
        meta: { inventory_link_id: data.id, recipient_email: recipientEmail },
      });
    }
  } else {
    emailError = resend ? "MAIL_FROM not configured" : "RESEND_API_KEY not configured";
  }

  return NextResponse.json({
    ok: true,
    id: data.id,
    token: data.token,
    url,
    expires_at: data.expires_at,
    created_at: data.created_at,
    email_sent: emailSent,
    email_error: emailError,
  });
}