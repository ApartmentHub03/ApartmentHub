import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { Resend } from "resend";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getSession } from "@/app/lib/auth";
import { DOC_DESCRIPTIONS, DOC_KEYS } from "@/app/lib/doc-descriptions";
import { documentRequestEmail } from "@/app/lib/email-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resendKey = process.env.VERKOOP_RESEND_API_KEY ?? process.env.RESEND_API_KEY;
const resend = resendKey ? new Resend(resendKey) : null;
const MAIL_FROM = process.env.VERKOOP_MAIL_FROM ?? process.env.MAIL_FROM;

export async function POST(req: NextRequest) {
  const sess = await getSession();
  if (!sess) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { vve_email?: string; vve_name?: string; doc_keys?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const vveEmail = (body.vve_email || "").trim();
  const vveName = (body.vve_name || "").trim();
  if (!vveEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(vveEmail)) {
    return NextResponse.json({ error: "invalid_vve_email" }, { status: 400 });
  }

  // Validate doc_keys: must be non-empty array, each must be a known DOC_KEY
  const rawDocKeys = Array.isArray(body.doc_keys) ? body.doc_keys : [];
  const docKeys = rawDocKeys.filter((k) => DOC_KEYS.includes(k));
  if (docKeys.length === 0) {
    return NextResponse.json({ error: "no_doc_keys_selected" }, { status: 400 });
  }

  const sb = supabaseAdmin();

  // Get dossier by authenticated seller phone
  const { data: dossier, error: dErr } = await sb
    .from("verkoop_dossiers")
    .select("id, naam, email, straat, postcode, woonplaats, taal, ai_prefilled")
    .eq("phone_e164", sess.phone_e164)
    .maybeSingle();

  if (dErr || !dossier) {
    return NextResponse.json({ error: "dossier_not_found" }, { status: 404 });
  }

  const lang = dossier.taal === "en" ? "en" : "nl";
  const sellerName = dossier.naam || "";
  const sellerEmail = dossier.email || "";
  const address = [dossier.straat, dossier.postcode, dossier.woonplaats]
    .filter(Boolean)
    .join(", ");

  const docLabels = docKeys.map((key) => {
    const desc = DOC_DESCRIPTIONS[key];
    return lang === "en" ? (desc?.en ?? key) : (desc?.nl ?? key);
  });

  // Create magic link with only the selected docs
  const token = randomBytes(24).toString("base64url");
  const { data: ml, error: mlErr } = await sb
    .from("verkoop_magic_links")
    .insert({
      dossier_id: dossier.id,
      token,
      role: "vve",
      allowed_actions: ["upload"],
      required_documents: docKeys,
      recipient_email: vveEmail,
      recipient_name: vveName || null,
      created_by: `seller:${sess.phone_e164}`,
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    })
    .select("id, token, expires_at")
    .single();

  if (mlErr) {
    return NextResponse.json(
      { error: "db_error", detail: mlErr.message },
      { status: 500 }
    );
  }

  const origin =
    req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "";
  const url = `${origin}/upload/${token}`;

  // Persist VvE contact into ai_prefilled so the dashboard shows it
  const aiPrefilled =
    (dossier.ai_prefilled as Record<string, unknown> | null) || {};
  const newPrefilled = {
    ...aiPrefilled,
    vve_email: vveEmail,
    vve_beheerder: vveName || aiPrefilled.vve_beheerder || null,
  };
  await sb
    .from("verkoop_dossiers")
    .update({ ai_prefilled: newPrefilled })
    .eq("id", dossier.id);

  // Audit: magic link created by seller
  await sb.from("verkoop_audit").insert({
    dossier_id: dossier.id,
    actor: `seller:${sess.phone_e164}`,
    action: "vve_request_sent_by_seller",
    meta: {
      magic_link_id: ml.id,
      recipient_email: vveEmail,
      recipient_name: vveName,
      docs: docKeys,
    },
  });

  // Send email via Resend with Reply-To set to seller
  let emailSent = false;
  let emailError: string | null = null;
  if (resend && MAIL_FROM) {
    const mail = documentRequestEmail({
      lang,
      role: "vve",
      recipient_name: vveName || "VvE-beheerder",
      object_adres: address,
      required_documents: docLabels,
      upload_url: url,
      valid_days: 30,
      seller_name: sellerName || undefined,
    });

    try {
      const emailResult = await resend.emails.send({
        from: MAIL_FROM,
        replyTo: sellerEmail || undefined,
        to: vveEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
      if (emailResult.error) {
        console.error("[request-vve] Resend error", emailResult.error);
        emailError =
          emailResult.error.message || String(emailResult.error);
      } else {
        emailSent = true;
      }
    } catch (err) {
      console.error("[request-vve] Resend failed", err);
      emailError = err instanceof Error ? err.message : String(err);
    }

    if (emailSent) {
      await sb.from("verkoop_audit").insert({
        dossier_id: dossier.id,
        actor: `seller:${sess.phone_e164}`,
        action: "vve_request_email_sent",
        meta: { magic_link_id: ml.id, recipient_email: vveEmail },
      });
    }
  } else {
    emailError = resend
      ? "MAIL_FROM not configured"
      : "RESEND_API_KEY not configured";
  }

  return NextResponse.json({
    ok: true,
    magic_link_id: ml.id,
    token,
    url,
    email_sent: emailSent,
    email_error: emailError,
  });
}
