/**
 * Email templates met ApartmentHub-branding.
 * Gebruikt door submit/route.ts voor de verkoper-bevestiging
 * en de makelaar-notificatie. Inline CSS voor maximale email-client
 * compatibiliteit.
 */

const TEAL = "#009B8A";
const ORANGE = "#FF7D28";
const INK = "#1A202C";
const GREY = "#4A5568";
const SOFT = "#E8F5F3";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c] || c));
}

function shell(title: string, body: string) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#F7FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${INK};line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7FAFC;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #E2E8F0;">
        <tr>
          <td style="background:${TEAL};color:#fff;padding:18px 28px;font-weight:700;font-size:16px;letter-spacing:-0.01em;">
            ApartmentHub
          </td>
        </tr>
        <tr><td style="padding:28px;">${body}</td></tr>
        <tr>
          <td style="background:#F7FAFC;border-top:1px solid #E2E8F0;padding:14px 28px;color:${GREY};font-size:12px;text-align:center;">
            ApartmentHub Makelaardij  •  Amsterdam
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ====================================================================
 * Bevestiging naar verkoper
 * ==================================================================== */
export function sellerConfirmationEmail(
  lang: "nl" | "en",
  fields: { naam: string; adres: string; vraagprijs?: string }
) {
  const naam = escapeHtml(fields.naam || "");
  const adres = escapeHtml(fields.adres || "");
  if (lang === "nl") {
    return {
      subject: `We hebben je verkoopaanvraag ontvangen. ${adres}`,
      html: shell("Bevestiging verkoopaanvraag", `
        <h2 style="margin:0 0 8px;color:${TEAL};font-size:22px;letter-spacing:-0.01em;">Bedankt, ${naam}!</h2>
        <p style="margin:0 0 16px;color:${INK};">Je verkoopaanvraag voor <strong>${adres}</strong> is binnen.</p>
        <div style="background:${SOFT};border-left:4px solid ${TEAL};padding:14px 16px;border-radius:8px;margin:18px 0;">
          <strong style="color:${TEAL};">Wat gebeurt er nu?</strong>
          <ol style="margin:8px 0 0;padding-left:20px;color:${INK};">
            <li>Je makelaar belt je <strong>binnen één werkdag</strong>.</li>
            <li>We plannen een bezichtigingsafspraak in.</li>
            <li>Tijdens dat bezoek nemen we het verkoopdossier door.</li>
          </ol>
        </div>
        <p style="margin:0 0 12px;color:${GREY};font-size:14px;">Heb je tussendoor vragen? Bel ons gerust op 020 123 4567 of antwoord op deze mail.</p>
        <p style="margin:24px 0 0;color:${GREY};">Tot snel,<br/>Het ApartmentHub-team</p>
      `),
    };
  }
  return {
    subject: `We received your sale request. ${adres}`,
    html: shell("Sale request received", `
      <h2 style="margin:0 0 8px;color:${TEAL};font-size:22px;">Thanks, ${naam}!</h2>
      <p style="margin:0 0 16px;">Your sale request for <strong>${adres}</strong> has been received.</p>
      <div style="background:${SOFT};border-left:4px solid ${TEAL};padding:14px 16px;border-radius:8px;margin:18px 0;">
        <strong style="color:${TEAL};">What happens next?</strong>
        <ol style="margin:8px 0 0;padding-left:20px;">
          <li>Your agent will call within <strong>one business day</strong>.</li>
          <li>We schedule a viewing appointment.</li>
          <li>During the visit we walk through the sale dossier.</li>
        </ol>
      </div>
      <p style="margin:0 0 12px;color:${GREY};font-size:14px;">Questions? Call us at +31 20 123 4567 or reply to this email.</p>
      <p style="margin:24px 0 0;color:${GREY};">Talk soon,<br/>The ApartmentHub team</p>
    `),
  };
}

/* ====================================================================
 * Notificatie naar makelaar (interne mail met dossier-overzicht)
 * ==================================================================== */
