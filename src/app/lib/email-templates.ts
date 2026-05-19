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
