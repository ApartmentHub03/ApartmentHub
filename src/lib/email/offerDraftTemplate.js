// Renders the "Generate offer" Gmail draft email.
//
// Template (matches David's spec):
//
//   Hi {agent contact name},
//
//   Here is the proposal from my candidate: {candidate name} at {apartment address}.
//
//   Rent: € {rent}
//   Deposit: € {deposit}
//   Start date: {start date}
//
//   Candidate type: {candidate type}
//
//   {candidate bio — free text}
//
//   Guarantor:
//   {guarantor bio — free text}
//
//   I hope I have provided you with sufficient information.
//
//   Yours sincerely,
//
//   [horizontal-logo.png]
//   {sender name}
//   Real Estate Agent
//   Email: {sender email}
//   Mobile: {sender phone}
//   Address: {sender address}
//   https://apartmenthub.nl/

const LOGO_URL = 'https://apartmenthub.nl/images/horizontal-logo.png';

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
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Derive the "Candidate type" label from personen rows.
//   1 person + werk_status='student' → "single student"
//   1 person + werk_status='working' → "single working person"
//   2 persons, both student → "2 students"
//   2 persons, both working → "2 working people"
//   2 persons, mixed → "2 people (1 student, 1 working)"
//   Fallback → "single person"
export function deriveCandidateType(personen) {
    if (!Array.isArray(personen) || personen.length === 0) return 'single person';
    const nonGuarantors = personen.filter((p) => (p.rol || p.type || 'tenant') !== 'Garantsteller' && p.type !== 'guarantor');
    const group = nonGuarantors.length ? nonGuarantors : personen;
    const count = group.length;
    if (count === 1) {
        const ws = String(group[0].werk_status || group[0].work_status || '').toLowerCase();
        if (ws === 'student') return 'single student';
        if (ws === 'working' || ws === 'werk') return 'single working person';
        return 'single person';
    }
    const students = group.filter((p) => String(p.werk_status || p.work_status || '').toLowerCase() === 'student').length;
    const working = count - students;
    if (students === count) return `${count} students`;
    if (working === count) return `${count} working people`;
    return `${count} people (${students} student${students === 1 ? '' : 's'}, ${working} working)`;
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
    const agentName = (agent?.contact_person_name || agent?.name || 'there').trim();
    const agentEmail = (agent?.email || '').trim();
    const apartmentAddress = apartment?.address || '—';
    const candidateName = (candidate?.name || '—').trim();
    const senderName = (sender?.name || '—').trim();
    const senderEmail = (sender?.email || '').trim();
    const senderPhone = (sender?.phone || '—').trim();
    const senderAddress = (sender?.address || '').trim();

    const bioHtml = candidateBio
        ? escapeHtml(candidateBio).replace(/\r\n|\n|\r/g, '<br />')
        : '<em>[Candidate bio — edit here]</em>';
    const guarantorHtml = guarantorBio
        ? escapeHtml(guarantorBio).replace(/\r\n|\n|\r/g, '<br />')
        : '<em>[Guarantor bio — edit here]</em>';

    const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a2b27;background:#ffffff">
<div style="max-width:640px;margin:0 auto;padding:24px 0">
  <p style="margin:0 0 12px;font-size:14px">Hi ${escapeHtml(agentName)},</p>

  <p style="margin:0 0 16px;font-size:14px">
    Here is the proposal from my candidate: <b>${escapeHtml(candidateName)}</b> at <b>${escapeHtml(apartmentAddress)}</b>.
  </p>

  <table style="font-size:14px;border-collapse:collapse;margin:0 0 16px">
    <tr><td style="padding:2px 12px 2px 0;color:#46544f">Rent:</td><td><b>${fmtEuro(rent)}</b></td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#46544f">Deposit:</td><td><b>${fmtEuro(deposit)}</b></td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#46544f">Start date:</td><td><b>${fmtDate(startDate)}</b></td></tr>
  </table>

  <p style="margin:0 0 16px;font-size:14px">Candidate type: <b>${escapeHtml(candidateType)}</b></p>

  <p style="margin:0 0 16px;font-size:14px;line-height:1.5">${bioHtml}</p>

  <p style="margin:0 0 4px;font-size:14px"><b>Guarantor:</b></p>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5">${guarantorHtml}</p>

  <p style="margin:0 0 24px;font-size:14px">I hope I have provided you with sufficient information.</p>

  <p style="margin:0 0 4px;font-size:14px">Yours sincerely,</p>

  <table style="margin-top:8px;border-collapse:collapse">
    <tr>
      <td style="vertical-align:top;padding-right:14px">
        <img src="${LOGO_URL}" alt="ApartmentHub" style="height:44px;display:block" />
      </td>
      <td style="vertical-align:top;font-size:13px;line-height:1.6;color:#1a2b27">
        <b style="font-size:15px">${escapeHtml(senderName)}</b><br />
        Real Estate Agent<br />
        Email: ${escapeHtml(senderEmail || '—')}<br />
        Mobile: ${escapeHtml(senderPhone)}<br />
        ${senderAddress ? `Address: ${escapeHtml(senderAddress)}<br />` : ''}
        <a href="https://apartmenthub.nl/" style="color:#497772;text-decoration:none">https://apartmenthub.nl/</a>
      </td>
    </tr>
  </table>
</div>
</body></html>`;

    return {
        to: agentEmail,
        subject: `Proposal for ${apartmentAddress} — ${candidateName}`,
        html,
    };
}