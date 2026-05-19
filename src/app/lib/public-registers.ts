/**
 * Public registers helper. Fetcht openbare data over een adres uit
 * Nederlandse open registries. Geen API-key nodig voor de meeste
 * functies. Per call faalt graceful (returns null) zodat een trage
 * register de hele intake niet blokkeert.
 *
 * Gebruik:
 *   const data = await enrichAddress("Prinsengracht 263", "1016 GV Amsterdam");
 *
 * Bronnen:
 *   - PDOK Locatieserver. https://api.pdok.nl/bzk/locatieserver/search/v3_1
 *   - Cultureel Erfgoed monumenten. https://monumentenregister.cultureelerfgoed.nl
 *   - EP-Online energielabel. https://www.ep-online.nl (vereist API-key)
 *   - WOZ-waardeloket. https://www.wozwaardeloket.nl (geen open API, scrapen)
 *   - Kadaster BAG. https://api.pdok.nl/lv/bag/ogc/v1 (bouwjaar/oppervlakte)
 */

export type AddressEnrichment = {
  // Validated address from BAG
  validatedAddress: {
    straat: string;
    huisnummer: number;
    huisletter?: string;
    huistoevoeging?: string;
    postcode: string;
    woonplaats: string;
    buurt?: string;
    wijk?: string;
    gemeente: string;
    provincie: string;
    coordinates: { lat: number; lng: number };
    bagId: string;             // adresseerbaarobject_id
    nummeraanduidingId: string;
  } | null;

  bouwjaar?: number | null;
  oppervlakte?: number | null;
  energielabel?: { klasse: string; geldigTot: string; registratiedatum?: string } | null;
  monument?: { type: "rijksmonument" | "gemeente" | "stadsgezicht"; nummer?: string } | null;
  wozWaarde?: { jaar: number; bedrag: number } | null;

  // Diagnostic
  errors: string[];
};

const TIMEOUT_MS = 4000;

async function fetchWithTimeout(url: string, init?: RequestInit, ms = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* ====================================================================
 * 1. PDOK Locatieserver. Adres-validatie + geocoding + buurt/wijk.
 *    Volledig gratis, geen key.
 * ==================================================================== */
export async function lookupBagAddress(
  street: string,
  postcodeCity: string
): Promise<AddressEnrichment["validatedAddress"]> {
  const q = `${street} ${postcodeCity}`.trim();
  const url =
    "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free" +
    "?q=" + encodeURIComponent(q) +
    "&fq=type:adres" +
    "&fl=id,bron,straatnaam,huisnummer,huis_nlt,postcode,woonplaatsnaam," +
    "buurtnaam,wijknaam,gemeentenaam,provincienaam,centroide_ll," +
    "adresseerbaarobject_id,nummeraanduiding_id,score" +
    "&rows=1";
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const data = await res.json();
    const doc = data?.response?.docs?.[0];
    if (!doc) return null;
    // PDOK does fuzzy matching and ALWAYS returns a result. A real
    // Amsterdam street typically scores ~20+; bogus input scores <10.
    // Reject low-confidence matches so a typo doesn't get silently
    // confirmed against a random address on the other side of the country.
    if ((doc.score ?? 0) < 10) return null;
    // parse "POINT(4.88 52.37)"
    const m = String(doc.centroide_ll || "").match(/POINT\(([\d.\-]+)\s+([\d.\-]+)\)/);
    return {
      straat: doc.straatnaam,
      huisnummer: doc.huisnummer,
      huisletter: undefined,
      huistoevoeging: undefined,
      postcode: doc.postcode,
      woonplaats: doc.woonplaatsnaam,
      buurt: doc.buurtnaam,
      wijk: doc.wijknaam,
      gemeente: doc.gemeentenaam,
      provincie: doc.provincienaam,
      coordinates: m
        ? { lng: parseFloat(m[1]), lat: parseFloat(m[2]) }
        : { lng: 0, lat: 0 },
      bagId: doc.adresseerbaarobject_id,
      nummeraanduidingId: doc.nummeraanduiding_id,
    };
  } catch {
    return null;
  }
}

/* ====================================================================
 * 2. Bouwjaar + oppervlakte via BAG WFS.
 *    Filter the verblijfsobject by adresseerbaarobject_id (which the
 *    locatieserver gives us as `bagId`). The verblijfsobject schema
 *    has both fields directly:
 *      - bouwjaar    (year the underlying pand was built)
 *      - oppervlakte (m² of the apartment unit itself)
 *
 *    Tested against multiple Amsterdam addresses; consistently returns
 *    sensible values. Free, no API key.
 * ==================================================================== */
