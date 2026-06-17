import type { DossierLike } from "./contract-generator";

function nameParts(full: string | null | undefined): { first: string; last: string } {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function v(s: string | null | undefined): string {
  return s && s.trim() ? s.trim() : "";
}

function f(r: Record<string, unknown>, key: string): string | null {
  const val = r[key];
  return typeof val === "string" ? val : null;
}

export function buildFieldMap(d: DossierLike, lang: string = "nl"): Record<string, string> {
  const { first, last } = nameParts(d.naam);
  const phone = d.telefoon?.trim() || d.phone_e164?.trim() || "";
  const dateLocale = lang === "en" ? "en-GB" : "nl-NL";
  const idType = lang === "en" ? "Passport" : "Paspoort";

  const raw = d as Record<string, unknown>;
  const payload = raw.payload ?? {};
  const p = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {} as Record<string, unknown>;
  const ai = raw.ai_prefilled ?? {};
  const a = typeof ai === "object" && ai !== null ? ai as Record<string, unknown> : {} as Record<string, unknown>;

  const vk2 = raw.mede_eigenaar ?? {};
  const co = typeof vk2 === "object" && vk2 !== null ? vk2 as Record<string, unknown> : {} as Record<string, unknown>;

  const otdData = raw.otd_data ?? {};
  const otd = typeof otdData === "object" && otdData !== null ? otdData as Record<string, unknown> : {} as Record<string, unknown>;

  const obj = raw.object ?? {};
  const o = typeof obj === "object" && obj !== null ? obj as Record<string, unknown> : {} as Record<string, unknown>;

  return {
    vk_voornaam: v(first || f(otd, "voornaam") || f(p, "voornaam")),
    vk_achternaam: v(last || f(otd, "achternaam") || f(p, "achternaam")),
    vk_straat: v(d.straat || f(otd, "straat") || f(p, "straat")),
    vk_postcode_plaats: v(d.postcode || f(otd, "postcode_plaats") || f(p, "postcode_plaats")),
    vk_geboortedatum: v(f(otd, "geboortedatum") || f(p, "geboortedatum") || f(a, "geboortedatum")),
    vk_geboorteplaats: v(f(otd, "geboorteplaats") || f(p, "geboorteplaats") || f(a, "geboorteplaats")),
    vk_nationaliteit: v(f(otd, "nationaliteit") || f(p, "nationaliteit")),
    vk_burgerlijke_staat: v(f(otd, "burgerlijke_staat") || f(p, "burgerlijke_staat")),
    vk_huwelijksgoederen: v(f(otd, "huwelijksgoederen") || f(p, "huwelijksgoederen")),
    vk_bsn: v(f(otd, "bsn") || f(p, "bsn")),
    vk_telefoon: v(phone),
    vk_email: v(d.email),
    vk_id_type: idType,
    vk_id_nummer: v(f(otd, "bsn") || f(p, "bsn") || f(a, "bsn")),

    vk2_voornaam: v(f(co, "voornaam")),
    vk2_achternaam: v(f(co, "achternaam")),
    vk2_geboortedatum: v(f(co, "geboortedatum")),
    vk2_relatie: v(f(co, "relatie")),
    vk2_bsn: v(f(co, "bsn")),
    vk2_id_nummer: v(f(co, "bsn")),

    obj_adres: v(d.straat || f(o, "adres") || f(otd, "obj_adres")),
    obj_postcode_plaats: v(d.postcode || f(o, "postcode_plaats") || f(otd, "obj_postcode_plaats")),
    obj_type: v(f(o, "type") || f(otd, "obj_type")),
    obj_bouwjaar: v(f(o, "bouwjaar") || f(a, "bouwjaar") || f(otd, "obj_bouwjaar")),
    obj_oppervlakte: v(f(o, "oppervlakte") || f(a, "oppervlakte") || f(otd, "obj_oppervlakte")),
    obj_eigendom: v(f(o, "eigendom") || f(otd, "obj_eigendom")),
    obj_erfpacht_einde: v(f(o, "erfpacht_einde") || f(otd, "obj_erfpacht_einde")),
    obj_erfpacht_canon: v(f(o, "erfpacht_canon") || f(otd, "obj_erfpacht_canon")),
    obj_kadaster: v(f(o, "kadaster") || f(otd, "obj_kadaster")),
    obj_vve_naam: v(f(a, "vve_naam") || f(otd, "obj_vve_naam")),
    obj_vve_kvk: v(f(a, "vve_kvk") || f(otd, "obj_vve_kvk")),
    obj_lasten: v(f(o, "lasten") || f(otd, "obj_lasten")),

    vraagprijs: v(f(otd, "vraagprijs")),
    opleverdatum: v(f(otd, "opleverdatum")),
    vraag_kosten: v(f(otd, "vraag_kosten")),
    koopovereenkomst_model: v(f(otd, "koopovereenkomst_model")),
    verkoopstrategie: v(f(otd, "verkoopstrategie")),

    ondertekend_door: v(
      raw.otd_signed_name as string | null ??
      raw.signature_name as string | null ??
      d.naam
    ),
    aanvaardingscode: v(raw.otd_acceptance_code as string | null),
    aanvaard_datum: v(
      raw.otd_signed_at as string | null
        ? new Date(raw.otd_signed_at as string).toLocaleString(dateLocale)
        : raw.signed_at as string | null
          ? new Date(raw.signed_at as string).toLocaleString(dateLocale)
          : ""
    ),
    aanvaard_ip: v(raw.otd_signed_ip as string | null ?? raw.signed_ip as string | null),
  };
}