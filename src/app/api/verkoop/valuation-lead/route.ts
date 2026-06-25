import { Resend } from "resend";
import { valuationConfirmationEmail } from "@/app/lib/email-templates";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { createClient } from "@supabase/supabase-js";

const resendKey = process.env.VERKOOP_RESEND_API_KEY ?? process.env.RESEND_API_KEY;
const resend = resendKey ? new Resend(resendKey) : null;

const MAIL_FROM = process.env.VERKOOP_MAIL_FROM ?? process.env.MAIL_FROM;

const ANON_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

function getAnonClient() {
  return createClient(ANON_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
        { status: 400 },
      );
    }

    let dossierId: string | null = null;

    const admin = supabaseAdmin();

    // 1. Insert into valuation_leads using anon client (respects RLS: public can
    //    INSERT, but not UPDATE/DELETE). Duplicates on phone are silently ignored.
    try {
      const anon = getAnonClient();
      const { error: leadError } = await anon
        .from("valuation_leads")
        .insert({
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
          souterrain,
          first_name,
          last_name,
          email,
          phone,
          estimated_value_low,
          estimated_value_high,
        });
      if (leadError) {
        // Duplicate key (23505) means phone already exists — silently ignore
        if (!leadError.message?.includes("23505") && !leadError.message?.includes("duplicate")) {
          console.warn("[valuation-lead] valuation_leads insert failed:", leadError);
        }
      }
    } catch (leadErr) {
      console.warn("[valuation-lead] valuation_leads insert failed (non-blocking):", leadErr);
    }

    // 2. Check for existing dossier by phone_e164 (unique index), if found skip insert
    try {
      const { data: existingDossier } = await admin
        .from("verkoop_dossiers")
        .select("id")
        .eq("phone_e164", phone)
        .maybeSingle();

      if (existingDossier) {
        dossierId = existingDossier.id;
      } else {
        const { data: dossier, error: dossierError } = await admin
          .from("verkoop_dossiers")
          .insert({
            straat: address,
            postcode: postcode || "Onbekend",
            woonplaats: city,
            naam,
            email,
            telefoon: phone,
            phone_e164: phone,
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
    } catch (dossierErr) {
      console.warn("[valuation-lead] verkoop_dossiers operation failed (non-blocking):", dossierErr);
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