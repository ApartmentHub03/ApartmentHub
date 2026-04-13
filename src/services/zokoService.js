// Client-side helpers that POST to the Next.js /api/zoko/send-template route,
// which in turn calls Zoko's WhatsApp template API with the server-side ZOKO_API_KEY.
//
// Templates in use:
//   - co_tenant_invite                         ({{1}}=name, {{2}}=invited_by, {{3}}=link)
//   - guarantor_invite                         ({{1}}=name, {{2}}=invited_by, {{3}}=link)
//   - you_can_now_start_applying_to_apartments ({{1}}=name, {{2}}=link)

async function postTemplate(body) {
    try {
        const res = await fetch('/api/zoko/send-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
            console.warn('[zokoService] send-template failed:', res.status, data);
            return { success: false, error: data?.message || `HTTP ${res.status}` };
        }
        return { success: true, data: data.data };
    } catch (err) {
        console.warn('[zokoService] network error:', err);
        return { success: false, error: err?.message || 'Network error' };
    }
}

/**
 * Invite a co-tenant via WhatsApp.
 * @param {{ recipient: string, name: string, invitedBy: string, inviteLink: string }} params
 */
export function sendCoTenantInvite({ recipient, name, invitedBy, inviteLink }) {
    return postTemplate({
        templateId: 'co_tenant_invite',
        recipient,
        templateArgs: [name, invitedBy, inviteLink],
    });
}

/**
 * Invite a guarantor via WhatsApp.
 * @param {{ recipient: string, name: string, invitedBy: string, inviteLink: string }} params
 */
export function sendGuarantorInvite({ recipient, name, invitedBy, inviteLink }) {
    return postTemplate({
        templateId: 'guarantor_invite',
        recipient,
        templateArgs: [name, invitedBy, inviteLink],
    });
}

/**
 * Notify the main tenant that profiles are complete and they can start applying.
 * @param {{ recipient: string, name: string, applyLink: string }} params
 */
export function sendReadyToApplyNotification({ recipient, name, applyLink }) {
    return postTemplate({
        templateId: 'you_can_now_start_applying_to_apartments',
        recipient,
        templateArgs: [name, applyLink],
    });
}