export async function lookupBuildingDetails(
  bagId: string
): Promise<{ bouwjaar: number | null; oppervlakte: number | null }> {
  if (!bagId) return { bouwjaar: null, oppervlakte: null };
  const filter =
    `<Filter><PropertyIsEqualTo>` +
    `<PropertyName>identificatie</PropertyName>` +
    `<Literal>${bagId}</Literal>` +
    `</PropertyIsEqualTo></Filter>`;
  const url =
    "https://service.pdok.nl/lv/bag/wfs/v2_0" +
    "?service=WFS&version=2.0.0&request=GetFeature" +
    "&typeNames=bag:verblijfsobject" +
    "&outputFormat=application/json" +
    "&count=1" +
    "&filter=" + encodeURIComponent(filter);
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return { bouwjaar: null, oppervlakte: null };
    const data = await res.json();
    const props = data?.features?.[0]?.properties;
    if (!props) return { bouwjaar: null, oppervlakte: null };
    const bouwjaar =
      typeof props.bouwjaar === "number" && props.bouwjaar > 1000
        ? props.bouwjaar
        : null;
    const oppervlakte =
      typeof props.oppervlakte === "number" && props.oppervlakte > 0
        ? props.oppervlakte
        : null;
    return { bouwjaar, oppervlakte };
  } catch {
    return { bouwjaar: null, oppervlakte: null };
  }
}

/* ====================================================================
 * 3. EP-Online energielabel.
 *    Vereist API-key (gratis aan te vragen via https://www.ep-online.nl).
 *    Set process.env.EP_ONLINE_API_KEY om te activeren.
 * ==================================================================== */
export async function lookupEnergyLabel(
  postcode: string,
  huisnummer: number,
  huisletter?: string
): Promise<AddressEnrichment["energielabel"]> {
  const apiKey = process.env.EP_ONLINE_API_KEY;
  if (!apiKey) return null; // graceful: geen key, geen label
  const pc = postcode.replace(/\s+/g, "");
  const url =
    "https://public.ep-online.nl/api/v5/PandEnergielabel/Adres" +
    "?postcode=" + encodeURIComponent(pc) +
    "&huisnummer=" + huisnummer +
    (huisletter ? "&huisletter=" + encodeURIComponent(huisletter) : "");
  try {
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: apiKey, Accept: "application/json" }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : data;
    if (!first || !first.energieklasse) return null;
    return {
      klasse: first.energieklasse,
      geldigTot: first.geldig_tot ?? "",
      registratiedatum: first.registratiedatum,
    };
  } catch {
    return null;
  }
}

/* ====================================================================
 * 4. Monumentenstatus (Rijksdienst Cultureel Erfgoed).
 *    DEFERRED. No clean free endpoint as of 2026-05.
 *    - The old REST API at monumentenregister.cultureelerfgoed.nl/api/v1
 *      returns 404 (Drupal "Pagina niet gevonden").
 *    - The SPARQL endpoint at api.linkeddata.cultureelerfgoed.nl is alive
 *      but doesn't expose a documented BAG cross-reference; navigating
 *      `heeftBasisregistratieRelatie -> heeftBAGRelatie` returns nothing
 *      for known monuments.
 *    - PDOK service.pdok.nl/cultureelerfgoed/* paths are 404.
 *    Practical alternatives, when prioritised:
 *    a) Download the open CSV at https://data.cultureelerfgoed.nl/
 *       once at deploy and lookup locally (heaviest but reliable).
 *    b) Scrape monumentenregister.cultureelerfgoed.nl/zoeken HTML
 *       (fragile but works in a pinch).
 *    Until then: monument is rare (~5% of Amsterdam panden) and the
 *    seller fills it in step 4.
 * ==================================================================== */
export async function lookupMonument(
  _postcode: string,
  _huisnummer: number
): Promise<AddressEnrichment["monument"]> {
  return null;
}

/* ====================================================================
 * 5. WOZ-waarde.
 *    Geen officiele open API. Opties:
 *    - wozdata.eu (commercieel)
 *    - omnizoek.nl (commercieel)
 *    - scrapen wozwaardeloket.nl (juridisch grijs gebied)
 *
 *    Voor MVP: laat verkoper zelf invullen, of toon link naar
 *    wozwaardeloket.nl in de portal (al geimplementeerd).
 * ==================================================================== */
export async function lookupWoz(
  _postcode: string,
  _huisnummer: number
): Promise<AddressEnrichment["wozWaarde"]> {
  // DEFERRED. No free open API. Options when prioritised:
  // - Paid wrapper: wozdata.eu, omnizoek.nl (~€0.05 per query)
  // - Scrape wozwaardeloket.nl (juridisch grijs)
  // - Use seller's WOZ-aanslag if they upload it (out of scope of this fn)
  return null;
}

/* ====================================================================
 * 6. Bodeminformatie (RIVM Bodemloket).
 *    DEFERRED. bodemloket.nl publishes data via Atlas Leefomgeving
 *    but the WFS/WMS endpoints that used to be at
 *    services.bodemloket.nl and service.pdok.nl/rivm/bodemloket are
 *    currently 404 / unreachable. The user-facing map at
 *    https://www.bodemloket.nl works via internal POST endpoints we
 *    can't reliably depend on. Document for follow-up; for now show
 *    the seller a link in step 2 (already in the portal).
 * ==================================================================== */
