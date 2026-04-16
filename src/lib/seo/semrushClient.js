// Semrush API wrapper.
// Docs: https://developer.semrush.com/api/
// Base URL: https://api.semrush.com/ with API key as query param
// Response format: CSV (semicolon-delimited) that we parse to JSON.

const BASE_URL = 'https://api.semrush.com/';
const BACKLINKS_URL = 'https://api.semrush.com/analytics/v1/';
const UNITS_URL = 'https://www.semrush.com/users/countapiunits.html';
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

const num = (v) => Number(v || 0);

// ─────────────────────────────────────────────────────────────
// API UNITS / ACCOUNT STATUS
// ─────────────────────────────────────────────────────────────

/**
 * Remaining API units on the current plan.
 * The counter endpoint returns a plain-text integer.
 */
export async function getApiUnitsRemaining() {
    const url = new URL(UNITS_URL);
    url.searchParams.set('key', getApiKey());
    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`Semrush units HTTP ${response.status}`);
    }
    const text = (await response.text()).trim();
    if (text.startsWith('ERROR')) {
        throw new Error(`Semrush units error: ${text}`);
    }
    return { remaining: Number(text) || 0, checkedAt: new Date().toISOString() };
}

// ─────────────────────────────────────────────────────────────
// DOMAIN ANALYTICS
// ─────────────────────────────────────────────────────────────

/**
 * domain_ranks — global rank, organic/paid keywords, traffic, cost.
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
        rank: num(row.Rank || row.Rk),
        organicKeywords: num(row['Organic Keywords'] || row.Or),
        organicTraffic: num(row['Organic Traffic'] || row.Ot),
        organicCost: num(row['Organic Cost'] || row.Oc),
        adwordsKeywords: num(row['Adwords Keywords'] || row.Ad),
        adwordsTraffic: num(row['Adwords Traffic'] || row.At),
        adwordsCost: num(row['Adwords Cost'] || row.Ac),
    };
}

/**
 * domain_rank — same data across ALL databases (one row per database).
 * Useful for multi-country visibility.
 */
export async function getDomainOverviewAllDatabases(domain = DEFAULT_DOMAIN) {
    const rows = await semrushFetch({
        type: 'domain_rank',
        domain,
        export_columns: 'Db,Dn,Rk,Or,Ot,Oc,Ad,At,Ac',
    });

    return rows.map((r) => ({
        database: r.Database || r.Db || '',
        rank: num(r.Rank || r.Rk),
        organicKeywords: num(r['Organic Keywords'] || r.Or),
        organicTraffic: num(r['Organic Traffic'] || r.Ot),
        organicCost: num(r['Organic Cost'] || r.Oc),
        adwordsKeywords: num(r['Adwords Keywords'] || r.Ad),
        adwordsTraffic: num(r['Adwords Traffic'] || r.At),
        adwordsCost: num(r['Adwords Cost'] || r.Ac),
    }));
}

/**
 * domain_organic — keywords bringing organic traffic to a domain.
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
        position: num(r.Position || r.Po),
        prevPosition: num(r['Previous Position'] || r.Pp),
        volume: num(r['Search Volume'] || r.Nq),
        cpc: num(r.CPC || r.Cp),
        url: r.Url || r.Ur || '',
        traffic: num(r['Traffic (%)'] || r.Tr),
        trafficCost: num(r['Traffic Cost'] || r.Tg),
        competition: num(r['Competition Level'] || r.Td),
    }));
}

/**
 * domain_adwords — paid search keywords a domain is bidding on.
 */
export async function getPaidKeywords(
    domain = DEFAULT_DOMAIN,
    database = DEFAULT_DATABASE,
    limit = 50
) {
    const rows = await semrushFetch({
        type: 'domain_adwords',
        domain,
        database,
        display_limit: limit,
        export_columns: 'Ph,Po,Pp,Nq,Cp,Ur,Tr,Tg,Vu',
    });

    return rows.map((r) => ({
        keyword: r.Keyword || r.Ph || '',
        position: num(r.Position || r.Po),
        prevPosition: num(r['Previous Position'] || r.Pp),
        volume: num(r['Search Volume'] || r.Nq),
        cpc: num(r.CPC || r.Cp),
        url: r.Url || r.Ur || '',
        traffic: num(r['Traffic (%)'] || r.Tr),
        trafficCost: num(r['Traffic Cost'] || r.Tg),
        visibility: num(r['Visibility (%)'] || r.Vu),
    }));
}