export function agentNotificationEmail(args: {
  lang: "nl" | "en";
  fields: Record<string, string>;
  filesByDoc: Record<string, { url: string; name: string; size: number }[]>;
  aiSummary?: string[];
  enrichmentSummary?: string[];
  dossierUrl?: string;
}) {
  const { lang, fields, filesByDoc, aiSummary, enrichmentSummary, dossierUrl } = args;
  const adres = escapeHtml(`${fields.straat ?? ""}, ${fields.postcode ?? ""}`);
  const naam = escapeHtml(fields.naam ?? "");
  const email = escapeHtml(fields.email ?? "");
  const telefoon = escapeHtml(fields.tel ?? "");
  const moment = escapeHtml(fields.moment ?? "");
  const motivatie = escapeHtml(fields.motivatie ?? "");
  const vraagprijs = escapeHtml(fields.vraagprijs ?? "");

  const summaryHtml = aiSummary?.length
    ? `<p style="margin:18px 0 6px;font-weight:700;color:${TEAL};">AI-extractie samenvatting</p>
       <ul style="margin:0 0 14px;padding-left:20px;color:${INK};">
         ${aiSummary.map(s => `<li>${escapeHtml(s)}</li>`).join("")}
       </ul>`
    : "";

  const enrichmentHtml = enrichmentSummary?.length
    ? `<p style="margin:18px 0 6px;font-weight:700;color:${TEAL};">Publieke registers</p>
       <ul style="margin:0 0 14px;padding-left:20px;color:${INK};">
         ${enrichmentSummary.map(s => `<li>${escapeHtml(s)}</li>`).join("")}
       </ul>`
    : "";

  const filesHtml = Object.keys(filesByDoc).length
    ? `<p style="margin:18px 0 6px;font-weight:700;color:${TEAL};">Geuploade documenten</p>
       ${Object.entries(filesByDoc).map(([key, files]) => `
         <p style="margin:8px 0 4px;font-weight:600;text-transform:capitalize;">${escapeHtml(key)}</p>
         <ul style="margin:0;padding-left:20px;color:${INK};">
           ${files.map(f => `<li><a href="${escapeHtml(f.url)}" style="color:${TEAL};">${escapeHtml(f.name)}</a> <span style="color:${GREY};">(${Math.round(f.size / 1024)} KB)</span></li>`).join("")}
         </ul>
       `).join("")}`
    : `<p style="color:${GREY};font-style:italic;">Geen documenten geupload.</p>`;

  /* ====================================================================
   * Te bestellen / op te halen door makelaar.
   * Deze stukken vragen we niet meer aan de klant. Wij regelen ze zelf
   * uit openbare registers. Lijst dient als checklist bij de aanvraag.
   * ==================================================================== */
  const vveNaam = escapeHtml(fields.vve_naam ?? "");
  const vveKvk = escapeHtml(fields.vve_kvk ?? "");
  const adresQ = encodeURIComponent(`${fields.straat ?? ""} ${fields.postcode ?? ""}`);
  const toFetchHtml = `
    <p style="margin:18px 0 6px;font-weight:700;color:${ORANGE};">Door makelaar op te halen</p>
    <ul style="margin:0 0 14px;padding-left:20px;color:${INK};font-size:13.5px;line-height:1.55;">
      <li>
        <strong>Leveringsakte + splitsingsakte</strong> bij Kadaster (~€19,85 per akte).
        <a href="https://www.kadaster.nl/akte-opvragen" style="color:${TEAL};">Akte opvragen bij Kadaster</a>
      </li>
      <li>
        <strong>KvK uittreksel VvE</strong> (~€2,50).
        ${vveNaam || vveKvk
          ? `<span style="color:${GREY};">Naam VvE: ${vveNaam || "?"} / KvK: ${vveKvk || "?"}</span>`
          : `<span style="color:${GREY};">Zoek VvE naam in MJOP/notulen.</span>`}
        <a href="https://www.kvk.nl/zoeken/" style="color:${TEAL};">KvK zoeken</a>
      </li>
      <li>
        <strong>Vergunningen</strong> via Omgevingsloket (DSO) op adres.
        <a href="https://omgevingswet.overheid.nl/home?search=${adresQ}" style="color:${TEAL};">Omgevingsloket</a>
      </li>
      <li>
        <strong>Bouwtekeningen</strong> via Stadsarchief Amsterdam (vul adres in en kies "Bouwdossiers").
        <a href="https://data.amsterdam.nl" style="color:${TEAL};">data.amsterdam.nl</a>
      </li>
      <li>
        <strong>Funderingsstatus</strong> via KCAF Funderingsviewer.
        <a href="https://www.kcaf.nl/funderingsviewer/" style="color:${TEAL};">KCAF</a>
      </li>
    </ul>`;

  const cta = dossierUrl
    ? `<p style="margin:24px 0 0;text-align:center;"><a href="${escapeHtml(dossierUrl)}" style="display:inline-block;background:${ORANGE};color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600;">Open dossier in admin</a></p>`
    : "";

  return {
    subject: `Nieuwe verkoopaanvraag. ${adres}`,
    html: shell("Nieuwe verkoopaanvraag", `
      <h2 style="margin:0 0 4px;color:${TEAL};font-size:20px;">Nieuwe aanvraag</h2>
      <p style="margin:0 0 18px;color:${GREY};">${adres}</p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;">
        <tr><td style="padding:4px 0;color:${GREY};width:140px;">Verkoper</td><td style="padding:4px 0;"><strong>${naam}</strong></td></tr>
        <tr><td style="padding:4px 0;color:${GREY};">E-mail</td><td style="padding:4px 0;"><a href="mailto:${email}" style="color:${TEAL};">${email}</a></td></tr>
        <tr><td style="padding:4px 0;color:${GREY};">Telefoon</td><td style="padding:4px 0;">${telefoon || "-"}</td></tr>
        <tr><td style="padding:4px 0;color:${GREY};">Beste belmoment</td><td style="padding:4px 0;">${moment || "Geen voorkeur"}</td></tr>
        <tr><td style="padding:4px 0;color:${GREY};">Vraagprijs</td><td style="padding:4px 0;">${vraagprijs ? "€ " + vraagprijs : "-"}</td></tr>
      </table>

      ${motivatie ? `<p style="margin:18px 0 6px;font-weight:700;color:${TEAL};">Motivatie verkoop</p>
        <p style="margin:0 0 14px;background:${SOFT};padding:12px;border-radius:8px;color:${INK};">${motivatie}</p>` : ""}

      ${enrichmentHtml}
      ${summaryHtml}
      ${filesHtml}
      ${toFetchHtml}
      ${cta}
    `),
  };
}

