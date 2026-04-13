import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { getGoogleCredentials } from './googleAuth';

// Google Analytics Data API v1 wrapper.
// Docs: https://developers.google.com/analytics/devguides/reporting/data/v1
// Uses the shared Google service account. Requires GA4_PROPERTY_ID env var.

let client = null;

function getClient() {
    if (client) return client;
    const credentials = getGoogleCredentials();
    client = new BetaAnalyticsDataClient({ credentials });
    return client;
}

function propertyPath() {
    const propertyId = process.env.GA4_PROPERTY_ID;
    if (!propertyId) throw new Error('Missing GA4_PROPERTY_ID env var');
    return `properties/${propertyId}`;
}

/**
 * Traffic metrics for a date range (default last 7 days).
 * @param {string} startDate - "7daysAgo" or "YYYY-MM-DD"
 * @param {string} endDate - "today" or "YYYY-MM-DD"
 */
export async function getTrafficData(startDate = '7daysAgo', endDate = 'today') {
    const [response] = await getClient().runReport({
        property: propertyPath(),
        dateRanges: [{ startDate, endDate }],
        metrics: [
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'totalUsers' },
            { name: 'newUsers' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
        ],
    });

    const row = response.rows?.[0]?.metricValues || [];
    return {
        sessions: Number(row[0]?.value || 0),
        pageviews: Number(row[1]?.value || 0),
        users: Number(row[2]?.value || 0),
        newUsers: Number(row[3]?.value || 0),
        bounceRate: Number(row[4]?.value || 0),
        avgSessionDuration: Number(row[5]?.value || 0),
    };
}

/**
 * Day-by-day traffic trend (for the LineChart).
 */
export async function getTrafficTrend(days = 30) {
    const [response] = await getClient().runReport({
        property: propertyPath(),
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }, { name: 'totalUsers' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
    });

    return (response.rows || []).map((row) => ({
        date: row.dimensionValues?.[0]?.value || '',
        sessions: Number(row.metricValues?.[0]?.value || 0),
        pageviews: Number(row.metricValues?.[1]?.value || 0),
        users: Number(row.metricValues?.[2]?.value || 0),
    }));
}

/**
 * Top pages by views.
 */
export async function getTopPages(limit = 20) {
    const [response] = await getClient().runReport({
        property: propertyPath(),
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [
            { name: 'screenPageViews' },
            { name: 'userEngagementDuration' },
            { name: 'bounceRate' },
        ],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit,
    });

    return (response.rows || []).map((row) => ({
        pagePath: row.dimensionValues?.[0]?.value || '',
        pageTitle: row.dimensionValues?.[1]?.value || '',
        views: Number(row.metricValues?.[0]?.value || 0),
        engagementDuration: Number(row.metricValues?.[1]?.value || 0),
        bounceRate: Number(row.metricValues?.[2]?.value || 0),
    }));
}

/**
 * Real-time active users.
 */
export async function getRealtimeData() {
    const [response] = await getClient().runRealtimeReport({
        property: propertyPath(),
        metrics: [{ name: 'activeUsers' }],
    });

    const value = Number(response.rows?.[0]?.metricValues?.[0]?.value || 0);
    return { activeUsers: value };
}

/**
 * Demographics: countries, devices, cities.
 */
export async function getDemographics() {
    const client = getClient();
    const property = propertyPath();

    const [countries, devices, cities] = await Promise.all([
        client.runReport({
            property,
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            dimensions: [{ name: 'country' }],
            metrics: [{ name: 'totalUsers' }],
            orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
            limit: 10,
        }),
        client.runReport({
            property,
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            dimensions: [{ name: 'deviceCategory' }],
            metrics: [{ name: 'totalUsers' }],
        }),
        client.runReport({
            property,
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            dimensions: [{ name: 'city' }],
            metrics: [{ name: 'totalUsers' }],
            orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
            limit: 10,
        }),
    ]);

    const mapRows = (resp) =>
        (resp[0].rows || []).map((row) => ({
            name: row.dimensionValues?.[0]?.value || '',
            users: Number(row.metricValues?.[0]?.value || 0),
        }));

    return {
        countries: mapRows(countries),
        devices: mapRows(devices),
        cities: mapRows(cities),
    };
}
