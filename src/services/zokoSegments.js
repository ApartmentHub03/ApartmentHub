// Zoko Segments API client.
//
// Wraps the GET /v2/segment/segments and GET /v2/segment/{id}/customers
// endpoints. Zoko enforces a 1-request-per-5-seconds rate limit, so this
// module spaces paginated calls accordingly.

const ZOKO_API_BASE = 'https://chat.zoko.io/v2';
const RATE_LIMIT_MS = 5200; // 5 sec + small buffer

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getApiKey() {
    const key = process.env.ZOKO_API_KEY;
    if (!key) throw new Error('ZOKO_API_KEY not configured');
    return key;
}

async function zokoGet(path, retries = 3) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const res = await fetch(`${ZOKO_API_BASE}${path}`, {
            headers: { apikey: getApiKey(), Accept: 'application/json' },
        });

        if (res.status === 429 && attempt < retries) {
            const wait = 6000 * (attempt + 1); // 6s, 12s, 18s
            await sleep(wait);
            continue;
        }

        const text = await res.text();
        let data;
        try { data = text ? JSON.parse(text) : null; } catch { data = text; }
        if (!res.ok) {
            const err = new Error(`Zoko API ${path} returned ${res.status}`);
            err.status = res.status;
            err.body = data;
            throw err;
        }
        return data;
    }
}

// GET /v2/segment/segments — returns all segments (paginated, 1000/page).
export async function listZokoSegments() {
    const segments = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
        if (page > 1) await sleep(RATE_LIMIT_MS);
        const data = await zokoGet(`/segment/segments?page=${page}`);
        if (data?.segments) segments.push(...data.segments);
        totalPages = data?.totalPages || 1;
        page++;
    }

    return segments.map((s) => ({
        id: s.id,
        name: s.name || '',
        createdAt: s.createdAt || null,
    }));
}

// GET /v2/segment/{id}/customers — returns all members of one segment
// (paginated, 1000/page). Respects the 5-sec rate limit between pages.
export async function getZokoSegmentCustomers(segmentId) {
    const customers = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
        if (page > 1) await sleep(RATE_LIMIT_MS);
        const data = await zokoGet(`/segment/${segmentId}/customers?page=${page}`);
        if (data?.customers) customers.push(...data.customers);
        totalPages = data?.totalPages || 1;
        page++;
    }

    return customers.map((c) => ({
        id: c.id || null,
        name: c.name || '',
        phone: c.phone || '',
        email: c.email || null,
    }));
}

// Parse a Zoko segment name like "Customer €1500 - €2000 & 2 Bedroom"
// into structured criteria. Returns nulls if the pattern doesn't match.
export function parseSegmentName(name) {
    if (!name) return { min_budget: null, max_budget: null, min_bedrooms: null };

    // Price range: "€1500 - €2000" or "€5000+"
    let minBudget = null;
    let maxBudget = null;
    const range = name.match(/€?\s*(\d[\d.]*)\s*-\s*€?\s*(\d[\d.]*)/);
    const plus = name.match(/€?\s*(\d[\d.]*)\s*\+/);

    if (range) {
        minBudget = Number(range[1].replace(/\./g, ''));
        maxBudget = Number(range[2].replace(/\./g, ''));
    } else if (plus) {
        minBudget = Number(plus[1].replace(/\./g, ''));
        maxBudget = null; // "and above"
    }

    // Bedroom count: "2 Bedroom" or "2 Bedrooms" or "4+ Bedrooms"
    let minBedrooms = null;
    const bed = name.match(/(\d+)\+?\s*bedroom/i);
    if (bed) minBedrooms = Number(bed[1]);

    return { min_budget: minBudget, max_budget: maxBudget, min_bedrooms: minBedrooms };
}

export function normalizePhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
}