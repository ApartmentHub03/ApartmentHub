import { google } from 'googleapis';
import { getGoogleCredentials } from './googleAuth';

// Google Search Console API wrapper.
// Docs: https://developers.google.com/webmaster-tools/v1/searchanalytics
// Requires env var: GSC_SITE_URL (e.g., "https://apartmenthub.nl")

let service = null;

function getService() {
    if (service) return service;
    const credentials = getGoogleCredentials();
    const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    service = google.webmasters({ version: 'v3', auth });
    return service;
}

function siteUrl() {
    const url = process.env.GSC_SITE_URL;
    if (!url) throw new Error('Missing GSC_SITE_URL env var');
    return url;
}

function daysAgoISO(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
}

function todayISO() {
    // GSC data lags 2-3 days, so we subtract 2 for fresher data
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return d.toISOString().slice(0, 10);
}

/**
 * Query Search Analytics grouped by query+page.
 * @param {number} days - how many days back (default 30)
 * @param {number} rowLimit - max rows (default 5000, max 25000)
 */
export async function getSearchAnalytics(days = 30, rowLimit = 5000) {
    const svc = getService();
    const response = await svc.searchanalytics.query({
        siteUrl: siteUrl(),
        requestBody: {
            startDate: daysAgoISO(days),
            endDate: todayISO(),
            dimensions: ['query', 'page'],
            rowLimit,
        },
    });

    return (response.data.rows || []).map((row) => ({
        query: row.keys?.[0] || '',
        page: row.keys?.[1] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
    }));
}

/**
 * Aggregated performance metrics (site-wide totals).
 */
export async function getSiteTotals(days = 30) {
    const svc = getService();
    const response = await svc.searchanalytics.query({
        siteUrl: siteUrl(),
        requestBody: {
            startDate: daysAgoISO(days),
            endDate: todayISO(),
            dimensions: [],
        },
    });

    const row = response.data.rows?.[0];
    return {
        clicks: row?.clicks || 0,
        impressions: row?.impressions || 0,
        ctr: row?.ctr || 0,
        position: row?.position || 0,
    };
}

/**
 * Day-by-day click/impression trend.
 */
export async function getDailyTrend(days = 30) {
    const svc = getService();
    const response = await svc.searchanalytics.query({
        siteUrl: siteUrl(),
        requestBody: {
            startDate: daysAgoISO(days),
            endDate: todayISO(),
            dimensions: ['date'],
            rowLimit: days,
        },
    });

    return (response.data.rows || []).map((row) => ({
        date: row.keys?.[0] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
    }));
}

/**
 * The money query: identify high-impression, low-CTR pages that need optimization.
 * This is the core of the self-improvement loop (from the Notion playbook).
 *
 * @param {object} opts
 * @param {number} opts.minImpressions - threshold for "high impressions" (default 100)
 * @param {number} opts.maxCtr - threshold for "low CTR" (default 0.02 = 2%)
 * @param {number} opts.days - lookback window (default 30)
 * @param {number} opts.limit - max opportunities returned (default 20)
 */
export async function getOpportunities({
    minImpressions = 100,
    maxCtr = 0.02,
    days = 30,
    limit = 20,
} = {}) {
    const rows = await getSearchAnalytics(days, 25000);

    const opportunities = rows
        .filter((r) => r.impressions >= minImpressions && r.ctr <= maxCtr)
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, limit)
        .map((r) => ({
            ...r,
            // "Potential clicks" if CTR hit 5% — useful for prioritization
            potentialClicks: Math.round(r.impressions * 0.05),
            missedClicks: Math.round(r.impressions * 0.05) - r.clicks,
            // Heuristic priority score
            priority:
                r.impressions >= 500
                    ? 'HIGH'
                    : r.impressions >= 200
                      ? 'MEDIUM'
                      : 'LOW',
        }));

    return opportunities;
}

/**
 * Top performing queries (highest clicks).
 */
export async function getTopQueries(limit = 20) {
    const svc = getService();
    const response = await svc.searchanalytics.query({
        siteUrl: siteUrl(),
        requestBody: {
            startDate: daysAgoISO(30),
            endDate: todayISO(),
            dimensions: ['query'],
            rowLimit: limit,
        },
    });

    return (response.data.rows || [])
        .map((row) => ({
            query: row.keys?.[0] || '',
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0,
        }))
        .sort((a, b) => b.clicks - a.clicks);
}