/* ====================================================================
 * Document-request email — sent to VvE, notary, lawyer, partner,
 * buyer, or seller with a magic-link upload URL.
 * ==================================================================== */
const ROLE_INTRO: Record<string, { nl: string; en: string }> = {
  vve:     { nl: "Dhr./Mevr. {seller} verkoopt het appartement op {adres}. Namens ApartmentHub vragen wij u vriendelijk om de volgende documenten aan te leveren:", en: "Mr./Ms. {seller} is selling the apartment at {adres}. On behalf of ApartmentHub, we kindly ask you to provide the following documents:" },
  notary:  { nl: "Ter voorbereiding van de levering op {adres} hebben wij nodig:", en: "In preparation for the transfer at {adres} we need:" },
  lawyer:  { nl: "Voor het verkoopdossier van {adres} hebben wij nodig:", en: "For the sale file of {adres} we need:" },
  partner: { nl: "Voor de verkoop van {adres} hebben wij nodig:", en: "For the sale of {adres} we need:" },
  buyer:   { nl: "Voor het koopdossier van {adres} hebben wij nodig:", en: "For the purchase file of {adres} we need:" },
  seller:  { nl: "Voor je verkoopdossier ontbreken nog:", en: "For your sale file we still need:" },
};

export function documentRequestEmail(args: {
  lang: "nl" | "en";
  role: "vve" | "notary" | "lawyer" | "partner" | "buyer" | "seller";
  recipient_name: string;
  object_adres: string;
  required_documents: string[];
  upload_url: string;
  valid_days: number;
  custom_message?: string;
  seller_name?: string;
}): { subject: string; html: string; text: string } {
  const adres = escapeHtml(args.object_adres);
  const name = escapeHtml(args.recipient_name);
  const rawIntro = (ROLE_INTRO[args.role] ?? ROLE_INTRO.seller)[args.lang];
  let intro = rawIntro.replace("{adres}", `<strong>${adres}</strong>`);
  if (args.seller_name) {
    intro = intro.replace("{seller}", escapeHtml(args.seller_name));
  } else {
    // Remove the prefix if no seller_name for non-vve roles
    intro = intro.replace("{seller} ", "").replace("{seller}", "");
  }
  const docList = args.required_documents.map(d => `<li>${escapeHtml(d)}</li>`).join("");
  const customBlock = args.custom_message
    ? `<p style="background:${SOFT};padding:12px;border-radius:8px;margin:18px 0;">${escapeHtml(args.custom_message)}</p>`
    : "";
  const ctaText = args.lang === "nl" ? "Documenten uploaden" : "Upload documents";
  const validText = args.lang === "nl"
    ? `Upload via de beveiligde link (geldig ${args.valid_days} dagen):`
    : `Upload via this secure link (valid ${args.valid_days} days):`;

  const contactLine = args.lang === "nl"
    ? `Vragen? david@apartmenthub.nl \u00b7 +31 6 83221189`
    : `Questions? david@apartmenthub.nl \u00b7 +31 6 83221189`;

  const replyToLine = args.seller_name
    ? (args.lang === "nl"
        ? `Vragen? U kunt rechtstreeks antwoorden aan ${escapeHtml(args.seller_name)}.`
        : `Questions? You can reply directly to ${escapeHtml(args.seller_name)}.`)
    : (args.lang === "nl"
        ? `Vragen? david@apartmenthub.nl`
        : `Questions? david@apartmenthub.nl`);

  const portalLine = args.lang === "nl"
    ? `Dit verzoek is gestart via het ApartmentHub verkoopportaal.`
    : `This request was initiated via the ApartmentHub seller portal.`;

  // Option B card design
  const cardHtml = `
    <div style="background:${SOFT};border:1px solid rgba(0,155,138,0.2);border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
      <p style="margin:0 0 18px;color:${INK};font-size:14px;">
        ${args.lang === "nl" ? "Upload uw documenten veilig via onze beveiligde portal." : "Upload your documents safely via our secure portal."}
      </p>
      <a href="${escapeHtml(args.upload_url)}" style="display:inline-block;background:${TEAL};color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">${ctaText} \u2192</a>
      <p style="margin:12px 0 0;font-size:12px;color:${GREY};">
        ${args.lang === "nl" ? "Link verloopt over" : "Link expires in"} ${args.valid_days} ${args.lang === "nl" ? "dagen" : "days"}
      </p>
    </div>
  `;

  const body = `
    <h2 style="margin:0 0 8px;color:${TEAL};font-size:20px;">${args.lang === "nl" ? "Documenten gevraagd" : "Documents requested"}</h2>
    <p style="margin:0 0 8px;">${args.lang === "nl" ? `Beste ${name},` : `Hi ${name},`}</p>
    <p style="margin:0 0 14px;">${intro}</p>
    <ul style="margin:0 0 14px;padding-left:20px;color:${INK};">${docList}</ul>
    ${customBlock}
    <p style="margin:18px 0 8px;color:${INK};">${validText}</p>
    ${cardHtml}
    <p style="margin:14px 0 0;font-size:13px;color:${GREY};">${replyToLine}</p>
    <p style="margin:8px 0 0;font-size:12px;color:#A0AEC0;font-style:italic;">${portalLine}</p>
    <hr style="border:none;border-top:1px solid #E2E8F0;margin:14px 0;" />
    <p style="margin:0;font-size:12px;color:${GREY};">${contactLine}</p>`;

  const subject = args.lang === "nl"
    ? `Documenten gevraagd \u2014 ${args.object_adres}`
    : `Documents requested \u2014 ${args.object_adres}`;

  const text = `${args.lang === "nl" ? "Documenten gevraagd" : "Documents requested"}\n\n${args.lang === "nl" ? `Beste ${args.recipient_name},` : `Hi ${args.recipient_name},`}\n\n${intro.replace(/<[^>]+>/g, "")}\n\n${args.required_documents.join("\n- ")}\n\n${validText} ${args.upload_url}\n\n${args.lang === "nl" ? `Link verloopt over ${args.valid_days} dagen.` : `Link expires in ${args.valid_days} days.`}\n\n${replyToLine.replace(/<[^>]+>/g, "")}\n${portalLine}\n\n${contactLine}`;

  return { subject, html: shell(args.lang === "nl" ? "Documenten gevraagd" : "Documents requested", body), text };
}

