import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getSession } from "@/app/lib/auth";
import { uploadFile, BUCKET } from "@/app/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Constants stamped onto every signed OTD — ApartmentHub party identity.
const AH_DEFAULTS: Record<string, string> = {
  ah_naam: "ApartmentHub B.V.",
  ah_kvk: "12345678",
  ah_adres: "Herengracht 100",
  ah_postcode: "1015 BS Amsterdam",
  ah_telefoon: "+31 20 123 4567",
  ah_email: "verkoop@apartmenthub.nl",
  ah_btw: "NL123456789B01",
  ah_vertegenwoordiger: "David van Wachem",
};

// Seller-supplied field whitelist. Anything outside this list is ignored
// so we don't accidentally let the client write arbitrary keys into
// otd_data. Mirrors docs/OTD_FIELDS.md in the verkoop reference repo.
const USER_FIELDS = [
  "vk_voornaam", "vk_achternaam", "vk_straat", "vk_postcode_plaats",
  "vk_geboortedatum", "vk_geboorteplaats", "vk_nationaliteit",
  "vk_burgerlijke_staat", "vk_huwelijksgoederen", "vk_bsn",
  "vk_telefoon", "vk_email", "vk_id_type", "vk_id_nummer",
  "vk2_voornaam", "vk2_achternaam", "vk2_geboortedatum",
  "vk2_relatie", "vk2_bsn", "vk2_id_nummer",
  "obj_adres", "obj_postcode_plaats", "obj_type", "obj_bouwjaar",
  "obj_oppervlakte", "obj_eigendom", "obj_erfpacht_einde",
  "obj_erfpacht_canon", "obj_kadaster", "obj_vve_naam",
  "obj_vve_kvk", "obj_lasten",
  "vraagprijs", "opleverdatum", "vraag_kosten",
  "koopovereenkomst_model", "verkoopstrategie",
] as const;

export async function POST(req: NextRequest) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const signedName = String(body.signed_name ?? "").trim();
  if (signedName.length < 3) {
    return NextResponse.json({ error: "missing_signed_name" }, { status: 400 });
  }
  if (body.accepted !== true) {
    return NextResponse.json({ error: "not_accepted" }, { status: 400 });
  }
  const signaturePng = typeof body.signature_png === "string" ? body.signature_png : "";

  const sb = supabaseAdmin();
  const { data: existing } = await sb
    .from("verkoop_dossiers")
    .select("id, otd_signed_at")
    .eq("phone_e164", sess.phone_e164)
    .maybeSingle();
  if (existing?.otd_signed_at) {
    return NextResponse.json({ error: "already_signed" }, { status: 409 });
  }

  const userData: Record<string, string> = {};
  for (const k of USER_FIELDS) {
    const v = body[k];
    if (typeof v === "string" && v.trim()) userData[k] = v.trim();
  }

  const acceptanceCode = randomBytes(4).toString("hex").toUpperCase();
  const signedAt = new Date().toISOString();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "";

  // The PDF template lives at <repo-root>/otd/template.pdf — outside src/
  // so it's not bundled by the webpack pipeline. process.cwd() resolves to
  // the project root both on `next dev` and on Vercel's runtime.
  const templatePath = path.join(process.cwd(), "otd", "template.pdf");
  let templateBytes: Buffer;
  try {
    templateBytes = await fs.readFile(templatePath);
  } catch (err) {
    console.error("[otd/sign] template not found at", templatePath, err);
    return NextResponse.json({ error: "template_missing" }, { status: 500 });
  }

  let signedPdfBytes: Uint8Array;
  try {
    const pdf = await PDFDocument.load(templateBytes);
    const form = pdf.getForm();
    const setField = (name: string, value: string) => {
      try {
        const f = form.getTextField(name);
        f.setText(value);
      } catch {
        // Field absent or not a text field — silent skip.
      }
    };
    for (const [k, v] of Object.entries(AH_DEFAULTS)) setField(k, v);
    for (const [k, v] of Object.entries(userData)) setField(k, v);
    const initials = signedName
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 4);
    for (let i = 1; i <= 14; i++) setField(`paraaf_p${i}`, initials);
    setField("ondertekend_door", signedName);
    setField("aanvaardingscode", acceptanceCode);
    setField("aanvaard_datum", signedAt);
    setField("aanvaard_ip", ip);
    form.flatten();
    signedPdfBytes = await pdf.save();
  } catch (err) {
    console.error("[otd/sign] PDF fill failed", err);
    return NextResponse.json(
      { error: "pdf_fill_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  let dossierId: string;
  if (existing) {
    dossierId = existing.id;
  } else {
    const { data: inserted, error: insErr } = await sb
      .from("verkoop_dossiers")
      .insert({
        phone_e164: sess.phone_e164,
        straat: userData.obj_adres ?? userData.vk_straat ?? "",
        postcode: (userData.obj_postcode_plaats ?? userData.vk_postcode_plaats ?? "").slice(0, 12),
        naam: `${userData.vk_voornaam ?? ""} ${userData.vk_achternaam ?? ""}`.trim(),
        email: userData.vk_email ?? "",
        telefoon: userData.vk_telefoon ?? null,
        taal: req.headers.get("referer")?.includes("/selling") ? "en" : "nl",
        last_activity_at: signedAt,
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      return NextResponse.json(
        { error: "dossier_create_failed", detail: insErr?.message },
        { status: 500 }
      );
    }
    dossierId = inserted.id;
    await sb.from("verkoop_audit").insert({
      dossier_id: dossierId,
      actor: `seller:${sess.phone_e164}`,
      action: "dossier_created",
      meta: { source: "otd_sign" },
    });
  }

  // Save the signed PDF to storage. The staff ZIP download auto-includes
  // everything under <dossier>/_signed/.
  const signedPath = `${dossierId}/_signed/otd.pdf`;
  try {
    await sb.storage.from(BUCKET).remove([signedPath]).catch(() => {});
    await uploadFile({
      path: signedPath,
      contents: signedPdfBytes,
      contentType: "application/pdf",
    });
  } catch (err) {
    console.error("[otd/sign] storage upload failed", err);
    return NextResponse.json(
      { error: "storage_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  await sb
    .from("verkoop_dossiers")
    .update({
      otd_data: userData,
      otd_signed_at: signedAt,
      otd_signed_name: signedName,
      otd_signed_ip: ip || null,
      otd_acceptance_code: acceptanceCode,
      otd_signature_png: signaturePng || null,
      last_activity_at: signedAt,
    })
    .eq("id", dossierId);

  await sb.from("verkoop_audit").insert({
    dossier_id: dossierId,
    actor: `seller:${sess.phone_e164}`,
    action: "otd_signed",
    meta: { acceptance_code: acceptanceCode, name: signedName, ip },
  });

  return NextResponse.json({
    ok: true,
    dossier_id: dossierId,
    acceptance_code: acceptanceCode,
    signed_at: signedAt,
    pdf_path: signedPath,
  });
}
