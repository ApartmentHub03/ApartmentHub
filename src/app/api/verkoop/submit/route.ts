// app/api/verkoop/submit/route.ts
//
// Finale verzending. Stappen:
//   1. Validate form data + consent
//   2. Save uploaded files to blob storage
//   3. Insert dossier row in Supabase
//   4. Email agent + confirmation to seller via Resend

import { Resend } from "resend";
import { put } from "@vercel/blob";
import {
  sellerConfirmationEmail,
  agentNotificationEmail,
} from "@/app/lib/email-templates";
import { summarizeEnrichment, type AddressEnrichment } from "@/app/lib/public-registers";
import { supabaseAdmin } from "@/app/lib/supabase-admin";

// Prefer the /sell-specific Resend key, falling back to the rental app's
// RESEND_API_KEY so a single key still works.
const resendKey = process.env.VERKOOP_RESEND_API_KEY ?? process.env.RESEND_API_KEY;
const resend = resendKey ? new Resend(resendKey) : null;

const MAIL_FROM = process.env.VERKOOP_MAIL_FROM ?? process.env.MAIL_FROM;
const MAIL_TO_AGENT = process.env.VERKOOP_MAIL_TO_AGENT ?? process.env.MAIL_TO_AGENT;

let supabase: ReturnType<typeof supabaseAdmin> | null = null;
try {
  supabase = supabaseAdmin();
} catch {
  supabase = null;
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const lang = (fd.get("lang") as string) === "en" ? "en" : "nl";

    // 1. Validatie
    if (fd.get("consent") !== "1") {
      return Response.json(
        { error: "consent_required", message: "Privacy consent missing" },
        { status: 400 }
      );
    }

    // 2. Plat veld-overzicht
    const fields: Record<string, string> = {};
    for (const [k, v] of fd.entries()) {
      if (typeof v === "string" && !k.startsWith("file_")) {
        fields[k] = v;
      }
    }

    // 3. Files uploaden naar blob storage
    const filesByDoc: Record<string, { url: string; name: string; size: number }[]> = {};
    for (const [k, v] of fd.entries()) {
      if (k.startsWith("file_") && v instanceof File && v.size > 0) {
        const docKey = k.slice("file_".length);
        const blobPath = `verkoop/${Date.now()}-${docKey}-${v.name}`;
        try {
          const blob = await put(blobPath, v, {
            access: "public",
            addRandomSuffix: true,
            // Vercel Blob's `put()` reads BLOB_READ_WRITE_TOKEN from env by
            // default. We prefix the verkoop key with VERKOOP_ so it doesn't
            // collide with anything the rental app might add later — pass it
            // explicitly so the lookup works regardless.
            token:
              process.env.VERKOOP_BLOB_READ_WRITE_TOKEN ??
              process.env.BLOB_READ_WRITE_TOKEN,
          });
          (filesByDoc[docKey] ||= []).push({ url: blob.url, name: v.name, size: v.size });
        } catch (e) {
          console.error("[submit] blob put failed", e);
        }
      }
    }

    // 4. Insert dossier
    let dossierId: string | null = null;
    const extraction = fields.extraction ? safeParse(fields.extraction) : null;
    const leadId = fields.lead_id || null;
    const woonplaats =
      extraction?.enrichment?.validatedAddress?.woonplaats ?? null;
    if (supabase) {
      const { data: dossier, error } = await supabase
        .from("verkoop_dossiers")
        .insert({
          lead_id: leadId,
          straat: fields.straat,
          postcode: fields.postcode,
          woonplaats,
          naam: fields.naam,
          email: fields.email,
          telefoon: fields.tel,
          taal: lang,
          vraagprijs: fields.vraagprijs
            ? parseFloat(fields.vraagprijs.replace(/[^0-9.]/g, "")) || null
            : null,
          oplev_datum: fields.oplev,
          motivatie: fields.motivatie,
          gebreken_toel: fields["lek-toel"],
          vve_sfeer: fields["vve-sfeer"],
          verbouw_toel: fields["verbouw-toel"],
          antwoorden: collectAnswers(fd),
          ai_summary: extraction?.summary ?? null,
          ai_prefilled: extraction?.prefilled ?? null,
          ai_skipped: extraction?.skipQuestions ?? null,
          enrichment: extraction?.enrichment ?? null,
          consent: true,
          consent_at: new Date().toISOString(),
          // BW 3:15a digital signature — typed name is legally binding,
          // canvas drawing is optional (stored as a base64 PNG data URL).
          // `signed_ip` comes from the request header so the audit trail
          // captures where the acceptance came from.
          signature_name: fields.signature_name || null,
          signature_image: fields.signature_image || null,
          signed_at: fields.signed_at || new Date().toISOString(),
          signed_ip:
            req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
            req.headers.get("x-real-ip") ||
            null,
        })
        .select("id")
        .single();
      if (!error && dossier) {
        dossierId = dossier.id;
        for (const [docKey, files] of Object.entries(filesByDoc)) {
          for (const f of files) {
            await supabase.from("verkoop_files").insert({
              dossier_id: dossierId,
              doc_key: docKey,
              filename: f.name,
              size_bytes: f.size,
              blob_url: f.url,
            });
          }
        }
      } else if (error) {
        console.error("[submit] dossier insert failed", error);
      }
    }

    // 5. Mail
    if (resend && MAIL_FROM) {
      const adres = `${fields.straat ?? ""}, ${fields.postcode ?? ""}`;

      if (MAIL_TO_AGENT) {
        // Only include the admin CTA if the admin URL is explicitly
        // configured. Avoids mailing a broken link before the admin
        // view is built.
        const dossierUrl =
          dossierId && process.env.ADMIN_URL_BASE
            ? `${process.env.ADMIN_URL_BASE.replace(/\/+$/, "")}/dossiers/${dossierId}`
            : undefined;
        // The intake step returns `summary` as a sibling of `enrichment`,
        // not nested. We recompute it here from the enrichment object so
        // the agent email always shows the same lines the seller sees.
        const enrichmentSummary = extraction?.enrichment
          ? summarizeEnrichment(
              extraction.enrichment as AddressEnrichment,
              lang as "nl" | "en",
            )
          : undefined;
        const agentMail = agentNotificationEmail({
          lang: lang as "nl" | "en",
          fields,
          filesByDoc,
          aiSummary: extraction?.summary,
          enrichmentSummary,
          dossierUrl,
        });
        try {
          await resend.emails.send({
            from: MAIL_FROM,
            to: MAIL_TO_AGENT,
            subject: agentMail.subject,
            html: agentMail.html,
          });
        } catch (e) {
          console.error("[submit] agent mail failed", e);
        }
      }

      if (fields.email) {
        const sellerMail = sellerConfirmationEmail(lang as "nl" | "en", {
          naam: fields.naam,
          adres,
          vraagprijs: fields.vraagprijs,
        });
        try {
          await resend.emails.send({
            from: MAIL_FROM,
            to: fields.email,
            subject: sellerMail.subject,
            html: sellerMail.html,
          });
        } catch (e) {
          console.error("[submit] seller mail failed", e);
        }
      }
    }

    return Response.json({ ok: true, dossierId });
  } catch (err) {
    console.error("[submit] error", err);
    return Response.json(
      { error: "submit_failed", message: String(err) },
      { status: 500 }
    );
  }
}

function safeParse(s: string) {
  try { return JSON.parse(s); } catch { return null; }
}

function collectAnswers(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("file_")) continue;
    if (typeof v !== "string") continue;
    if (k in out) {
      if (!Array.isArray(out[k])) out[k] = [out[k]];
      (out[k] as string[]).push(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