/* ====================================================================
 * Inventory request email — "Lijst van zaken" sent to the seller with
 * a tokenized link to fill in the fixtures & fittings form.
 * ==================================================================== */
export function inventoryRequestEmail(args: {
  lang: "nl" | "en";
  recipient_name: string;
  object_adres: string;
  inventory_url: string;
  valid_days: number;
  custom_message?: string;
}): { subject: string; html: string; text: string } {
  const adres = escapeHtml(args.object_adres);
  const name = escapeHtml(args.recipient_name);
  const nl = args.lang === "nl";

  const customBlock = args.custom_message
    ? `<p style="background:${SOFT};padding:12px;border-radius:8px;margin:18px 0;">${escapeHtml(args.custom_message)}</p>`
    : "";

  const cardHtml = `
    <div style="background:${SOFT};border:1px solid rgba(0,155,138,0.2);border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
      <p style="margin:0 0 18px;color:${INK};font-size:14px;">
        ${nl ? "Vul de lijst van zaken veilig online in via onze beveiligde portal." : "Fill in the list of fixtures & fittings safely via our secure portal."}
      </p>
      <a href="${escapeHtml(args.inventory_url)}" style="display:inline-block;background:${TEAL};color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">${nl ? "Lijst invullen" : "Fill in list"} \u2192</a>
      <p style="margin:12px 0 0;font-size:12px;color:${GREY};">
        ${nl ? "Link verloopt over" : "Link expires in"} ${args.valid_days} ${nl ? "dagen" : "days"}
      </p>
    </div>
  `;

  const body = `
    <h2 style="margin:0 0 8px;color:${TEAL};font-size:20px;">${nl ? "Lijst van zaken" : "List of fixtures & fittings"}</h2>
    <p style="margin:0 0 8px;">${nl ? `Beste ${name},` : `Hi ${name},`}</p>
    <p style="margin:0 0 14px;">
      ${nl
        ? `Voor de verkoop van <strong>${adres}</strong> vragen wij u de lijst van zaken in te vullen. Geef per item aan of het in de woning blijft, meegaat, of ter overname is.`
        : `For the sale of <strong>${adres}</strong> we ask you to fill in the list of fixtures & fittings. For each item indicate whether it stays in the property, goes with you, or is available for takeover.`}
    </p>
    ${customBlock}
    ${cardHtml}
    <p style="margin:14px 0 0;font-size:13px;color:${GREY};">
      ${nl ? "Vragen? david@apartmenthub.nl \u00b7 +31 6 83221189" : "Questions? david@apartmenthub.nl \u00b7 +31 6 83221189"}
    </p>
    <p style="margin:8px 0 0;font-size:12px;color:#A0AEC0;font-style:italic;">
      ${nl ? "Dit verzoek is gestart via het ApartmentHub verkoopportaal." : "This request was initiated via the ApartmentHub seller portal."}
    </p>`;

  const subject = nl
    ? `Lijst van zaken \u2014 ${args.object_adres}`
    : `List of fixtures & fittings \u2014 ${args.object_adres}`;

  const text = `${nl ? "Lijst van zaken" : "List of fixtures & fittings"}\n\n${nl ? `Beste ${args.recipient_name},` : `Hi ${args.recipient_name},`}\n\n${nl ? `Voor de verkoop van ${args.object_adres} vragen wij u de lijst van zaken in te vullen.` : `For the sale of ${args.object_adres} we ask you to fill in the list of fixtures & fittings.`}\n\n${nl ? "Vul in via:" : "Fill in at:"} ${args.inventory_url}\n\n${nl ? `Link verloopt over ${args.valid_days} dagen.` : `Link expires in ${args.valid_days} days.`}\n\n${nl ? "Vragen? david@apartmenthub.nl" : "Questions? david@apartmenthub.nl"}`;

  return { subject, html: shell(nl ? "Lijst van zaken" : "List of fixtures & fittings", body), text };
}