export async function lookupBodem(
  _coordinates: { lat: number; lng: number }
): Promise<null> {
  return null;
}

/* ====================================================================
 * 7. Erfpacht (Amsterdam).
 *    DEFERRED. Amsterdam exposes a WMS at
 *    map.data.amsterdam.nl/maps/erfpacht but layer discovery is opaque
 *    and the GetFeatureInfo endpoint requires layer-specific knowledge
 *    the public catalog doesn't expose cleanly. The seller will tell
 *    us directly in step 4 (radio: voortdurend / eeuwigdurend / vol
 *    eigendom). Once Amsterdam ships a documented JSON API for
 *    perceel-erfpacht we can wire it up.
 * ==================================================================== */
export async function lookupErfpacht(
  _coordinates: { lat: number; lng: number }
): Promise<null> {
  return null;
}

/* ====================================================================
 * Master enrichment. Roept alle hierboven parallel aan en aggregeert.
 * ==================================================================== */
export async function enrichAddress(
  street: string,
  postcodeCity: string
): Promise<AddressEnrichment> {
  const errors: string[] = [];
  const validatedAddress = await lookupBagAddress(street, postcodeCity);

  if (!validatedAddress) {
    return {
      validatedAddress: null,
      errors: ["Adres niet gevonden in BAG"],
    };
  }

  const [building, energy, monument, woz] = await Promise.allSettled([
    lookupBuildingDetails(validatedAddress.bagId),
    lookupEnergyLabel(validatedAddress.postcode, validatedAddress.huisnummer),
    lookupMonument(validatedAddress.postcode, validatedAddress.huisnummer),
    lookupWoz(validatedAddress.postcode, validatedAddress.huisnummer),
  ]);

  const result: AddressEnrichment = {
    validatedAddress,
    bouwjaar: building.status === "fulfilled" ? building.value.bouwjaar : null,
    oppervlakte: building.status === "fulfilled" ? building.value.oppervlakte : null,
    energielabel: energy.status === "fulfilled" ? energy.value : null,
    monument: monument.status === "fulfilled" ? monument.value : null,
    wozWaarde: woz.status === "fulfilled" ? woz.value : null,
    errors,
  };

  // log soft errors voor debugging
  if (building.status === "rejected") errors.push("BAG building lookup failed");
  if (energy.status === "rejected") errors.push("EP-online lookup failed");
  if (monument.status === "rejected") errors.push("Monument lookup failed");

  return result;
}

/* ====================================================================
 * Format helpers voor de portal "summary" string array.
 * ==================================================================== */
export function summarizeEnrichment(
  data: AddressEnrichment,
  lang: "nl" | "en"
): string[] {
  const lines: string[] = [];
  const va = data.validatedAddress;
  if (va) {
    lines.push(
      lang === "nl"
        ? `Adres bevestigd: ${va.straat} ${va.huisnummer}, ${va.postcode} ${va.woonplaats}`
        : `Address confirmed: ${va.straat} ${va.huisnummer}, ${va.postcode} ${va.woonplaats}`
    );
    if (va.buurt) {
      lines.push(
        lang === "nl"
          ? `Buurt: ${va.buurt}, wijk ${va.wijk ?? "?"}`
          : `Neighbourhood: ${va.buurt}, district ${va.wijk ?? "?"}`
      );
    }
  }
  if (data.bouwjaar) {
    lines.push(
      lang === "nl"
        ? `Bouwjaar: ${data.bouwjaar}`
        : `Year built: ${data.bouwjaar}`
    );
  }
  if (data.oppervlakte) {
    lines.push(
      lang === "nl"
        ? `Oppervlakte (BAG): ${data.oppervlakte} m²`
        : `Floor area (BAG): ${data.oppervlakte} m²`
    );
  }
  if (data.energielabel) {
    lines.push(
      lang === "nl"
        ? `Definitief energielabel ${data.energielabel.klasse}`
        : `Definitive energy label ${data.energielabel.klasse}`
    );
  }
  if (data.monument) {
    lines.push(
      lang === "nl"
        ? `Status: ${data.monument.type === "rijksmonument" ? "Rijksmonument" : "Gemeentelijk monument"} ${data.monument.nummer ?? ""}`
        : `Status: ${data.monument.type === "rijksmonument" ? "National monument" : "Municipal monument"} ${data.monument.nummer ?? ""}`
    );
  }
  if (data.wozWaarde) {
    lines.push(
      lang === "nl"
        ? `WOZ-waarde ${data.wozWaarde.jaar}: € ${data.wozWaarde.bedrag.toLocaleString("nl-NL")}`
        : `WOZ value ${data.wozWaarde.jaar}: € ${data.wozWaarde.bedrag.toLocaleString("en-US")}`
    );
  }
  return lines;
}
