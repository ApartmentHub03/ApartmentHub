// Renders the "Generate offer" Gmail draft email (Dutch body copy — the
// audience is Dutch real estate agents/collaborators). The signature block
// itself (job title, Email/Mobile/Address labels) stays in the fixed
// bilingual brand format used across every ApartmentHub signature.
//
// Template (matches David's spec):
//
//   Hoi {agent contact name},
//
//   Hierbij de voordracht van mijn kandidaat: {candidate name} voor {apartment address}.
//
//   Huur: € {rent}
//   Borg: € {deposit}
//   Ingangsdatum: {start date}
//
//   Type kandidaat: {candidate type}
//
//   {candidate bio — free text}
//
//   Garantsteller:
//   {guarantor bio — free text}
//
//   Ik hoop je hiermee voldoende te hebben geïnformeerd.
//
//   Met vriendelijke groet,
//
//   [logo]  {sender name}
//           Real Estate Agent
//
//   Email:              Mobile:
//   {sender email}      {sender phone}
//
//   Address:
//   {sender address}
//
//   https://apartmenthub.nl/

const LOGO_URL = 'https://apartmenthub.nl/images/vertical-logo.png';

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function fmtEuro(n) {
    const num = Number(n || 0);
    return `&euro; ${num.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(d) {
    if (!d) return '—';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return escapeHtml(d);
    return date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Derive the "Type kandidaat" label from personen rows.
//   1 person + werk_status='student' → "alleenstaande student"
//   1 person + werk_status='working' → "alleenstaande werkende"
//   2 persons, both student → "2 studenten"
//   2 persons, both working → "2 werkenden"
//   2 persons, mixed → "2 personen (1 student, 1 werkend)"
//   Fallback → "alleenstaand persoon"
export function deriveCandidateType(personen) {
    if (!Array.isArray(personen) || personen.length === 0) return 'alleenstaand persoon';
    const nonGuarantors = personen.filter((p) => (p.rol || p.type || 'tenant') !== 'Garantsteller' && p.type !== 'guarantor');
    const group = nonGuarantors.length ? nonGuarantors : personen;
    const count = group.length;
    if (count === 1) {
        const ws = String(group[0].werk_status || group[0].work_status || '').toLowerCase();
        if (ws === 'student') return 'alleenstaande student';
        if (ws === 'working' || ws === 'werk') return 'alleenstaande werkende';
        return 'alleenstaand persoon';
    }
    const students = group.filter((p) => String(p.werk_status || p.work_status || '').toLowerCase() === 'student').length;
    const working = count - students;
    if (students === count) return `${count} studenten`;
    if (working === count) return `${count} werkenden`;
    return `${count} personen (${students} student${students === 1 ? '' : 'en'}, ${working} werkend)`;
}

/**
 * @param {object} args
 * @param {object} args.agent           - real_estate_agents row: { name, contact_person_name, email }
 * @param {object} args.apartment       - { address } (apartments."Full Address" or street)
 * @param {object} args.candidate       - { name } (accounts.tenant_name)
 * @param {number} args.rent             - bid amount (€/month)
 * @param {number} args.deposit         - deposit (typically 2× rent)
 * @param {string} args.startDate        - ISO date or 'YYYY-MM-DD'
 * @param {string} args.candidateType   - derived label
 * @param {string} args.candidateBio    - free-text paragraph (may contain newlines)
 * @param {string} args.guarantorBio    - free-text paragraph (may contain newlines)
 * @param {object} args.sender          - crm_users row: { name, email, phone, address }
 * @returns {{ to: string, subject: string, html: string }}
 */
export function renderOfferDraftEmail({
    agent,
    apartment,
    candidate,
    rent,
    deposit,
    startDate,
    candidateType,
    candidateBio,
    guarantorBio,
    sender,
}) {
    const agentName = (agent?.contact_person_name || agent?.name || 'daar').trim();
    const agentEmail = (agent?.email || '').trim();
    const apartmentAddress = apartment?.address || '—';
    const candidateName = (candidate?.name || '—').trim();
    const senderName = (sender?.name || '—').trim();
    const senderEmail = (sender?.email || '').trim();
    const senderPhone = (sender?.phone || '—').trim();
    const senderAddress = (sender?.address || '').trim();

    const bioHtml = candidateBio
        ? escapeHtml(candidateBio).replace(/\r\n|\n|\r/g, '<br />')
        : '<em>[Kandidaat bio — hier aanvullen]</em>';
    const guarantorHtml = guarantorBio
        ? escapeHtml(guarantorBio).replace(/\r\n|\n|\r/g, '<br />')
        : '<em>[Garantsteller bio — hier aanvullen]</em>';

    const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a2b27;background:#ffffff">
<div style="max-width:640px;margin:0 auto;padding:24px 0">
  <p style="margin:0 0 12px;font-size:14px">Hoi ${escapeHtml(agentName)},</p>

  <p style="margin:0 0 16px;font-size:14px">
    Hierbij de voordracht van mijn kandidaat: <b>${escapeHtml(candidateName)}</b> voor <b>${escapeHtml(apartmentAddress)}</b>.
  </p>

  <div style="margin:0 0 16px;font-size:14px;line-height:1.8">
    <div><span style="color:#46544f">Huur:</span> <b>${fmtEuro(rent)}</b></div>
    <div><span style="color:#46544f">Borg:</span> <b>${fmtEuro(deposit)}</b></div>
    <div><span style="color:#46544f">Ingangsdatum:</span> <b>${fmtDate(startDate)}</b></div>
  </div>

  <p style="margin:0 0 16px;font-size:14px">Type kandidaat: <b>${escapeHtml(candidateType)}</b></p>

  <p style="margin:0 0 16px;font-size:14px;line-height:1.5">${bioHtml}</p>

  <p style="margin:0 0 4px;font-size:14px"><b>Garantsteller:</b></p>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5">${guarantorHtml}</p>

  <p style="margin:0 0 24px;font-size:14px">Ik hoop je hiermee voldoende te hebben geinformeerd.</p>

  <p style="margin:0 0 4px;font-size:14px">Met vriendelijke groet,</p>

  <table style="border-collapse:collapse;margin-top:12px;max-width:420px">
    <tr>
      <td style="vertical-align:top;width:64px;padding-right:14px">
        <img src="${LOGO_URL}" alt="ApartmentHub" style="width:56px;height:auto;display:block" />
      </td>
      <td style="vertical-align:top">
        <div style="font-size:17px;font-weight:700;color:#497772;line-height:1.3">${escapeHtml(senderName)}</div>
        <div style="font-size:13px;color:#1a1a1a;line-height:1.4;margin-bottom:8px">Real Estate Agent</div>
        <table style="border-collapse:collapse">
          <tr>
            <td style="vertical-align:top;padding-right:40px">
              <div style="font-size:12px;font-weight:700;color:#1a1a1a">Email:</div>
              <a href="mailto:${escapeHtml(senderEmail)}" style="font-size:12px;color:#1a1a1a;text-decoration:underline">${escapeHtml(senderEmail)}</a>
            </td>
            <td style="vertical-align:top">
              <div style="font-size:12px;font-weight:700;color:#1a1a1a">Mobile:</div>
              <div style="font-size:12px;color:#1a1a1a">${escapeHtml(senderPhone)}</div>
            </td>
          </tr>
        </table>
        ${senderAddress ? `<div style="margin-top:8px">
          <div style="font-size:12px;font-weight:700;color:#1a1a1a">Address:</div>
          <div style="font-size:12px;color:#1a1a1a">${escapeHtml(senderAddress)}</div>
        </div>` : ''}
      </td>
    </tr>
  </table>

  <p style="margin:12px 0 0;font-size:12px">
    <a href="https://apartmenthub.nl/" style="font-weight:700;color:#1a1a1a;text-decoration:underline">https://apartmenthub.nl/</a>
  </p>

  <p style="margin:16px 0 0;font-size:10px;line-height:1.5;color:#497772;max-width:420px">
    The content of this email is confidential and intended for the recipient specified in message only. It is strictly forbidden to share any part of this message with any third party, without a written consent of the sender. If you received this message by mistake, please reply to this message and follow with its deletion, so that we can ensure such a mistake does not occur in the future.
  </p>
</div>
</body></html>`;

    return {
        to: agentEmail,
        subject: `Voordracht voor ${apartmentAddress}, ${candidateName}`,
        html,
    };
}