/**
 * domain_organic_organic — top organic competitors.
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
        competitorRelevance: num(r['Competitor Relevance'] || r.Cr),
        commonKeywords: num(r['Common Keywords'] || r.Np),
        organicKeywords: num(r['Organic Keywords'] || r.Or),
        organicTraffic: num(r['Organic Traffic'] || r.Ot),
        organicCost: num(r['Organic Cost'] || r.Oc),
    }));
}

/**
 * domain_adwords_adwords — top paid-search competitors.
 */
export async function getPaidCompetitors(
    domain = DEFAULT_DOMAIN,
    database = DEFAULT_DATABASE,
    limit = 10
) {
    const rows = await semrushFetch({
        type: 'domain_adwords_adwords',
        domain,
        database,
        display_limit: limit,
        export_columns: 'Dn,Cr,Np,Ad,At,Ac',
    });

    return rows.map((r) => ({
        domain: r.Domain || r.Dn || '',
        competitorRelevance: num(r['Competitor Relevance'] || r.Cr),
        commonKeywords: num(r['Common Keywords'] || r.Np),
        adwordsKeywords: num(r['Adwords Keywords'] || r.Ad),
        adwordsTraffic: num(r['Adwords Traffic'] || r.At),
        adwordsCost: num(r['Adwords Cost'] || r.Ac),
    }));
}

/**
 * domain_adwords_historical — historical paid search data per month.
 */
export async function getPaidHistorical(
    domain = DEFAULT_DOMAIN,
    database = DEFAULT_DATABASE,
    limit = 24
) {
    const rows = await semrushFetch({
        type: 'domain_adwords_historical',
        domain,
        database,
        display_limit: limit,
        export_columns: 'Dt,Ad,At,Ac',
    });

    return rows.map((r) => ({
        date: r.Date || r.Dt || '',
        adwordsKeywords: num(r['Adwords Keywords'] || r.Ad),
        adwordsTraffic: num(r['Adwords Traffic'] || r.At),
        adwordsCost: num(r['Adwords Cost'] || r.Ac),
    }));
}

// ─────────────────────────────────────────────────────────────
// KEYWORD ANALYTICS
// ─────────────────────────────────────────────────────────────

/**
 * phrase_this — overview metrics for a single keyword.
 */
export async function getKeywordOverview(phrase, database = DEFAULT_DATABASE) {
    const rows = await semrushFetch({
        type: 'phrase_this',
        phrase,
        database,
        export_columns: 'Ph,Nq,Cp,Co,Nr,Td',
    });

    const row = rows[0] || {};
    return {
        keyword: row.Keyword || row.Ph || phrase,
        volume: num(row['Search Volume'] || row.Nq),
        cpc: num(row.CPC || row.Cp),
        competition: num(row.Competition || row.Co),
        results: num(row['Number of Results'] || row.Nr),
        trend: row.Trends || row.Td || '',
    };
}

/**
 * phrase_organic — domains ranking for a specific keyword (SERP).
 * Position is implicit (row 1 = pos 1).
 */
