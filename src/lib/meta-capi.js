const ZOKO_API_BASE = 'https://chat.zoko.io/v2';

/* ------------------------------------------------------------------ */
/* SHA-256                                                           */
/* ------------------------------------------------------------------ */
export async function sha256(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str.toLowerCase().trim());
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ------------------------------------------------------------------ */
/* Phone normalization for Zoko (digits only, no +)                 */
/* ------------------------------------------------------------------ */
export function normalizePhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
}

/* ------------------------------------------------------------------ */
/* Build user_data for CAPI from a meta_leads row                     */
/* ------------------------------------------------------------------ */
export async function buildUserData(lead) {
    const ud = {};
    ud.ph = [await sha256(normalizePhone(lead.phone))];
    if (lead.email) ud.em = [await sha256(lead.email)];
    if (lead.full_name) {
        const parts = lead.full_name.trim().split(/\s+/);
        if (parts[0]) ud.fn = [await sha256(parts[0])];
        if (parts.length > 1) ud.ln = [await sha256(parts.slice(1).join(' '))];
    }
    if (lead.external_id) ud.external_id = [lead.external_id];
    if (lead.tracking_fbp) ud.fbp = lead.tracking_fbp;
    if (lead.tracking_fbc) ud.fbc = lead.tracking_fbc;
    return ud;
}

/* ------------------------------------------------------------------ */
/* Deterministic event_id for idempotency / dedup                     */
/* ------------------------------------------------------------------ */
export async function eventId(phone, eventName) {
    return sha256(normalizePhone(phone) + ':' + eventName);
}

/* ------------------------------------------------------------------ */
/* Send a CAPI event to Meta                                         */
/* ------------------------------------------------------------------ */
export async function sendCapiEvent({ eventName, eventId: eid, actionSource, userData, customData }) {
    const pixelId = process.env.META_PIXEL_ID;
    const token = process.env.META_CAPI_ACCESS_TOKEN;
    if (!pixelId || !token) {
        console.error('[meta-capi] Missing META_PIXEL_ID or META_CAPI_ACCESS_TOKEN');
        return { success: false, error: 'Missing Meta config' };
    }

    const payload = {
        data: [{
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            event_id: eid,
            action_source: actionSource || 'system_generated',
            user_data: userData,
            ...(customData ? { custom_data: customData } : {}),
        }],
    };

    try {
        const res = await fetch(
            `https://graph.facebook.com/v19.0/${pixelId}/events`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, access_token: token }),
            }
        );
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { data = text; }

        if (!res.ok) {
            console.error('[meta-capi] Error:', res.status, data);
            return { success: false, status: res.status, data };
        }
        return { success: true, data };
    } catch (err) {
        console.error('[meta-capi] Error:', err);
        return { success: false, error: err.message };
    }
}

/* ------------------------------------------------------------------ */
/* Zoko helpers                                                      */
/* ------------------------------------------------------------------ */
const zokoHeaders = (apiKey) => ({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'apikey': apiKey,
});

export async function findZokoCustomerId(apiKey, phone) {
    try {
        const res = await fetch(`${ZOKO_API_BASE}/customer?phone=${encodeURIComponent(phone)}`, {
            method: 'GET',
            headers: zokoHeaders(apiKey),
        });
        if (res.ok) {
            const text = await res.text();
            if (text) {
                try {
                    const data = JSON.parse(text);
                    if (Array.isArray(data) && data.length > 0 && data[0].id) return data[0].id;
                    if (data && data.id) return data.id;
                } catch { /* ignore parse errors */ }
            }
        }
    } catch (err) {
        console.error('[meta-capi] Zoko find customer error:', err);
    }
    return null;
}

export async function addZokoTags(apiKey, customerId, tags) {
    if (!customerId || !tags || tags.length === 0) return;
    try {
        const res = await fetch(`${ZOKO_API_BASE}/customer/${customerId}/tags`, {
            method: 'PUT',
            headers: zokoHeaders(apiKey),
            body: JSON.stringify({ tags }),
        });
        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            console.error('[meta-capi] Zoko add tags error:', res.status, errText);
        }
    } catch (err) {
        console.error('[meta-capi] Zoko add tags error:', err);
    }
}
