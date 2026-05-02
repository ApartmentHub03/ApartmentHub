const TOKEN_URL =
    process.env.SALESFORCE_TOKEN_URL ||
    'https://apartmenthub--hubdev.sandbox.my.salesforce.com/services/oauth2/token';
const API_URL =
    process.env.SALESFORCE_API_URL ||
    'https://apartmenthub--hubdev.sandbox.my.salesforce-sites.com/services/apexrest/listofapartments';
const CLIENT_ID = process.env.SALESFORCE_CLIENT_ID;
const CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET;

// In-memory token cache. Salesforce session tokens are typically valid for ~2h;
// we refresh ~5 min early, and on any 401 from the API.
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

async function callListEndpoint(token) {
    return fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

export async function GET() {
    try {
        let token = await getAccessToken();
        let res = await callListEndpoint(token);
        if (res.status === 401) {
            token = await getAccessToken(true);
            res = await callListEndpoint(token);
        }
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            return Response.json(
                { success: false, error: `Salesforce returned non-JSON (${res.status})`, raw: text.slice(0, 500) },
                { status: 502 }
            );
        }
        if (!res.ok || data.success === false) {
            return Response.json(
                { success: false, error: data.message || `Salesforce error ${res.status}`, details: data },
                { status: 502 }
            );
        }

        // Map Salesforce fields → shape the apartments page already expects.
        const apartments = (data.listOfApartments || []).map((a) => ({
            id: a.id,
            'Full Address': a.name,
            name: a.name,
            rental_price: a.price ?? null,
            bedrooms: a.bedrooms ?? null,
            square_meters: a.sqMeters ?? null,
            deposit: a.deposit ?? null,
            start_date: a.startDate ?? null,
            end_date: a.endDate ?? null,
            status: 'Active',
        }));

        return Response.json({ success: true, apartments });
    } catch (error) {
        console.error('[Salesforce Apartments] Error:', error);
        return Response.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
