import { NextResponse } from 'next/server';
import { getCachedOrFetch } from '@/lib/seo/cacheManager';
import {
    getTrafficData,
    getTrafficTrend,
    getTopPages,
    getRealtimeData,
} from '@/lib/seo/ga4Client';
import { getDomainOverview, getBacklinks } from '@/lib/seo/semrushClient';
import { getSiteTotals, getOpportunities, getDailyTrend } from '@/lib/seo/gscClient';
import { getPageInsights, getRecentPosts } from '@/lib/seo/metaClient';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

// The critical first-load endpoint: fetches everything needed for the
// Overview tab in parallel, using the cache layer wherever possible.
// All calls are wrapped in Promise.allSettled so one slow/failing source
// doesn't block the whole dashboard.

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const results = await Promise.allSettled([
            getCachedOrFetch('ga4:traffic:7daysAgo', () => getTrafficData('7daysAgo', 'today'), 3600),
            getCachedOrFetch('ga4:traffic:trend:30d', () => getTrafficTrend(30), 3600),
            getCachedOrFetch('ga4:top_pages:10', () => getTopPages(10), 3600),
            getCachedOrFetch('ga4:realtime', () => getRealtimeData(), 300),
            getCachedOrFetch(
                'semrush:domain_overview:apartmenthub.nl:nl',
                () => getDomainOverview('apartmenthub.nl', 'nl'),
                86400
            ),
            getCachedOrFetch(
                'semrush:backlinks:apartmenthub.nl',
                () => getBacklinks('apartmenthub.nl'),
                86400
            ),
            getCachedOrFetch('gsc:totals:30d', () => getSiteTotals(30), 21600),
            getCachedOrFetch('gsc:trend:30d', () => getDailyTrend(30), 21600),
            getCachedOrFetch(
                'gsc:opportunities:100:0.02:30:10',
                () => getOpportunities({ minImpressions: 100, maxCtr: 0.02, days: 30, limit: 10 }),
                21600
            ),
            getCachedOrFetch('meta:insights:day:7', () => getPageInsights('day', 7), 3600),
            getCachedOrFetch('meta:posts:recent:5', () => getRecentPosts(5), 3600),
        ]);

        const unwrap = (r) =>
            r.status === 'fulfilled'
                ? { data: r.value.data, source: r.value.source }
                : { data: null, error: r.reason?.message || 'Failed' };

        const [
            traffic,
            trafficTrend,
            topPages,
            realtime,
            semrushDomain,
            semrushBacklinks,
            gscTotals,
            gscTrend,
            gscOpportunities,
            metaInsights,
            metaPosts,
        ] = results.map(unwrap);

        return NextResponse.json({
            success: true,
            ga4: {
                traffic: traffic.data,
                trend: trafficTrend.data,
                topPages: topPages.data,
                realtime: realtime.data,
            },
            semrush: {
                domain: semrushDomain.data,
                backlinks: semrushBacklinks.data,
            },
            gsc: {
                totals: gscTotals.data,
                trend: gscTrend.data,
                opportunities: gscOpportunities.data,
            },
            meta: {
                insights: metaInsights.data,
                recentPosts: metaPosts.data,
            },
            errors: results
                .map((r, i) => (r.status === 'rejected' ? { index: i, error: r.reason?.message } : null))
                .filter(Boolean),
        });
    } catch (err) {
        return errorResponse(err);
    }
}
