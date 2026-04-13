// Semrush API wrapper.
// Docs: https://developer.semrush.com/api/
// Base URL: https://api.semrush.com/ with API key as query param
// Response format: CSV (semicolon-delimited) that we parse to JSON.

const BASE_URL = 'https://api.semrush.com/';
const BACKLINKS_URL = 'https://api.semrush.com/analytics/v1/';
const DEFAULT_DOMAIN = 'apartmenthub.nl';
const DEFAULT_DATABASE = 'nl'; // Netherlands

function getApiKey() {
    const key = process.env.SEMRUSH_API_KEY;
    if (!key) throw new Error('Missing SEMRUSH_API_KEY env var');
    return key;
}

/**
 * Parse Semrush CSV response (semicolon-delimited).
 * First line is header, subsequent lines are data.
 */
function parseCsv(text) {
    if (!text || typeof text !== 'string') return [];
    // Semrush returns errors as plain text starting with "ERROR"
    if (text.startsWith('ERROR')) {
        throw new Error(`Semrush API error: ${text.trim()}`);
    }
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(';');
    return lines.slice(1).map((line) => {
        const values = line.split(';');
        const obj = {};
        headers.forEach((h, i) => {
            obj[h.trim()] = values[i]?.trim() || '';
        });
        return obj;
    });
}

async function semrushFetch(params, baseUrl = BASE_URL) {
    const url = new URL(baseUrl);
    Object.entries({ ...params, key: getApiKey() }).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'text/csv' },
    });

    if (!response.ok) {
        throw new Error(`Semrush HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    return parseCsv(text);
}

/**
 * Domain overview: organic keywords count, traffic, cost.
 */
export async function getDomainOverview(domain = DEFAULT_DOMAIN, database = DEFAULT_DATABASE) {
    const rows = await semrushFetch({
        type: 'domain_ranks',
        domain,
        database,
        export_columns: 'Db,Dn,Rk,Or,Ot,Oc,Ad,At,Ac',
    });

    const row = rows[0] || {};
    return {
        database: row.Database || row.Db || database,
        domain: row.Domain || row.Dn || domain,
        rank: Number(row.Rank || row.Rk || 0),
        organicKeywords: Number(row['Organic Keywords'] || row.Or || 0),
        organicTraffic: Number(row['Organic Traffic'] || row.Ot || 0),
        organicCost: Number(row['Organic Cost'] || row.Oc || 0),
        adwordsKeywords: Number(row['Adwords Keywords'] || row.Ad || 0),
        adwordsTraffic: Number(row['Adwords Traffic'] || row.At || 0),
        adwordsCost: Number(row['Adwords Cost'] || row.Ac || 0),
    };
}

/**
 * Organic keywords the domain ranks for.
 */
export async function getOrganicKeywords(
    domain = DEFAULT_DOMAIN,
    database = DEFAULT_DATABASE,
    limit = 50
) {
    const rows = await semrushFetch({
        type: 'domain_organic',
        domain,
        database,
        display_limit: limit,
        export_columns: 'Ph,Po,Pp,Nq,Cp,Ur,Tr,Tg,Td',
    });

    return rows.map((r) => ({
        keyword: r.Keyword || r.Ph || '',
        position: Number(r.Position || r.Po || 0),
        prevPosition: Number(r['Previous Position'] || r.Pp || 0),
        volume: Number(r['Search Volume'] || r.Nq || 0),
        cpc: Number(r.CPC || r.Cp || 0),
        url: r.Url || r.Ur || '',
        traffic: Number(r['Traffic (%)'] || r.Tr || 0),
        trafficCost: Number(r['Traffic Cost'] || r.Tg || 0),
        competition: Number(r['Competition Level'] || r.Td || 0),
    }));
}

/**
 * Backlinks overview.
 */
export async function getBacklinks(domain = DEFAULT_DOMAIN) {
    const rows = await semrushFetch({
        type: 'backlinks_overview',
        target: domain,
        target_type: 'root_domain',
        export_columns: 'total,domains_num,urls_num,ips_num',
    }, BACKLINKS_URL);

    const row = rows[0] || {};
    return {
        totalBacklinks: Number(row.total || 0),
        referringDomains: Number(row.domains_num || 0),
        referringUrls: Number(row.urls_num || 0),
        referringIps: Number(row.ips_num || 0),
    };
}

/**
 * Top organic competitors.
 */
export async function getCompetitors(
    domain = DEFAULT_DOMAIN,
    database = DEFAULT_DATABASE,
    limit = 10
) {
    const rows = await semrushFetch({
        type: 'domain_organic_organic',
        domain,
        database,
        display_limit: limit,
        export_columns: 'Dn,Cr,Np,Or,Ot,Oc',
    });

    return rows.map((r) => ({
        domain: r.Domain || r.Dn || '',
        competitorRelevance: Number(r['Competitor Relevance'] || r.Cr || 0),
        commonKeywords: Number(r['Common Keywords'] || r.Np || 0),
        organicKeywords: Number(r['Organic Keywords'] || r.Or || 0),
        organicTraffic: Number(r['Organic Traffic'] || r.Ot || 0),
        organicCost: Number(r['Organic Cost'] || r.Oc || 0),
    }));
}

/**
 * SERP results for a specific keyword.
 * Returns top organic results so we can see who ranks for a query.
 */
export async function getSerpResults(
    query,
    database = DEFAULT_DATABASE,
    limit = 10
) {
    // phrase_organic returns Domain, URL, SERP features.
    // Position is implicit (row 1 = position 1).
    const rows = await semrushFetch({
        type: 'phrase_organic',
        phrase: query,
        database,
        display_limit: limit,
        export_columns: 'Dn,Ur',
    });

    return rows.map((r, i) => ({
        domain: r.Domain || r.Dn || '',
        url: r.Url || r.Ur || '',
        position: i + 1,
    }));
}
