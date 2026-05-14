const TOKEN_URL =
    process.env.SALESFORCE_TOKEN_URL ||
    'https://apartmenthub--hubdev.sandbox.my.salesforce.com/services/oauth2/token';
const DOSSIER_URL =
    process.env.SALESFORCE_DOSSIER_URL ||
    'https://apartmenthub--hubdev.sandbox.my.salesforce-sites.com/services/apexrest/apthub/dossier';
const CLIENT_ID = process.env.SALESFORCE_CLIENT_ID;
const CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET;

let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function fetchAccessToken() {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        throw new Error('Missing SALESFORCE_CLIENT_ID or SALESFORCE_CLIENT_SECRET');
    }
    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
    });
    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) {
        throw new Error(`Salesforce token request failed: ${res.status} ${JSON.stringify(data)}`);
    }
    cachedToken = data.access_token;
    cachedTokenExpiresAt = Date.now() + 110 * 60 * 1000;
    return cachedToken;
}

async function getAccessToken(forceRefresh = false) {
    if (!forceRefresh && cachedToken && Date.now() < cachedTokenExpiresAt) {
        return cachedToken;
    }
    return fetchAccessToken();
}

// Salesforce expects digits only — no `+`, no spaces, no dashes.
function normalizePhone(raw) {
    return String(raw || '').replace(/\D/g, '');
}

async function callDossierEndpoint(token, phone) {
    const url = `${DOSSIER_URL}?phone=${encodeURIComponent(phone)}`;
    return fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const phone = normalizePhone(searchParams.get('phone'));
        if (!phone) {
            return Response.json(
                { success: false, error: 'Missing phone query parameter' },
                { status: 400 }
            );
        }

        let token = await getAccessToken();
        let res = await callDossierEndpoint(token, phone);
        if (res.status === 401) {
            token = await getAccessToken(true);
            res = await callDossierEndpoint(token, phone);
        }
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            return Response.json(
                {
                    success: false,
                    error: `Salesforce returned non-JSON (${res.status})`,
                    raw: text.slice(0, 500),
                },
                { status: 502 }
            );
        }
        if (!res.ok || data.success === false) {
            return Response.json(
                {
                    success: false,
                    error: data.message || `Salesforce error ${res.status}`,
                    details: data,
                },
                { status: 502 }
            );
        }

        return Response.json({ success: true, dossier: data });
    } catch (error) {
        console.error('[Salesforce Dossier] Error:', error);
        return Response.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
