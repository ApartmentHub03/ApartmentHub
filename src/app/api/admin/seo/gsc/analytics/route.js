import { NextResponse } from 'next/server';
import { getCachedOrFetch } from '@/lib/seo/cacheManager';
import {
    getSearchAnalytics,
    getSiteTotals,
    getDailyTrend,
    getTopQueries,
} from '@/lib/seo/gscClient';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const { searchParams } = new URL(request.url);
        const days = Number(searchParams.get('days') || 30);

        const [rows, totals, trend, topQueries] = await Promise.all([
            getCachedOrFetch(
                `gsc:search_analytics:${days}d`,
                () => getSearchAnalytics(days, 5000),
                21600 // 6hr — GSC data lags 2-3 days anyway
            ),
            getCachedOrFetch(
                `gsc:totals:${days}d`,
                () => getSiteTotals(days),
                21600
            ),
            getCachedOrFetch(
                `gsc:trend:${days}d`,
                () => getDailyTrend(days),
                21600
            ),
            getCachedOrFetch(
                'gsc:top_queries',
                () => getTopQueries(20),
                21600
            ),
        ]);

        return NextResponse.json({
            success: true,
            rows: rows.data,
            totals: totals.data,
            trend: trend.data,
            topQueries: topQueries.data,
            source: rows.source,
            fetchedAt: rows.fetchedAt,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
