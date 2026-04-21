import { NextResponse } from 'next/server';
import { getCachedOrFetch } from '@/lib/seo/cacheManager';
import { getTrafficData, getTrafficTrend } from '@/lib/seo/ga4Client';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '7daysAgo';
        const includeTrend = searchParams.get('trend') !== 'false';

        const [current, previous, trend] = await Promise.all([
            getCachedOrFetch(
                `ga4:traffic:${range}`,
                () => getTrafficData(range, 'today'),
                3600
            ),
            // Previous period for delta calculation (same length range, shifted back)
            getCachedOrFetch(
                `ga4:traffic:${range}:prev`,
                () => getTrafficData('14daysAgo', '8daysAgo'),
                3600
            ),
            includeTrend
                ? getCachedOrFetch('ga4:traffic:trend:30d', () => getTrafficTrend(30), 3600)
                : Promise.resolve({ data: [], source: 'skipped' }),
        ]);

        return NextResponse.json({
            success: true,
            current: current.data,
            previous: previous.data,
            trend: trend.data,
            source: current.source,
            fetchedAt: current.fetchedAt,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