export async function getSerpResults(
    query,
    database = DEFAULT_DATABASE,
    limit = 10
) {
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

/**
 * phrase_adwords — domains bidding on a keyword.
 */
export async function getKeywordAdwords(
    phrase,
    database = DEFAULT_DATABASE,
    limit = 10
) {
    const rows = await semrushFetch({
        type: 'phrase_adwords',
        phrase,
        database,
        display_limit: limit,
        export_columns: 'Dn,Ur,Vu',
    });

    return rows.map((r, i) => ({
        domain: r.Domain || r.Dn || '',
        url: r.Url || r.Ur || '',
        visibility: num(r['Visibility (%)'] || r.Vu),
        position: i + 1,
    }));
}

/**
 * phrase_related — related keywords.
 */
export async function getRelatedKeywords(
    phrase,
    database = DEFAULT_DATABASE,
    limit = 25
) {
    const rows = await semrushFetch({
        type: 'phrase_related',
        phrase,
        database,
        display_limit: limit,
        export_columns: 'Ph,Nq,Cp,Co,Nr,Td',
    });

    return rows.map((r) => ({
        keyword: r.Keyword || r.Ph || '',
        volume: num(r['Search Volume'] || r.Nq),
        cpc: num(r.CPC || r.Cp),
        competition: num(r.Competition || r.Co),
        results: num(r['Number of Results'] || r.Nr),
        trend: r.Trends || r.Td || '',
    }));
}

/**
 * phrase_fullsearch — broad-match keyword suggestions.
 */
export async function getBroadMatchKeywords(
    phrase,
    database = DEFAULT_DATABASE,
    limit = 25
) {
    const rows = await semrushFetch({
        type: 'phrase_fullsearch',
        phrase,
        database,
        display_limit: limit,
        export_columns: 'Ph,Nq,Cp,Co,Nr,Td',
    });

    return rows.map((r) => ({
        keyword: r.Keyword || r.Ph || '',
        volume: num(r['Search Volume'] || r.Nq),
        cpc: num(r.CPC || r.Cp),
        competition: num(r.Competition || r.Co),
        results: num(r['Number of Results'] || r.Nr),
        trend: r.Trends || r.Td || '',
    }));
}

/**
 * keyword_difficulty — difficulty score (0–100) for one or more phrases.
 * @param {string|string[]} phrases
 */
export async function getKeywordDifficulty(phrases, database = DEFAULT_DATABASE) {
    const phrase = Array.isArray(phrases) ? phrases.join(';') : phrases;
    const rows = await semrushFetch({
        type: 'phrase_kdi',
        phrase,
        database,
        export_columns: 'Ph,Kd',
    });

    return rows.map((r) => ({
        keyword: r.Keyword || r.Ph || '',
        difficulty: num(r['Keyword Difficulty Index'] || r.Kd),
    }));
}

// ─────────────────────────────────────────────────────────────
// BACKLINK ANALYTICS
// ─────────────────────────────────────────────────────────────

/**
 * backlinks_overview — aggregate backlink metrics.
 */
export async function getBacklinks(domain = DEFAULT_DOMAIN) {
    const rows = await semrushFetch(
        {
            type: 'backlinks_overview',
            target: domain,
            target_type: 'root_domain',
            export_columns: 'total,domains_num,urls_num,ips_num,score',
        },
        BACKLINKS_URL
    );

    const row = rows[0] || {};
    return {
        totalBacklinks: num(row.total),
        referringDomains: num(row.domains_num),
        referringUrls: num(row.urls_num),
        referringIps: num(row.ips_num),
        authorityScore: num(row.score),
    };
}

/**
 * backlinks — individual backlink rows.
 */
export async function getBacklinksList(domain = DEFAULT_DOMAIN, limit = 50) {
    const rows = await semrushFetch(
        {
            type: 'backlinks',
            target: domain,
            target_type: 'root_domain',
            display_limit: limit,
            export_columns:
                'page_ascore,source_url,source_title,target_url,anchor,external_num,internal_num,first_seen,last_seen',
        },
        BACKLINKS_URL
    );

    return rows.map((r) => ({
        authorityScore: num(r.page_ascore),
        sourceUrl: r.source_url || '',
        sourceTitle: r.source_title || '',
        targetUrl: r.target_url || '',
        anchor: r.anchor || '',
        externalLinks: num(r.external_num),
        internalLinks: num(r.internal_num),
        firstSeen: r.first_seen || '',
        lastSeen: r.last_seen || '',
    }));
}

/**
 * backlinks_refdomains — referring domains.
 */
export async function getReferringDomains(domain = DEFAULT_DOMAIN, limit = 50) {
    const rows = await semrushFetch(
        {
            type: 'backlinks_refdomains',
            target: domain,
            target_type: 'root_domain',
            display_limit: limit,
            export_columns: 'domain_ascore,domain,backlinks_num,ip',
        },
        BACKLINKS_URL
    );

    return rows.map((r) => ({
        authorityScore: num(r.domain_ascore),
        domain: r.domain || '',
        backlinks: num(r.backlinks_num),
        ip: r.ip || '',
    }));
}

/**
 * backlinks_anchors — anchor-text distribution.
 */
export async function getAnchors(domain = DEFAULT_DOMAIN, limit = 50) {
    const rows = await semrushFetch(
        {
            type: 'backlinks_anchors',
            target: domain,
            target_type: 'root_domain',
            display_limit: limit,
            export_columns: 'anchor,domains_num,backlinks_num,first_seen,last_seen',
        },
        BACKLINKS_URL
    );

    return rows.map((r) => ({
        anchor: r.anchor || '',
        referringDomains: num(r.domains_num),
        backlinks: num(r.backlinks_num),
        firstSeen: r.first_seen || '',
        lastSeen: r.last_seen || '',
    }));
}

/**
 * backlinks_competitors — backlink competitors.
 */
export async function getBacklinkCompetitors(domain = DEFAULT_DOMAIN, limit = 10) {
    const rows = await semrushFetch(
        {
            type: 'backlinks_competitors',
            target: domain,
            target_type: 'root_domain',
            display_limit: limit,
            export_columns:
                'ascore,neighbour,similarity,domains_num,backlinks_num',
        },
        BACKLINKS_URL
    );

    return rows.map((r) => ({
        authorityScore: num(r.ascore),
        domain: r.neighbour || '',
        similarity: num(r.similarity),
        referringDomains: num(r.domains_num),
        backlinks: num(r.backlinks_num),
    }));
}