/* ====================================================================
 * Valuation confirmation — sent to the seller after submitting the
 * valuation form with their estimated value range.
 * ==================================================================== */
export function valuationConfirmationEmail(
  lang: "nl" | "en",
  fields: {
    naam: string;
    adres: string;
    postcode: string;
    wijk: string;
    stad: string;
    oppervlakte: string;
    valueLow: string;
    valueHigh: string;
  }
) {
  const naam = escapeHtml(fields.naam || "");
  const adres = escapeHtml(fields.adres || "");
  const postcode = escapeHtml(fields.postcode || "");
  const wijk = escapeHtml(fields.wijk || "");
  const stad = escapeHtml(fields.stad || "");
  const oppervlakte = escapeHtml(fields.oppervlakte || "");
  const valueLow = escapeHtml(fields.valueLow || "");
  const valueHigh = escapeHtml(fields.valueHigh || "");

  if (lang === "nl") {
    return {
      subject: `Jouw woningwaarde-indicatie — ${adres}`,
      html: shell("Woningwaarde-indicatie", `
        <h2 style="margin:0 0 8px;color:${TEAL};font-size:22px;letter-spacing:-0.01em;">Bedankt, ${naam}!</h2>
        <p style="margin:0 0 16px;color:${INK};">We hebben je aanvraag ontvangen voor <strong>${adres}${postcode ? `, ${postcode}` : ""}</strong>.</p>
        <div style="background:${SOFT};border-left:4px solid ${TEAL};padding:16px 18px;border-radius:8px;margin:18px 0;">
          <p style="margin:0 0 4px;color:${INK};font-size:14px;">Geschatte marktwaarde van je woning:</p>
          <p style="margin:0;font-size:24px;font-weight:700;color:${TEAL};">${valueLow} tot ${valueHigh}</p>
          <p style="margin:8px 0 0;color:${GREY};font-size:13px;">${stad} · ${wijk} · ${oppervlakte} m²</p>
        </div>
        <p style="margin:0 0 14px;color:${INK};">Dit is een geautomatiseerde indicatie op basis van marktdata en het BAG, geen taxatie. Voor een exacte waardebepaling komen we graag langs.</p>
        <div style="background:#F7FAFC;border-radius:8px;padding:14px 16px;margin:18px 0;">
          <strong style="color:${TEAL};">Wat gebeurt er nu?</strong>
          <ol style="margin:8px 0 0;padding-left:20px;color:${INK};">
            <li>We bellen je <strong>binnen één werkdag</strong>.</li>
            <li>We plannen een gratis en vrijblijvend huisbezoek in.</li>
            <li>Op locatie bepalen we de exacte waarde en verkoopstrategie.</li>
          </ol>
        </div>
        <p style="margin:0 0 12px;color:${GREY};font-size:14px;">Heb je tussendoor vragen? Bel ons gerust of antwoord op deze mail.</p>
        <p style="margin:24px 0 0;color:${GREY};">Tot snel,<br/>Het ApartmentHub-team</p>
      `),
    };
  }
  return {
    subject: `Your property value estimate — ${adres}`,
    html: shell("Property value estimate", `
      <h2 style="margin:0 0 8px;color:${TEAL};font-size:22px;letter-spacing:-0.01em;">Thank you, ${naam}!</h2>
      <p style="margin:0 0 16px;color:${INK};">We've received your request for <strong>${adres}${postcode ? `, ${postcode}` : ""}</strong>.</p>
      <div style="background:${SOFT};border-left:4px solid ${TEAL};padding:16px 18px;border-radius:8px;margin:18px 0;">
        <p style="margin:0 0 4px;color:${INK};font-size:14px;">Estimated market value of your property:</p>
        <p style="margin:0;font-size:24px;font-weight:700;color:${TEAL};">${valueLow} to ${valueHigh}</p>
        <p style="margin:8px 0 0;color:${GREY};font-size:13px;">${stad} · ${wijk} · ${oppervlakte} m²</p>
      </div>
      <p style="margin:0 0 14px;color:${INK};">This is an automated indication based on market data and the BAG, not a formal appraisal. For an exact valuation, we are happy to visit.</p>
      <div style="background:#F7FAFC;border-radius:8px;padding:14px 16px;margin:18px 0;">
        <strong style="color:${TEAL};">What happens next?</strong>
        <ol style="margin:8px 0 0;padding-left:20px;color:${INK};">
          <li>We'll call you <strong>within one business day</strong>.</li>
          <li>We schedule a free, no-obligation home visit.</li>
          <li>On-site we determine the exact value and sales strategy.</li>
        </ol>
      </div>
      <p style="margin:0 0 12px;color:${GREY};font-size:14px;">Have questions in the meantime? Feel free to call us or reply to this email.</p>
      <p style="margin:24px 0 0;color:${GREY};">See you soon,<br/>The ApartmentHub team</p>
    `),
  };
}
