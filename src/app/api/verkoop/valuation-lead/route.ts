// app/api/verkoop/valuation-lead/route.ts
//
// Sell-lead valuation form submission. Creates a row in both:
//   1. valuation_leads (flat lead record)
//   2. verkoop_dossiers (dashboard-selling entry, status = in_progress)
//
// Uses supabaseAdmin (service role) so RLS on verkoop_dossiers is bypassed
// without needing an anon INSERT policy. Errors are logged but non-blocking
// (fail silently) — the user still sees their valuation result regardless.

import { Resend } from "resend";
import { valuationConfirmationEmail } from "@/app/lib/email-templates";
import { supabaseAdmin } from "@/app/lib/supabase-admin";

const resendKey = process.env.VERKOOP_RESEND_API_KEY ?? process.env.RESEND_API_KEY;
const resend = resendKey ? new Resend(resendKey) : null;

const MAIL_FROM = process.env.VERKOOP_MAIL_FROM ?? process.env.MAIL_FROM;

let supabase: ReturnType<typeof supabaseAdmin> | null = null;
try {
  supabase = supabaseAdmin();
} catch {
  supabase = null;
}

function formatEUR(n: number | null): string {
  if (n == null) return "—";
  return "€ " + n.toLocaleString("nl-NL", { maximumFractionDigits: 0 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const address = String(body.adres ?? "");
    const postcode = String(body.postcode ?? "");
    const city = String(body.stad ?? "");
    const neighborhood = String(body.wijk ?? "");
    const surface_area = Number(body.oppervlakte) || 0;
    const property_type = String(body.type ?? "");
    const construction_period = String(body.bouwperiode ?? "");
    const condition = String(body.staat ?? "");
    const energy_label = String(body.energielabel ?? "");
    const outdoor_space = String(body.buitenruimte ?? "");
    const parking = String(body.parkeren ?? "");
    const souterrain = String(body.souterrain ?? "");
    const first_name = String(body.voornaam ?? "");
    const last_name = String(body.achternaam ?? "");
    const email = String(body.email ?? "");
    const phone = String(body.telefoon ?? "");
    const taal = body.taal === "en" ? "en" : "nl";
    const estimated_value_low = Number(body.geschatte_waarde_laag) || null;
    const estimated_value_high = Number(body.geschatte_waarde_hoog) || null;

    const naam = `${first_name} ${last_name}`.trim();

    if (!address || !naam || !email) {
      return Response.json(
        { ok: false, error: "missing_required_fields" },
        { status: 400 }
      );
    }

    let dossierId: string | null = null;

    if (supabase) {
      // 1. Upsert into valuation_leads (update if phone already exists)
      const { error: leadError } = await supabase
        .from("valuation_leads")
        .upsert({
          address,
          postcode,
          city,
          neighborhood,
          surface_area,
          property_type,
          construction_period,
          condition,
          energy_label,
          outdoor_space,
          parking,
          first_name,
          last_name,
          email,
          phone,
          estimated_value_low,
          estimated_value_high,
        }, { onConflict: "phone" });
      if (leadError) {
        console.warn("[valuation-lead] valuation_leads insert failed:", leadError);
      }

      // 2. Check for existing dossier by phone, if found return it (no update)
      const { data: existingDossier } = await supabase
        .from("verkoop_dossiers")
        .select("id")
        .eq("telefoon", phone)
        .maybeSingle();

      if (existingDossier) {
        dossierId = existingDossier.id;
        console.log("[valuation-lead] Existing dossier found for phone:", dossierId);
      } else {
        // Insert new dossier
        const { data: dossier, error: dossierError } = await supabase
          .from("verkoop_dossiers")
          .insert({
            straat: address,
            postcode,
            woonplaats: city,
            naam,
            email,
            telefoon: phone,
            taal,
            antwoorden: {
              wijk: neighborhood,
              oppervlakte: surface_area,
              type: property_type,
              bouwperiode: construction_period,
              staat: condition,
              energielabel: energy_label,
              buitenruimte: outdoor_space,
              parkeren: parking,
              souterrain,
              geschatte_waarde_laag: estimated_value_low,
              geschatte_waarde_hoog: estimated_value_high,
            },
            status: "in_progress",
            consent: true,
            consent_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (dossierError) {
          console.warn("[valuation-lead] verkoop_dossiers insert failed:", dossierError);
        } else {
          dossierId = dossier?.id ?? null;
        }
      }
    }

    // 3. Send confirmation email via Resend (best-effort, fail silently)
    if (resend && MAIL_FROM) {
      try {
        const { subject, html } = valuationConfirmationEmail(taal, {
          naam,
          adres: address,
          postcode,
          wijk: neighborhood,
          stad: city,
          oppervlakte: String(surface_area),
          valueLow: formatEUR(estimated_value_low),
          valueHigh: formatEUR(estimated_value_high),
        });
        await resend.emails.send({
          from: MAIL_FROM,
          to: email,
          subject,
          html,
        });
      } catch (mailErr) {
        console.warn("[valuation-lead] email send failed (non-blocking):", mailErr);
      }
    }

    return Response.json({ ok: true, dossierId });
  } catch (err) {
    console.error("[valuation-lead] error", err);
    return Response.json({ ok: true, dossierId: null });
  }
}