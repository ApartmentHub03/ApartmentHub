// app/api/verkoop/intake/route.ts
//
// Stap 1 lead-capture. Pakt het adres en haalt direct alle openbare
// register-data op (BAG, energielabel, monument, etc) zodat stap 4 al
// pre-fill data heeft, ook voor sellers die geen documenten uploaden.

import { enrichAddress, summarizeEnrichment } from "@/app/lib/public-registers";
import { supabaseAdmin } from "@/app/lib/supabase-admin";

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
    const lead = {
      straat: String(fd.get("straat") ?? ""),
      postcode: String(fd.get("postcode") ?? ""),
      naam: String(fd.get("naam") ?? ""),
      email: String(fd.get("email") ?? ""),
      tel: String(fd.get("tel") ?? ""),
      moment: String(fd.get("moment") ?? ""),
      lang,
      receivedAt: new Date().toISOString(),
    };

    // Enrichment: haal direct openbare data op voor dit adres. Doen we
    // eerst zodat we het BAG-id mee kunnen schrijven met de lead row.
    const enrichment = await enrichAddress(lead.straat, lead.postcode);
    const summary = summarizeEnrichment(enrichment, lang);

    // Persist (best effort). Returns the lead id so the front-end can
    // include it in the final submit, linking lead -> dossier.
    let leadId: string | null = null;
    if (supabase) {
      const { data, error } = await supabase
        .from("verkoop_leads")
        .insert({
          adres: `${lead.straat}, ${lead.postcode}`,
          naam: lead.naam,
          email: lead.email,
          telefoon: lead.tel,
          beste_moment: lead.moment,
          taal: lead.lang,
          bag_id: enrichment.validatedAddress?.bagId ?? null,
        })
        .select("id")
        .single();
      if (error) console.error("[intake] lead insert failed", error);
      else leadId = data?.id ?? null;
    }

    return Response.json({
      ok: true,
      leadId,
      enrichment,
      summary,
    });
  } catch (err) {
    console.error("[intake] error", err);
    return Response.json({ ok: true, leadId: null, enrichment: null, summary: [] });
  }
}
