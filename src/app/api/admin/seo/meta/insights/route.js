import { NextResponse } from 'next/server';
import { getCachedOrFetch } from '@/lib/seo/cacheManager';
import { getPageInsights } from '@/lib/seo/metaClient';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'day';
        const days = Number(searchParams.get('days')) || 30;

        const result = await getCachedOrFetch(
            `meta:insights:${period}:${days}`,
            () => getPageInsights(period, days),
            21600
        );

        return NextResponse.json({
            success: true,
            insights: result.data,
            source: result.source,
            fetchedAt: result.fetchedAt,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
